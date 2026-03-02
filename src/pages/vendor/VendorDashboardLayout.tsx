import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { vendorService, VendorProfile } from "@/services/vendorService";
import { customOrderService } from "@/services/customOrderService";
import type { PagedCustomOrderResponse } from "@/types/customOrders";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Settings,
  AlertCircle,
  Clock,
  BarChart3,
  ScanLine,
  Layers,
  Briefcase,
  ShoppingBag,
  LogOut,
  Menu,
  ChevronRight,
  Percent,
  XCircle,
  Edit,
  Megaphone,
} from "lucide-react";
import { useState } from "react";
import { RejectionReasonWithModal } from "@/components/RejectionReasonModal";

// Helper function to check if vendor is Ethiopian
export const isEthiopianVendor = (vendorProfile: VendorProfile | undefined): boolean => {
  if (!vendorProfile) return false;
  return vendorProfile.countryCode === 'ET';
};

// Navigation item type
interface NavigationItem {
  value: string;
  path: string;
  label: string;
  icon: React.ElementType;
  show: boolean;
  badge?: number;
}

export default function VendorDashboardLayout() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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

  // Fetch vendor custom orders for badge count
  const { data: customOrdersData } = useQuery<PagedCustomOrderResponse>({
    queryKey: ['vendor', 'custom-orders'],
    queryFn: () => customOrderService.getByVendor(0, 100),
    enabled: isAuthenticated && isVendor,
  });

  // Fetch vendor product orders for badge count
  const { data: productOrdersData } = useQuery({
    queryKey: ['vendor', 'product-orders'],
    queryFn: async () => {
      const { orderService } = await import('@/services/orderService');
      return orderService.getVendorOrders(0, 100);
    },
    enabled: isAuthenticated && isVendor && (vendorProfile?.vendorType === 'PRODUCT' || vendorProfile?.vendorType === 'HYBRID'),
  });

  const customOrders = customOrdersData?.content || [];
  const customOrdersNeedsAction = customOrders.filter((o) => 
    o.status === 'SUBMITTED' || o.status === 'PAID'
  ).length;

  const productOrders = productOrdersData?.content || [];
  const productOrdersNeedsAction = productOrders.filter((o: any) => 
    o.status === 'PENDING' || o.status === 'CONFIRMED'
  ).length;

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

  const navigationItems: NavigationItem[] = [
    { value: 'overview', path: '/vendor', label: 'Overview', icon: BarChart3, show: true },
    { value: 'products', path: '/vendor/products', label: 'Products', icon: Package, show: vendorProfile?.vendorType === 'PRODUCT' || vendorProfile?.vendorType === 'HYBRID' },
    { value: 'product-orders', path: '/vendor/product-orders', label: 'Product Orders', icon: ShoppingBag, show: vendorProfile?.vendorType === 'PRODUCT' || vendorProfile?.vendorType === 'HYBRID', badge: productOrdersNeedsAction },
    { value: 'events', path: '/vendor/events', label: 'Events', icon: Calendar, show: vendorProfile?.vendorType === 'SERVICE' || vendorProfile?.vendorType === 'HYBRID' },
    { value: 'services', path: '/vendor/services', label: 'Services', icon: Briefcase, show: vendorProfile?.vendorType === 'SERVICE' || vendorProfile?.vendorType === 'HYBRID' },
    { value: 'service-orders', path: '/vendor/service-orders', label: 'Service Bookings', icon: Calendar, show: vendorProfile?.vendorType === 'SERVICE' || vendorProfile?.vendorType === 'HYBRID' },
    { value: 'discounts', path: '/vendor/discounts', label: 'Discounts', icon: Percent, show: true },
    { value: 'campaigns', path: '/vendor/campaigns', label: 'Campaigns', icon: Megaphone, show: true },
    { value: 'custom-templates', path: '/vendor/custom-templates', label: 'Custom Templates', icon: Layers, show: vendorProfile?.vendorType === 'PRODUCT' || vendorProfile?.vendorType === 'HYBRID' },
    { value: 'custom-orders', path: '/vendor/custom-orders', label: 'Custom Orders', icon: ShoppingBag, show: vendorProfile?.vendorType === 'PRODUCT' || vendorProfile?.vendorType === 'HYBRID', badge: customOrdersNeedsAction },
    { value: 'check-in', path: '/vendor/check-in', label: 'Check-In', icon: ScanLine, show: vendorProfile?.vendorType === 'SERVICE' || vendorProfile?.vendorType === 'HYBRID' },
    { value: 'payments', path: '/vendor/payments', label: 'Payments', icon: CreditCard, show: true },
    { value: 'requests', path: '/vendor/requests', label: 'Requests', icon: Clock, show: true },
    { value: 'settings', path: '/vendor/settings', label: 'Settings', icon: Settings, show: true },
  ].filter(item => item.show);

  // Get active tab based on current path
  const getActiveTab = () => {
    const path = location.pathname;
    // Match exact path or path with trailing content (for nested routes)
    const matchedItem = navigationItems.find(item => {
      if (item.path === '/vendor') {
        return path === '/vendor' || path === '/vendor/';
      }
      return path.startsWith(item.path);
    });
    return matchedItem?.value || 'overview';
  };

  const activeTab = getActiveTab();
  const isCustomOrderDetailPage = location.pathname.startsWith('/vendor/custom-orders/');
  const normalizedVendorStatus = (vendorProfile?.status || '').trim().toUpperCase();
  const vendorApplicationStatus = normalizedVendorStatus || (
    vendorProfile?.isApproved
      ? 'APPROVED'
      : vendorProfile?.rejectionReason
        ? 'REJECTED'
        : 'PENDING'
  );
  const isVendorApproved = vendorApplicationStatus === 'APPROVED';
  const isVendorRejected = vendorApplicationStatus === 'REJECTED';

  return (
    <div className={cn('min-h-screen', isCustomOrderDetailPage ? 'bg-white' : 'bg-gray-50')}>
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-eagle-green border-b border-white/10 z-50 lg:hidden">
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-2">
            <Store className="h-6 w-6 text-june-bud" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white truncate max-w-[150px]">
                {vendorProfile?.businessName || 'Vendor'}
              </span>
              {isVendorApproved ? (
                <Badge className="bg-green-500 text-white text-[10px] h-4 px-1 w-fit">Approved</Badge>
              ) : isVendorRejected ? (
                <Badge className="bg-red-500 text-white text-[10px] h-4 px-1 w-fit">Rejected</Badge>
              ) : (
                <Badge className="bg-amber-500 text-white text-[10px] h-4 px-1 w-fit">Pending</Badge>
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
                <Badge className="bg-green-600 text-white text-xs font-light">Approved</Badge>
              ) : isVendorRejected ? (
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
                <Link
                  key={item.value}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
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
                </Link>
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
        <main className={cn(isCustomOrderDetailPage ? 'p-0' : 'p-4 sm:p-6 lg:p-8')}>
          {/* Vendor Approval Status Banner */}
          {vendorProfile && !isVendorApproved && (
            <div className={cn(
              "mb-6 rounded-lg border-2 p-4 sm:p-6",
              isVendorRejected ? "border-red-300 bg-red-50" : "border-amber-300 bg-amber-50"
            )}>
              <div className="flex items-start gap-4">
                <div className={cn(
                  "rounded-full p-3",
                  isVendorRejected ? "bg-red-100" : "bg-amber-100"
                )}>
                  {isVendorRejected ? (
                    <XCircle className="h-6 w-6 text-red-600" />
                  ) : (
                    <Clock className="h-6 w-6 text-amber-600" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className={cn(
                    "text-lg font-semibold",
                    isVendorRejected ? "text-red-800" : "text-amber-800"
                  )}>
                    {isVendorRejected ? "Your Vendor Application Was Rejected" : "Your Vendor Account is Pending Approval"}
                  </h3>
                  {isVendorRejected ? (
                    <>
                      <p className="mt-1 text-sm text-red-700">
                        Please update your business details and resubmit your application from Settings.
                      </p>
                      <div className="mt-3 rounded-md border border-red-200 bg-white p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-red-700">Rejection message</p>
                        {vendorProfile.rejectionReason ? (
                          <RejectionReasonWithModal
                            reason={vendorProfile.rejectionReason}
                            title="Vendor rejection reason"
                            className="mt-1 text-sm text-red-800"
                            truncateLength={120}
                          />
                        ) : (
                          <p className="mt-1 text-sm text-red-800">No rejection reason provided.</p>
                        )}
                        {vendorProfile.rejectedAt && (
                          <p className="mt-1 text-xs text-red-600">
                            Rejected on {new Date(vendorProfile.rejectedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Badge className="bg-red-200 text-red-800 border-red-300">Action Required</Badge>
                        <Button size="sm" asChild>
                          <Link to="/vendor/resubmit">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit & Resubmit
                          </Link>
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

          <Outlet />
        </main>
      </div>
    </div>
  );
}
