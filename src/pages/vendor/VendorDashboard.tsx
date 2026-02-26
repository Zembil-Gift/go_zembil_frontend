import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient, QueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { vendorService, VendorProfile, Product, PriceUpdateRequest, EventResponse, EventPriceUpdateResponse, ServicePriceUpdateRequest, CategoryChangeRequest, ServiceCategoryChangeRequest } from "@/services/vendorService";
import { apiService } from "@/services/apiService";
import { imageService, ImageDto } from "@/services/imageService";
import { certificateService } from "@/services/certificateService";
import { getProductImageUrl, getEventImageUrl } from "@/utils/imageUtils";
import { serviceOrderService, ServiceOrderResponse } from "@/services/serviceOrderService";
import { serviceService, ServiceResponse } from "@/services/serviceService";
import { customOrderTemplateService } from "@/services/customOrderTemplateService";
import { customOrderService } from "@/services/customOrderService";
import type { CustomOrder, CustomOrderTemplate, PagedCustomOrderTemplateResponse, PagedCustomOrderResponse } from "@/types/customOrders";
import { RejectionReasonWithModal } from "@/components/RejectionReasonModal";
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
import { TagInput } from "@/components/TagInput";
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
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Briefcase,
  X,
  Award,
  Download,
  Loader2,
  ShoppingBag,
  User,
  MessageSquare,
  LogOut,
  Menu,
  ChevronRight,
} from "lucide-react";

// Helper function to check if vendor is Ethiopian
const isEthiopianVendor = (vendorProfile: VendorProfile | undefined): boolean => {
  if (!vendorProfile) return false;
  return vendorProfile.countryCode === 'ET';
};

