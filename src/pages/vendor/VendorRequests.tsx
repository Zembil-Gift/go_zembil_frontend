import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import vendorChangeRequestService, {
  VendorChangeRequestDto,
  EditChangeRequest,
} from "@/services/vendorChangeRequestService";
import { vendorService, VendorProfile } from "@/services/vendorService";
import { customOrderService } from "@/services/customOrderService";
import type { CustomOrder } from "@/types/customOrders";
import { apiService } from "@/services/apiService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  Package,
  Calendar,
  DollarSign,
  Clock,
  Edit,
  ArrowLeft,
  RefreshCw,
  XCircle,
  CheckCircle,
  AlertTriangle,
  Ticket,
  FolderTree,
  Trash2,
  Wrench,
  ShoppingBag,
  Eye,
} from "lucide-react";

interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
}

interface SubCategory {
  id: number;
  name: string;
  slug: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

const priceEditSchema = z.object({
  currencyCode: z.string().min(1, "Currency is required"),
  amount: z.number().min(0.01, "Price must be greater than 0"),
  reason: z.string().optional(),
});

const categoryEditSchema = z.object({
  newSubCategoryId: z.string().min(1, "New category is required"),
  reason: z.string().optional(),
});

type PriceEditForm = z.infer<typeof priceEditSchema>;
type CategoryEditForm = z.infer<typeof categoryEditSchema>;

export default function VendorRequests() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isVendor = user?.role?.toUpperCase() === "VENDOR";

