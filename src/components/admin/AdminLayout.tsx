import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/vendors', label: 'Vendors', icon: Store },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/services', label: 'Services', icon: Briefcase },
  { href: '/admin/events', label: 'Events', icon: Calendar },
  { href: '/admin/featured-ads', label: 'Featured & Ads', icon: Star },
  { href: '/admin/categories', label: 'Categories', icon: Tag },
  { href: '/admin/subcategories', label: 'Subcategories', icon: Layers },
  { href: '/admin/delivery', label: 'Delivery', icon: Truck },
  { href: '/admin/tax', label: 'Tax Management', icon: Receipt },
  { href: '/admin/currency', label: 'Currency', icon: DollarSign }
];

export default function AdminLayout({ children, title, description }: AdminLayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-eagle-green">
          <div className="flex flex-col flex-1 min-h-0">
            {/* Logo */}
            <div className="flex items-center h-16 px-4 bg-eagle-green/90">
              <span className="text-xl font-bold text-white">Admin Panel</span>
            </div>
            
            {/* Navigation */}
            <nav className="flex-1 px-2 py-4 space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.href || 
                  (item.href !== '/admin' && location.pathname.startsWith(item.href));
                
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                      isActive 
                        ? 'bg-june-bud text-eagle-green' 
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    {item.label}
                    {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                  </Link>
                );
              })}
            </nav>

        
          </div>
        </aside>

        {/* Main content */}
        <div className="lg:pl-64 flex-1">
          {/* Mobile header */}
          <div className="lg:hidden bg-eagle-green px-4 py-3 flex items-center justify-between">
            <div className="flex items-center">
              <Shield className="h-6 w-6 text-june-bud mr-2" />
              <span className="text-lg font-bold text-white">Admin</span>
            </div>
          </div>

          {/* Mobile navigation */}
          <div className="lg:hidden bg-white border-b overflow-x-auto">
            <nav className="flex px-4 py-2 space-x-4">
              {navItems.map((item) => {
                const isActive = location.pathname === item.href || 
                  (item.href !== '/admin' && location.pathname.startsWith(item.href));
                
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      'flex items-center px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap',
                      isActive 
                        ? 'bg-june-bud/20 text-eagle-green' 
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Page content */}
          <main className="p-6">
            {/* Page header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-eagle-green">{title}</h1>
              {description && (
                <p className="mt-1 text-sm text-gray-600">{description}</p>
              )}
            </div>

            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
