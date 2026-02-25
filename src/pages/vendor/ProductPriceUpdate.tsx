import {useState} from "react";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {z} from "zod";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Link, useParams} from "react-router-dom";
import {useAuth} from "@/hooks/useAuth";
import {useToast} from "@/hooks/use-toast";
import {ProductSku, VendorProfile, vendorService} from "@/services/vendorService";
import {apiService} from "@/services/apiService";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {AlertCircle, ArrowLeft, DollarSign, Info, Package, RefreshCw} from "lucide-react";
import {Alert, AlertDescription, AlertTitle,} from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const isEthiopianVendor = (vendorProfile: VendorProfile | undefined): boolean => {
  if (!vendorProfile) return false;
  return vendorProfile.countryCode === 'ET';
};

interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
}

// Platform commission rate (10%)
const PLATFORM_COMMISSION_RATE = 0.10;

const priceUpdateSchema = z.object({
  skuId: z.number(),
  skuCode: z.string(),
  currencyCode: z.string().min(1, "Currency is required"),
  vendorAmount: z.number().min(0.01, "Vendor price must be greater than 0"),
  reason: z.string().optional(),
});

type PriceUpdateFormData = z.infer<typeof priceUpdateSchema>;

export default function ProductPriceUpdate() {
  const { id } = useParams<{ id: string }>();
  const productId = id ? parseInt(id, 10) : null;

  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const isVendor = user?.role?.toUpperCase() === 'VENDOR';

  const [selectedSku, setSelectedSku] = useState<ProductSku | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch product data
  const { data: product, isLoading: productLoading, error: productError } = useQuery({
    queryKey: ['vendor', 'product', productId],
    queryFn: async () => {
      return await apiService.getRequest<any>(`/api/v1/products/${productId}`);
    },
    enabled: !!productId && isAuthenticated && isVendor,
  });

  // Fetch vendor profile
  const { data: vendorProfile } = useQuery({
    queryKey: ['vendor', 'profile'],
    queryFn: () => vendorService.getMyProfile(),
    enabled: isAuthenticated && isVendor,
  });

  // Fetch currencies
  const { data: currencies = [] } = useQuery({
    queryKey: ['currencies'],
    queryFn: () => apiService.getRequest<Currency[]>('/api/currencies'),
  });

  const availableCurrencies = isEthiopianVendor(vendorProfile)
    ? currencies.filter(c => c.code === 'ETB')
    : currencies;

  const form = useForm<PriceUpdateFormData>({
    resolver: zodResolver(priceUpdateSchema),
    defaultValues: {
      skuId: 0,
      skuCode: "",
      currencyCode: "",
      vendorAmount: 0,
      reason: "",
    },
  });

  // Check if vendor owns this product
  // For products, vendorId is the User ID, so compare with userId
  const isProductOwner = product && vendorProfile && product.vendorId === vendorProfile.userId;

  // Price update mutation
  const priceUpdateMutation = useMutation({
    mutationFn: async (data: PriceUpdateFormData) => {
      if (!productId) throw new Error("Product ID is required");

      // Convert to minor units (cents)
      const vendorAmountMinor = Math.round(data.vendorAmount * 100);
      // Calculate customer price with platform commission
      const unitAmountMinor = Math.round(vendorAmountMinor * (1 + PLATFORM_COMMISSION_RATE));

      // Backend expects PriceDto directly, not a prices array
      const request = {
        newPrice: {
          currencyCode: data.currencyCode,
          vendorAmountMinor: vendorAmountMinor,
          unitAmountMinor: unitAmountMinor,
        },
        reason: data.reason,
      };

      return vendorService.createSkuPriceUpdateRequest(productId, data.skuId, request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'my-products'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'pending-rejected-price-requests'] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'product-price-requests'] });
      toast({
        title: "Price Update Requested",
        description: "Your price update request has been submitted for admin approval.",
      });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit price update request",
        variant: "destructive",
      });
    },
  });

  const openPriceDialog = (sku: ProductSku) => {
    setSelectedSku(sku);
    // Price is returned directly on sku.price
    // vendorAmountMinor is in cents, convert to major units for display
    const vendorAmountMajor = sku.price?.vendorAmountMinor 
      ? sku.price.vendorAmountMinor / 100 
      : (sku.price?.amount || 0);
    form.reset({
      skuId: sku.id || 0,
      skuCode: sku.skuCode,
      currencyCode: sku.price?.currencyCode || availableCurrencies[0]?.code || "USD",
      vendorAmount: vendorAmountMajor,
      reason: "",
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: PriceUpdateFormData) => {
    priceUpdateMutation.mutate(data);
  };

  const getSkuCurrentPrice = (sku: ProductSku) => {
    // Price is returned directly on sku.price
    if (!sku.price?.currencyCode) return "No price set";
    const currency = currencies.find(c => c.code === sku.price?.currencyCode);
    const symbol = currency?.symbol || sku.price.currencyCode;
    
    // Get customer price (unitAmountMinor) and vendor price (vendorAmountMinor)
    const customerAmount = sku.price.unitAmountMinor 
      ? (sku.price.unitAmountMinor / 100).toFixed(2)
      : (sku.price.amount?.toFixed(2) || "0.00");
    
    return `${symbol} ${customerAmount}`;
  };

  const getSkuVendorPrice = (sku: ProductSku) => {
    if (!sku.price?.currencyCode) return "No price set";
    const currency = currencies.find(c => c.code === sku.price?.currencyCode);
    const symbol = currency?.symbol || sku.price.currencyCode;
    
    const vendorAmount = sku.price.vendorAmountMinor 
      ? (sku.price.vendorAmountMinor / 100).toFixed(2)
      : (sku.price.vendorAmount?.toFixed(2) || "0.00");
    
    return `${symbol} ${vendorAmount}`;
  };

  if (!isAuthenticated || !isVendor) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You must be logged in as a vendor to access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (productLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-ethiopian-gold" />
        </div>
      </div>
    );
  }

  if (productError || !product) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load product. The product may not exist or you may not have permission to view it.
          </AlertDescription>
        </Alert>
        <Button asChild className="mt-4">
          <Link to="/vendor">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    );
  }

  if (!isProductOwner) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unauthorized</AlertTitle>
          <AlertDescription>
            You can only update prices for your own products.
          </AlertDescription>
        </Alert>
        <Button asChild className="mt-4">
          <Link to="/vendor">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    );
  }

  const skus = product.productSku || [];

  return (
    <div className="container mx-auto py-4 sm:py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/vendor">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Update Product Prices</h1>
          <p className="text-muted-foreground text-sm sm:text-base">{product.name}</p>
        </div>
      </div>

      {/* Info Alert */}
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Price Update Process</AlertTitle>
        <AlertDescription>
          Price updates require admin approval. Once you submit a price change request,
          it will be reviewed by an administrator before taking effect.
        </AlertDescription>
      </Alert>

      {/* SKU List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Variants (SKUs)
          </CardTitle>
          <CardDescription>
            Select a variant to request a price update
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {skus.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No variants found for this product.
            </div>
          ) : (
            <div className="space-y-4">
              {skus.map((sku: ProductSku, index: number) => (
                <div
                  key={sku.id || index}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg hover:bg-gray-50 gap-4"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-12 w-12 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                      <Package className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{sku.skuCode}</p>
                      {sku.attributes && sku.attributes.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {sku.attributes.map((attr, attrIndex) => (
                            <Badge key={attrIndex} variant="secondary" className="text-xs">
                              {attr.name}: {attr.value}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        Stock: {sku.stockQuantity}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                    <div className="text-left sm:text-right">
                      <p className="text-sm text-muted-foreground">Your Price</p>
                      <p className="font-semibold text-green-600">{getSkuVendorPrice(sku)}</p>
                      <p className="text-xs text-muted-foreground">Customer: {getSkuCurrentPrice(sku)}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openPriceDialog(sku)}
                      className="self-start sm:self-auto"
                    >
                      <DollarSign className="h-4 w-4 mr-1" />
                      Update Price
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Price Update Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Price Update</DialogTitle>
            <DialogDescription>
              Submit a new price for {selectedSku?.skuCode}. This change requires admin approval.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Current Vendor Price</Label>
                <p className="text-lg font-semibold text-green-600">
                  {selectedSku && getSkuVendorPrice(selectedSku)}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Current Customer Price</Label>
                <p className="text-lg font-semibold">
                  {selectedSku && getSkuCurrentPrice(selectedSku)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currencyCode">Currency</Label>
                <Select
                  value={form.watch("currencyCode")}
                  onValueChange={(value) => form.setValue("currencyCode", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCurrencies.map((currency) => (
                      <SelectItem key={currency.id} value={currency.code}>
                        {currency.code} - {currency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.currencyCode && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.currencyCode.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendorAmount">Your New Price</Label>
                <Input
                  id="vendorAmount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  {...form.register("vendorAmount", { valueAsNumber: true })}
                />
                {form.formState.errors.vendorAmount && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.vendorAmount.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Change (Optional)</Label>
              <Textarea
                id="reason"
                placeholder="Explain why you're requesting this price change..."
                {...form.register("reason")}
                rows={3}
              />
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={priceUpdateMutation.isPending} className="w-full sm:w-auto">
                {priceUpdateMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Request"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