export default function VendorDashboardNew() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/signin');
  };

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

  // Fetch vendor service orders
  const { data: serviceOrdersData } = useQuery({
    queryKey: ['vendor', 'service-orders'],
    queryFn: () => serviceOrderService.getVendorOrders(0, 100),
    enabled: isAuthenticated && isVendor,
  });

  // Fetch vendor services
  const { data: servicesData } = useQuery({
    queryKey: ['vendor', 'services'],
    queryFn: () => serviceService.getMyServices(undefined, 0, 100),
    enabled: isAuthenticated && isVendor,
  });

  // Fetch vendor custom templates
  const { data: customTemplatesData } = useQuery<PagedCustomOrderTemplateResponse>({
    queryKey: ['vendor', 'custom-templates', vendorProfile?.id],
    queryFn: async (): Promise<PagedCustomOrderTemplateResponse> => {
      if (!vendorProfile?.id) {
        return { content: [], totalElements: 0, totalPages: 0, size: 100, number: 0, first: true, last: true, empty: true };
      }
      return customOrderTemplateService.getByVendor(vendorProfile.id, 0, 100);
    },
    enabled: isAuthenticated && isVendor && !!vendorProfile?.id,
  });

  // Fetch vendor custom orders
  const { data: customOrdersData } = useQuery<PagedCustomOrderResponse>({
    queryKey: ['vendor', 'custom-orders'],
    queryFn: () => customOrderService.getByVendor(0, 100),
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
  const serviceOrders = serviceOrdersData?.content || [];
  const services = servicesData?.content || [];
  const customTemplates: CustomOrderTemplate[] = customTemplatesData?.content || [];
  const customOrders: CustomOrder[] = customOrdersData?.content || [];

  // Calculate service order statistics
  const serviceOrderStats = {
    pending: serviceOrders.filter((o: ServiceOrderResponse) => o.status === 'BOOKED' && o.paymentStatus === 'PAID').length,
    confirmed: serviceOrders.filter((o: ServiceOrderResponse) => o.status === 'CONFIRMED_BY_VENDOR').length,
    inProgress: serviceOrders.filter((o: ServiceOrderResponse) => o.status === 'IN_PROGRESS').length,
    completed: serviceOrders.filter((o: ServiceOrderResponse) => o.status === 'COMPLETED').length,
    cancelled: serviceOrders.filter((o: ServiceOrderResponse) => o.status === 'CANCELLED').length,
    total: serviceOrders.length,
    revenue: serviceOrders
      .filter((o: ServiceOrderResponse) => o.status === 'COMPLETED')
      .reduce((sum: number, o: ServiceOrderResponse) => sum + (o.totalAmountMinor || 0), 0),
  };

  // Calculate custom template statistics
  const customTemplateStats = {
    pending: customTemplates.filter(t => t.status === 'PENDING_APPROVAL').length,
    approved: customTemplates.filter(t => t.status === 'APPROVED').length,
    rejected: customTemplates.filter(t => t.status === 'REJECTED').length,
    total: customTemplates.length,
  };

  // Calculate custom order statistics
  const customOrderStats = {
    submitted: customOrders.filter((o: CustomOrder) => o.status === 'SUBMITTED').length,
    priceProposed: customOrders.filter((o: CustomOrder) => o.status === 'PRICE_PROPOSED').length,
    confirmed: customOrders.filter((o: CustomOrder) => o.status === 'CONFIRMED').length,
    paid: customOrders.filter((o: CustomOrder) => o.status === 'PAID').length,
    inProgress: customOrders.filter((o: CustomOrder) => o.status === 'IN_PROGRESS').length,
    completed: customOrders.filter((o: CustomOrder) => o.status === 'COMPLETED').length,
    total: customOrders.length,
    needsAction: customOrders.filter((o: CustomOrder) => 
      o.status === 'SUBMITTED' || o.status === 'PAID'
    ).length,
  };

  const getStatusBadge = (status: string, deliveryConfirmedAt?: string) => {
    // Special handling for DELIVERED orders awaiting admin confirmation
    if (status?.toUpperCase() === 'DELIVERED' && !deliveryConfirmedAt) {
      return <Badge className="bg-purple-100 text-purple-800">Awaiting Confirmation</Badge>;
    }
    
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
      case 'APPROVED':
      case 'ENABLED':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'PENDING':
      case 'PENDING_APPROVAL':
        return <Badge className="bg-amber-100 text-amber-800">Pending</Badge>;
      case 'PLACED':
        return <Badge className="bg-purple-100 text-purple-800">Awaiting Confirmation</Badge>;
      case 'CONFIRMED':
        return <Badge className="bg-blue-100 text-blue-800">Confirmed</Badge>;
      case 'DELIVERED':
        return <Badge className="bg-green-100 text-green-800">Delivered</Badge>;
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

  const navigationItems = [
    { value: 'overview', label: 'Overview', icon: BarChart3, show: true },
    { value: 'products', label: 'Products', icon: Package, show: vendorProfile?.vendorType === 'PRODUCT' || vendorProfile?.vendorType === 'HYBRID' },
    { value: 'events', label: 'Events', icon: Calendar, show: vendorProfile?.vendorType === 'SERVICE' || vendorProfile?.vendorType === 'HYBRID' },
    { value: 'services', label: 'Services', icon: Briefcase, show: vendorProfile?.vendorType === 'SERVICE' || vendorProfile?.vendorType === 'HYBRID' },
    { value: 'custom-templates', label: 'Custom Templates', icon: Layers, show: true },
    { value: 'custom-orders', label: 'Custom Orders', icon: ShoppingBag, show: true, badge: customOrderStats.needsAction },
    { value: 'check-in', label: 'Check-In', icon: ScanLine, show: vendorProfile?.vendorType === 'SERVICE' || vendorProfile?.vendorType === 'HYBRID' },
    { value: 'payments', label: 'Payments', icon: CreditCard, show: true },
    { value: 'requests', label: 'Requests', icon: Clock, show: true },
    { value: 'settings', label: 'Settings', icon: Settings, show: true },
  ].filter(item => item.show);

  const normalizedVendorStatus = (vendorProfile?.status || '').trim().toUpperCase();
  const vendorApplicationStatus = normalizedVendorStatus || (
    vendorProfile?.isApproved
      ? 'APPROVED'
      : vendorProfile?.rejectionReason
        ? 'REJECTED'
        : 'PENDING'
  );
  const isVendorApproved = vendorApplicationStatus === 'APPROVED';
  const isApplicationRejected = vendorApplicationStatus === 'REJECTED';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-eagle-green border-b border-white/10 z-50 lg:hidden">
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white truncate max-w-[150px]">
                {vendorProfile?.businessName || 'Vendor'}
              </span>
              {isVendorApproved ? (
                <Badge className="bg-green-500 text-white text-[10px] font-light h-4 px-1 w-fit">Approved</Badge>
              ) : isApplicationRejected ? (
                <Badge className="bg-red-500 text-white text-[10px] font-light h-4 px-1 w-fit">Rejected</Badge>
              ) : (
                <Badge className="bg-amber-500 text-white text-[10px] font-light h-4 px-1 w-fit">Pending</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-june-bud text-eagle-green text-xs">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{user?.firstName} {user?.lastName}</span>
                    <span className="text-xs text-muted-foreground">Vendor</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white hover:bg-white/10"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>

      {/* Backdrop for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed top-16 lg:top-0 left-0 bottom-0 w-64 bg-eagle-green z-40 transition-transform duration-300 ease-in-out overflow-y-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Desktop Header */}
          <div className="hidden lg:block p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white truncate">
                  {vendorProfile?.businessName || 'Vendor Dashboard'}
                </h2>
                <p className="text-xs text-emerald-100 truncate">Manage your business</p>
              </div>
            </div>
            <div className="mt-2">
              {isVendorApproved ? (
                <Badge className="bg-green-500 text-white text-xs">Approved</Badge>
              ) : isApplicationRejected ? (
                <Badge className="bg-red-500 text-white text-xs">Rejected</Badge>
              ) : (
                <Badge className="bg-amber-500 text-white text-xs">Pending Approval</Badge>
              )}
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navigationItems.map((item) => {
              const isActive = activeTab === item.value;
              const Icon = item.icon;
              
              return (
                <button
                  key={item.value}
                  onClick={() => {
                    setActiveTab(item.value);
                    setSidebarOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all',
                    isActive 
                      ? 'bg-june-bud text-eagle-green shadow-lg' 
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1.5 text-xs flex items-center justify-center">
                      {item.badge}
                    </Badge>
                  )}
                  {isActive && <ChevronRight className="h-4 w-4 flex-shrink-0 ml-2" />}
                </button>
              );
            })}
          </nav>

          {/* Desktop User Profile */}
          <div className="hidden lg:block p-4 border-t border-white/10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-2 text-white hover:bg-white/10 hover:text-white">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-june-bud text-eagle-green">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start flex-1 min-w-0">
                    <span className="text-sm text-start font-medium truncate w-full">
                      {user?.firstName} {user?.lastName}
                    </span>
                    <span className="text-xs text-white/70">Vendor</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="pt-16 lg:pt-0 lg:pl-64 min-h-screen">
        <main className="p-4 sm:p-6 lg:p-8">
        
        {/* Vendor Approval Status Banner */}
        {vendorProfile && !isVendorApproved && (
          <div className={cn(
            "mb-6 rounded-lg border-2 p-4 sm:p-6",
            isApplicationRejected ? "border-red-300 bg-red-50" : "border-amber-300 bg-amber-50"
          )}>
            <div className="flex items-start gap-4">
              <div className={cn(
                "rounded-full p-3",
                isApplicationRejected ? "bg-red-100" : "bg-amber-100"
              )}>
                {isApplicationRejected ? (
                  <XCircle className="h-6 w-6 text-red-600" />
                ) : (
                  <Clock className="h-6 w-6 text-amber-600" />
                )}
              </div>
              <div className="flex-1">
                <h3 className={cn(
                  "text-lg font-semibold",
                  isApplicationRejected ? "text-red-800" : "text-amber-800"
                )}>
                  {isApplicationRejected
                    ? "Your Vendor Application Was Rejected"
                    : "Your Vendor Account is Pending Approval"}
                </h3>
                {isApplicationRejected ? (
                  <>
                    <p className="mt-1 text-sm text-red-700">
                      Please update your business details and resubmit your application from the Settings tab.
                    </p>
                    <div className="mt-3 rounded-md border border-red-200 bg-white p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-red-700">Rejection message</p>
                      <RejectionReasonWithModal
                        reason={vendorProfile.rejectionReason}
                        title="Vendor rejection reason"
                        className="mt-1 text-sm text-red-800"
                        truncateLength={120}
                      />
                      {vendorProfile.rejectedAt && (
                        <p className="mt-1 text-xs text-red-600">
                          Rejected on {new Date(vendorProfile.rejectedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge className="bg-red-200 text-red-800 border-red-300">Action Required</Badge>
                      <Button size="sm" onClick={() => setActiveTab('settings')}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit & Resubmit
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mt-1 text-sm text-amber-700">
                      Thank you for registering as a vendor! Your account is currently being reviewed by our team.
                      Once approved, you'll be able to create products, events, services, and custom order templates.
                    </p>
                    <p className="mt-2 text-sm text-amber-600">
                      You'll receive an email notification once your account has been approved.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge className="bg-amber-200 text-amber-800 border-amber-300">
                        <Clock className="h-3 w-3 mr-1" />
                        Review in Progress
                      </Badge>
                      <Badge variant="outline" className="border-amber-300 text-amber-700">Products: Disabled</Badge>
                      <Badge variant="outline" className="border-amber-300 text-amber-700">Events: Disabled</Badge>
                      <Badge variant="outline" className="border-amber-300 text-amber-700">Services: Disabled</Badge>
                      <Badge variant="outline" className="border-amber-300 text-amber-700">Custom Orders: Disabled</Badge>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Products card - only for PRODUCT and HYBRID vendors */}
              {(vendorProfile?.vendorType === 'PRODUCT' || vendorProfile?.vendorType === 'HYBRID') && (
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
              )}

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
                  <CardTitle className="text-sm font-medium">Service Bookings</CardTitle>
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{serviceOrderStats.total}</div>
                  <p className="text-xs text-muted-foreground">
                    {serviceOrderStats.pending} pending • {serviceOrderStats.confirmed} confirmed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Custom Templates</CardTitle>
                  <Layers className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{customTemplateStats.total}</div>
                  <p className="text-xs text-muted-foreground">
                    {customTemplateStats.pending} pending • {customTemplateStats.approved} approved
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {vendorRevenue?.currencySymbol || '$'} {vendorRevenue?.totalRevenue?.toFixed(2) || '0.00'}
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
                {!vendorProfile?.isApproved && (
                  <CardDescription className="text-amber-600">
                    Some actions are disabled until your vendor account is approved.
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {vendorProfile?.isApproved ? (
                  <Button asChild variant="outline" className="h-20 flex-col">
                    <Link to="/vendor/products/new">
                      <Plus className="h-6 w-6 mb-2" />
                      <span>Add Product</span>
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" className="h-20 flex-col opacity-50 cursor-not-allowed" disabled>
                    <Plus className="h-6 w-6 mb-2 text-gray-400" />
                    <span className="text-gray-400">Add Product</span>
                  </Button>
                )}
                {vendorProfile?.isApproved ? (
                  <Button asChild variant="outline" className="h-20 flex-col">
                    <Link to="/vendor/events/new">
                      <Calendar className="h-6 w-6 mb-2" />
                      <span>Create Event</span>
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" className="h-20 flex-col opacity-50 cursor-not-allowed" disabled>
                    <Calendar className="h-6 w-6 mb-2 text-gray-400" />
                    <span className="text-gray-400">Create Event</span>
                  </Button>
                )}
                {vendorProfile?.isApproved ? (
                  <Button asChild variant="outline" className="h-20 flex-col">
                    <Link to="/vendor/custom-templates/new">
                      <Layers className="h-6 w-6 mb-2" />
                      <span>Custom Template</span>
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" className="h-20 flex-col opacity-50 cursor-not-allowed" disabled>
                    <Layers className="h-6 w-6 mb-2 text-gray-400" />
                    <span className="text-gray-400">Custom Template</span>
                  </Button>
                )}
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
              {vendorProfile?.isApproved ? (
                <Button asChild>
                  <Link to="/vendor/products/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" className="opacity-50 cursor-not-allowed" disabled>
                  <Plus className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="text-gray-400">Add Product</span>
                </Button>
              )}
            </div>

            {products.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No products yet</h3>
                  <p className="text-muted-foreground mb-4">Start by creating your first product</p>
                  {vendorProfile?.isApproved ? (
                    <Button asChild>
                      <Link to="/vendor/products/new">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Product
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="outline" className="opacity-50 cursor-not-allowed" disabled>
                      <Plus className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-gray-400">Create Product</span>
                    </Button>
                  )}
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
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {getStatusBadge(product.status || '')}
                            {product.rejectionReason && (
                              <RejectionReasonWithModal
                                reason={product.rejectionReason}
                                title="Product rejection reason"
                                truncateLength={50}
                              />
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
              {vendorProfile?.isApproved ? (
                <Button asChild>
                  <Link to="/vendor/events/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Event
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" className="opacity-50 cursor-not-allowed" disabled>
                  <Plus className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="text-gray-400">Create Event</span>
                </Button>
              )}
            </div>

            {events.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No events yet</h3>
                  <p className="text-muted-foreground mb-4">Start by creating your first event</p>
                  {vendorProfile?.isApproved ? (
                    <Button asChild>
                      <Link to="/vendor/events/new">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Event
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="outline" className="opacity-50 cursor-not-allowed" disabled>
                      <Plus className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-gray-400">Create Event</span>
                    </Button>
                  )}
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

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Service Bookings</h2>
              <div className="flex gap-2">
                <Button asChild variant="outline">
                  <Link to="/vendor/service-calendar">
                    <Calendar className="h-4 w-4 mr-2" />
                    Calendar View
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/vendor/service-orders">
                    <Briefcase className="h-4 w-4 mr-2" />
                    Manage Orders
                  </Link>
                </Button>
                {vendorProfile?.isApproved ? (
                  <Button asChild>
                    <Link to="/vendor/services/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Service
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" className="opacity-50 cursor-not-allowed" disabled>
                    <Plus className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="text-gray-400">Add Service</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Service Order Stats */}
            {/* <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-blue-600">{serviceOrderStats.pending}</div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-green-600">{serviceOrderStats.confirmed}</div>
                  <p className="text-xs text-muted-foreground">Confirmed</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-yellow-600">{serviceOrderStats.inProgress}</div>
                  <p className="text-xs text-muted-foreground">In Progress</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-emerald-600">{serviceOrderStats.completed}</div>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-red-600">{serviceOrderStats.cancelled}</div>
                  <p className="text-xs text-muted-foreground">Cancelled</p>
                </CardContent>
              </Card>
            </div> */}

            {/* Service Revenue */}
            {/* <Card>
              <CardHeader>
                <CardTitle className="text-lg">Service Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-eagle-green">
                  {serviceOrderService.formatPrice(serviceOrderStats.revenue, vendorRevenue?.currencyCode || 'USD')}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  From {serviceOrderStats.completed} completed service{serviceOrderStats.completed !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card> */}

            {/* Recent Service Orders */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Service Orders</CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/vendor/service-orders">View All</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {serviceOrders.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No service orders yet.</p>
                ) : (
                  <div className="space-y-4">
                    {serviceOrders.slice(0, 5).map((order: ServiceOrderResponse) => {
                      const statusDisplay = serviceOrderService.getStatusDisplay(order.status);
                      return (
                        <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 rounded bg-eagle-green/10 flex items-center justify-center">
                              <Briefcase className="h-5 w-5 text-eagle-green" />
                            </div>
                            <div>
                              <p className="font-medium">{order.service?.title || 'Service'}</p>
                              <p className="text-sm text-muted-foreground">
                                {serviceOrderService.formatDateTime(order.scheduledDateTime)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={`${statusDisplay.bgColor} ${statusDisplay.color} border-none`}>
                              {statusDisplay.text}
                            </Badge>
                            <span className="font-medium">
                              {serviceOrderService.formatPrice(order.totalAmountMinor, order.currency)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* My Services */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>My Services</CardTitle>
                {vendorProfile?.isApproved ? (
                  <Button asChild variant="outline" size="sm">
                    <Link to="/vendor/services/new">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Service
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="opacity-50 cursor-not-allowed" disabled>
                    <Plus className="h-4 w-4 mr-1 text-gray-400" />
                    <span className="text-gray-400">Add Service</span>
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {services.length === 0 ? (
                  <div className="text-center py-8">
                    <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-muted-foreground mb-4">No services created yet.</p>
                    {vendorProfile?.isApproved ? (
                      <Button asChild>
                        <Link to="/vendor/services/new">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Your First Service
                        </Link>
                      </Button>
                    ) : (
                      <Button variant="outline" className="opacity-50 cursor-not-allowed" disabled>
                        <Plus className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="text-gray-400">Create Your First Service</span>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {services.map((service: ServiceResponse) => (
                      <div key={service.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          {service.primaryImageUrl ? (
                            <img 
                              src={service.primaryImageUrl} 
                              alt={service.title} 
                              className="h-12 w-12 rounded object-cover"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded bg-eagle-green/10 flex items-center justify-center">
                              <Briefcase className="h-6 w-6 text-eagle-green" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{service.title}</p>
                            <p className="text-sm text-muted-foreground">{service.city}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(service.status)}
                          <span className="font-medium">
                            {serviceService.formatPrice(service.defaultPackage?.basePrice ?? service.basePrice ?? 0, service.defaultPackage?.currency ?? service.currency)}
                          </span>
                          {service.hasPackages && (
                            <Badge variant="outline" className="text-xs">
                              {service.packages?.length || 0} packages
                            </Badge>
                          )}
                          <Button asChild variant="outline" size="sm">
                            <Link to={`/vendor/services/${service.id}/edit`}>Edit</Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Custom Templates Tab */}
          <TabsContent value="custom-templates" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Custom Order Templates</h2>
              {vendorProfile?.isApproved ? (
                <Button asChild>
                  <Link to="/vendor/custom-templates/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" className="opacity-50 cursor-not-allowed" disabled>
                  <Plus className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="text-gray-400">Create Template</span>
                </Button>
              )}
            </div>

            {/* Template Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
                  <Layers className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{customTemplateStats.total}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
                  <Clock className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">
                    {customTemplateStats.pending}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Approved</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {customTemplateStats.approved}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                  <XCircle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {customTemplateStats.rejected}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Templates */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Templates</CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/vendor/custom-templates">View All</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {customTemplates.length === 0 ? (
                  <div className="text-center py-8">
                    <Layers className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-muted-foreground mb-4">No custom templates created yet.</p>
                    {vendorProfile?.isApproved ? (
                      <Button asChild>
                        <Link to="/vendor/custom-templates/new">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Your First Template
                        </Link>
                      </Button>
                    ) : (
                      <Button variant="outline" className="opacity-50 cursor-not-allowed" disabled>
                        <Plus className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="text-gray-400">Create Your First Template</span>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {customTemplates.slice(0, 5).map((template) => (
                      <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="h-12 w-12 rounded bg-eagle-green/10 flex items-center justify-center">
                            <Layers className="h-6 w-6 text-eagle-green" />
                          </div>
                          <div>
                            <p className="font-medium">{template.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {customOrderTemplateService.formatTemplatePrice(template)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {template.fields.length} field{template.fields.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(template.status)}
                          <Button asChild variant="outline" size="sm">
                            <Link to={`/vendor/custom-templates/${template.id}`}>View</Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Custom Orders Tab */}
          <TabsContent value="custom-orders" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Custom Orders</h2>
              <Button asChild variant="outline">
                <Link to="/vendor/custom-orders">
                  View All Orders
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>

            {/* Order Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">New Orders</CardTitle>
                  <Clock className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">
                    {customOrderStats.submitted}
                  </div>
                  <p className="text-xs text-muted-foreground">Awaiting your price proposal</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Price Proposed</CardTitle>
                  <DollarSign className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {customOrderStats.priceProposed}
                  </div>
                  <p className="text-xs text-muted-foreground">Awaiting customer response</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Paid</CardTitle>
                  <CreditCard className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {customOrderStats.paid}
                  </div>
                  <p className="text-xs text-muted-foreground">Ready to start working</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                  <Package className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {customOrderStats.inProgress}
                  </div>
                  <p className="text-xs text-muted-foreground">Currently being fulfilled</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Orders */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Orders</CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/vendor/custom-orders">View All</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {customOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-muted-foreground mb-4">No custom orders yet.</p>
                    <p className="text-sm text-muted-foreground">
                      Once customers order from your templates, they'll appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {customOrders.slice(0, 5).map((order: CustomOrder) => (
                      <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full bg-june-bud/20 flex items-center justify-center">
                            <User className="h-5 w-5 text-eagle-green" />
                          </div>
                          <div>
                            <p className="font-medium">{order.templateName}</p>
                            <p className="text-sm text-muted-foreground">
                              #{order.orderNumber} • {order.customerName}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <p className="font-semibold">
                              {customOrderService.formatPrice(
                                (order.finalVendorPrice || order.baseVendorPrice || order.finalPrice || order.basePrice) ?? 0,
                                order.currencyCode || 'ETB'
                              )}
                            </p>
                            <Badge className={customOrderService.getStatusBadgeColor(order.status)}>
                              {customOrderService.getStatusText(order.status)}
                            </Badge>
                          </div>
                          <Button asChild variant="outline" size="sm">
                            <Link to={`/vendor/custom-orders/${order.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions for Orders Needing Attention */}
            {customOrderStats.needsAction > 0 && (
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader>
                  <CardTitle className="text-amber-800 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Orders Needing Your Attention
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {customOrderStats.submitted > 0 && (
                      <p className="text-sm text-amber-700">
                        • <strong>{customOrderStats.submitted}</strong> order{customOrderStats.submitted !== 1 ? 's' : ''} waiting for your price proposal
                      </p>
                    )}
                    {customOrderStats.paid > 0 && (
                      <p className="text-sm text-amber-700">
                        • <strong>{customOrderStats.paid}</strong> paid order{customOrderStats.paid !== 1 ? 's' : ''} ready to start
                      </p>
                    )}
                  </div>
                  <Button asChild className="mt-4">
                    <Link to="/vendor/custom-orders">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Review Orders
                    </Link>
                  </Button>
                </CardContent>
              </Card>
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
        </main>
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
  categoryId: number;
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
  skuCode: z.string().optional(),
  skuName: z.string().min(1, "Variant name is required"),
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
  tags: z.array(z.string()).optional(),
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

// Service schemas
const serviceEditSchema = z.object({
  title: z.string().min(1, "Service title is required"),
  description: z.string().optional(),
  location: z.string().optional(),
  city: z.string().optional(),
  durationMinutes: z.number().min(1).optional(),
  categoryId: z.string().optional(),
});

const servicePriceUpdateEditSchema = z.object({
  currencyCode: z.string().min(1, "Currency is required"),
  amount: z.number().min(0.01, "Price must be greater than 0"),
  reason: z.string().optional(),
});

const productCategoryEditSchema = z.object({
  newSubCategoryId: z.number().min(1, "Category is required"),
  reason: z.string().optional(),
});

const serviceCategoryEditSchema = z.object({
  newSubCategoryId: z.number().min(1, "Category is required"),
  reason: z.string().optional(),
});

type ProductEditForm = z.infer<typeof productEditSchema>;
type PriceUpdateEditForm = z.infer<typeof priceUpdateEditSchema>;
type EventEditForm = z.infer<typeof eventEditSchema>;
type EventPriceUpdateEditForm = z.infer<typeof eventPriceUpdateEditSchema>;
type ServiceEditForm = z.infer<typeof serviceEditSchema>;
type ServicePriceUpdateEditForm = z.infer<typeof servicePriceUpdateEditSchema>;
type ProductCategoryEditForm = z.infer<typeof productCategoryEditSchema>;
type ServiceCategoryEditForm = z.infer<typeof serviceCategoryEditSchema>;

function RequestsManagement({ vendorProfile, getStatusBadge, queryClient }: RequestsManagementProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("products");

  // Edit dialog states
  const [editProductOpen, setEditProductOpen] = useState(false);
  const [editPriceUpdateOpen, setEditPriceUpdateOpen] = useState(false);
  const [editEventOpen, setEditEventOpen] = useState(false);
  const [editEventPriceOpen, setEditEventPriceOpen] = useState(false);
  const [editServiceOpen, setEditServiceOpen] = useState(false);
  const [editServicePriceOpen, setEditServicePriceOpen] = useState(false);
  const [editProductCategoryOpen, setEditProductCategoryOpen] = useState(false);
  const [editServiceCategoryOpen, setEditServiceCategoryOpen] = useState(false);

  // Selected items
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedPriceUpdate, setSelectedPriceUpdate] = useState<PriceUpdateRequest | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventResponse | null>(null);
  const [selectedEventPriceUpdate, setSelectedEventPriceUpdate] = useState<EventPriceUpdateResponse | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceResponse | null>(null);
  const [selectedServicePriceUpdate, setSelectedServicePriceUpdate] = useState<ServicePriceUpdateRequest | null>(null);
  const [selectedProductCategoryRequest, setSelectedProductCategoryRequest] = useState<CategoryChangeRequest | null>(null);
  const [selectedServiceCategoryRequest, setSelectedServiceCategoryRequest] = useState<ServiceCategoryChangeRequest | null>(null);

  // Image management for events
  const [pendingEventImages, setPendingEventImages] = useState<File[]>([]);
  const [isUploadingEventImages, setIsUploadingEventImages] = useState(false);
  const [currentEventImages, setCurrentEventImages] = useState<ImageDto[]>([]);

  // Image management for products - SKU images only (keyed by SKU index)
  const [pendingSkuImages, setPendingSkuImages] = useState<Record<number, File[]>>({});
  const [currentSkuImages, setCurrentSkuImages] = useState<Record<number, ImageDto[]>>({});
  const [isUploadingProductImages, setIsUploadingProductImages] = useState(false);

  // Image management for services
  const [pendingServiceImages, setPendingServiceImages] = useState<File[]>([]);
  const [isUploadingServiceImages, setIsUploadingServiceImages] = useState(false);
  const [currentServiceImages, setCurrentServiceImages] = useState<string[]>([]);

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

  // Fetch pending/rejected services
  const { data: pendingServicesData, isLoading: loadingServices } = useQuery({
    queryKey: ['vendor', 'pending-rejected-services'],
    queryFn: () => serviceService.getMyPendingRejectedServices(0, 100),
  });

  // Fetch pending/rejected service price requests
  const { data: pendingServicePriceRequestsData, isLoading: loadingServicePrices } = useQuery({
    queryKey: ['vendor', 'pending-rejected-service-price-requests'],
    queryFn: () => vendorService.getMyPendingRejectedServicePriceRequests(0, 100),
  });

  // Fetch pending/rejected product category change requests
  const { data: pendingProductCategoryRequestsData, isLoading: loadingProductCategories } = useQuery({
    queryKey: ['vendor', 'pending-rejected-product-category-requests'],
    queryFn: () => vendorService.getMyPendingRejectedCategoryChangeRequests(0, 100),
  });

  // Fetch pending/rejected service category change requests
  const { data: pendingServiceCategoryRequestsData, isLoading: loadingServiceCategories } = useQuery({
    queryKey: ['vendor', 'pending-rejected-service-category-requests'],
    queryFn: () => vendorService.getMyPendingRejectedServiceCategoryRequests(0, 100),
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
  const pendingServices = pendingServicesData?.content || [];
  const pendingProductCategoryRequests = pendingProductCategoryRequestsData?.content || [];
  const pendingServiceCategoryRequests = pendingServiceCategoryRequestsData?.content || [];
  const pendingServicePriceRequests = pendingServicePriceRequestsData?.content || [];

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

  // Service edit mutation
  const editServiceMutation = useMutation({
    mutationFn: (data: { serviceId: number; service: any }) =>
      serviceService.editPendingService(data.serviceId, data.service),
    onSuccess: () => {
      toast({ title: "Success", description: "Service updated and resubmitted for review. Status reset to PENDING." });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'services'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'pending-rejected-services'] });
      setEditServiceOpen(false);
      setSelectedService(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.response?.data?.message || error.message || "Failed to update service", 
        variant: "destructive" 
      });
    },
  });

  // Service price update mutation
  const editServicePriceMutation = useMutation({
    mutationFn: (data: { requestId: number; request: { newPrice: any; reason?: string } }) =>
      vendorService.editServicePriceUpdateRequest(data.requestId, data.request),
    onSuccess: () => {
      toast({ title: "Success", description: "Service price update request resubmitted for review. Status reset to PENDING." });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'service-price-requests'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'pending-rejected-service-price-requests'] });
      setEditServicePriceOpen(false);
      setSelectedServicePriceUpdate(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.response?.data?.message || error.message || "Failed to update request", 
        variant: "destructive" 
      });
    },
  });

  // Product category change mutation
  const editProductCategoryMutation = useMutation({
    mutationFn: (data: { requestId: number; request: { newSubCategoryId: number; reason?: string } }) =>
      vendorService.editCategoryChangeRequest(data.requestId, data.request),
    onSuccess: () => {
      toast({ title: "Success", description: "Category change request resubmitted for review. Status reset to PENDING." });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'pending-rejected-product-category-requests'] });
      setEditProductCategoryOpen(false);
      setSelectedProductCategoryRequest(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.response?.data?.message || error.message || "Failed to update request", 
        variant: "destructive" 
      });
    },
  });

  // Service category change mutation
  const editServiceCategoryMutation = useMutation({
    mutationFn: (data: { requestId: number; request: { newSubCategoryId: number; reason?: string } }) =>
      vendorService.editServiceCategoryChangeRequest(data.requestId, data.request),
    onSuccess: () => {
      toast({ title: "Success", description: "Category change request resubmitted for review. Status reset to PENDING." });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'pending-rejected-service-category-requests'] });
      setEditServiceCategoryOpen(false);
      setSelectedServiceCategoryRequest(null);
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
      tags: [],
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

  const serviceForm = useForm<ServiceEditForm>({
    resolver: zodResolver(serviceEditSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      city: "",
      durationMinutes: undefined,
      categoryId: "",
    },
  });

  const servicePriceForm = useForm<ServicePriceUpdateEditForm>({
    resolver: zodResolver(servicePriceUpdateEditSchema),
    defaultValues: {
      currencyCode: "",
      amount: 0,
      reason: "",
    },
  });

  const productCategoryForm = useForm<ProductCategoryEditForm>({
    resolver: zodResolver(productCategoryEditSchema),
    defaultValues: {
      newSubCategoryId: 0,
      reason: "",
    },
  });

  const serviceCategoryForm = useForm<ServiceCategoryEditForm>({
    resolver: zodResolver(serviceCategoryEditSchema),
    defaultValues: {
      newSubCategoryId: 0,
      reason: "",
    },
  });

  const openPriceUpdateEdit = (request: PriceUpdateRequest) => {
    setSelectedPriceUpdate(request);
    priceUpdateForm.reset({
      currencyCode: request.newPrice?.currencyCode || currencies[0]?.code || "",
      amount: request.newPrice?.amount ?? (request.newPrice?.unitAmountMinor ? request.newPrice.unitAmountMinor / 100 : 0),
      reason: request.reason || "",
    });
    setEditPriceUpdateOpen(true);
  };

  const openEventPriceEdit = (request: EventPriceUpdateResponse) => {
    setSelectedEventPriceUpdate(request);
    // Convert from minor units (cents/santim) to decimal for form
    const amountDecimal = (request.newPriceMinor ?? 0) / 100;
    eventPriceForm.reset({
      currencyCode: request.newCurrencyCode || currencies[0]?.code || "",
      amount: amountDecimal,
      reason: request.reason || "",
    });
    setEditEventPriceOpen(true);
  };

  const openServiceEdit = (service: ServiceResponse) => {
    setSelectedService(service);
    // Extract URLs from service images
    setCurrentServiceImages(service.images?.map(img => img.fullUrl || img.url) || []);
    setPendingServiceImages([]);
    serviceForm.reset({
      title: service.title || "",
      description: service.description || "",
      location: service.location || "",
      city: service.city || "",
      durationMinutes: service.durationMinutes,
      categoryId: service.categoryId?.toString() || "",
    });
    setEditServiceOpen(true);
  };

  const openServicePriceEdit = (request: ServicePriceUpdateRequest) => {
    setSelectedServicePriceUpdate(request);
    // Convert from minor units if available, otherwise use amount
    const amountDecimal = request.newPrice?.amount ?? (request.newPrice?.unitAmountMinor ? request.newPrice.unitAmountMinor / 100 : 0);
    servicePriceForm.reset({
      currencyCode: request.newPrice?.currencyCode || currencies[0]?.code || "",
      amount: amountDecimal,
      reason: request.reason || "",
    });
    setEditServicePriceOpen(true);
  };

  const openProductCategoryEdit = (request: CategoryChangeRequest) => {
    setSelectedProductCategoryRequest(request);
    productCategoryForm.reset({
      newSubCategoryId: request.newSubCategoryId || 0,
      reason: request.reason || "",
    });
    setEditProductCategoryOpen(true);
  };

  const openServiceCategoryEdit = (request: ServiceCategoryChangeRequest) => {
    setSelectedServiceCategoryRequest(request);
    serviceCategoryForm.reset({
      newSubCategoryId: request.newSubCategoryId || 0,
      reason: request.reason || "",
    });
    setEditServiceCategoryOpen(true);
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
          tags: data.tags && data.tags.length > 0 ? data.tags : undefined,
          occasion: data.occasion,
          productSku: data.productSku.map((sku, index) => ({
            id: sku.id,
            skuCode: sku.skuCode || "", // Provide default empty string for required field
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
          currencyCode: isEthiopianVendor(vendorProfile) ? 'ETB' : data.currencyCode,
          amount: data.amount,
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
          // Get original price from various possible sources
          const originalPriceMinor = originalTicket?.vendorPriceMinor ?? originalTicket?.priceMinor;
          const originalPriceMajor = originalPriceMinor ? originalPriceMinor / 100 : originalTicket?.priceObj?.prices?.[0]?.amount;
          const originalCurrency = originalTicket?.currency ?? originalTicket?.priceObj?.prices?.[0]?.currencyCode;
          
          if (originalPriceMajor !== undefined && (originalPriceMajor !== ticketType.amount || originalCurrency !== ticketType.currencyCode)) {
            // Price changed - submit price update request
            await vendorService.requestEventPriceUpdate({
              eventId: selectedEvent.id,
              ticketTypeId: ticketType.id,
              newPrice: ticketType.amount,
              newCurrency: ticketType.currencyCode,
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

  const onServiceSubmit = async (data: ServiceEditForm) => {
    if (!selectedService?.id) return;
    
    // Validate that at least one service image exists (current or pending)
    const totalImages = currentServiceImages.length + pendingServiceImages.length;
    if (totalImages === 0) {
      toast({
        title: "Image Required",
        description: "Please upload at least one service image before saving.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Update basic service details
      await editServiceMutation.mutateAsync({
        serviceId: selectedService.id,
        service: {
          title: data.title,
          description: data.description,
          location: data.location,
          city: data.city,
          durationMinutes: data.durationMinutes,
          categoryId: data.categoryId ? parseInt(data.categoryId) : undefined,
        },
      });
      
      // Upload images if any pending
      if (pendingServiceImages.length > 0) {
        setIsUploadingServiceImages(true);
        try {
          await imageService.uploadServiceImages(selectedService.id, pendingServiceImages);
        } catch (imageError) {
          console.error("Failed to upload service images:", imageError);
          toast({
            title: "Warning",
            description: "Service updated but some images failed to upload.",
            variant: "destructive",
          });
        } finally {
          setIsUploadingServiceImages(false);
        }
      }
      
      // Clear image states
      setPendingServiceImages([]);
      setCurrentServiceImages([]);
      
    } catch (error: any) {
      setIsUploadingServiceImages(false);
      // Error is already handled by the mutation
    }
  };

  const onServicePriceSubmit = (data: ServicePriceUpdateEditForm) => {
    if (!selectedServicePriceUpdate?.id) return;
    editServicePriceMutation.mutate({
      requestId: selectedServicePriceUpdate.id,
      request: {
        newPrice: {
          currencyCode: data.currencyCode,
          amount: data.amount,
        },
        reason: data.reason,
      },
    });
  };

  const onProductCategorySubmit = (data: ProductCategoryEditForm) => {
    if (!selectedProductCategoryRequest?.id) return;
    editProductCategoryMutation.mutate({
      requestId: selectedProductCategoryRequest.id,
      request: {
        newSubCategoryId: data.newSubCategoryId,
        reason: data.reason,
      },
    });
  };

  const onServiceCategorySubmit = (data: ServiceCategoryEditForm) => {
    if (!selectedServiceCategoryRequest?.id) return;
    editServiceCategoryMutation.mutate({
      requestId: selectedServiceCategoryRequest.id,
      request: {
        newSubCategoryId: data.newSubCategoryId,
        reason: data.reason,
      },
    });
  };

  const getRequestCount = () => {
    return pendingProducts.length + pendingPriceRequests.length + pendingEvents.length + pendingEventPriceRequests.length + pendingServices.length + pendingServicePriceRequests.length + pendingProductCategoryRequests.length + pendingServiceCategoryRequests.length;
  };

  const isLoading = loadingProducts || loadingPriceRequests || loadingEvents || loadingEventPrices || loadingServices || loadingServicePrices || loadingProductCategories || loadingServiceCategories;
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
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-8 lg:w-auto lg:inline-grid">
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
          <TabsTrigger value="product-categories" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Product Categories</span>
            {pendingProductCategoryRequests.length > 0 && (
              <Badge variant="secondary" className="ml-1">{pendingProductCategoryRequests.length}</Badge>
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
          <TabsTrigger value="services" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">Services</span>
            {pendingServices.length > 0 && (
              <Badge variant="secondary" className="ml-1">{pendingServices.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="service-prices" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Service Prices</span>
            {pendingServicePriceRequests.length > 0 && (
              <Badge variant="secondary" className="ml-1">{pendingServicePriceRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="service-categories" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Service Categories</span>
            {pendingServiceCategoryRequests.length > 0 && (
              <Badge variant="secondary" className="ml-1">{pendingServiceCategoryRequests.length}</Badge>
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
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                              <RejectionReasonWithModal
                                reason={product.rejectionReason}
                                title="Product rejection reason"
                                className="text-sm text-red-700"
                                truncateLength={120}
                              />
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
                    const currentPrice = request.currentPrice;
                    const newPrice = request.newPrice;
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
                                  {currentPrice?.currencyCode} {(currentPrice?.amount ?? (currentPrice?.unitAmountMinor ? currentPrice.unitAmountMinor / 100 : 0))?.toFixed(2)}
                                </span>
                              </div>
                              <span className="text-muted-foreground">→</span>
                              <div>
                                <span className="text-sm text-muted-foreground">New: </span>
                                <span className="font-medium text-blue-600">
                                  {newPrice?.currencyCode} {(newPrice?.amount ?? (newPrice?.unitAmountMinor ? newPrice.unitAmountMinor / 100 : 0))?.toFixed(2)}
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
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                                <RejectionReasonWithModal
                                  reason={request.rejectionReason}
                                  title="Request rejection reason"
                                  className="text-sm text-red-700"
                                  truncateLength={120}
                                />
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
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                              <RejectionReasonWithModal
                                reason={event.rejectionReason}
                                title="Event rejection reason"
                                className="text-sm text-red-700"
                                truncateLength={120}
                              />
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
                    const currentPriceDisplay = ((request.currentPriceMinor ?? 0) / 100).toFixed(2);
                    const newPriceDisplay = ((request.newPriceMinor ?? 0) / 100).toFixed(2);
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
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                                <RejectionReasonWithModal
                                  reason={request.rejectionReason}
                                  title="Request rejection reason"
                                  className="text-sm text-red-700"
                                  truncateLength={120}
                                />
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

        {/* Service Creation Requests Tab */}
        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Service Creation Requests
              </CardTitle>
              <CardDescription>
                Services pending approval or rejected by admin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingServices ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : pendingServices.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">No pending or rejected services</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingServices.map((service) => (
                    <div key={service.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-3">
                          {service.primaryImageUrl ? (
                            <img 
                              src={service.primaryImageUrl} 
                              alt={service.title}
                              className="h-16 w-16 rounded object-cover"
                            />
                          ) : (
                            <div className="h-16 w-16 rounded bg-gray-100 flex items-center justify-center">
                              <Briefcase className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <h3 className="font-semibold">{service.title}</h3>
                            <p className="text-sm text-muted-foreground">{service.categoryName || 'Uncategorized'}</p>
                            <div className="flex items-center gap-2 mt-2">
                              {getStatusBadge(service.status)}
                              <span className="text-sm text-muted-foreground">
                                Price: {serviceService.formatPrice(service.defaultPackage?.basePrice ?? service.basePrice ?? 0, service.defaultPackage?.currency ?? service.currency)}
                              </span>
                            </div>
                            {service.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{service.description}</p>
                            )}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => openServiceEdit(service)}>
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                      {service.rejectionReason && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                              <RejectionReasonWithModal
                                reason={service.rejectionReason}
                                title="Service rejection reason"
                                className="text-sm text-red-700"
                                truncateLength={120}
                              />
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

        {/* Service Price Update Requests Tab */}
        <TabsContent value="service-prices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Service Price Update Requests
              </CardTitle>
              <CardDescription>
                Service price change requests pending approval or rejected by admin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingServicePrices ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : pendingServicePriceRequests.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">No pending or rejected service price update requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingServicePriceRequests.map((request) => {
                    // Backend may return prices in minor units or major units
                    const currentPrice = request.currentPrice?.amount ?? (request.currentPrice?.unitAmountMinor ? request.currentPrice.unitAmountMinor / 100 : 0);
                    const newPrice = request.newPrice?.amount ?? (request.newPrice?.unitAmountMinor ? request.newPrice.unitAmountMinor / 100 : 0);
                    const currency = request.currentPrice?.currencyCode || request.newPrice?.currencyCode || 'ETB';
                    
                    return (
                      <div key={request.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">{request.serviceName || `Service #${request.serviceId}`}</h3>
                            <p className="text-sm text-muted-foreground">Vendor: {request.vendorName || `#${request.vendorId}`}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <div>
                                <span className="text-sm text-muted-foreground">Current: </span>
                                <span className="font-medium">
                                  {currency} {currentPrice.toFixed(2)}
                                </span>
                              </div>
                              <span className="text-muted-foreground">→</span>
                              <div>
                                <span className="text-sm text-muted-foreground">New: </span>
                                <span className="font-medium text-blue-600">
                                  {currency} {newPrice.toFixed(2)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              {getStatusBadge(request.status || 'PENDING')}
                              {request.createdAt && (
                                <span className="text-sm text-muted-foreground">
                                  Submitted: {new Date(request.createdAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            {request.reason && (
                              <p className="text-sm text-muted-foreground mt-1">Reason: {request.reason}</p>
                            )}
                          </div>
                          <Button variant="outline" size="sm" onClick={() => openServicePriceEdit(request)}>
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                        {request.rejectionReason && (
                          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                                <RejectionReasonWithModal
                                  reason={request.rejectionReason}
                                  title="Request rejection reason"
                                  className="text-sm text-red-700"
                                  truncateLength={120}
                                />
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

        {/* Product Category Change Requests Tab */}
        <TabsContent value="product-categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Product Category Change Requests
              </CardTitle>
              <CardDescription>
                Category change requests pending approval or rejected by admin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingProductCategories ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : pendingProductCategoryRequests.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">No pending or rejected category change requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingProductCategoryRequests.map((request: CategoryChangeRequest) => (
                    <div key={request.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-3">
                          {request.productCover ? (
                            <img 
                              src={request.productCover} 
                              alt={request.productName}
                              className="h-16 w-16 rounded object-cover"
                            />
                          ) : (
                            <div className="h-16 w-16 rounded bg-gray-100 flex items-center justify-center">
                              <Package className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <h3 className="font-semibold">{request.productName}</h3>
                            <div className="flex items-center gap-2 mt-2">
                              {getStatusBadge(request.status || 'PENDING')}
                            </div>
                            <div className="mt-2 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Current:</span>
                                <span>{request.currentCategoryName} → {request.currentSubCategoryName}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-muted-foreground">New:</span>
                                <span className="text-blue-600 font-medium">{request.newCategoryName} → {request.newSubCategoryName}</span>
                              </div>
                            </div>
                            {request.reason && (
                              <p className="text-sm text-muted-foreground mt-2">Reason: {request.reason}</p>
                            )}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => openProductCategoryEdit(request)}>
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                      {request.rejectionReason && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                              <RejectionReasonWithModal
                                reason={request.rejectionReason}
                                title="Request rejection reason"
                                className="text-sm text-red-700"
                                truncateLength={120}
                              />
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

        {/* Service Category Change Requests Tab */}
        <TabsContent value="service-categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Service Category Change Requests
              </CardTitle>
              <CardDescription>
                Category change requests pending approval or rejected by admin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingServiceCategories ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : pendingServiceCategoryRequests.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">No pending or rejected category change requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingServiceCategoryRequests.map((request: ServiceCategoryChangeRequest) => (
                    <div key={request.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-3">
                          {request.serviceCover ? (
                            <img 
                              src={request.serviceCover} 
                              alt={request.serviceName}
                              className="h-16 w-16 rounded object-cover"
                            />
                          ) : (
                            <div className="h-16 w-16 rounded bg-gray-100 flex items-center justify-center">
                              <Briefcase className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <h3 className="font-semibold">{request.serviceName}</h3>
                            <div className="flex items-center gap-2 mt-2">
                              {getStatusBadge(request.status || 'PENDING')}
                            </div>
                            <div className="mt-2 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Current:</span>
                                <span>{request.currentCategoryName} → {request.currentSubCategoryName}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-muted-foreground">New:</span>
                                <span className="text-blue-600 font-medium">{request.newCategoryName} → {request.newSubCategoryName}</span>
                              </div>
                            </div>
                            {request.reason && (
                              <p className="text-sm text-muted-foreground mt-2">Reason: {request.reason}</p>
                            )}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => openServiceCategoryEdit(request)}>
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                      {request.rejectionReason && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                              <RejectionReasonWithModal
                                reason={request.rejectionReason}
                                title="Request rejection reason"
                                className="text-sm text-red-700"
                                truncateLength={120}
                              />
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
                <Label htmlFor="tags">Tags</Label>
                <Controller
                  name="tags"
                  control={productForm.control}
                  render={({ field }) => (
                    <TagInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Enter tag"
                      maxTags={10}
                    />
                  )}
                />
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
                    skuName: "", // Add default empty skuName (required field)
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
                        {/* SKU Name */}
                        <div>
                          <Label>Variant Name (optional)</Label>
                          <Input
                            placeholder={productSkuFields.length === 1 ? "e.g., Default" : "e.g., Red Medium"}
                            {...productForm.register(`productSku.${skuIndex}.skuName`)}
                          />
                          {productForm.formState.errors.productSku?.[skuIndex]?.skuName && (
                            <p className="text-sm text-red-600 mt-1">
                              {productForm.formState.errors.productSku[skuIndex]?.skuName?.message}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">A friendly name for this variant</p>
                        </div>

                        {/* SKU Code and Stock */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>SKU Code (optional)</Label>
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
            <div className={isEthiopianVendor(vendorProfile) ? "" : "grid grid-cols-2 gap-4"}>
              {!isEthiopianVendor(vendorProfile) && (
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
                          {availableCurrencies.map((currency) => (
                            <SelectItem key={currency.id} value={currency.code}>
                              {currency.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              )}
              <div>
                <Label>{isEthiopianVendor(vendorProfile) ? "New Price (ETB) *" : "New Price *"}</Label>
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

      {/* Edit Service Dialog */}
      <Dialog open={editServiceOpen} onOpenChange={setEditServiceOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Service Request</DialogTitle>
            <DialogDescription>
              Update your pending or rejected service request.
              {selectedService?.status === 'REJECTED' && (
                <span className="block mt-2 text-amber-600">
                  This service was rejected. Editing will resubmit it for approval.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={serviceForm.handleSubmit(onServiceSubmit)} className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input {...serviceForm.register("title")} />
              {serviceForm.formState.errors.title && (
                <p className="text-sm text-red-500 mt-1">{serviceForm.formState.errors.title.message}</p>
              )}
            </div>
            <div>
              <Label>Description</Label>
              <Textarea {...serviceForm.register("description")} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Location</Label>
                <Input {...serviceForm.register("location")} />
              </div>
              <div>
                <Label>City</Label>
                <Input {...serviceForm.register("city")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Duration (minutes)</Label>
                <Input 
                  type="number" 
                  min="1" 
                  {...serviceForm.register("durationMinutes", { valueAsNumber: true })} 
                />
              </div>
              <div>
                <Label>Category</Label>
                <Controller
                  name="categoryId"
                  control={serviceForm.control}
                  render={({ field }) => (
                    <Select 
                      value={field.value?.toString() || ''} 
                      onValueChange={(val) => field.onChange(val ? parseInt(val) : undefined)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            
            {/* Service Images */}
            <div>
              <Label>Images</Label>
              <div className="mt-2">
                {/* Current images */}
                {currentServiceImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {currentServiceImages.map((url, idx) => (
                      <div key={idx} className="relative h-20 w-20">
                        <img src={url} alt={`Service image ${idx + 1}`} className="h-full w-full object-cover rounded" />
                        <button
                          type="button"
                          title="Remove image"
                          aria-label={`Remove service image ${idx + 1}`}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                          onClick={() => setCurrentServiceImages(currentServiceImages.filter((_, i) => i !== idx))}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {/* Pending images */}
                {pendingServiceImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {pendingServiceImages.map((file, idx) => (
                      <div key={idx} className="relative h-20 w-20">
                        <img src={URL.createObjectURL(file)} alt={`New image ${idx + 1}`} className="h-full w-full object-cover rounded border-2 border-blue-500" />
                        <button
                          type="button"
                          title="Remove image"
                          aria-label={`Remove new image ${idx + 1}`}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                          onClick={() => setPendingServiceImages(pendingServiceImages.filter((_, i) => i !== idx))}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setPendingServiceImages([...pendingServiceImages, ...files]);
                  }}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditServiceOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={editServiceMutation.isPending || isUploadingServiceImages}>
                {(editServiceMutation.isPending || isUploadingServiceImages) ? 'Submitting...' : 'Save & Resubmit'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Service Price Update Dialog */}
      <Dialog open={editServicePriceOpen} onOpenChange={setEditServicePriceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Service Price Update Request</DialogTitle>
            <DialogDescription>
              Update the price change request for {selectedServicePriceUpdate?.serviceName || 'this service'}.
              {selectedServicePriceUpdate?.status === 'REJECTED' && (
                <span className="block mt-2 text-amber-600">
                  This request was rejected. Editing will resubmit it for approval.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={servicePriceForm.handleSubmit(onServicePriceSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Currency *</Label>
                <Controller
                  name="currencyCode"
                  control={servicePriceForm.control}
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
                  control={servicePriceForm.control}
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
              <Textarea {...servicePriceForm.register("reason")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditServicePriceOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={editServicePriceMutation.isPending}>
                {editServicePriceMutation.isPending ? 'Submitting...' : 'Save & Resubmit'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Product Category Dialog */}
      <Dialog open={editProductCategoryOpen} onOpenChange={setEditProductCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product Category Change Request</DialogTitle>
            <DialogDescription>
              Update the category change request for {selectedProductCategoryRequest?.productName || 'this product'}.
              {selectedProductCategoryRequest?.status === 'REJECTED' && (
                <span className="block mt-2 text-amber-600">
                  This request was rejected. Editing will resubmit it for approval.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={productCategoryForm.handleSubmit(onProductCategorySubmit)} className="space-y-4">
            <div>
              <Label>New Category *</Label>
              <Controller
                name="newSubCategoryId"
                control={productCategoryForm.control}
                render={({ field }) => (
                  <Select value={field.value?.toString()} onValueChange={(val) => field.onChange(Number(val))}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => 
                        allSubCategories
                          .filter(sub => sub.categoryId === category.id)
                          .map((sub) => (
                            <SelectItem key={sub.id} value={sub.id.toString()}>
                              {category.name} → {sub.name}
                            </SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea {...productCategoryForm.register("reason")} placeholder="Explain why you want to change the category" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditProductCategoryOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={editProductCategoryMutation.isPending}>
                {editProductCategoryMutation.isPending ? 'Submitting...' : 'Save & Resubmit'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Service Category Dialog */}
      <Dialog open={editServiceCategoryOpen} onOpenChange={setEditServiceCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Service Category Change Request</DialogTitle>
            <DialogDescription>
              Update the category change request for {selectedServiceCategoryRequest?.serviceName || 'this service'}.
              {selectedServiceCategoryRequest?.status === 'REJECTED' && (
                <span className="block mt-2 text-amber-600">
                  This request was rejected. Editing will resubmit it for approval.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={serviceCategoryForm.handleSubmit(onServiceCategorySubmit)} className="space-y-4">
            <div>
              <Label>New Category *</Label>
              <Controller
                name="newSubCategoryId"
                control={serviceCategoryForm.control}
                render={({ field }) => (
                  <Select value={field.value?.toString()} onValueChange={(val) => field.onChange(Number(val))}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => 
                        allSubCategories
                          .filter(sub => sub.categoryId === category.id)
                          .map((sub) => (
                            <SelectItem key={sub.id} value={sub.id.toString()}>
                              {category.name} → {sub.name}
                            </SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea {...serviceCategoryForm.register("reason")} placeholder="Explain why you want to change the category" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditServiceCategoryOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={editServiceCategoryMutation.isPending}>
                {editServiceCategoryMutation.isPending ? 'Submitting...' : 'Save & Resubmit'}
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
  const normalizedVendorStatus = (vendorProfile?.status || '').trim().toUpperCase();
  const isApplicationRejected =
    normalizedVendorStatus === 'REJECTED' ||
    (Boolean(vendorProfile?.rejectionReason) && !vendorProfile?.isApproved);

  const settingsSchema = z.object({
    businessName: z.string().min(2, "Business name is required"),
    businessEmail: z.string().email("Enter a valid business email"),
    businessPhone: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    description: z.string().max(1000, "Description must be less than 1000 characters").optional(),
  });

  type SettingsFormValues = z.infer<typeof settingsSchema>;

  const settingsForm = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      businessName: vendorProfile?.businessName || "",
      businessEmail: vendorProfile?.businessEmail || "",
      businessPhone: vendorProfile?.businessPhone || "",
      city: vendorProfile?.city || "",
      country: vendorProfile?.country || "",
      description: vendorProfile?.description || "",
    },
  });

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

  const updateVendorProfileMutation = useMutation({
    mutationFn: (values: SettingsFormValues) =>
      vendorService.updateMyProfile({
        businessName: values.businessName,
        businessEmail: values.businessEmail,
        businessPhone: values.businessPhone || undefined,
        city: values.city || undefined,
        country: values.country || undefined,
        description: values.description || undefined,
      }),
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: isApplicationRejected
          ? "Your application has been resubmitted for review."
          : "Your business profile has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'profile'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'summary'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update business profile",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!vendorProfile) return;
    settingsForm.reset({
      businessName: vendorProfile.businessName || "",
      businessEmail: vendorProfile.businessEmail || "",
      businessPhone: vendorProfile.businessPhone || "",
      city: vendorProfile.city || "",
      country: vendorProfile.country || "",
      description: vendorProfile.description || "",
    });
  }, [vendorProfile, settingsForm]);

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

  const onSubmitSettings = (values: SettingsFormValues) => {
    updateVendorProfileMutation.mutate(values);
  };

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

      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Business Information
          </CardTitle>
          <CardDescription>
            {isApplicationRejected
              ? "Update your business details and resubmit your application."
              : "Keep your business details up to date."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isApplicationRejected && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">Application rejected</p>
              {vendorProfile?.rejectionReason ? (
                <RejectionReasonWithModal
                  reason={vendorProfile.rejectionReason}
                  title="Vendor rejection reason"
                  className="mt-1 text-sm text-red-700"
                  truncateLength={120}
                />
              ) : (
                <p className="mt-1 text-sm text-red-700">No reason provided.</p>
              )}
              {vendorProfile?.rejectedAt && (
                <p className="mt-1 text-xs text-red-600">
                  Rejected on {new Date(vendorProfile.rejectedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          <form onSubmit={settingsForm.handleSubmit(onSubmitSettings)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="settings-business-name">Business Name *</Label>
                <Input id="settings-business-name" {...settingsForm.register("businessName")} />
                {settingsForm.formState.errors.businessName && (
                  <p className="text-sm text-red-600 mt-1">{settingsForm.formState.errors.businessName.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="settings-business-email">Business Email *</Label>
                <Input id="settings-business-email" type="email" {...settingsForm.register("businessEmail")} />
                {settingsForm.formState.errors.businessEmail && (
                  <p className="text-sm text-red-600 mt-1">{settingsForm.formState.errors.businessEmail.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="settings-business-phone">Business Phone</Label>
                <Input id="settings-business-phone" {...settingsForm.register("businessPhone")} />
              </div>
              <div>
                <Label htmlFor="settings-city">City</Label>
                <Input id="settings-city" {...settingsForm.register("city")} />
              </div>
              <div>
                <Label htmlFor="settings-country">Country</Label>
                <Input id="settings-country" {...settingsForm.register("country")} />
              </div>
            </div>

            <div>
              <Label htmlFor="settings-description">Description</Label>
              <Textarea
                id="settings-description"
                className="min-h-[120px]"
                {...settingsForm.register("description")}
              />
              {settingsForm.formState.errors.description && (
                <p className="text-sm text-red-600 mt-1">{settingsForm.formState.errors.description.message}</p>
              )}
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={updateVendorProfileMutation.isPending}>
                {updateVendorProfileMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : isApplicationRejected ? (
                  'Save & Resubmit'
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Onboarding Certificate */}
      <VendorCertificateCard />
    </div>
  );
}

// Vendor Certificate Card Component
function VendorCertificateCard() {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: certificate, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['vendor', 'my-certificate'],
    queryFn: () => certificateService.getMyCertificate(),
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const blob = await certificateService.downloadMyCertificatePdf();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my-onboarding-certificate.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: "Success", description: "Certificate downloaded successfully" });
    } catch (error) {
      console.error('Error downloading certificate:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download certificate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading || isRefetching) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Onboarding Certificate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            <span className="ml-2">Loading certificate...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!certificate) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Onboarding Certificate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <XCircle className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-sm mb-2">No certificate found for your account.</p>
            <p className="text-xs text-gray-400 mb-4 text-center max-w-xs">
              If you completed the onboarding video, your certificate should appear here. 
              Try refreshing if you just completed the process.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="text-emerald-600"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-emerald-600" />
          Onboarding Certificate
        </CardTitle>
        <CardDescription>
          Your vendor onboarding completion certificate.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg border bg-green-50 border-green-200">
          <CheckCircle className="h-8 w-8 text-green-600 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-medium text-green-900">Certificate Verified</h4>
            <p className="text-sm text-green-700">
              Issued on {new Date(certificate.issuedAt).toLocaleDateString()}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadPdf}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg border break-words">
            <Label className="text-muted-foreground text-xs">Certificate Code</Label>
            <p className="font-mono font-bold text-emerald-600 break-all">{certificate.certificateCode}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border break-words">
            <Label className="text-muted-foreground text-xs">Vendor Type</Label>
            <p className="font-medium break-words">{certificate.vendorType}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border break-words">
            <Label className="text-muted-foreground text-xs">Full Name</Label>
            <p className="font-medium break-words">{certificate.fullName}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border break-words">
            <Label className="text-muted-foreground text-xs">Email</Label>
            <p className="font-medium break-all">{certificate.email}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
