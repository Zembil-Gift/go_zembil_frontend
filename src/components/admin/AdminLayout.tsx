import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/services/apiService';
import { 
  LayoutDashboard, 
  Users, 
  Store, 
  Calendar,
  Tag, 
  Layers,
  Package,
  ChevronRight,
  Shield,
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  hideHeader?: boolean;
}

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/vendors', label: 'Vendors', icon: Store },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/services', label: 'Services', icon: Briefcase },
  { href: '/admin/events', label: 'Events', icon: Calendar },
  { href: '/admin/custom-templates', label: 'Custom Templates', icon: FileText },
  { href: '/admin/custom-orders', label: 'Custom Orders', icon: ShoppingBag },
  { href: '/admin/featured-ads', label: 'Featured & Ads', icon: Star },
  { href: '/admin/categories', label: 'Categories', icon: Tag },
  { href: '/admin/subcategories', label: 'Subcategories', icon: Layers },
  { href: '/admin/delivery', label: 'Delivery', icon: Truck },
  { href: '/admin/tax', label: 'Tax Management', icon: Receipt },
  { href: '/admin/currency', label: 'Currency', icon: DollarSign }
];

// Super admin only items
const superAdminNavItems = [
  { href: '/admin/roles', label: 'Roles', icon: Shield },
  { href: '/admin/permissions', label: 'Permissions', icon: Key },
];

export default function AdminLayout({ children, title, description, hideHeader = false }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isSuperAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch pending packages count for badge
  const { data: pendingPackagesData } = useQuery({
    queryKey: ['admin', 'pending-packages-count'],
    queryFn: async () => {
      try {
        const response = await apiService.getRequest<{ content: any[] }>('/api/admin/service-packages/pending?page=0&size=1');
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
    navigate('/signin');
  };

  // Combine nav items based on role
  const allNavItems = isSuperAdmin() 
    ? [...navItems, ...superAdminNavItems]
    : navItems;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-eagle-green border-b border-white/10 z-50 lg:hidden">
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-june-bud" />
            <span className="text-lg font-bold text-white">Admin Panel</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Mobile User Dropdown */}
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
                    <span className="text-xs text-muted-foreground">Administrator</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Hamburger Menu */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white hover:bg-white/10"
            >
              {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
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
          {/* Desktop Logo */}
          <div className="hidden lg:flex items-center h-16 px-4 bg-eagle-green/90 border-b border-white/10">
            <Shield className="h-6 w-6 text-june-bud mr-2" />
            <span className="text-xl font-bold text-white">Admin Panel</span>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {allNavItems.map((item) => {
              const isActive = location.pathname === item.href || 
                (item.href !== '/admin' && location.pathname.startsWith(item.href));
              
              // Check if this is a super admin only item
              const isSuperAdminItem = superAdminNavItems.some(i => i.href === item.href);
              
              // Show badge for Services if there are pending packages
              const showPendingPackagesBadge = item.href === '/admin/services' && pendingPackagesCount > 0;
              
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all',
                    isActive 
                      ? 'bg-june-bud text-eagle-green shadow-lg' 
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {showPendingPackagesBadge && (
                    <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1.5 text-xs">
                      {pendingPackagesCount}
                    </Badge>
                  )}
                  {isSuperAdminItem && !isActive && (
                    <Badge variant="outline" className="text-xs border-purple-400 text-purple-300">
                      Super
                    </Badge>
                  )}
                  {isActive && <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                </Link>
              );
            })}
          </nav>

          {/* Desktop User Profile Dropdown */}
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
                    <span className="text-xs text-white/70">Administrator</span>
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
        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {/* Page header */}
          {!hideHeader && title && (
            <div className="mb-6">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-eagle-green">{title}</h1>
              {description && (
                <p className="mt-1 text-sm sm:text-base text-gray-600">{description}</p>
              )}
            </div>
          )}

          {/* Content */}
          <div className="w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
