import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { vendorService, Product, PriceUpdateRequest, EventResponse, EventPriceUpdateResponse, VendorProfile } from "@/services/vendorService";

const isEthiopianVendor = (vendorProfile: VendorProfile | undefined): boolean => {
  if (!vendorProfile) return false;
  return vendorProfile.countryCode === 'ET';
};
import { apiService } from "@/services/apiService";
import { getProductImageUrl, getEventImageUrl } from "@/utils/imageUtils";
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
} from "lucide-react";

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface SubCategory {
  id: number;
  name: string;
  slug: string;
}

interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
}

const productEditSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  summary: z.string().optional(),
  cover: z.string().optional(),
  subCategoryId: z.string().optional(),
  currencyCode: z.string().min(1, "Currency is required"),
  amount: z.number().min(0.01, "Price must be greater than 0"),
  reason: z.string().optional(),
});

const priceUpdateEditSchema = z.object({
  currencyCode: z.string().min(1, "Currency is required"),
  amount: z.number().min(0.01, "Price must be greater than 0"),
  reason: z.string().optional(),
});

const eventEditSchema = z.object({
  title: z.string().min(1, "Event title is required"),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  venue: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  imageUrl: z.string().optional(),
});

const eventPriceUpdateEditSchema = z.object({
  currencyCode: z.string().min(1, "Currency is required"),
  amount: z.number().min(0.01, "Price must be greater than 0"),
  reason: z.string().optional(),
});

type ProductEditForm = z.infer<typeof productEditSchema>;
type PriceUpdateEditForm = z.infer<typeof priceUpdateEditSchema>;
type EventEditForm = z.infer<typeof eventEditSchema>;
type EventPriceUpdateEditForm = z.infer<typeof eventPriceUpdateEditSchema>;

