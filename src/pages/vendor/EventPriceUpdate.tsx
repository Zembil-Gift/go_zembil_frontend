import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { vendorService, VendorProfile, TicketType } from "@/services/vendorService";
import { apiService } from "@/services/apiService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  Ticket,
  AlertCircle,
  DollarSign,
  RefreshCw,
  Info,
  Calendar
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  ticketTypeId: z.number(),
  ticketTypeName: z.string(),
  currencyCode: z.string().min(1, "Currency is required"),
  vendorAmount: z.number().min(0, "Vendor price must be 0 or greater"),
  reason: z.string().optional(),
});

type PriceUpdateFormData = z.infer<typeof priceUpdateSchema>;

export default function EventPriceUpdate() {
  const { id } = useParams<{ id: string }>();
  const eventId = id ? parseInt(id, 10) : null;

  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const isVendor = user?.role?.toUpperCase() === 'VENDOR';

  const [selectedTicketType, setSelectedTicketType] = useState<TicketType | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch event data
  const { data: event, isLoading: eventLoading, error: eventError } = useQuery({
    queryKey: ['vendor', 'event', eventId],
    queryFn: () => vendorService.getMyEvent(eventId!),
    enabled: !!eventId && isAuthenticated && isVendor,
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
      ticketTypeId: 0,
      ticketTypeName: "",
      currencyCode: "",
      vendorAmount: 0,
      reason: "",
    },
  });

  // Check if vendor owns this event
  // For events, vendorId is the Vendor entity ID, so compare with vendorProfile.id
  const isEventOwner = event && vendorProfile && event.vendorId === vendorProfile.id;

  // Price update mutation
  const priceUpdateMutation = useMutation({
    mutationFn: async (data: PriceUpdateFormData) => {
      if (!eventId) throw new Error("Event ID is required");

      // Convert vendor amount to major units (what vendor receives)
      // Backend will calculate customer price with commission
      const request = {
        ticketTypeId: data.ticketTypeId,
        newPrice: data.vendorAmount, // Vendor's price in major units (e.g., 100.00)
        newCurrency: data.currencyCode,
        reason: data.reason || "Price update requested",
      };

      return vendorService.requestEventPriceUpdate(request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor'] });
      toast({
        title: "Price Update Requested",
        description: "Your ticket price update request has been submitted for admin approval.",
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

  const openPriceDialog = (ticketType: TicketType) => {
    setSelectedTicketType(ticketType);
    // Backend returns vendorPriceMinor (in cents) - convert to major units for display
    // Fall back to priceMinor if vendorPriceMinor is not available
    const vendorAmountMajor = ticketType.vendorPriceMinor 
      ? ticketType.vendorPriceMinor / 100 
      : (ticketType.priceMinor ? ticketType.priceMinor / 100 / (1 + PLATFORM_COMMISSION_RATE) : 0);
    form.reset({
      ticketTypeId: ticketType.id,
      ticketTypeName: ticketType.name,
      currencyCode: ticketType.currency || availableCurrencies[0]?.code || "USD",
      vendorAmount: Math.round(vendorAmountMajor * 100) / 100, // Round to 2 decimal places
      reason: "",
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: PriceUpdateFormData) => {
    priceUpdateMutation.mutate(data);
  };

  const getTicketCurrentPrice = (ticketType: TicketType) => {
    // Backend returns priceMinor (customer price in cents) and currency directly
    if (!ticketType.currency || ticketType.priceMinor === undefined) return "No price set";
    const amountInMajor = ticketType.priceMinor / 100;
    const currency = currencies.find(c => c.code === ticketType.currency);
    return `${currency?.symbol || ticketType.currency} ${amountInMajor.toFixed(2)}`;
  };

  const getTicketVendorPrice = (ticketType: TicketType) => {
    // Backend returns vendorPriceMinor (vendor's price in cents)
    if (!ticketType.currency) return "No price set";
    const currency = currencies.find(c => c.code === ticketType.currency);
    const symbol = currency?.symbol || ticketType.currency;
    
    // Use vendorPriceMinor if available, otherwise calculate from priceMinor
    let vendorAmount: number;
    if (ticketType.vendorPriceMinor !== undefined) {
      vendorAmount = ticketType.vendorPriceMinor / 100;
    } else if (ticketType.priceMinor !== undefined) {
      // Calculate vendor price by removing commission
      vendorAmount = (ticketType.priceMinor / 100) / (1 + PLATFORM_COMMISSION_RATE);
    } else {
      return "No price set";
    }
    
    return `${symbol} ${vendorAmount.toFixed(2)}`;
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

  if (eventLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-ethiopian-gold" />
        </div>
      </div>
    );
  }

  if (eventError || !event) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load event. The event may not exist or you may not have permission to view it.
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

  if (!isEventOwner) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unauthorized</AlertTitle>
          <AlertDescription>
            You can only update prices for your own events.
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

  const ticketTypes = event.ticketTypes || [];

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/vendor">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Update Ticket Prices</h1>
          <p className="text-muted-foreground">{event.title}</p>
        </div>
      </div>

      {/* Event Info */}
      <Card className="mb-6">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="h-16 w-24 bg-gray-100 rounded flex items-center justify-center">
            <Calendar className="h-8 w-8 text-gray-400" />
          </div>
          <div>
            <h3 className="font-medium">{event.title}</h3>
            <p className="text-sm text-muted-foreground">{event.location}</p>
            <p className="text-sm text-muted-foreground">
              {new Date(event.eventDate).toLocaleDateString()}
            </p>
          </div>
          <div className="ml-auto">
            <Badge variant={event.status === 'ACTIVE' ? 'default' : 'secondary'}>
              {event.status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Price Update Process</AlertTitle>
        <AlertDescription>
          Ticket price updates require admin approval. Once you submit a price change request,
          it will be reviewed by an administrator before taking effect.
        </AlertDescription>
      </Alert>

      {/* Ticket Types List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Ticket Types
          </CardTitle>
          <CardDescription>
            Select a ticket type to request a price update
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ticketTypes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No ticket types found for this event.
            </div>
          ) : (
            <div className="space-y-4">
              {ticketTypes.map((ticketType: TicketType, index: number) => (
                <div
                  key={ticketType.id || index}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-gray-100 rounded flex items-center justify-center">
                      <Ticket className="h-6 w-6 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium">{ticketType.name}</p>
                      {ticketType.description && (
                        <p className="text-sm text-muted-foreground">{ticketType.description}</p>
                      )}
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          Capacity: {ticketType.capacity}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Sold: {ticketType.soldCount || 0}
                        </Badge>
                        <Badge variant={ticketType.isActive ? "default" : "secondary"} className="text-xs">
                          {ticketType.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Your Price</p>
                      <p className="font-semibold text-green-600">{getTicketVendorPrice(ticketType)}</p>
                      <p className="text-xs text-muted-foreground">Customer: {getTicketCurrentPrice(ticketType)}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openPriceDialog(ticketType)}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Ticket Price Update</DialogTitle>
            <DialogDescription>
              Submit a new price for "{selectedTicketType?.name}". This change requires admin approval.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Current Vendor Price</Label>
                <p className="text-lg font-semibold text-green-600">
                  {selectedTicketType && getTicketVendorPrice(selectedTicketType)}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Current Customer Price</Label>
                <p className="text-lg font-semibold">
                  {selectedTicketType && getTicketCurrentPrice(selectedTicketType)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                  min="0"
                  {...form.register("vendorAmount", { valueAsNumber: true })}
                />
                {form.formState.errors.vendorAmount && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.vendorAmount.message}
                  </p>
                )}
              </div>
            </div>

            {/* Show calculated customer price */}
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">Customer Price (with {(PLATFORM_COMMISSION_RATE * 100).toFixed(0)}% platform fee)</p>
                  <p className="text-xs text-muted-foreground">This is what customers will pay</p>
                </div>
                <p className="text-lg font-bold">
                  {(() => {
                    const vendorAmount = form.watch("vendorAmount") || 0;
                    const customerAmount = vendorAmount * (1 + PLATFORM_COMMISSION_RATE);
                    const currency = currencies.find(c => c.code === form.watch("currencyCode"));
                    return `${currency?.symbol || form.watch("currencyCode") || ""} ${customerAmount.toFixed(2)}`;
                  })()}
                </p>
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={priceUpdateMutation.isPending}>
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