  const [activeTab, setActiveTab] = useState("products");
  const [editPriceOpen, setEditPriceOpen] = useState(false);
  const [editCategoryOpen, setEditCategoryOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<VendorChangeRequestDto | null>(null);

  // Fetch vendor profile to determine vendor type
  const { data: vendorProfile } = useQuery<VendorProfile>({
    queryKey: ["vendor", "profile"],
    queryFn: () => vendorService.getMyProfile(),
    enabled: isAuthenticated && isVendor,
  });

  const vendorType = vendorProfile?.vendorType; // 'PRODUCT' | 'SERVICE' | 'HYBRID'
  const isProductVendor = !vendorType || vendorType === "PRODUCT" || vendorType === "HYBRID";
  const isServiceVendor = !vendorType || vendorType === "SERVICE" || vendorType === "HYBRID";
  const showProducts = isProductVendor;
  const showCustomOrders = isProductVendor;
  const showServices = isServiceVendor;
  const showEvents = isServiceVendor;

  // Set default tab based on vendor type once profile loads
  useEffect(() => {
    if (!vendorType) return;
    if (vendorType === "SERVICE") setActiveTab("services");
    else setActiveTab("products");
  }, [vendorType]);

  // Currencies & sub-categories for edit dialogs
  const { data: currencies = [] } = useQuery({
    queryKey: ["currencies"],
    queryFn: () => apiService.getRequest<Currency[]>("/api/currencies"),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiService.getRequest<Category[]>("/api/categories"),
  });

  const { data: allSubCategories = [] } = useQuery({
    queryKey: ["all-subcategories", categories.map((c) => c.id)],
    queryFn: async () => {
      const results = await Promise.all(
        categories.map((cat) =>
          apiService.getRequest<SubCategory[]>(`/api/categories/${cat.id}/sub-categories`)
        )
      );
      return results.flat();
    },
    enabled: categories.length > 0,
  });

  // Fetch change requests by entity type
  const { data: productData, isLoading: productLoading } = useQuery({
    queryKey: ["vendor", "change-requests", "PRODUCT"],
    queryFn: () => vendorChangeRequestService.getMyChangeRequestsByEntityType("PRODUCT", 0, 100),
    enabled: isAuthenticated && isVendor,
  });

  const { data: serviceData, isLoading: serviceLoading } = useQuery({
    queryKey: ["vendor", "change-requests", "SERVICE"],
    queryFn: () => vendorChangeRequestService.getMyChangeRequestsByEntityType("SERVICE", 0, 100),
    enabled: isAuthenticated && isVendor,
  });

  const { data: servicePackageData, isLoading: servicePackageLoading } = useQuery({
    queryKey: ["vendor", "change-requests", "SERVICE_PACKAGE"],
    queryFn: () =>
      vendorChangeRequestService.getMyChangeRequestsByEntityType("SERVICE_PACKAGE", 0, 100),
    enabled: isAuthenticated && isVendor,
  });

  const { data: eventData, isLoading: eventLoading } = useQuery({
    queryKey: ["vendor", "change-requests", "EVENT"],
    queryFn: () => vendorChangeRequestService.getMyChangeRequestsByEntityType("EVENT", 0, 100),
    enabled: isAuthenticated && isVendor,
  });

  // Fetch custom orders for product/hybrid vendors
  const { data: customOrdersData, isLoading: customOrdersLoading } = useQuery({
    queryKey: ["vendor", "custom-orders", "all"],
    queryFn: () => customOrderService.getByVendor(0, 100),
    enabled: isAuthenticated && isVendor && isProductVendor,
  });

  // Fetch products for price fallback (used when a request returns an invalid/unchanged current price)
  const { data: myProductsData = [] } = useQuery({
    queryKey: ["vendor", "my-products", "for-request-price-fallback"],
    queryFn: async () => {
      const response = await vendorService.getMyProducts(0, 100);
      return response.content || [];
    },
    enabled: isAuthenticated && isVendor && isProductVendor,
  });

  // Split by change type
  const productPriceRequests = (productData?.content ?? []).filter(
    (r) => r.requestType === "PRICE_UPDATE"
  );
  const productCategoryRequests = (productData?.content ?? []).filter(
    (r) => r.requestType === "CATEGORY_CHANGE"
  );

  // Service: category at SERVICE level; price at SERVICE_PACKAGE level
  const serviceCategoryRequests = (serviceData?.content ?? []).filter(
    (r) => r.requestType === "CATEGORY_CHANGE"
  );
  const servicePackagePriceRequests = (servicePackageData?.content ?? []).filter(
    (r) => r.requestType === "PRICE_UPDATE"
  );

  const eventPriceRequests = (eventData?.content ?? []).filter(
    (r) => r.requestType === "PRICE_UPDATE"
  );
  const eventCategoryRequests = (eventData?.content ?? []).filter(
    (r) => r.requestType === "CATEGORY_CHANGE"
  );

  // Totals for tab badges
  const productTotal = (productData?.content ?? []).length;
  const serviceTotal =
    (serviceData?.content ?? []).length + (servicePackageData?.content ?? []).length;
  const eventTotal = (eventData?.content ?? []).length;
  const customOrdersTotal = (customOrdersData?.content ?? []).filter(
    (o) => !["DELIVERED", "CANCELLED"].includes(o.status)
  ).length;
  const grandTotal = productTotal + serviceTotal + eventTotal + customOrdersTotal;

  // Mutations
  const editMutation = useMutation({
    mutationFn: ({ requestId, request }: { requestId: number; request: EditChangeRequest }) =>
      vendorChangeRequestService.editChangeRequest(requestId, request),
    onSuccess: () => {
      toast({ title: "Success", description: "Request updated and resubmitted for review." });
      queryClient.invalidateQueries({ queryKey: ["vendor", "change-requests"] });
      setEditPriceOpen(false);
      setEditCategoryOpen(false);
      setSelectedRequest(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update request",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (requestId: number) => vendorChangeRequestService.deleteChangeRequest(requestId),
    onSuccess: () => {
      toast({ title: "Success", description: "Request cancelled." });
      queryClient.invalidateQueries({ queryKey: ["vendor", "change-requests"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel request",
        variant: "destructive",
      });
    },
  });

  // Forms
  const priceForm = useForm<PriceEditForm>({
    resolver: zodResolver(priceEditSchema),
    defaultValues: { currencyCode: "", amount: 0, reason: "" },
  });

  const categoryForm = useForm<CategoryEditForm>({
    resolver: zodResolver(categoryEditSchema),
    defaultValues: { newSubCategoryId: "", reason: "" },
  });

  const openPriceEdit = (request: VendorChangeRequestDto) => {
    setSelectedRequest(request);
    const vp = request.newVendorPrice;
    priceForm.reset({
      currencyCode: vp?.currencyCode || currencies[0]?.code || "ETB",
      amount:
        vp?.amount ??
        vp?.vendorAmount ??
        (vp?.vendorAmountMinor != null ? vp.vendorAmountMinor / 100 : 0),
      reason: request.reason || "",
    });
    setEditPriceOpen(true);
  };

  const openCategoryEdit = (request: VendorChangeRequestDto) => {
    setSelectedRequest(request);
    categoryForm.reset({
      newSubCategoryId: request.newSubCategoryId?.toString() || "",
      reason: request.reason || "",
    });
    setEditCategoryOpen(true);
  };

  const onPriceSubmit = (data: PriceEditForm) => {
    if (!selectedRequest?.id) return;
    editMutation.mutate({
      requestId: selectedRequest.id,
      request: {
        newPrice: { currencyCode: data.currencyCode, amount: data.amount },
        reason: data.reason,
      },
    });
  };

  const onCategorySubmit = (data: CategoryEditForm) => {
    if (!selectedRequest?.id) return;
    editMutation.mutate({
      requestId: selectedRequest.id,
      request: {
        newSubCategoryId: parseInt(data.newSubCategoryId),
        reason: data.reason,
      },
    });
  };

  // Helpers
  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "APPROVED":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "PENDING":
        return (
          <Badge className="bg-amber-100 text-amber-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatPrice = (
    price:
      | { currencyCode?: string; amount?: number; vendorAmount?: number; vendorAmountMinor?: number }
      | undefined
  ) => {
    if (!price) return "N/A";
    const amount =
      price.amount ??
      price.vendorAmount ??
      (price.vendorAmountMinor != null ? price.vendorAmountMinor / 100 : 0);
    return `${price.currencyCode || "ETB"} ${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getPriceAmount = (
    price:
      | { amount?: number; vendorAmount?: number; vendorAmountMinor?: number; unitAmountMinor?: number }
      | undefined
  ) => {
    if (!price) return null;
    return (
      price.vendorAmount ??
      price.amount ??
      (price.vendorAmountMinor != null ? price.vendorAmountMinor / 100 : null) ??
      (price.unitAmountMinor != null ? price.unitAmountMinor / 100 : null)
    );
  };

  const pricesAreSame = (
    a:
      | { currencyCode?: string; amount?: number; vendorAmount?: number; vendorAmountMinor?: number; unitAmountMinor?: number }
      | undefined,
    b:
      | { currencyCode?: string; amount?: number; vendorAmount?: number; vendorAmountMinor?: number; unitAmountMinor?: number }
      | undefined
  ) => {
    const aAmount = getPriceAmount(a);
    const bAmount = getPriceAmount(b);
    if (aAmount == null || bAmount == null) return false;
    const aCurrency = a?.currencyCode || "ETB";
    const bCurrency = b?.currencyCode || "ETB";
    return aCurrency === bCurrency && Math.abs(aAmount - bAmount) < 0.000001;
  };

  const getLiveProductVendorPriceByEntityId = (entityId: number): { currencyCode?: string; vendorAmount?: number; vendorAmountMinor?: number; amount?: number } | undefined => {
    for (const product of myProductsData as any[]) {
      let rawPrice: any = null;

      // Product-level request
      if (product?.id === entityId) {
        const defaultSku = product?.productSku?.find((s: any) => s?.isDefault) || product?.productSku?.[0];
        rawPrice = defaultSku?.price || product?.price;
      }

      // SKU-level request
      if (!rawPrice) {
        const skuMatch = product?.productSku?.find((s: any) => s?.id === entityId);
        if (skuMatch?.price) rawPrice = skuMatch.price;
      }

      if (rawPrice) {
        // Convert raw Price entity to vendor-price PriceDto format
        // The raw price object has vendorAmountMinor (vendor price) and unitAmountMinor (customer price)
        // We must use vendorAmountMinor for the vendor view, NOT unitAmountMinor
        const vendorMinor = rawPrice.vendorAmountMinor ?? rawPrice.vendorAmount;
        const vendorAmount = rawPrice.vendorAmount ?? (rawPrice.vendorAmountMinor != null ? rawPrice.vendorAmountMinor / 100 : null);
        return {
          currencyCode: rawPrice.currencyCode || rawPrice.currency?.code || "ETB",
          vendorAmount: vendorAmount ?? rawPrice.amount ?? (rawPrice.unitAmountMinor != null ? rawPrice.unitAmountMinor / 100 : 0),
          vendorAmountMinor: vendorMinor ?? rawPrice.unitAmountMinor,
        };
      }
    }
    return undefined;
  };

  const resolveCurrentVendorPrice = (request: VendorChangeRequestDto) => {
    if (request.requestType !== "PRICE_UPDATE") return request.currentVendorPrice;

    const current = request.currentVendorPrice;
    const next = request.newVendorPrice;

    // If current is missing or equals requested price, fallback to live product/SKU price.
    if (request.entityType === "PRODUCT" && (!current || pricesAreSame(current, next))) {
      const livePrice = getLiveProductVendorPriceByEntityId(request.entityId);
      return livePrice || current;
    }

    return current;
  };

  // Request card
  const renderRequestCard = (request: VendorChangeRequestDto) => {
    const isPriceUpdate = request.requestType === "PRICE_UPDATE";
    const canEdit = request.status === "PENDING" || request.status === "REJECTED";
    const currentPriceForDisplay = resolveCurrentVendorPrice(request);

    return (
      <div key={request.id} className="border rounded-lg p-4 bg-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {request.entityImageUrl && (
              <img
                src={request.entityImageUrl}
                alt={request.entityName || ""}
                className="h-12 w-12 rounded object-cover flex-shrink-0"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{request.entityName || "—"}</h3>

              {isPriceUpdate ? (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {formatPrice(currentPriceForDisplay)}{" "}
                  <span className="mx-1 text-gray-400">→</span>
                  <span className="font-medium text-primary-blue">
                    {formatPrice(request.newVendorPrice)}
                  </span>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {request.currentSubCategoryName || request.currentCategoryName || "—"}{" "}
                  <span className="mx-1 text-gray-400">→</span>
                  <span className="font-medium text-primary-blue">
                    {request.newSubCategoryName || request.newCategoryName || "—"}
                  </span>
                </p>
              )}

              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {getStatusBadge(request.status)}
                <span className="text-xs text-muted-foreground">
                  {new Date(request.createdAt).toLocaleDateString()}
                </span>
              </div>

              {request.reason && (
                <p className="text-xs text-muted-foreground mt-1 italic">
                  Reason: {request.reason}
                </p>
              )}
            </div>
          </div>

          {canEdit && (
            <div className="flex gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => (isPriceUpdate ? openPriceEdit(request) : openCategoryEdit(request))}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              {request.status === "PENDING" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteMutation.mutate(request.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              )}
            </div>
          )}
        </div>

        {request.rejectionReason && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                <p className="text-sm text-red-700">{request.rejectionReason}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Change-type section
  const renderChangeTypeSection = (
    title: string,
    icon: React.ReactNode,
    requests: VendorChangeRequestDto[],
    isLoading: boolean,
    emptyMessage: string
  ) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b">
        {icon}
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          {title}
        </h3>
        <Badge variant="secondary" className="ml-auto">
          {requests.length}
        </Badge>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-400" />
          <p className="text-sm">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-3">{requests.map(renderRequestCard)}</div>
      )}
    </div>
  );

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (!isAuthenticated || !isVendor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertCircle className="h-16 w-16 text-amber-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-4">You need to be a vendor to access this page.</p>
        <Button asChild>
          <Link to="/vendor-signup">Become a Vendor</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container max-w-5xl mx-auto px-4">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/vendor">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Change Requests</h1>
            <p className="text-muted-foreground">
              Price and category change requests awaiting review ({grandTotal} total)
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex flex-wrap gap-1 h-auto p-1">
            {showProducts && (
              <TabsTrigger value="products" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span>Products</span>
                {productTotal > 0 && (
                  <Badge variant="secondary" className="ml-1">{productTotal}</Badge>
                )}
              </TabsTrigger>
            )}
            {showCustomOrders && (
              <TabsTrigger value="custom-orders" className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                <span>Custom Orders</span>
                {customOrdersTotal > 0 && (
                  <Badge variant="secondary" className="ml-1">{customOrdersTotal}</Badge>
                )}
              </TabsTrigger>
            )}
            {showServices && (
              <TabsTrigger value="services" className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                <span>Services</span>
                {serviceTotal > 0 && (
                  <Badge variant="secondary" className="ml-1">{serviceTotal}</Badge>
                )}
              </TabsTrigger>
            )}
            {showEvents && (
              <TabsTrigger value="events" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Events</span>
                {eventTotal > 0 && (
                  <Badge variant="secondary" className="ml-1">{eventTotal}</Badge>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          {showProducts && (
            <TabsContent value="products">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Product Change Requests
                  </CardTitle>
                  <CardDescription>Price and category change requests for your products</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  {renderChangeTypeSection(
                    "Price Changes",
                    <DollarSign className="h-4 w-4 text-blue-500" />,
                    productPriceRequests,
                    productLoading,
                    "No pending price change requests for products"
                  )}
                  {renderChangeTypeSection(
                    "Category Changes",
                    <FolderTree className="h-4 w-4 text-purple-500" />,
                    productCategoryRequests,
                    productLoading,
                    "No pending category change requests for products"
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {showCustomOrders && (
            <TabsContent value="custom-orders">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5" />
                    Custom Order Requests
                  </CardTitle>
                  <CardDescription>
                    Customer custom order requests awaiting your action
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {customOrdersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (customOrdersData?.content ?? []).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <ShoppingBag className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                      <p className="font-medium">No custom orders yet</p>
                      <p className="text-sm mt-1">Customer custom orders will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(customOrdersData?.content ?? []).map((order: CustomOrder) => {
                        const isActive = !["DELIVERED", "CANCELLED"].includes(order.status);
                        const statusColor: Record<string, string> = {
                          SUBMITTED: "bg-blue-100 text-blue-800",
                          PRICE_PROPOSED: "bg-yellow-100 text-yellow-800",
                          CONFIRMED: "bg-purple-100 text-purple-800",
                          PAID: "bg-green-100 text-green-800",
                          IN_PROGRESS: "bg-indigo-100 text-indigo-800",
                          COMPLETED: "bg-teal-100 text-teal-800",
                          OUT_FOR_DELIVERY: "bg-orange-100 text-orange-800",
                          DELIVERED: "bg-gray-100 text-gray-600",
                          CANCELLED: "bg-red-100 text-red-800",
                        };
                        return (
                          <div
                            key={order.id}
                            className={`border rounded-lg p-4 bg-white ${
                              isActive ? "border-l-4 border-l-primary-blue" : "opacity-70"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm">
                                    #{order.orderNumber}
                                  </span>
                                  <Badge
                                    className={`text-xs ${
                                      statusColor[order.status] ?? "bg-gray-100 text-gray-700"
                                    }`}
                                  >
                                    {order.status.replace(/_/g, " ")}
                                  </Badge>
                                </div>
                                <p className="text-sm font-medium mt-1 truncate">
                                  {order.templateName}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Customer: {order.customerName}
                                </p>
                                {order.finalPrice != null ? (
                                  <p className="text-xs text-muted-foreground">
                                    Price: {order.currencyCode}{" "}
                                    {order.finalPrice.toLocaleString("en-US", {
                                      minimumFractionDigits: 2,
                                    })}
                                  </p>
                                ) : order.basePrice != null ? (
                                  <p className="text-xs text-muted-foreground">
                                    Base price: {order.currencyCode}{" "}
                                    {order.basePrice.toLocaleString("en-US", {
                                      minimumFractionDigits: 2,
                                    })}
                                  </p>
                                ) : null}
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(order.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <Button variant="outline" size="sm" asChild className="flex-shrink-0">
                                <Link to={`/vendor/custom-orders/${order.id}`}>
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Link>
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {showServices && (
            <TabsContent value="services">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    Service Change Requests
                  </CardTitle>
                  <CardDescription>Price and category change requests for your services and packages</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  {renderChangeTypeSection(
                    "Package Price Changes",
                    <DollarSign className="h-4 w-4 text-blue-500" />,
                    servicePackagePriceRequests,
                    servicePackageLoading,
                    "No pending price change requests for service packages"
                  )}
                  {renderChangeTypeSection(
                    "Category Changes",
                    <FolderTree className="h-4 w-4 text-purple-500" />,
                    serviceCategoryRequests,
                    serviceLoading,
                    "No pending category change requests for services"
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {showEvents && (
            <TabsContent value="events">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Event Change Requests
                  </CardTitle>
                  <CardDescription>Ticket price and category change requests for your events</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  {renderChangeTypeSection(
                    "Ticket Price Changes",
                    <Ticket className="h-4 w-4 text-blue-500" />,
                    eventPriceRequests,
                    eventLoading,
                    "No pending ticket price change requests"
                  )}
                  {renderChangeTypeSection(
                    "Category Changes",
                    <FolderTree className="h-4 w-4 text-purple-500" />,
                    eventCategoryRequests,
                    eventLoading,
                    "No pending category change requests for events"
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Edit Price Dialog */}
      <Dialog open={editPriceOpen} onOpenChange={setEditPriceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Price Change Request</DialogTitle>
            <DialogDescription>
              Update your price change request for <strong>{selectedRequest?.entityName}</strong>.
              {selectedRequest?.status === "REJECTED" && (
                <span className="block mt-1 text-amber-600">
                  This request was rejected. Editing will resubmit it for review.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={priceForm.handleSubmit(onPriceSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Currency *</Label>
                <Controller
                  name="currencyCode"
                  control={priceForm.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((c) => (
                          <SelectItem key={c.id} value={c.code}>
                            {c.code} - {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {priceForm.formState.errors.currencyCode && (
                  <p className="text-sm text-red-600 mt-1">{priceForm.formState.errors.currencyCode.message}</p>
                )}
              </div>
              <div>
                <Label>New Price *</Label>
                <Controller
                  name="amount"
                  control={priceForm.control}
                  render={({ field }) => (
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={field.value || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(val === "" ? 0 : Math.round(parseFloat(val) * 100) / 100);
                      }}
                    />
                  )}
                />
                {priceForm.formState.errors.amount && (
                  <p className="text-sm text-red-600 mt-1">{priceForm.formState.errors.amount.message}</p>
                )}
              </div>
            </div>
            <div>
              <Label>Reason for Change</Label>
              <Textarea {...priceForm.register("reason")} placeholder="Explain why you need to change the price..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditPriceOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={editMutation.isPending}>
                {editMutation.isPending ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Submitting...</>
                ) : "Save & Resubmit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={editCategoryOpen} onOpenChange={setEditCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category Change Request</DialogTitle>
            <DialogDescription>
              Update your category change request for <strong>{selectedRequest?.entityName}</strong>.
              {selectedRequest?.status === "REJECTED" && (
                <span className="block mt-1 text-amber-600">
                  This request was rejected. Editing will resubmit it for review.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <span className="font-medium">Current category: </span>
              {selectedRequest.currentSubCategoryName || selectedRequest.currentCategoryName || "N/A"}
            </div>
          )}
          <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className="space-y-4">
            <div>
              <Label>New Category *</Label>
              <Controller
                name="newSubCategoryId"
                control={categoryForm.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {allSubCategories.map((sc) => (
                        <SelectItem key={sc.id} value={sc.id.toString()}>
                          {sc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {categoryForm.formState.errors.newSubCategoryId && (
                <p className="text-sm text-red-600 mt-1">{categoryForm.formState.errors.newSubCategoryId.message}</p>
              )}
            </div>
            <div>
              <Label>Reason for Change</Label>
              <Textarea {...categoryForm.register("reason")} placeholder="Explain why this item should be recategorized..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditCategoryOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={editMutation.isPending}>
                {editMutation.isPending ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Submitting...</>
                ) : "Save & Resubmit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