export default function VendorRequests() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("products");

  const [editProductOpen, setEditProductOpen] = useState(false);
  const [editPriceUpdateOpen, setEditPriceUpdateOpen] = useState(false);
  const [editEventOpen, setEditEventOpen] = useState(false);
  const [editEventPriceOpen, setEditEventPriceOpen] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedPriceUpdate, setSelectedPriceUpdate] = useState<PriceUpdateRequest | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventResponse | null>(null);
  const [selectedEventPriceUpdate, setSelectedEventPriceUpdate] = useState<EventPriceUpdateResponse | null>(null);

  const isVendor = user?.role?.toUpperCase() === 'VENDOR';

  const { data: vendorProfile } = useQuery({
    queryKey: ['vendor', 'profile'],
    queryFn: () => vendorService.getMyProfile(),
    enabled: isAuthenticated && isVendor,
  });

  const { data: currencies = [] } = useQuery({
    queryKey: ['currencies'],
    queryFn: () => apiService.getRequest<Currency[]>('/api/currencies'),
  });

  const availableCurrencies = isEthiopianVendor(vendorProfile)
    ? currencies.filter(c => c.code === 'ETB')
    : currencies;

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiService.getRequest<Category[]>('/api/categories'),
  });

  const { data: allSubCategories = [] } = useQuery({
    queryKey: ['all-subcategories', categories],
    queryFn: async () => {
      const subCategoriesPromises = categories.map((category) =>
        apiService.getRequest<SubCategory[]>(`/api/categories/${category.id}/sub-categories`)
      );
      const results = await Promise.all(subCategoriesPromises);
      return results.flat();
    },
    enabled: categories.length > 0,
  });

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['vendor', 'pending-products', vendorProfile?.id],
    queryFn: () => vendorService.getVendorProducts(vendorProfile!.id, 0, 100),
    enabled: isAuthenticated && isVendor && !!vendorProfile?.id,
  });

  const { data: priceRequestsData, isLoading: priceRequestsLoading } = useQuery({
    queryKey: ['vendor', 'price-requests', vendorProfile?.id],
    queryFn: () => vendorService.getVendorPriceUpdateRequests(vendorProfile!.id, 0, 100),
    enabled: isAuthenticated && isVendor && !!vendorProfile?.id,
  });

  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['vendor', 'events'],
    queryFn: () => vendorService.getMyEvents(undefined, 0, 100),
    enabled: isAuthenticated && isVendor,
  });

  const { data: eventPriceRequestsData, isLoading: eventPriceLoading } = useQuery({
    queryKey: ['vendor', 'event-price-requests'],
    queryFn: () => vendorService.getMyEventPriceUpdateRequests(0, 100),
    enabled: isAuthenticated && isVendor,
  });

  const pendingProducts = (productsData?.content || []).filter(
    (p) => p.status === 'PENDING' || p.status === 'REJECTED'
  );
  const pendingPriceRequests = (priceRequestsData?.content || []).filter(
    (r) => r.status === 'PENDING' || r.status === 'REJECTED'
  );
  const pendingEvents = (eventsData?.content || []).filter(
    (e) => e.status === 'PENDING_APPROVAL' || e.status === 'REJECTED'
  );
  const pendingEventPriceRequests = (eventPriceRequestsData?.content || []).filter(
    (r) => r.status === 'PENDING' || r.status === 'REJECTED'
  );

  const editProductMutation = useMutation({
    mutationFn: (data: { productId: number; product: Partial<Product> }) =>
      vendorService.editPendingProduct(data.productId, data.product as Product),
    onSuccess: () => {
      toast({ title: "Success", description: "Product updated and resubmitted for review." });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'pending-products'] });
      setEditProductOpen(false);
      setSelectedProduct(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update product", variant: "destructive" });
    },
  });

  const editPriceUpdateMutation = useMutation({
    mutationFn: (data: { requestId: number; request: PriceUpdateRequest }) =>
      vendorService.editPriceUpdateRequest(data.requestId, data.request),
    onSuccess: () => {
      toast({ title: "Success", description: "Price update request resubmitted for review." });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'price-requests'] });
      setEditPriceUpdateOpen(false);
      setSelectedPriceUpdate(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update request", variant: "destructive" });
    },
  });

  const editEventMutation = useMutation({
    mutationFn: (data: { eventId: number; event: any }) =>
      vendorService.editPendingEvent(data.eventId, data.event),
    onSuccess: () => {
      toast({ title: "Success", description: "Event updated and resubmitted for review." });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'events'] });
      setEditEventOpen(false);
      setSelectedEvent(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update event", variant: "destructive" });
    },
  });

  const editEventPriceMutation = useMutation({
    mutationFn: (data: { requestId: number; request: any }) =>
      vendorService.editEventPriceUpdateRequest(data.requestId, data.request),
    onSuccess: () => {
      toast({ title: "Success", description: "Event price update request resubmitted for review." });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'event-price-requests'] });
      setEditEventPriceOpen(false);
      setSelectedEventPriceUpdate(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update request", variant: "destructive" });
    },
  });

  const productForm = useForm<ProductEditForm>({
    resolver: zodResolver(productEditSchema),
    defaultValues: {
      name: "",
      description: "",
      summary: "",
      cover: "",
      subCategoryId: "",
      currencyCode: "",
      amount: 0,
    },
  });

  const priceUpdateForm = useForm<PriceUpdateEditForm>({
    resolver: zodResolver(priceUpdateEditSchema),
    defaultValues: {
      currencyCode: "",
      amount: 0,
      reason: "",
    },
  });

  const eventForm = useForm<EventEditForm>({
    resolver: zodResolver(eventEditSchema),
    defaultValues: {
      title: "",
      description: "",
      shortDescription: "",
      venue: "",
      address: "",
      city: "",
      country: "",
      imageUrl: "",
    },
  });

  const eventPriceForm = useForm<EventPriceUpdateEditForm>({
    resolver: zodResolver(eventPriceUpdateEditSchema),
    defaultValues: {
      currencyCode: "",
      amount: 0,
      reason: "",
    },
  });

  const openProductEdit = (product: Product) => {
    setSelectedProduct(product);
    const currencyCode = product.price?.currencyCode || product.price?.prices?.[0]?.currencyCode || currencies[0]?.code || "";
    const amount = product.price?.vendorAmount || product.price?.amount || product.price?.prices?.[0]?.amount || 0;
    productForm.reset({
      name: product.name,
      description: product.description || "",
      summary: product.summary || "",
      cover: product.cover || "",
      subCategoryId: product.subCategoryId?.toString() || "",
      currencyCode,
      amount,
    });
    setEditProductOpen(true);
  };

  const openPriceUpdateEdit = (request: PriceUpdateRequest) => {
    setSelectedPriceUpdate(request);
    const newPrice = request.newPrice?.prices?.[0];
    priceUpdateForm.reset({
      currencyCode: newPrice?.currencyCode || currencies[0]?.code || "",
      amount: newPrice?.amount || 0,
      reason: request.reason || "",
    });
    setEditPriceUpdateOpen(true);
  };

  const openEventEdit = (event: EventResponse) => {
    setSelectedEvent(event);
    eventForm.reset({
      title: event.title,
      description: event.description || "",
      shortDescription: event.shortDescription || "",
      venue: event.venue || "",
      address: event.address || "",
      city: event.city || "",
      country: event.country || "",
      imageUrl: event.imageUrl || "",
    });
    setEditEventOpen(true);
  };

  const openEventPriceEdit = (request: EventPriceUpdateResponse) => {
    setSelectedEventPriceUpdate(request);
    const newPrice = request.newPrice?.prices?.[0];
    eventPriceForm.reset({
      currencyCode: newPrice?.currencyCode || currencies[0]?.code || "",
      amount: newPrice?.amount || 0,
      reason: request.reason || "",
    });
    setEditEventPriceOpen(true);
  };

  const onProductSubmit = (data: ProductEditForm) => {
    if (!selectedProduct?.id) return;
    editProductMutation.mutate({
      productId: selectedProduct.id,
      product: {
        name: data.name,
        description: data.description,
        summary: data.summary,
        cover: data.cover,
        subCategoryId: data.subCategoryId ? parseInt(data.subCategoryId) : undefined,
        price: {
          currencyCode: data.currencyCode,
          amount: data.amount,
        },
      },
    });
  };

  const onPriceUpdateSubmit = (data: PriceUpdateEditForm) => {
    if (!selectedPriceUpdate?.id) return;
    editPriceUpdateMutation.mutate({
      requestId: selectedPriceUpdate.id,
      request: {
        ...selectedPriceUpdate,
        newPrice: {
          prices: [{
            currencyCode: data.currencyCode,
            amount: data.amount,
          }],
        },
        reason: data.reason,
      },
    });
  };

  const onEventSubmit = (data: EventEditForm) => {
    if (!selectedEvent?.id) return;
    editEventMutation.mutate({
      eventId: selectedEvent.id,
      event: data,
    });
  };

  const onEventPriceSubmit = (data: EventPriceUpdateEditForm) => {
    if (!selectedEventPriceUpdate?.id) return;
    editEventPriceMutation.mutate({
      requestId: selectedEventPriceUpdate.id,
      request: {
        ticketTypeId: selectedEventPriceUpdate.ticketTypeId,
        newPrice: {
          prices: [{
            currencyCode: data.currencyCode,
            amount: data.amount,
          }],
        },
        reason: data.reason,
      },
    });
  };

  const getStatusBadge = (status: string) => {
    const upperStatus = status?.toUpperCase();
    switch (upperStatus) {
      case 'ACTIVE':
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'PENDING':
      case 'PENDING_APPROVAL':
        return <Badge className="bg-amber-100 text-amber-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRequestCount = () => {
    return pendingProducts.length + pendingPriceRequests.length + pendingEvents.length + pendingEventPriceRequests.length;
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
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
      <div className="container max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/vendor">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">My Requests</h1>
            <p className="text-muted-foreground">
              Manage your pending and rejected requests ({getRequestCount()} items need attention)
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Products</span>
              {pendingProducts.length > 0 && (
                <Badge variant="secondary" className="ml-1">{pendingProducts.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="product-prices" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Product Prices</span>
              {pendingPriceRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1">{pendingPriceRequests.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Events</span>
              {pendingEvents.length > 0 && (
                <Badge variant="secondary" className="ml-1">{pendingEvents.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="event-prices" className="flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              <span className="hidden sm:inline">Event Prices</span>
              {pendingEventPriceRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1">{pendingEventPriceRequests.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Product Creation Requests Tab */}
          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Product Creation Requests
                </CardTitle>
                <CardDescription>
                  Products pending approval or rejected by admin. Edit and resubmit rejected products.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {productsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : pendingProducts.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-muted-foreground">No pending or rejected products</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingProducts.map((product) => (
                      <div key={product.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <img 
                              src={getProductImageUrl(product.images, product.cover)} 
                              alt={product.name} 
                              className="h-16 w-16 rounded object-cover"
                              onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                            />
                            <div className="h-16 w-16 rounded bg-gray-200 flex items-center justify-center">
                              <Package className="h-8 w-8 text-gray-400" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{product.name}</h3>
                              <p className="text-sm text-muted-foreground">{product.categoryName}</p>
                              <div className="flex items-center gap-2 mt-2">
                                {getStatusBadge(product.status || '')}
                                <span className="text-sm text-muted-foreground">
                                  Created: {new Date(product.createdAt || '').toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => openProductEdit(product)}>
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                        {product.rejectionReason && (
                          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                                <p className="text-sm text-red-700">{product.rejectionReason}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Product Price Update Requests Tab */}
          <TabsContent value="product-prices" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Product Price Update Requests
                </CardTitle>
                <CardDescription>
                  Price change requests pending approval or rejected by admin.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {priceRequestsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : pendingPriceRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-muted-foreground">No pending or rejected price update requests</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingPriceRequests.map((request) => {
                      const currentPrice = request.currentPrice?.prices?.[0];
                      const newPrice = request.newPrice?.prices?.[0];
                      return (
                        <div key={request.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold">{request.productName}</h3>
                              {request.skuCode && (
                                <p className="text-sm text-muted-foreground">SKU: {request.skuCode}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2">
                                <div>
                                  <span className="text-sm text-muted-foreground">Current: </span>
                                  <span className="font-medium">
                                    {currentPrice?.currencyCode} {currentPrice?.amount?.toFixed(2)}
                                  </span>
                                </div>
                                <span className="text-muted-foreground">→</span>
                                <div>
                                  <span className="text-sm text-muted-foreground">New: </span>
                                  <span className="font-medium text-blue-600">
                                    {newPrice?.currencyCode} {newPrice?.amount?.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                {getStatusBadge(request.status || '')}
                                <span className="text-sm text-muted-foreground">
                                  Submitted: {new Date(request.createdAt || '').toLocaleDateString()}
                                </span>
                              </div>
                              {request.reason && (
                                <p className="text-sm text-muted-foreground mt-1">Reason: {request.reason}</p>
                              )}
                            </div>
                            <Button variant="outline" size="sm" onClick={() => openPriceUpdateEdit(request)}>
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </div>
                          {request.rejectionReason && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                                  <p className="text-sm text-red-700">{request.rejectionReason}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Event Creation Requests Tab */}
          <TabsContent value="events" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Event Creation Requests
                </CardTitle>
                <CardDescription>
                  Events pending approval or rejected by admin. Edit and resubmit rejected events.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {eventsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : pendingEvents.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-muted-foreground">No pending or rejected events</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingEvents.map((event) => (
                      <div key={event.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <img 
                              src={getEventImageUrl(event.images, event.imageUrl)} 
                              alt={event.title} 
                              className="h-16 w-24 rounded object-cover"
                              onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                            />
                            <div className="h-16 w-24 rounded bg-gray-200 flex items-center justify-center hidden">
                              <Calendar className="h-8 w-8 text-gray-400" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{event.title}</h3>
                              <p className="text-sm text-muted-foreground">{event.venue}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(event.startDateTime).toLocaleDateString()} - {new Date(event.endDateTime).toLocaleDateString()}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                {getStatusBadge(event.status)}
                              </div>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => openEventEdit(event)}>
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                        {(event as any).rejectionReason && (
                          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                                <p className="text-sm text-red-700">{(event as any).rejectionReason}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Event Price Update Requests Tab */}
          <TabsContent value="event-prices" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="h-5 w-5" />
                  Event Price Update Requests
                </CardTitle>
                <CardDescription>
                  Ticket price change requests pending approval or rejected by admin.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {eventPriceLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : pendingEventPriceRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-muted-foreground">No pending or rejected event price update requests</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingEventPriceRequests.map((request) => {
                      const currentPrice = request.currentPrice?.prices?.[0];
                      const newPrice = request.newPrice?.prices?.[0];
                      return (
                        <div key={request.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold">{request.eventTitle}</h3>
                              <p className="text-sm text-muted-foreground">Ticket Type: {request.ticketTypeName}</p>
                              <div className="flex items-center gap-4 mt-2">
                                <div>
                                  <span className="text-sm text-muted-foreground">Current: </span>
                                  <span className="font-medium">
                                    {currentPrice?.currencyCode} {currentPrice?.amount?.toFixed(2)}
                                  </span>
                                </div>
                                <span className="text-muted-foreground">→</span>
                                <div>
                                  <span className="text-sm text-muted-foreground">New: </span>
                                  <span className="font-medium text-blue-600">
                                    {newPrice?.currencyCode} {newPrice?.amount?.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                {getStatusBadge(request.status)}
                                <span className="text-sm text-muted-foreground">
                                  Submitted: {new Date(request.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              {request.reason && (
                                <p className="text-sm text-muted-foreground mt-1">Reason: {request.reason}</p>
                              )}
                            </div>
                            <Button variant="outline" size="sm" onClick={() => openEventPriceEdit(request)}>
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </div>
                          {request.rejectionReason && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                                  <p className="text-sm text-red-700">{request.rejectionReason}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Product Dialog */}
      <Dialog open={editProductOpen} onOpenChange={setEditProductOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update your product details and resubmit for review.
              {selectedProduct?.status === 'REJECTED' && (
                <span className="block mt-2 text-amber-600">
                  This product was rejected. Editing will resubmit it for approval.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={productForm.handleSubmit(onProductSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">Product Name *</Label>
              <Input id="name" {...productForm.register("name")} />
              {productForm.formState.errors.name && (
                <p className="text-sm text-red-600 mt-1">{productForm.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="summary">Summary</Label>
              <Input id="summary" {...productForm.register("summary")} />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...productForm.register("description")} className="min-h-[100px]" />
            </div>

            <div>
              <Label htmlFor="cover">Cover Image URL</Label>
              <Input id="cover" {...productForm.register("cover")} placeholder="https://..." />
            </div>

            <div>
              <Label>Sub-Category</Label>
              <Controller
                name="subCategoryId"
                control={productForm.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a sub-category" />
                    </SelectTrigger>
                    <SelectContent>
                      {allSubCategories.map((subCategory) => (
                        <SelectItem key={subCategory.id} value={subCategory.id.toString()}>
                          {subCategory.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Currency *</Label>
                <Controller
                  name="currencyCode"
                  control={productForm.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.id} value={currency.code}>
                            {currency.code} - {currency.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <Label>Your Price *</Label>
                <Controller
                  name="amount"
                  control={productForm.control}
                  render={({ field }) => (
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={field.value || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                          field.onChange(0);
                        } else {
                          const numValue = parseFloat(value);
                          field.onChange(Math.round(numValue * 100) / 100);
                        }
                      }}
                    />
                  )}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This is what you'll receive. Platform fee will be added for customers.
                </p>
                {productForm.formState.errors.amount && (
                  <p className="text-sm text-red-600 mt-1">{productForm.formState.errors.amount.message}</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditProductOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editProductMutation.isPending}>
                {editProductMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Save & Resubmit'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Price Update Request Dialog */}
      <Dialog open={editPriceUpdateOpen} onOpenChange={setEditPriceUpdateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Price Update Request</DialogTitle>
            <DialogDescription>
              Update the price change request for {selectedPriceUpdate?.productName}.
              {selectedPriceUpdate?.status === 'REJECTED' && (
                <span className="block mt-2 text-amber-600">
                  This request was rejected. Editing will resubmit it for approval.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={priceUpdateForm.handleSubmit(onPriceUpdateSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Currency *</Label>
                <Controller
                  name="currencyCode"
                  control={priceUpdateForm.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.id} value={currency.code}>
                            {currency.code} - {currency.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <Label>New Price *</Label>
                <Controller
                  name="amount"
                  control={priceUpdateForm.control}
                  render={({ field }) => (
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={field.value || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                          field.onChange(0);
                        } else {
                          const numValue = parseFloat(value);
                          field.onChange(Math.round(numValue * 100) / 100);
                        }
                      }}
                    />
                  )}
                />
                {priceUpdateForm.formState.errors.amount && (
                  <p className="text-sm text-red-600 mt-1">{priceUpdateForm.formState.errors.amount.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="reason">Reason for Price Change</Label>
              <Textarea id="reason" {...priceUpdateForm.register("reason")} placeholder="Explain why you need to change the price..." />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditPriceUpdateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editPriceUpdateMutation.isPending}>
                {editPriceUpdateMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Save & Resubmit'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={editEventOpen} onOpenChange={setEditEventOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>
              Update your event details and resubmit for review.
              {selectedEvent?.status === 'REJECTED' && (
                <span className="block mt-2 text-amber-600">
                  This event was rejected. Editing will resubmit it for approval.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={eventForm.handleSubmit(onEventSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="title">Event Title *</Label>
              <Input id="title" {...eventForm.register("title")} />
              {eventForm.formState.errors.title && (
                <p className="text-sm text-red-600 mt-1">{eventForm.formState.errors.title.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="shortDescription">Short Description</Label>
              <Input id="shortDescription" {...eventForm.register("shortDescription")} />
            </div>

            <div>
              <Label htmlFor="description">Full Description</Label>
              <Textarea id="description" {...eventForm.register("description")} className="min-h-[100px]" />
            </div>

            <div>
              <Label htmlFor="venue">Venue</Label>
              <Input id="venue" {...eventForm.register("venue")} />
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...eventForm.register("address")} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" {...eventForm.register("city")} />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input id="country" {...eventForm.register("country")} />
              </div>
            </div>

            <div>
              <Label htmlFor="imageUrl">Event Image URL</Label>
              <Input id="imageUrl" {...eventForm.register("imageUrl")} placeholder="https://..." />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditEventOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editEventMutation.isPending}>
                {editEventMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Save & Resubmit'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Event Price Update Dialog */}
      <Dialog open={editEventPriceOpen} onOpenChange={setEditEventPriceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Event Price Update Request</DialogTitle>
            <DialogDescription>
              Update the ticket price change request for {selectedEventPriceUpdate?.ticketTypeName}.
              {selectedEventPriceUpdate?.status === 'REJECTED' && (
                <span className="block mt-2 text-amber-600">
                  This request was rejected. Editing will resubmit it for approval.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={eventPriceForm.handleSubmit(onEventPriceSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Currency *</Label>
                <Controller
                  name="currencyCode"
                  control={eventPriceForm.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
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
                  )}
                />
                {isEthiopianVendor(vendorProfile) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Ethiopian vendors can only use ETB currency
                  </p>
                )}
              </div>
              <div>
                <Label>New Price *</Label>
                <Controller
                  name="amount"
                  control={eventPriceForm.control}
                  render={({ field }) => (
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={field.value || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                          field.onChange(0);
                        } else {
                          const numValue = parseFloat(value);
                          field.onChange(Math.round(numValue * 100) / 100);
                        }
                      }}
                    />
                  )}
                />
                {eventPriceForm.formState.errors.amount && (
                  <p className="text-sm text-red-600 mt-1">{eventPriceForm.formState.errors.amount.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="reason">Reason for Price Change</Label>
              <Textarea id="reason" {...eventPriceForm.register("reason")} placeholder="Explain why you need to change the ticket price..." />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditEventPriceOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editEventPriceMutation.isPending}>
                {editEventPriceMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Save & Resubmit'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
