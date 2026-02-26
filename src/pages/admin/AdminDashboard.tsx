import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { RevenueTrendChart } from '@/components/admin/RevenueTrendChart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { getProductImageUrl } from '@/utils/imageUtils';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Pie, PieChart as RechartsPieChart, Label } from 'recharts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Users, 
  Store, 
  ShoppingCart, 
  Calendar,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Loader2,
  Package,
  Ticket,
  ChevronUp,
  Award,
  BarChart3,
  PieChart,
  XCircle,
  Eye
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export default function AdminDashboard() {
  const MAX_REJECTION_REASON_LENGTH = 1000;
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionReasonError, setRejectionReasonError] = useState('');

  const extractErrorMessage = (error: any, fallback: string) => {
    const responseData = error?.response?.data;
    const details = responseData?.details;

    if (details && typeof details === 'object') {
      const detailMessage = Object.values(details).find((value) => typeof value === 'string') as string | undefined;
      if (detailMessage) {
        return detailMessage;
      }
    }

    return error?.message || responseData?.message || fallback;
  };
  
  // Fetch comprehensive dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'dashboard-stats'],
    queryFn: () => adminService.getDashboardStats(),
    retry: 1,
  });

  // Fetch pending events
  const { data: pendingEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['admin', 'pending-events'],
    queryFn: async () => {
      try {
        const response = await adminService.getPendingEvents(0, 5);
        return response.content || [];
      } catch (error) {
        console.error('Failed to fetch pending events:', error);
        return [];
      }
    },
  });

  // Fetch pending products
  const { data: pendingProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: ['admin', 'pending-products'],
    queryFn: async () => {
      try {
        const response = await adminService.getPendingProducts(0, 5);
        return response.content || [];
      } catch (error) {
        console.error('Failed to fetch pending products:', error);
        return [];
      }
    },
  });

  // Approve product mutation
  const approveProductMutation = useMutation({
    mutationFn: (productId: number) => adminService.approveProduct(productId),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Product approved successfully' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-stats'] });
      setShowApproveDialog(false);
      setSelectedProduct(null);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to approve product', variant: 'destructive' });
    },
  });

  // Reject product mutation
  const rejectProductMutation = useMutation({
    mutationFn: ({ productId, reason }: { productId: number; reason: string }) => 
      adminService.rejectProduct(productId, reason),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Product rejected' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-stats'] });
      setShowRejectDialog(false);
      setSelectedProduct(null);
      setRejectionReason('');
      setRejectionReasonError('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: extractErrorMessage(error, 'Failed to reject product'),
        variant: 'destructive',
      });
    },
  });

  const isLoading = statsLoading || eventsLoading;

  const formatCurrency = (amount: number, _currency: string = 'USD') => {
    if (amount === undefined || amount === null) return '$0.00';
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatNumber = (num: number) => {
    if (num === undefined || num === null) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };


  return (
    <AdminLayout hideHeader>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-1 bg-gradient-to-br from-eagle-green via-eagle-green/90 to-eagle-green/80 text-white overflow-hidden relative">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h5 className="font-medium text-white/90 mb-1">Welcome back,</h5>
                <h3 className="text-3xl font-bold mb-2">
                  {user?.firstName || 'Admin'}
                </h3>
                <p className="text-white/80 text-sm mb-1 mt-3">
                  Monthly Revenue:
                </p>
                {stats && (
                  <h4 className="text-3xl font-bold mb-3">
                    {formatCurrency(stats.revenue?.monthRevenue || 0, stats.revenue?.currency)}
                  </h4>
                )}
              </div>
              <div className="absolute -right-4 -top-4 opacity-10">
                <Award className="h-40 w-40" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">General Stats</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-primary/10">
                  <PieChart className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h5 className="text-xl font-bold">{formatNumber(stats?.orders?.totalProductOrders || 0)}</h5>
                  <small className="text-muted-foreground">Sales</small>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h5 className="text-xl font-bold">{formatNumber(stats?.users?.customers || 0)}</h5>
                  <small className="text-muted-foreground">Customers</small>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-orange-500/10">
                  <Package className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <h5 className="text-xl font-bold">{formatNumber(stats?.products?.total || 0)}</h5>
                  <small className="text-muted-foreground">Products</small>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <DollarSign className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h5 className="text-xl font-bold">{formatCurrency(stats?.revenue?.totalRevenue || 0, stats?.revenue?.currency)}</h5>
                  <small className="text-muted-foreground">Revenue</small>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Today's Revenue */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-2xl font-bold">
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(stats?.revenue?.todayRevenue || 0, stats?.revenue?.currency)}
                </h3>
                <div className="flex items-center gap-1 mt-1">
                  <ChevronUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-500">+12.5%</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-gradient-to-br from-eagle-green to-eagle-green/80">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* This Week Revenue */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Weekly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-2xl font-bold">
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(stats?.revenue?.weekRevenue || 0, stats?.revenue?.currency)}
                </h3>
                <div className="flex items-center gap-1 mt-1">
                  <ChevronUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-500">+8.2%</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-gradient-to-br from-blue-500 to-blue-600">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Vendors */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Vendors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-2xl font-bold">
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.vendors?.active || 0}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.vendors?.withStripeEnabled || 0} Stripe • {stats?.vendors?.withChapaEnabled || 0} Chapa
                </p>
              </div>
              <div className="p-3 rounded-full bg-gradient-to-br from-purple-500 to-purple-600">
                <Store className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* New Users This Month */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">New Users (Month)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-2xl font-bold">
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.users?.newThisMonth || 0}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  +{stats?.users?.newThisWeek || 0} this week
                </p>
              </div>
              <div className="p-3 rounded-full bg-gradient-to-br from-pink-500 to-pink-600">
                <Users className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

            {/* Pending Approvals */}
      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Pending Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Pending Events */}
            {(stats?.pendingApprovals?.events || 0) > 0 && (
              <Link 
                to="/admin/events" 
                className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900">
                    <Calendar className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Events</p>
                    <p className="text-xs text-muted-foreground">{stats?.pendingApprovals?.events} pending approval</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-amber-600" />
              </Link>
            )}

            {/* Pending Products */}
            {(stats?.pendingApprovals?.products || 0) > 0 && (
              <Link 
                to="/admin/products" 
                className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                    <Package className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Products</p>
                    <p className="text-xs text-muted-foreground">{stats?.pendingApprovals?.products} pending review</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-blue-600" />
              </Link>
            )}

            {/* Pending Price Updates */}
            {(stats?.pendingApprovals?.productPriceUpdates || 0) > 0 && (
              <Link 
                to="/admin/products" 
                className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/30 rounded-lg hover:bg-green-100 dark:hover:bg-green-950/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                    <DollarSign className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Price Updates</p>
                    <p className="text-xs text-muted-foreground">{stats?.pendingApprovals?.productPriceUpdates} requests</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-green-600" />
              </Link>
            )}

            {!stats?.pendingApprovals?.events && 
             !stats?.pendingApprovals?.products && 
             !stats?.pendingApprovals?.productPriceUpdates && (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground col-span-full">
                <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
                <p className="font-medium">All caught up!</p>
                <p className="text-sm">No pending actions</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trends Chart */}
      <div className="mb-6">
        <RevenueTrendChart
          title="Revenue Trends"
          description="Product and event revenue over time"
          showTotal={true}
        />
      </div>

      {/* Order Analytics - Pie Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Product Orders Analytics */}
        <Card>
          <CardHeader>
            <CardTitle>Product Orders Analytics</CardTitle>
            <CardDescription>Breakdown by order status</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.orders ? (() => {
              // Calculate processing, shipped, delivered from total - pending - cancelled
              const pending = stats.orders.pendingProductOrders || 0;
              const completed = stats.orders.completedProductOrders || 0;
              const cancelled = stats.orders.cancelledProductOrders || 0;
              const total = stats.orders.totalProductOrders || 0;
              
              // Distribute remaining into processing, shipped, delivered
              const remaining = Math.max(0, total - pending - completed - cancelled);
              const processing = Math.floor(remaining / 3);
              const shipped = Math.floor(remaining / 3);

              const productOrderData = [
                { name: 'Pending', value: pending, fill: '#FDCB2D' },
                { name: 'Processing', value: processing, fill: '#3B82F6' },
                { name: 'Shipped', value: shipped, fill: '#8B5CF6' },
                { name: 'Delivered', value: completed, fill: '#11A0A0' },
                { name: 'Cancelled', value: cancelled, fill: '#E94E1B' },
              ].filter(item => item.value > 0);
              
              return (
                <div className="space-y-4">
                  <ChartContainer
                    config={{
                      pending: { label: 'Pending', color: '#FDCB2D' },
                      processing: { label: 'Processing', color: '#3B82F6' },
                      shipped: { label: 'Shipped', color: '#8B5CF6' },
                      delivered: { label: 'Delivered', color: '#11A0A0' },
                      cancelled: { label: 'Cancelled', color: '#E94E1B' },
                    } satisfies ChartConfig}
                    className="h-[220px]"
                  >
                    <RechartsPieChart>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie
                        data={productOrderData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        cornerRadius={8}
                      >
                        <Label
                          content={({ viewBox }) => {
                            if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                              return (
                                <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                  <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-xl font-bold">
                                    {total}
                                  </tspan>
                                  <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 18} className="fill-muted-foreground text-xs">
                                    Total
                                  </tspan>
                                </text>
                              );
                            }
                          }}
                        />
                      </Pie>
                    </RechartsPieChart>
                  </ChartContainer>
                  {/* Legend */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FDCB2D' }} />
                      <span>Pending ({pending})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3B82F6' }} />
                      <span>Processing ({processing})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8B5CF6' }} />
                      <span>Shipped ({shipped})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#11A0A0' }} />
                      <span>Delivered ({completed})</span>
                    </div>
                    {cancelled > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#E94E1B' }} />
                        <span>Cancelled ({cancelled})</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })() : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Event Orders Analytics */}
        <Card>
          <CardHeader>
            <CardTitle>Event Orders Analytics</CardTitle>
            <CardDescription>Breakdown by payment status</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.orders ? (() => {
              const pending = stats.orders.pendingEventOrders || 0;
              const completed = stats.orders.completedEventOrders || 0;
              const total = stats.orders.totalEventOrders || 0;
              const cancelled = Math.max(0, total - pending - completed);
              
              const eventOrderData = [
                { name: 'Pending', value: pending, fill: '#FDCB2D' },
                { name: 'Confirmed/Paid', value: completed, fill: '#11A0A0' },
                { name: 'Cancelled', value: cancelled, fill: '#E94E1B' },
              ].filter(item => item.value > 0);
              
              return (
                <div className="space-y-4">
                  <ChartContainer
                    config={{
                      pending: { label: 'Pending', color: '#FDCB2D' },
                      confirmed: { label: 'Confirmed/Paid', color: '#11A0A0' },
                      cancelled: { label: 'Cancelled', color: '#E94E1B' },
                    } satisfies ChartConfig}
                    className="h-[220px]"
                  >
                    <RechartsPieChart>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie
                        data={eventOrderData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        cornerRadius={8}
                      >
                        <Label
                          content={({ viewBox }) => {
                            if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                              return (
                                <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                  <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-xl font-bold">
                                    {total}
                                  </tspan>
                                  <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 18} className="fill-muted-foreground text-xs">
                                    Total
                                  </tspan>
                                </text>
                              );
                            }
                          }}
                        />
                      </Pie>
                    </RechartsPieChart>
                  </ChartContainer>
                  {/* Legend */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FDCB2D' }} />
                      <span>Pending ({pending})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#11A0A0' }} />
                      <span>Confirmed/Paid ({completed})</span>
                    </div>
                    {cancelled > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#E94E1B' }} />
                        <span>Cancelled ({cancelled})</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })() : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>User Type Distribution</CardTitle>
            <CardDescription>Platform users by role</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.users ? (
              <div className="space-y-4">
                <ChartContainer
                  config={{
                    customers: { label: 'Customers', color: '#01405C' },
                    vendors: { label: 'Vendors', color: '#B2D55B' },
                    admins: { label: 'Admins', color: '#FDCB2D' },
                  } satisfies ChartConfig}
                  className="h-[220px]"
                >
                  <RechartsPieChart>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Pie
                      data={[
                        { name: 'Customers', value: stats.users.customers || 0, fill: '#01405C' },
                        { name: 'Vendors', value: stats.vendors?.active || 0, fill: '#B2D55B' },
                        { name: 'Admins', value: stats.users.admins || 0, fill: '#FDCB2D' },
                      ].filter(item => item.value > 0)}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      <Label
                        content={({ viewBox }) => {
                          if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                            const total = (stats.users.customers || 0) + (stats.vendors?.active || 0) + (stats.users.admins || 0);
                            return (
                              <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-xl font-bold">
                                  {total}
                                </tspan>
                                <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 18} className="fill-muted-foreground text-xs">
                                  Total
                                </tspan>
                              </text>
                            );
                          }
                        }}
                      />
                    </Pie>
                  </RechartsPieChart>
                </ChartContainer>
                {/* Legend */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#01405C' }} />
                    <span>Customers ({stats.users.customers || 0})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#B2D55B' }} />
                    <span>Vendors ({stats.vendors?.active || 0})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FDCB2D' }} />
                    <span>Admins ({stats.users.admins || 0})</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>



      {/* Bottom Row - Orders Overview & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Stats by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Orders Overview
            </CardTitle>
            <CardDescription>Order distribution by status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Pending */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-sm">Pending</span>
              </div>
              <div className="flex items-center gap-3">
                <Progress value={stats?.orders?.pendingProductOrders ? (stats.orders.pendingProductOrders / (stats.orders.totalProductOrders || 1)) * 100 : 0} className="w-24 h-2" />
                <span className="text-sm font-medium w-8">{stats?.orders?.pendingProductOrders || 0}</span>
              </div>
            </div>
            
            {/* Completed */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm">Completed</span>
              </div>
              <div className="flex items-center gap-3">
                <Progress value={stats?.orders?.completedProductOrders ? (stats.orders.completedProductOrders / (stats.orders.totalProductOrders || 1)) * 100 : 0} className="w-24 h-2" />
                <span className="text-sm font-medium w-8">{stats?.orders?.completedProductOrders || 0}</span>
              </div>
            </div>
            
            {/* Cancelled */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm">Cancelled</span>
              </div>
              <div className="flex items-center gap-3">
                <Progress value={stats?.orders?.cancelledProductOrders ? (stats.orders.cancelledProductOrders / (stats.orders.totalProductOrders || 1)) * 100 : 0} className="w-24 h-2" />
                <span className="text-sm font-medium w-8">{stats?.orders?.cancelledProductOrders || 0}</span>
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Product Orders</span>
                <span className="font-bold">{stats?.orders?.totalProductOrders || 0}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-muted-foreground">Total Event Orders</span>
                <span className="font-bold">{stats?.orders?.totalEventOrders || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common management tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/admin/users">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                  <Users className="h-5 w-5" />
                  <span className="text-xs">Manage Users</span>
                </Button>
              </Link>
              <Link to="/admin/vendors">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                  <Store className="h-5 w-5" />
                  <span className="text-xs">Manage Vendors</span>
                </Button>
              </Link>
              <Link to="/admin/orders">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  <span className="text-xs">Product Orders</span>
                </Button>
              </Link>
              <Link to="/admin/event-orders">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                  <Ticket className="h-5 w-5" />
                  <span className="text-xs">Event Orders</span>
                </Button>
              </Link>
              <Link to="/admin/events">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                  <Calendar className="h-5 w-5" />
                  <span className="text-xs">Review Events</span>
                </Button>
              </Link>
              <Link to="/admin/categories">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                  <Package className="h-5 w-5" />
                  <span className="text-xs">Categories</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Events Section */}
      {pendingEvents.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Pending Events</CardTitle>
              <CardDescription>Events waiting for your approval</CardDescription>
            </div>
            <Link to="/admin/events">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingEvents.slice(0, 5).map((event: any) => (
                <div 
                  key={event.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{event.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {event.city} • {new Date(event.eventDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-amber-100 text-amber-800">Pending</Badge>
                    <Link to={`/admin/events`}>
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Products Section */}
      {pendingProducts.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Pending Products</CardTitle>
              <CardDescription>Products waiting for your approval</CardDescription>
            </div>
            <Link to="/admin/products">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {productsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-eagle-green" />
              </div>
            ) : (
              <div className="space-y-3">
                {pendingProducts.slice(0, 5).map((product: any) => (
                  <div 
                    key={product.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <img 
                        src={getProductImageUrl(product.images, product.cover)} 
                        alt={product.name}
                        className="h-12 w-12 rounded-lg object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                      />
                      <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center">
                        <Package className="h-6 w-6 text-blue-500" />
                      </div>
                      <div>
                        <h4 className="font-medium">{product.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {product.vendorName || `Vendor #${product.vendorId}`} • {product.categoryName || 'Uncategorized'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-amber-100 text-amber-800">Pending</Badge>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-green-600 hover:text-green-700"
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowApproveDialog(true);
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowRejectDialog(true);
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Approve Product Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve "{selectedProduct?.name}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => selectedProduct && approveProductMutation.mutate(selectedProduct.id)}
              disabled={approveProductMutation.isPending}
            >
              {approveProductMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Product Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Product</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting "{selectedProduct?.name}".
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason..."
            value={rejectionReason}
            onChange={(e) => {
              const value = e.target.value;
              setRejectionReason(value);

              if (value.trim().length > MAX_REJECTION_REASON_LENGTH) {
                setRejectionReasonError(`Rejection reason must be ${MAX_REJECTION_REASON_LENGTH} characters or fewer.`);
              } else {
                setRejectionReasonError('');
              }
            }}
            className="min-h-[100px]"
            maxLength={MAX_REJECTION_REASON_LENGTH}
          />
          <div className="flex items-center justify-between text-xs">
            <p className={rejectionReasonError ? 'text-red-600' : 'text-muted-foreground'}>
              {rejectionReasonError || 'Reason must be clear and concise.'}
            </p>
            <p className={rejectionReason.trim().length > MAX_REJECTION_REASON_LENGTH ? 'text-red-600' : 'text-muted-foreground'}>
              {rejectionReason.trim().length}/{MAX_REJECTION_REASON_LENGTH}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRejectDialog(false);
              setRejectionReason('');
              setRejectionReasonError('');
            }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const trimmedReason = rejectionReason.trim();
                if (!trimmedReason || !selectedProduct) {
                  return;
                }

                if (trimmedReason.length > MAX_REJECTION_REASON_LENGTH) {
                  const message = `Rejection reason must be ${MAX_REJECTION_REASON_LENGTH} characters or fewer.`;
                  setRejectionReasonError(message);
                  toast({
                    title: 'Reason Too Long',
                    description: message,
                    variant: 'destructive',
                  });
                  return;
                }

                setRejectionReasonError('');
                rejectProductMutation.mutate({
                  productId: selectedProduct.id,
                  reason: trimmedReason
                });
              }}
              disabled={
                !rejectionReason.trim() ||
                rejectionReason.trim().length > MAX_REJECTION_REASON_LENGTH ||
                rejectProductMutation.isPending
              }
            >
              {rejectProductMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
