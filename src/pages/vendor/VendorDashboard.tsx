import { useState } from "react";
import { useQuery, useMutation, useQueryClient, QueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { vendorService, VendorProfile, Product, PriceUpdateRequest, EventResponse, EventPriceUpdateResponse, VendorRevenue } from "@/services/vendorService";
import { apiService } from "@/services/apiService";
import { imageService, ImageDto } from "@/services/imageService";
import { getProductImageUrl, getEventImageUrl } from "@/utils/imageUtils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ImageUpload";
import { TicketScanner } from "@/components/vendor/TicketScanner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Store,
  Package,
  Calendar,
  CreditCard,
  Plus,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Ticket,
  BarChart3,
  ExternalLink,
  RefreshCw,
  Edit,
  AlertTriangle,
  ImageIcon,
  Trash2,
  ScanLine,
  Eye,
  Layers,
  RotateCcw,
  XCircle,
} from "lucide-react";

// Helper function to check if vendor is Ethiopian
const isEthiopianVendor = (vendorProfile: VendorProfile | undefined): boolean => {
  if (!vendorProfile) return false;
  return vendorProfile.countryCode === 'ET';
};

export default function VendorDashboardNew() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  // Check if user is a vendor
  const isVendor = user?.role?.toUpperCase() === 'VENDOR';

  // Fetch vendor profile
  const { data: vendorProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['vendor', 'profile'],
    queryFn: () => vendorService.getMyProfile(),
    enabled: isAuthenticated && isVendor,
  });

  // Fetch onboarding status
  const { data: onboardingStatus } = useQuery({
    queryKey: ['vendor', 'onboarding-status'],
    queryFn: () => vendorService.getOnboardingStatus(),
    enabled: isAuthenticated && isVendor,
  });

  // Fetch vendor summary
  const { data: vendorSummary } = useQuery({
    queryKey: ['vendor', 'summary'],
    queryFn: () => vendorService.getVendorSummary(),
    enabled: isAuthenticated && isVendor,
  });

  // Fetch vendor revenue (with tax/VAT considerations)
  const { data: vendorRevenue } = useQuery({
    queryKey: ['vendor', 'revenue'],
    queryFn: () => vendorService.getVendorRevenue(),
    enabled: isAuthenticated && isVendor,
  });

  // Fetch vendor products
  const { data: productsData } = useQuery({
    queryKey: ['vendor', 'my-products'],
    queryFn: () => vendorService.getMyProducts(),
    enabled: isAuthenticated && isVendor,
  });

  // Fetch vendor events
  const { data: eventsData } = useQuery({
    queryKey: ['vendor', 'events'],
    queryFn: () => vendorService.getMyEvents(),
    enabled: isAuthenticated && isVendor,
  });

  // Stripe onboarding mutation
  const stripeOnboardingMutation = useMutation({
    mutationFn: () => vendorService.startStripeOnboarding(
      `${window.location.origin}/vendor/onboarding/refresh`,
      `${window.location.origin}/vendor/onboarding/return`
    ),
    onSuccess: (data) => {
      if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl;
      } else {
        toast({ title: "Stripe onboarding started", description: data.message });
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Stripe dashboard mutation
  const stripeDashboardMutation = useMutation({
    mutationFn: () => vendorService.getStripeDashboard(),
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, '_blank');
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // State for cancel/deactivate dialogs
  const [cancelEventDialog, setCancelEventDialog] = useState<{ open: boolean; eventId: number | null; eventTitle: string }>({
    open: false, eventId: null, eventTitle: ''
  });
  const [cancelReason, setCancelReason] = useState('');
  const [deactivateProductDialog, setDeactivateProductDialog] = useState<{ open: boolean; productId: number | null; productName: string }>({
    open: false, productId: null, productName: ''
  });

  // Product deactivation mutation
  const deactivateProductMutation = useMutation({
    mutationFn: (productId: number) => vendorService.deactivateProduct(productId),
    onSuccess: () => {
      toast({ title: "Product deactivated", description: "Your product has been deactivated and is no longer visible to customers." });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'my-products'] });
      setDeactivateProductDialog({ open: false, productId: null, productName: '' });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Product reactivation mutation
  const reactivateProductMutation = useMutation({
    mutationFn: (productId: number) => vendorService.reactivateProduct(productId),
    onSuccess: () => {
      toast({ title: "Product reactivated", description: "Your product is now active and visible to customers." });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'my-products'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Event cancellation mutation
  const cancelEventMutation = useMutation({
    mutationFn: ({ eventId, reason }: { eventId: number; reason: string }) => 
      vendorService.cancelEvent(eventId, reason),
    onSuccess: () => {
      toast({ title: "Event cancelled", description: "Your event has been cancelled." });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'events'] });
      setCancelEventDialog({ open: false, eventId: null, eventTitle: '' });
      setCancelReason('');
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Event reactivation mutation
  const reactivateEventMutation = useMutation({
    mutationFn: (eventId: number) => vendorService.reactivateEvent(eventId),
    onSuccess: () => {
      toast({ title: "Event reactivated", description: "Your event has been reactivated and is now visible." });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'events'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (authLoading || profileLoading) {
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
        <p className="text-gray-600 mb-4">You need to be a vendor to access this dashboard.</p>
        <Button asChild>
          <Link to="/vendor-signup">Become a Vendor</Link>
        </Button>
      </div>
    );
  }

  const products = productsData?.content || [];
  const events = eventsData?.content || [];

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
      case 'APPROVED':
      case 'ENABLED':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'PENDING':
      case 'PENDING_APPROVAL':
        return <Badge className="bg-amber-100 text-amber-800">Pending</Badge>;
      case 'REJECTED':
      case 'DISABLED':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case 'DRAFT':
        return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
      case 'INACTIVE':
        return <Badge className="bg-slate-100 text-slate-800">Inactive</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-eagle-green text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Store className="h-10 w-10" />
              <div>
                <h1 className="text-2xl font-bold">{vendorProfile?.businessName || 'Vendor Dashboard'}</h1>
                <p className="text-emerald-100">Manage your products, events, and payments</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {vendorProfile?.isApproved ? (
                <Badge className="bg-green-500 text-white">Approved</Badge>
              ) : (
                <Badge className="bg-amber-500 text-white">Pending Approval</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Products</span>
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Events</span>
            </TabsTrigger>
            <TabsTrigger value="check-in" className="flex items-center gap-2">
              <ScanLine className="h-4 w-4" />
              <span className="hidden sm:inline">Check-In</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Payments</span>
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Requests</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{products.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {products.filter(p => p.status === 'ACTIVE').length} active
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{vendorSummary?.totalEvents || events.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {vendorSummary?.activeEvents || events.filter(e => e.status === 'ACTIVE').length} active
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
                  <Ticket className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{vendorSummary?.totalTicketsSold || 0}</div>
                  <p className="text-xs text-muted-foreground">All time</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {vendorRevenue?.currencySymbol || '$'}{vendorRevenue?.totalRevenue?.toFixed(2) || '0.00'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {vendorRevenue?.totalOrderCount || 0} orders • {vendorRevenue?.currencyCode || 'USD'}
                  </p>
                  {vendorRevenue?.isVatRegistered && vendorRevenue?.vatIncluded > 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      Includes {vendorRevenue.currencySymbol}{vendorRevenue.vatIncluded.toFixed(2)} VAT (pass-through)
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Payment Status Alert */}
            {onboardingStatus && !onboardingStatus.canReceivePayments && (
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-800">
                    <AlertCircle className="h-5 w-5" />
                    Payment Setup Required
                  </CardTitle>
                  <CardDescription className="text-amber-700">
                    Set up your payment accounts to receive payouts from sales.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => setActiveTab('payments')} variant="outline" className="border-amber-600 text-amber-700">
                    Set Up Payments
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Button asChild variant="outline" className="h-20 flex-col">
                  <Link to="/vendor/products/new">
                    <Plus className="h-6 w-6 mb-2" />
                    <span>Add Product</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-20 flex-col">
                  <Link to="/vendor/events/new">
                    <Calendar className="h-6 w-6 mb-2" />
                    <span>Create Event</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-20 flex-col" onClick={() => setActiveTab('requests')}>
                  <Clock className="h-6 w-6 mb-2" />
                  <span>My Requests</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col" onClick={() => setActiveTab('requests')}>
                  <DollarSign className="h-6 w-6 mb-2" />
                  <span>Price Update</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col" onClick={() => setActiveTab('payments')}>
                  <CreditCard className="h-6 w-6 mb-2" />
                  <span>Payment Setup</span>
                </Button>
              </CardContent>
            </Card>

            {/* Recent Products */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Products</CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/vendor/products">View All</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {products.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No products yet. Create your first product!</p>
                ) : (
                  <div className="space-y-4">
                    {products.slice(0, 5).map((product) => (
                      <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <img 
                            src={getProductImageUrl(product.images, product.cover)} 
                            alt={product.name} 
                            className="h-12 w-12 rounded object-cover"
                            onError={(e) => { e.currentTarget.classList.add('hidden'); const fallback = e.currentTarget.nextElementSibling; if (fallback) fallback.classList.remove('hidden'); }}
                          />
                          <div className="h-12 w-12 rounded bg-gray-200 hidden items-center justify-center">
                            <Package className="h-6 w-6 text-gray-400" />
                          </div>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-muted-foreground">{product.categoryName}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(product.status || '')}
                          <Button asChild variant="ghost" size="sm">
                            <Link to={`/vendor/products/${product.id}/edit`}>Edit</Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">My Products</h2>
              <Button asChild>
                <Link to="/vendor/products/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Link>
              </Button>
            </div>

            {products.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No products yet</h3>
                  <p className="text-muted-foreground mb-4">Start by creating your first product</p>
                  <Button asChild>
                    <Link to="/vendor/products/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Product
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {products.map((product) => (
                  <Card key={product.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center space-x-4">
                        <img 
                          src={getProductImageUrl(product.images, product.cover)} 
                          alt={product.name} 
                          className="h-16 w-16 rounded object-cover"
                          onError={(e) => { e.currentTarget.classList.add('hidden'); const fallback = e.currentTarget.nextElementSibling; if (fallback) fallback.classList.remove('hidden'); }}
                        />
                        <div className="h-16 w-16 rounded bg-gray-200 hidden items-center justify-center">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                        <div>
                          <h3 className="font-medium">{product.name}</h3>
                          <p className="text-sm text-muted-foreground">{product.categoryName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {getStatusBadge(product.status || '')}
                            {product.rejectionReason && (
                              <span className="text-xs text-red-600">Reason: {product.rejectionReason}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/vendor/products/${product.id}/edit`}>Edit</Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/vendor/products/${product.id}/price`}>Update Price</Link>
                        </Button>
                        {product.status?.toUpperCase() === 'INACTIVE' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => reactivateProductMutation.mutate(product.id!)}
                            disabled={reactivateProductMutation.isPending}
                            className="text-green-600 hover:text-green-700"
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Reactivate
                          </Button>
                        ) : ['ACTIVE', 'PENDING'].includes(product.status?.toUpperCase() || '') ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeactivateProductDialog({ 
                              open: true, 
                              productId: product.id!, 
                              productName: product.name || ''
                            })}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Deactivate
                          </Button>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">My Events</h2>
              <Button asChild>
                <Link to="/vendor/events/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Event
                </Link>
              </Button>
            </div>

            {events.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No events yet</h3>
                  <p className="text-muted-foreground mb-4">Start by creating your first event</p>
                  <Button asChild>
                    <Link to="/vendor/events/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Event
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {events.map((event) => (
                  <Card key={event.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center space-x-4">
                        <img 
                          src={getEventImageUrl(event.images, event.bannerImageUrl)} 
                          alt={event.title} 
                          className="h-16 w-24 rounded object-cover"
                          onError={(e) => { e.currentTarget.classList.add('hidden'); const fallback = e.currentTarget.nextElementSibling; if (fallback) fallback.classList.remove('hidden'); }}
                        />
                        <div className="h-16 w-24 rounded bg-gray-200 hidden items-center justify-center">
                          <Calendar className="h-8 w-8 text-gray-400" />
                        </div>
                        <div>
                          <h3 className="font-medium">{event.title}</h3>
                          <p className="text-sm text-muted-foreground">{event.location}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(event.eventDate).toLocaleDateString()}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {getStatusBadge(event.status)}
                            <span className="text-xs text-muted-foreground">
                              {event.totalSold || 0}/{event.totalCapacity || 0} sold
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/vendor/events/${event.id}/edit`}>
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/vendor/events/${event.id}/price`}>Update Price</Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/vendor/events/${event.id}/analytics`}>Analytics</Link>
                        </Button>
                        {event.status?.toUpperCase() === 'CANCELLED' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => reactivateEventMutation.mutate(event.id)}
                            disabled={reactivateEventMutation.isPending}
                            className="text-green-600 hover:text-green-700"
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Reactivate
                          </Button>
                        ) : event.status?.toUpperCase() === 'APPROVED' || event.status?.toUpperCase() === 'PENDING_APPROVAL' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCancelEventDialog({ 
                              open: true, 
                              eventId: event.id, 
                              eventTitle: event.title 
                            })}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Check-In Tab */}
          <TabsContent value="check-in" className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Ticket Check-In</h2>
                <p className="text-muted-foreground">
                  Validate and check in attendees at your events
                </p>
              </div>
            </div>
            <TicketScanner />
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-6">
            <h2 className="text-xl font-semibold">Payment Setup</h2>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Stripe Setup - Only show for non-Ethiopian vendors */}
              {!isEthiopianVendor(vendorProfile) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Stripe Connect
                  </CardTitle>
                  <CardDescription>
                    Accept international payments via Stripe
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Status:</span>
                    {getStatusBadge(onboardingStatus?.stripeStatus || 'NOT_STARTED')}
                  </div>
                  {onboardingStatus?.stripeAccountId && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Account ID:</span>
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs">{onboardingStatus.stripeAccountId}</code>
                    </div>
                  )}
                  <Separator />
                  <div className="flex gap-2">
                    {!onboardingStatus?.stripeEnabled ? (
                      <Button
                        onClick={() => stripeOnboardingMutation.mutate()}
                        disabled={stripeOnboardingMutation.isPending}
                        className="flex-1"
                      >
                        {stripeOnboardingMutation.isPending ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4 mr-2" />
                        )}
                        {onboardingStatus?.stripeStatus === 'NOT_STARTED' ? 'Start Setup' : 'Continue Setup'}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => stripeDashboardMutation.mutate()}
                        disabled={stripeDashboardMutation.isPending}
                        variant="outline"
                        className="flex-1"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Stripe Dashboard
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
              )}

              {/* Chapa Setup */}
              <Card className={isEthiopianVendor(vendorProfile) ? "md:col-span-1" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Chapa (Ethiopian Birr)
                  </CardTitle>
                  <CardDescription>
                    Accept ETB payments via Chapa
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Status:</span>
                    {getStatusBadge(onboardingStatus?.chapaStatus || 'NOT_STARTED')}
                  </div>
                  {onboardingStatus?.chapaSubaccountId && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Subaccount ID:</span>
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs">{onboardingStatus.chapaSubaccountId}</code>
                    </div>
                  )}
                  <Separator />
                  <Button asChild variant={onboardingStatus?.chapaEnabled ? 'outline' : 'default'} className="w-full">
                    <Link to="/vendor/payments/chapa">
                      {onboardingStatus?.chapaEnabled ? 'Manage Chapa' : 'Set Up Chapa'}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Payment Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Payout Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  {onboardingStatus?.canReceivePayments ? (
                    <>
                      <CheckCircle className="h-8 w-8 text-green-500" />
                      <div>
                        <p className="font-medium text-green-700">You can receive payments!</p>
                        <p className="text-sm text-muted-foreground">
                          Your payment setup is complete. Funds will be transferred to your connected accounts.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-8 w-8 text-amber-500" />
                      <div>
                        <p className="font-medium text-amber-700">Payment setup incomplete</p>
                        <p className="text-sm text-muted-foreground">
                          Complete your Stripe or Chapa setup to receive payouts from your sales.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Requests Tab */}
          <TabsContent value="requests" className="space-y-6">
            <RequestsManagement
              vendorProfile={vendorProfile}
              getStatusBadge={getStatusBadge}
              queryClient={queryClient}
            />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <VendorSettings vendorProfile={vendorProfile} queryClient={queryClient} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Deactivate Product Dialog */}
      <AlertDialog open={deactivateProductDialog.open} onOpenChange={(open) => {
        if (!open && !deactivateProductMutation.isPending) {
          setDeactivateProductDialog({ open: false, productId: null, productName: '' });
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate "{deactivateProductDialog.productName}"? 
              This will hide the product from customers. You can reactivate it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deactivateProductMutation.isPending}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => {
                if (deactivateProductDialog.productId) {
                  deactivateProductMutation.mutate(deactivateProductDialog.productId);
                }
              }}
              disabled={deactivateProductMutation.isPending}
            >
              {deactivateProductMutation.isPending ? 'Deactivating...' : 'Deactivate'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Event Dialog */}
      <Dialog open={cancelEventDialog.open} onOpenChange={(open) => {
        if (!open) {
          setCancelEventDialog({ open: false, eventId: null, eventTitle: '' });
          setCancelReason('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel "{cancelEventDialog.eventTitle}"? 
              Please provide a reason for cancellation.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="cancel-reason">Cancellation Reason</Label>
            <Textarea
              id="cancel-reason"
              placeholder="Enter the reason for cancelling this event..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="mt-2"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCancelEventDialog({ open: false, eventId: null, eventTitle: '' });
              setCancelReason('');
            }}>
              Go Back
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (cancelEventDialog.eventId && cancelReason.trim()) {
                  cancelEventMutation.mutate({ eventId: cancelEventDialog.eventId, reason: cancelReason });
                }
              }}
              disabled={!cancelReason.trim() || cancelEventMutation.isPending}
            >
              {cancelEventMutation.isPending ? 'Cancelling...' : 'Cancel Event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Requests Management Component
interface RequestsManagementProps {
  vendorProfile: VendorProfile | undefined;
  getStatusBadge: (status: string) => JSX.Element;
  queryClient: QueryClient;
}

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

const productSkuEditSchema = z.object({
  id: z.number().optional(),
  skuCode: z.string().min(1, "SKU code is required"),
  stockQuantity: z.number().min(0, "Stock cannot be negative"),
  currencyCode: z.string().min(1, "Currency is required"),
  amount: z.number().min(0.01, "Price must be greater than 0"),
  attributes: z.array(z.object({
    id: z.number().optional(),
    name: z.string().min(1, "Attribute name is required"),
    value: z.string().min(1, "Attribute value is required"),
  })).optional(),
});

const productEditSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  summary: z.string().optional(),
  subCategoryId: z.string().optional(),
  tags: z.string().optional(),
  occasion: z.string().optional(),
  productSku: z.array(productSkuEditSchema).min(1, "At least one SKU is required"),
});

const priceUpdateEditSchema = z.object({
  currencyCode: z.string().min(1, "Currency is required"),
  amount: z.number().min(0.01, "Price must be greater than 0"),
  reason: z.string().optional(),
});

const ticketTypeEditSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Ticket name is required"),
  description: z.string().optional(),
  capacity: z.number().min(1, "Capacity must be at least 1"),
  currencyCode: z.string().min(1, "Currency is required"),
  amount: z.number().min(0, "Price must be 0 or greater"),
});

const eventEditSchema = z.object({
  title: z.string().min(1, "Event title is required"),
  description: z.string().optional(),
  location: z.string().optional(),
  city: z.string().optional(),
  organizerContact: z.string().optional(),
  bannerImageUrl: z.string().optional(),
  eventDate: z.string().optional(),
  eventEndDate: z.string().optional(),
  eventTypeId: z.string().optional(),
  ticketTypes: z.array(ticketTypeEditSchema).min(1, "At least one ticket type is required"),
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

function RequestsManagement({ vendorProfile, getStatusBadge, queryClient }: RequestsManagementProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("products");

  // Edit dialog states
  const [editProductOpen, setEditProductOpen] = useState(false);
  const [editPriceUpdateOpen, setEditPriceUpdateOpen] = useState(false);
  const [editEventOpen, setEditEventOpen] = useState(false);
  const [editEventPriceOpen, setEditEventPriceOpen] = useState(false);

  // Selected items
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedPriceUpdate, setSelectedPriceUpdate] = useState<PriceUpdateRequest | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventResponse | null>(null);
  const [selectedEventPriceUpdate, setSelectedEventPriceUpdate] = useState<EventPriceUpdateResponse | null>(null);

  // Image management for events
  const [pendingEventImages, setPendingEventImages] = useState<File[]>([]);
  const [isUploadingEventImages, setIsUploadingEventImages] = useState(false);
  const [currentEventImages, setCurrentEventImages] = useState<ImageDto[]>([]);

  // Image management for products - SKU images only (keyed by SKU index)
  const [pendingSkuImages, setPendingSkuImages] = useState<Record<number, File[]>>({});
  const [currentSkuImages, setCurrentSkuImages] = useState<Record<number, ImageDto[]>>({});
  const [isUploadingProductImages, setIsUploadingProductImages] = useState(false);

  // Fetch pending/rejected items using /me/ endpoints (authenticated vendor)
  const { data: pendingProductsData, isLoading: loadingProducts } = useQuery({
    queryKey: ['vendor', 'pending-rejected-products'],
    queryFn: () => vendorService.getMyPendingRejectedProducts(0, 100),
  });

  const { data: pendingPriceRequestsData, isLoading: loadingPriceRequests } = useQuery({
    queryKey: ['vendor', 'pending-rejected-price-requests'],
    queryFn: () => vendorService.getMyPendingRejectedPriceRequests(0, 100),
  });

  const { data: pendingEventsData, isLoading: loadingEvents } = useQuery({
    queryKey: ['vendor', 'pending-rejected-events'],
    queryFn: () => vendorService.getMyPendingRejectedEvents(0, 100),
  });

  const { data: pendingEventPriceRequestsData, isLoading: loadingEventPrices } = useQuery({
    queryKey: ['vendor', 'pending-rejected-event-price-requests'],
    queryFn: () => vendorService.getMyPendingRejectedEventPriceRequests(0, 100),
  });

  // Fetch currencies
  const { data: currencies = [] } = useQuery({
    queryKey: ['currencies'],
    queryFn: () => apiService.getRequest<Currency[]>('/api/currencies'),
  });

  // Filter currencies based on vendor country - Ethiopian vendors can only use ETB
  const availableCurrencies = isEthiopianVendor(vendorProfile)
    ? currencies.filter(c => c.code === 'ETB')
    : currencies;

  // Fetch categories
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

  // Get actual pending/rejected items from the dedicated endpoints
  const pendingProducts = pendingProductsData?.content || [];
  const pendingPriceRequests = pendingPriceRequestsData?.content || [];
  const pendingEvents = pendingEventsData?.content || [];
  const pendingEventPriceRequests = pendingEventPriceRequestsData?.content || [];

  // Mutations
  const editProductMutation = useMutation({
    mutationFn: (data: { productId: number; product: Partial<Product> }) =>
      vendorService.editPendingProduct(data.productId, data.product as Product),
    onSuccess: () => {
      toast({ title: "Success", description: "Product updated and resubmitted for review. Status reset to PENDING." });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'pending-rejected-products'] });
      setEditProductOpen(false);
      setSelectedProduct(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.response?.data?.message || error.message || "Failed to update product", 
        variant: "destructive" 
      });
    },
  });

  const editPriceUpdateMutation = useMutation({
    mutationFn: (data: { requestId: number; request: PriceUpdateRequest }) =>
      vendorService.editPriceUpdateRequest(data.requestId, data.request),
    onSuccess: () => {
      toast({ title: "Success", description: "Price update request resubmitted for review. Status reset to PENDING." });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'price-requests'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'pending-rejected-price-requests'] });
      setEditPriceUpdateOpen(false);
      setSelectedPriceUpdate(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.response?.data?.message || error.message || "Failed to update request", 
        variant: "destructive" 
      });
    },
  });

  // Remove the old editEventMutation since we're handling it directly in onEventSubmit

  const editEventPriceMutation = useMutation({
    mutationFn: (data: { requestId: number; request: any }) =>
      vendorService.editEventPriceUpdateRequest(data.requestId, data.request),
    onSuccess: () => {
      toast({ title: "Success", description: "Event price update request resubmitted for review. Status reset to PENDING." });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'event-price-requests'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'pending-rejected-event-price-requests'] });
      setEditEventPriceOpen(false);
      setSelectedEventPriceUpdate(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.response?.data?.message || error.message || "Failed to update request", 
        variant: "destructive" 
      });
    },
  });

  // Forms
  const productForm = useForm<ProductEditForm>({
    resolver: zodResolver(productEditSchema),
    defaultValues: {
      name: "",
      description: "",
      summary: "",
      subCategoryId: "",
      tags: "",
      occasion: "",
      productSku: [{
        skuCode: "",
        stockQuantity: 0,
        currencyCode: "",
        amount: 0,
        attributes: [],
      }],
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
      location: "",
      city: "",
      organizerContact: "",
      bannerImageUrl: "",
      eventDate: "",
      eventEndDate: "",
      eventTypeId: "",
      ticketTypes: [],
    },
  });

  const { fields: eventTicketFields, append: appendEventTicket, remove: removeEventTicket } = useFieldArray({
    control: eventForm.control,
    name: "ticketTypes",
  });

  const { fields: productSkuFields, append: appendProductSku, remove: removeProductSku } = useFieldArray({
    control: productForm.control,
    name: "productSku",
  });

  const eventPriceForm = useForm<EventPriceUpdateEditForm>({
    resolver: zodResolver(eventPriceUpdateEditSchema),
    defaultValues: {
      currencyCode: "",
      amount: 0,
      reason: "",
    },
  });

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

  const openEventPriceEdit = (request: EventPriceUpdateResponse) => {
    setSelectedEventPriceUpdate(request);
    // Convert from minor units (cents/santim) to decimal for form
    const amountDecimal = request.newPriceMinor / 100;
    eventPriceForm.reset({
      currencyCode: request.newCurrencyCode || currencies[0]?.code || "",
      amount: amountDecimal,
      reason: request.reason || "",
    });
    setEditEventPriceOpen(true);
  };

  // Submit handlers
  const onProductSubmit = async (data: ProductEditForm) => {
    if (!selectedProduct?.id) return;
    
    // Validate that each SKU has at least one image (current or pending)
    for (let i = 0; i < data.productSku.length; i++) {
      const currentImages = currentSkuImages[i] || [];
      const pendingImages = pendingSkuImages[i] || [];
      const totalImages = currentImages.length + pendingImages.length;
      
      if (totalImages === 0) {
        toast({
          title: "Image Required",
          description: `Please upload at least one image for ${data.productSku.length === 1 ? 'your product' : `variant #${i + 1} (${data.productSku[i].skuCode || 'unnamed'})`}.`,
          variant: "destructive",
        });
        return;
      }
    }
    
    try {
      // Update basic product details with SKU data
      await editProductMutation.mutateAsync({
        productId: selectedProduct.id,
        product: {
          name: data.name,
          description: data.description,
          summary: data.summary,
          subCategoryId: data.subCategoryId ? parseInt(data.subCategoryId) : undefined,
          tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(t => t) : undefined,
          occasion: data.occasion,
          productSku: data.productSku.map((sku, index) => ({
            id: sku.id,
            skuCode: sku.skuCode,
            stockQuantity: sku.stockQuantity,
            isDefault: index === 0, // First SKU is default
            price: {
              currencyCode: sku.currencyCode,
              amount: sku.amount,
            },
            attributes: sku.attributes?.filter(attr => attr.name && attr.value) || [],
          })),
        },
      });
      
      // Upload SKU images if any pending
      const hasAnyPendingImages = Object.values(pendingSkuImages).some(images => images.length > 0);
      if (hasAnyPendingImages && selectedProduct.productSku) {
        setIsUploadingProductImages(true);
        try {
          for (const [skuIndexStr, images] of Object.entries(pendingSkuImages)) {
            const skuIndex = parseInt(skuIndexStr, 10);
            const sku = selectedProduct.productSku[skuIndex];
            
            if (images.length > 0 && sku?.id) {
              await imageService.uploadSkuImages(sku.id, images);
            }
          }
        } catch (imageError) {
          console.error("Failed to upload SKU images:", imageError);
          toast({
            title: "Warning",
            description: "Product updated but some images failed to upload.",
            variant: "destructive",
          });
        } finally {
          setIsUploadingProductImages(false);
        }
      }
      
      // Clear image states
      setPendingSkuImages({});
      setCurrentSkuImages({});
      
    } catch (error: any) {
      setIsUploadingProductImages(false);
      // Error is already handled by the mutation
    }
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

  const onEventSubmit = async (data: EventEditForm) => {
    if (!selectedEvent?.id) return;
    
    // Validate that at least one event image exists (current or pending)
    const totalImages = currentEventImages.length + pendingEventImages.length;
    if (totalImages === 0) {
      toast({
        title: "Image Required",
        description: "Please upload at least one event image before saving.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Update basic event details
      const eventPayload = {
        title: data.title,
        description: data.description,
        location: data.location,
        city: data.city,
        organizerContact: data.organizerContact,
        bannerImageUrl: data.bannerImageUrl,
        eventDate: data.eventDate,
        eventEndDate: data.eventEndDate,
        eventTypeId: data.eventTypeId ? parseInt(data.eventTypeId) : undefined,
      };
      
      await vendorService.editPendingOrRejectedEvent(selectedEvent.id, eventPayload);
      
      // Handle ticket type updates and price change requests
      for (const ticketType of data.ticketTypes) {
        if (ticketType.id) {
          // Existing ticket type - check if price changed
          const originalTicket = selectedEvent.ticketTypes?.find(tt => tt.id === ticketType.id);
          const originalPrice = originalTicket?.price?.prices?.[0];
          
          if (originalPrice && (originalPrice.amount !== ticketType.amount || originalPrice.currencyCode !== ticketType.currencyCode)) {
            // Price changed - submit price update request
            await vendorService.requestEventPriceUpdate({
              ticketTypeId: ticketType.id,
              newPrice: {
                prices: [{
                  currencyCode: ticketType.currencyCode,
                  amount: ticketType.amount,
                }],
              },
              reason: "Price update via event edit",
            });
          }
          
          // Update other ticket type details (non-price fields)
          await vendorService.updateTicketType(ticketType.id, {
            name: ticketType.name,
            description: ticketType.description,
            capacity: ticketType.capacity,
          });
        } else {
          // New ticket type
          await vendorService.addTicketType(selectedEvent.id, {
            name: ticketType.name,
            description: ticketType.description,
            capacity: ticketType.capacity,
            price: ticketType.amount,
            currency: ticketType.currencyCode,
          });
        }
      }
      
      // Upload images if any pending
      if (pendingEventImages.length > 0) {
        setIsUploadingEventImages(true);
        try {
          await imageService.uploadEventImages(selectedEvent.id, pendingEventImages);
        } catch (imageError) {
          console.error("Failed to upload event images:", imageError);
          toast({
            title: "Warning",
            description: "Event updated but some images failed to upload.",
            variant: "destructive",
          });
        } finally {
          setIsUploadingEventImages(false);
        }
      }
      
      toast({ 
        title: "Success", 
        description: "Event updated and resubmitted for review. Price changes require admin approval." 
      });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'events'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'pending-rejected-events'] });
      setEditEventOpen(false);
      setSelectedEvent(null);
      setPendingEventImages([]);
      setCurrentEventImages([]);
      
    } catch (error: any) {
      setIsUploadingEventImages(false);
      toast({ 
        title: "Error", 
        description: error.response?.data?.message || error.message || "Failed to update event", 
        variant: "destructive" 
      });
    }
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

  const getRequestCount = () => {
    return pendingProducts.length + pendingPriceRequests.length + pendingEvents.length + pendingEventPriceRequests.length;
  };

  const isLoading = loadingProducts || loadingPriceRequests || loadingEvents || loadingEventPrices;
  const hasNoRequests = !isLoading && getRequestCount() === 0;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">All Requests</h2>
          <p className="text-sm text-muted-foreground">
            {isLoading ? (
              "Loading requests..."
            ) : (
              `${getRequestCount()} pending or rejected items need attention`
            )}
          </p>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading your requests...</p>
          </CardContent>
        </Card>
      ) : hasNoRequests ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              You have no pending or rejected items at the moment. All your submissions are either approved or you haven't made any yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
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
              {loadingProducts ? (
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
                            onError={(e) => { e.currentTarget.classList.add('hidden'); const fallback = e.currentTarget.nextElementSibling; if (fallback) fallback.classList.remove('hidden'); }}
                          />
                          <div className="h-16 w-16 rounded bg-gray-200 hidden items-center justify-center">
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
                        <div className="flex items-center space-x-2">
                          <Button asChild variant="outline" size="sm">
                            <Link to={`/products/${product.id}`}>
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Link>
                          </Button>
                          <Button asChild variant="outline" size="sm">
                            <Link to={`/vendor/products/${product.id}/edit`}>
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Link>
                          </Button>
                        </div>
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
              {loadingPriceRequests ? (
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
              {loadingEvents ? (
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
                            src={getEventImageUrl(event.images, event.bannerImageUrl)} 
                            alt={event.title} 
                            className="h-16 w-24 rounded object-cover"
                            onError={(e) => { e.currentTarget.classList.add('hidden'); const fallback = e.currentTarget.nextElementSibling; if (fallback) fallback.classList.remove('hidden'); }}
                          />
                          <div className="h-16 w-24 rounded bg-gray-200 hidden items-center justify-center">
                            <Calendar className="h-8 w-8 text-gray-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{event.title}</h3>
                            <p className="text-sm text-muted-foreground">{event.location}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(event.eventDate).toLocaleDateString()}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              {getStatusBadge(event.status)}
                            </div>
                          </div>
                        </div>
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/vendor/events/${event.id}/edit`}>
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Link>
                        </Button>
                      </div>
                      {event.rejectionReason && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                              <p className="text-sm text-red-700">{event.rejectionReason}</p>
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
              {loadingEventPrices ? (
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
                    // Backend returns prices in minor units (cents/santim)
                    const currentPriceDisplay = (request.currentPriceMinor / 100).toFixed(2);
                    const newPriceDisplay = (request.newPriceMinor / 100).toFixed(2);
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
                                  {request.currentCurrencyCode} {currentPriceDisplay}
                                </span>
                              </div>
                              <span className="text-muted-foreground">→</span>
                              <div>
                                <span className="text-sm text-muted-foreground">New: </span>
                                <span className="font-medium text-blue-600">
                                  {request.newCurrencyCode} {newPriceDisplay}
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
      )}

      {/* Edit Product Dialog */}
      <Dialog open={editProductOpen} onOpenChange={setEditProductOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
          <form onSubmit={productForm.handleSubmit(onProductSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Product Name *</Label>
                <Input id="name" {...productForm.register("name")} placeholder="Enter product name" />
                {productForm.formState.errors.name && (
                  <p className="text-sm text-red-600 mt-1">{productForm.formState.errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="summary">Short Summary</Label>
                <Input id="summary" {...productForm.register("summary")} placeholder="Brief product summary" />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" {...productForm.register("description")} className="min-h-[100px]" placeholder="Detailed product description" />
              </div>
            </div>

            {/* Category & Tags */}
            <div className="space-y-4">
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

              <div>
                <Label htmlFor="occasion">Occasion</Label>
                <Input id="occasion" {...productForm.register("occasion")} placeholder="e.g., Birthday, Wedding, Christmas" />
              </div>

              <div>
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <Input id="tags" {...productForm.register("tags")} placeholder="gift, premium, handmade" />
              </div>
            </div>

            {/* Product SKUs */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  <Label className="text-base font-medium">Product Variants (SKUs) *</Label>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendProductSku({
                    skuCode: "",
                    stockQuantity: 0,
                    currencyCode: isEthiopianVendor(vendorProfile) ? "ETB" : (availableCurrencies[0]?.code || ""),
                    amount: 0,
                    attributes: [],
                  })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Variant
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Manage stock and pricing for your product. Add multiple variants if you have different sizes, colors, etc.
              </p>

              <div className="space-y-4">
                {productSkuFields.map((field, skuIndex) => {
                  const attributes = productForm.watch(`productSku.${skuIndex}.attributes`) || [];
                  return (
                    <Card key={field.id} className="border-2">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">
                            {productSkuFields.length === 1 ? "Product SKU" : `Variant #${skuIndex + 1}`}
                          </CardTitle>
                          {productSkuFields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeProductSku(skuIndex)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* SKU Code and Stock */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>SKU Code *</Label>
                            <Input
                              placeholder={productSkuFields.length === 1 ? "e.g., PROD-001" : "e.g., SHIRT-RED-M"}
                              {...productForm.register(`productSku.${skuIndex}.skuCode`)}
                            />
                            {productForm.formState.errors.productSku?.[skuIndex]?.skuCode && (
                              <p className="text-sm text-red-600 mt-1">
                                {productForm.formState.errors.productSku[skuIndex]?.skuCode?.message}
                              </p>
                            )}
                          </div>
                          <div>
                            <Label>Stock Quantity *</Label>
                            <Controller
                              name={`productSku.${skuIndex}.stockQuantity`}
                              control={productForm.control}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={field.value || ''}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === '') {
                                      field.onChange(0);
                                    } else {
                                      field.onChange(parseInt(value, 10));
                                    }
                                  }}
                                  onBlur={field.onBlur}
                                />
                              )}
                            />
                          </div>
                        </div>

                        {/* SKU Price */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Currency *</Label>
                            <Controller
                              name={`productSku.${skuIndex}.currencyCode`}
                              control={productForm.control}
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
                          </div>
                          <div>
                            <Label>Your Price *</Label>
                            <Controller
                              name={`productSku.${skuIndex}.amount`}
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
                                      if (!isNaN(numValue)) {
                                        // Round to 2 decimal places using Math.round to avoid floating point errors
                                        field.onChange(Math.round(numValue * 100) / 100);
                                      }
                                    }
                                  }}
                                />
                              )}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              This is what you'll receive. Platform fee will be added for customers.
                            </p>
                          </div>
                        </div>

                        {/* Attributes */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Attributes (Size, Color, etc.)</Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const currentAttributes = productForm.getValues(`productSku.${skuIndex}.attributes`) || [];
                                productForm.setValue(`productSku.${skuIndex}.attributes`, [
                                  ...currentAttributes,
                                  { name: "", value: "" },
                                ]);
                              }}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Attribute
                            </Button>
                          </div>
                          {attributes.map((_, attrIndex) => (
                            <div key={attrIndex} className="flex gap-2 items-end">
                              <div className="flex-1">
                                <Input
                                  placeholder="Name (e.g., Color)"
                                  {...productForm.register(`productSku.${skuIndex}.attributes.${attrIndex}.name`)}
                                />
                              </div>
                              <div className="flex-1">
                                <Input
                                  placeholder="Value (e.g., Red)"
                                  {...productForm.register(`productSku.${skuIndex}.attributes.${attrIndex}.value`)}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const currentAttributes = productForm.getValues(`productSku.${skuIndex}.attributes`) || [];
                                  productForm.setValue(
                                    `productSku.${skuIndex}.attributes`,
                                    currentAttributes.filter((_, i) => i !== attrIndex)
                                  );
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        {/* SKU Images */}
                        <div className="space-y-3 border-t pt-4">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="h-4 w-4" />
                            <Label className="text-sm font-medium">Images *</Label>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Upload images for this {productSkuFields.length === 1 ? 'product' : 'variant'}. First image will be the cover.
                          </p>
                          <ImageUpload
                            images={currentSkuImages[skuIndex] || []}
                            onFilesSelected={(files) => {
                              setPendingSkuImages(prev => ({
                                ...prev,
                                [skuIndex]: [...(prev[skuIndex] || []), ...files],
                              }));
                            }}
                            maxImages={10}
                            isUploading={isUploadingProductImages}
                            disabled={editProductMutation.isPending}
                            label=""
                            helperText={`Upload images for this ${productSkuFields.length === 1 ? 'product' : 'variant'}.`}
                          />
                          {pendingSkuImages[skuIndex] && pendingSkuImages[skuIndex].length > 0 && (
                            <p className="text-sm text-muted-foreground">
                              {pendingSkuImages[skuIndex].length} new image(s) will be uploaded
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditProductOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editProductMutation.isPending || isUploadingProductImages}>
                {editProductMutation.isPending || isUploadingProductImages ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    {isUploadingProductImages ? 'Uploading Images...' : 'Submitting...'}
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
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.id} value={currency.code}>
                            {currency.code}
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
                      value={field.value || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                          field.onChange(0);
                        } else {
                          // Use Math.round to avoid floating-point precision issues
                          const numValue = parseFloat(value);
                          if (!isNaN(numValue)) {
                            field.onChange(Math.round(numValue * 100) / 100);
                          }
                        }
                      }}
                    />
                  )}
                />
              </div>
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea {...priceUpdateForm.register("reason")} placeholder="Explain the price change..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditPriceUpdateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={editPriceUpdateMutation.isPending}>
                {editPriceUpdateMutation.isPending ? 'Submitting...' : 'Save & Resubmit'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={editEventOpen} onOpenChange={setEditEventOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>
              Update your event details, images, and ticket types. Price changes require admin approval.
              {selectedEvent?.status === 'REJECTED' && (
                <span className="block mt-2 text-amber-600">
                  This event was rejected. Editing will resubmit it for approval.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={eventForm.handleSubmit(onEventSubmit)} className="space-y-6">
            {/* Basic Event Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Event Title *</Label>
                <Input {...eventForm.register("title")} />
                {eventForm.formState.errors.title && (
                  <p className="text-sm text-red-600 mt-1">{eventForm.formState.errors.title.message}</p>
                )}
              </div>
              <div>
                <Label>City</Label>
                <Input {...eventForm.register("city")} placeholder="Event city" />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea {...eventForm.register("description")} className="min-h-[100px]" placeholder="Event description" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Location/Venue</Label>
                <Input {...eventForm.register("location")} placeholder="Event venue" />
              </div>
              <div>
                <Label>Organizer Contact</Label>
                <Input {...eventForm.register("organizerContact")} placeholder="Contact information" />
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Start Date/Time</Label>
                <Input type="datetime-local" {...eventForm.register("eventDate")} />
              </div>
              <div>
                <Label>End Date/Time</Label>
                <Input type="datetime-local" {...eventForm.register("eventEndDate")} />
              </div>
            </div>

            {/* Category */}
            <div>
              <Label>Category</Label>
              <Controller
                name="eventTypeId"
                control={eventForm.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Event Images */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <ImageIcon className="h-4 w-4" />
                <Label className="text-base font-medium">Event Images</Label>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Upload up to 10 images for your event. The first image will be the primary/cover image.
              </p>
              <ImageUpload
                images={currentEventImages}
                onFilesSelected={(files) => {
                  setPendingEventImages(prev => [...prev, ...files]);
                }}
                maxImages={10}
                isUploading={isUploadingEventImages}
                disabled={false}
                label=""
                helperText="Drag and drop images here, or click to select."
              />
              {pendingEventImages.length > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  {pendingEventImages.length} new image(s) will be uploaded when you save the event
                </p>
              )}
            </div>

            {/* Ticket Types */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Ticket className="h-4 w-4" />
                  <Label className="text-base font-medium">Ticket Types *</Label>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    appendEventTicket({
                      name: "",
                      description: "",
                      capacity: 50,
                      currencyCode: isEthiopianVendor(vendorProfile) ? "ETB" : (availableCurrencies[0]?.code || "USD"),
                      amount: 0,
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Ticket Type
                </Button>
              </div>

              <div className="space-y-4">
                {eventTicketFields.map((ticketField, ticketIndex) => (
                  <div key={ticketField.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Ticket Type {ticketIndex + 1}</h4>
                      {eventTicketFields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEventTicket(ticketIndex)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Name *</Label>
                        <Input
                          placeholder="e.g., General Admission, VIP"
                          {...eventForm.register(`ticketTypes.${ticketIndex}.name`)}
                        />
                      </div>
                      <div>
                        <Label>Capacity *</Label>
                        <Input
                          type="number"
                          min="1"
                          placeholder="100"
                          {...eventForm.register(`ticketTypes.${ticketIndex}.capacity`, { valueAsNumber: true })}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Description</Label>
                      <Input
                        placeholder="What's included with this ticket"
                        {...eventForm.register(`ticketTypes.${ticketIndex}.description`)}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Currency *</Label>
                        <Controller
                          name={`ticketTypes.${ticketIndex}.currencyCode`}
                          control={eventForm.control}
                          render={({ field }) => (
                            <Select 
                              value={field.value} 
                              onValueChange={field.onChange}
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
                          )}
                        />
                      </div>
                      <div>
                        <Label className="flex items-center gap-2">
                          Price *
                          <DollarSign className="h-3 w-3 text-amber-500" />
                          <span className="text-xs text-amber-600">Changes need approval</span>
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          {...eventForm.register(`ticketTypes.${ticketIndex}.amount`, { valueAsNumber: true })}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {eventForm.formState.errors.ticketTypes && (
                <p className="text-sm text-red-600 mt-2">{eventForm.formState.errors.ticketTypes.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditEventOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUploadingEventImages}>
                {isUploadingEventImages ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Uploading Images...
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
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {currencies.map((c) => <SelectItem key={c.id} value={c.code}>{c.code}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
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
                      value={field.value || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                          field.onChange(0);
                        } else {
                          // Use Math.round to avoid floating-point precision issues
                          const numValue = parseFloat(value);
                          if (!isNaN(numValue)) {
                            field.onChange(Math.round(numValue * 100) / 100);
                          }
                        }
                      }}
                    />
                  )}
                />
              </div>
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea {...eventPriceForm.register("reason")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditEventPriceOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={editEventPriceMutation.isPending}>
                {editEventPriceMutation.isPending ? 'Submitting...' : 'Save & Resubmit'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Vendor Settings Component
interface VendorSettingsProps {
  vendorProfile: VendorProfile | undefined;
  queryClient: QueryClient;
}

function VendorSettings({ vendorProfile, queryClient }: VendorSettingsProps) {
  const { toast } = useToast();
  const [pendingLogo, setPendingLogo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Upload logo mutation
  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!vendorProfile?.id) throw new Error("Vendor profile not found");
      return imageService.uploadVendorLogo(vendorProfile.id, file);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Logo uploaded successfully" });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'profile'] });
      setPendingLogo(null);
      setPreviewUrl(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to upload logo", 
        variant: "destructive" 
      });
    },
  });

  // Delete logo mutation
  const deleteLogoMutation = useMutation({
    mutationFn: async () => {
      if (!vendorProfile?.id) throw new Error("Vendor profile not found");
      return imageService.deleteVendorLogo(vendorProfile.id);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Logo deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'profile'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete logo", 
        variant: "destructive" 
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Error", description: "File size must be less than 5MB", variant: "destructive" });
        return;
      }
      setPendingLogo(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = () => {
    if (pendingLogo) {
      setIsUploading(true);
      uploadLogoMutation.mutate(pendingLogo, {
        onSettled: () => setIsUploading(false),
      });
    }
  };

  const handleCancelUpload = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPendingLogo(null);
    setPreviewUrl(null);
  };

  const handleDeleteLogo = () => {
    if (confirm("Are you sure you want to delete your business logo?")) {
      deleteLogoMutation.mutate();
    }
  };

  const currentLogoUrl = vendorProfile?.logoUrl;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold">Business Settings</h2>

      {/* Business Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Business Logo
          </CardTitle>
          <CardDescription>
            Upload your business logo. This will be displayed on your vendor profile and products.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Logo or Preview */}
          <div className="flex flex-col lg:flex-row items-start gap-6">
            <div className="flex-shrink-0 mx-auto lg:mx-0">
              {previewUrl ? (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Logo preview"
                    className="w-32 h-32 object-cover rounded-lg border-2 border-dashed border-primary"
                  />
                  <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                    Preview
                  </span>
                </div>
              ) : currentLogoUrl ? (
                <img
                  src={currentLogoUrl}
                  alt="Business logo"
                  className="w-32 h-32 object-cover rounded-lg border"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              {!previewUrl && !currentLogoUrl && (
                <div className="w-32 h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                  <Store className="h-12 w-12 text-gray-400" />
                </div>
              )}
              {!previewUrl && currentLogoUrl && (
                <div className="w-32 h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 items-center justify-center hidden">
                  <Store className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </div>

            <div className="flex-1 w-full lg:w-auto space-y-4">
              {pendingLogo ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Selected: <span className="font-medium">{pendingLogo.name}</span>
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={handleUpload}
                      disabled={isUploading || uploadLogoMutation.isPending}
                      className="w-full sm:w-auto"
                    >
                      {isUploading ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Upload Logo
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={handleCancelUpload} className="w-full sm:w-auto">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="logo-upload" className="cursor-pointer">
                    <div className="inline-flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50 transition-colors">
                      <Plus className="h-4 w-4" />
                      {currentLogoUrl ? 'Change Logo' : 'Upload Logo'}
                    </div>
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleFileSelect}
                      className="hidden"
                      aria-label="Upload logo image"
                    />
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Accepted formats: JPEG, PNG, GIF, WebP. Max size: 5MB.
                  </p>
                  {currentLogoUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive w-full sm:w-auto"
                      onClick={handleDeleteLogo}
                      disabled={deleteLogoMutation.isPending}
                    >
                      {deleteLogoMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Delete Logo
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Information (Read-only for now) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Business Information
          </CardTitle>
          <CardDescription>
            Your business details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div>
              <Label className="text-muted-foreground">Business Name</Label>
              <p className="font-medium">{vendorProfile?.businessName || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Business Email</Label>
              <p className="font-medium">{vendorProfile?.businessEmail || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Business Phone</Label>
              <p className="font-medium">{vendorProfile?.businessPhone || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Contact Name</Label>
              <p className="font-medium">{vendorProfile?.contactName || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">City</Label>
              <p className="font-medium">{vendorProfile?.city || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Country</Label>
              <p className="font-medium">{vendorProfile?.country || '-'}</p>
            </div>
          </div>
          {vendorProfile?.description && (
            <div className="mt-4">
              <Label className="text-muted-foreground">Description</Label>
              <p className="text-sm mt-1">{vendorProfile.description}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
