import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/services/apiService";
import {
  LayoutDashboard,
  Users,
  Store,
  Calendar,
  Tag,
  Layers,
  Package,
  ChevronRight,
  DollarSign,
  Receipt,
  Truck,
  Briefcase,
  Star,
  FileText,
  ShoppingBag,
  LogOut,
  Menu,
  X,
  Key,
  CreditCard,
  Megaphone,
  Percent,
  Wallet,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import GoGeramiLogo from "@/components/GoGeramiLogo";

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  hideHeader?: boolean;
}

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/vendors", label: "Vendors", icon: Store },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/services", label: "Services", icon: Briefcase },
  { href: "/admin/events", label: "Events", icon: Calendar },
  {
    href: "/admin/custom-templates",
    label: "Custom Templates",
    icon: FileText,
  },
  { href: "/admin/custom-orders", label: "Custom Orders", icon: ShoppingBag },
  { href: "/admin/featured-ads", label: "Featured & Ads", icon: Star },
  { href: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
  {
    href: "/admin/campaign-participations",
    label: "Campaign Participations",
    icon: Users,
  },
  { href: "/admin/categories", label: "Categories", icon: Tag },
  { href: "/admin/subcategories", label: "Subcategories", icon: Layers },
  { href: "/admin/delivery", label: "Delivery", icon: Truck },
  { href: "/admin/tax", label: "Tax Management", icon: Receipt },
  { href: "/admin/currency", label: "Currency", icon: DollarSign },
  {
    href: "/admin/payment-methods",
    label: "Payment Methods",
    icon: CreditCard,
  },
  { href: "/admin/refunds", label: "Refunds", icon: Undo2 },
  { href: "/admin/vendor-payouts", label: "Vendor Payout", icon: Wallet },
  { href: "/admin/commission", label: "Commission", icon: Percent },
];

// Super admin only items
const superAdminNavItems = [
  { href: "/admin/roles", label: "Roles" },
  { href: "/admin/permissions", label: "Permissions", icon: Key },
];

export default function AdminLayout({
  children,
  title,
  description,
  hideHeader = false,
}: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isSuperAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch pending packages count for badge
  const { data: pendingPackagesData } = useQuery({
    queryKey: ["admin", "pending-packages-count"],
    queryFn: async () => {
      try {
        const response = await apiService.getRequest<{ content: any[] }>(
          "/api/admin/service-packages/pending?page=0&size=1"
        );
        return response.content?.length || 0;
      } catch {
        return 0;
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const pendingPackagesCount = pendingPackagesData || 0;

  const handleLogout = () => {
    logout();
    navigate("/signin");
  };

  // Combine nav items based on role
  const allNavItems = isSuperAdmin()
    ? [...navItems, ...superAdminNavItems]
    : navItems;

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <div className="fixed top-0 left-0 right-0 h-16 bg-eagle-green shadow-lg z-50 lg:hidden">
        <div className="flex items-center justify-between h-full px-4 pt-5">
          <div className="flex items-center gap-2">
            <GoGeramiLogo
              variant="icon"
              size="md"
              imagePath="/attached_assets/go-gerami.png"
              className="h-10 w-auto"
            />
            <span className="text-lg font-semibold text-white tracking-tight">
              Admin Panel
            </span>
          </div>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/90 hover:bg-white/15 rounded-full transition-colors"
                >
                  <Avatar className="h-8 w-8 ring-2 ring-white/20">
                    <AvatarFallback className="bg-june-bud text-eagle-green text-xs font-medium">
                      {user?.firstName?.[0]}
                      {user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 shadow-xl border-0"
                sideOffset={8}
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground">
                      {user?.firstName} {user?.lastName}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 focus:text-red-600 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white/90 hover:bg-white/15 rounded-lg transition-colors"
            >
              {sidebarOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-16 lg:top-0 left-0 bottom-0 w-[17rem] z-40 transition-transform duration-300 ease-in-out overflow-y-auto scrollbar-thin",
          "bg-gradient-to-b from-eagle-green via-eagle-green to-[#013347] shadow-xl",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="hidden lg:flex items-center gap-3 pt-6 pb-4 px-5 border-b border-white/10">
            <GoGeramiLogo
              variant="icon"
              size="lg"
              imagePath="/attached_assets/go-gerami.png"
              className="h-9 w-auto brightness-0 invert opacity-90"
            />
            <div>
              <span className="text-lg font-semibold text-white tracking-tight block">
                Admin Panel
              </span>
            </div>
          </div>

          <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
            {allNavItems.map((item) => {
              const isActive =
                location.pathname === item.href ||
                (item.href !== "/admin" &&
                  location.pathname.startsWith(item.href) &&
                  location.pathname !== "/admin/delivery-confirmations");

              const isSuperAdminItem = superAdminNavItems.some(
                (i) => i.href === item.href
              );
              const showPendingPackagesBadge =
                item.href === "/admin/services" && pendingPackagesCount > 0;

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200",
                    isActive
                      ? "bg-june-bud text-eagle-green shadow-md shadow-june-bud/25"
                      : "text-white/85 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <span className="flex-1 truncate">{item.label}</span>
                  {showPendingPackagesBadge && (
                    <Badge
                      variant="destructive"
                      className="ml-auto h-5 min-w-5 px-1.5 text-xs font-semibold shrink-0"
                    >
                      {pendingPackagesCount}
                    </Badge>
                  )}
                  {isSuperAdminItem && !isActive && (
                    <Badge
                      variant="outline"
                      className="text-[10px] border-white/30 text-white/70 bg-white/5 shrink-0"
                    >
                      Super
                    </Badge>
                  )}
                  {isActive && (
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-eagle-green" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Desktop User Profile Dropdown */}
          <div className="hidden lg:block p-4 border-t border-white/10 bg-white/[0.03]">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-auto py-3 px-3 text-white hover:bg-white/10 rounded-xl transition-colors"
                >
                  <Avatar className="h-9 w-9 ring-2 ring-white/20">
                    <AvatarFallback className="bg-june-bud/90 text-eagle-green font-medium">
                      {user?.firstName?.[0]}
                      {user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start flex-1 min-w-0 text-left">
                    <span className="text-sm font-medium truncate w-full">
                      {user?.firstName} {user?.lastName}
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                side="top"
                className="w-56 shadow-xl border-0"
                sideOffset={8}
              >
                <DropdownMenuLabel className="font-normal">
                  My Account
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 focus:text-red-600 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="pt-16 lg:pt-0 lg:pl-[17rem] min-h-screen">
        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8 min-h-screen">
          {/* Page header */}
          {!hideHeader && title && (
            <header className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-eagle-green tracking-tight">
                {title}
              </h1>
              {description && (
                <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-2xl">
                  {description}
                </p>
              )}
            </header>
          )}

          {/* Content */}
          <div className="w-full max-w-full overflow-x-hidden">{children}</div>
        </main>
      </div>
    </div>
  );
}
