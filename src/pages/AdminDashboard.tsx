import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Users, 
  Package, 
  DollarSign, 
  ShoppingCart,
  UserCheck,
  Star,
  Settings,
  Eye,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  MessageSquare,
  TrendingUp,
  Calendar,
  Clock,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Types for admin data
interface AdminStats {
  totalOrders: number;
  totalRevenue: number;
  totalVendors: number;
  totalCelebrities: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  pendingVendors: number;
  pendingCelebrities: number;
}

interface AdminOrder {
  id: number;
  userId: string;
  total: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
  recipientName: string;
  recipientEmail: string;
  items: Array<{
    productName: string;
    quantity: number;
    price: number;
  }>;
}

interface PendingVendor {
  id: number;
  businessName: string;
  ownerName: string;
  email: string;
  businessType: string;
  phone: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  documents?: string[];
}

interface PendingCelebrity {
  id: number;
  fullName: string;
  stageName: string;
  email: string;
  phone: string;
  bio: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  profilePicture?: string;
  socialMedia?: {
    instagram?: string;
    twitter?: string;
    tiktok?: string;
  };
}

export default function AdminDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<PendingVendor | null>(null);
  const [selectedCelebrity, setSelectedCelebrity] = useState<PendingCelebrity | null>(null);

  // Check if user is admin
  const isAdmin = (user as any)?.role === 'admin';

  // Fetch admin statistics
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    enabled: isAdmin,
  });

  // Fetch orders for admin
  const { data: orders = [], isLoading: ordersLoading } = useQuery<AdminOrder[]>({
    queryKey: ['/api/admin/orders'],
    enabled: isAdmin,
  });

  // Fetch pending vendors
  const { data: pendingVendors = [], isLoading: vendorsLoading } = useQuery<PendingVendor[]>({
    queryKey: ['/api/admin/vendors/pending'],
    enabled: isAdmin,
  });

  // Fetch pending celebrities
  const { data: pendingCelebrities = [], isLoading: celebritiesLoading } = useQuery<PendingCelebrity[]>({
    queryKey: ['/api/admin/celebrities/pending'],
    enabled: isAdmin,
  });

  // Mutation for updating order status
  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update order');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({
        title: "Order Updated",
        description: "Order status has been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    },
  });

  // Mutation for approving/rejecting vendors
  const updateVendorStatusMutation = useMutation({
    mutationFn: async ({ vendorId, status }: { vendorId: number; status: 'approved' | 'rejected' }) => {
      const response = await fetch(`/api/admin/vendors/${vendorId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update vendor');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/vendors/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({
        title: "Vendor Updated",
        description: "Vendor status has been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update vendor status",
        variant: "destructive",
      });
    },
  });

  // Mutation for approving/rejecting celebrities
  const updateCelebrityStatusMutation = useMutation({
    mutationFn: async ({ celebrityId, status }: { celebrityId: number; status: 'approved' | 'rejected' }) => {
      const response = await fetch(`/api/admin/celebrities/${celebrityId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update celebrity');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/celebrities/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({
        title: "Celebrity Updated",
        description: "Celebrity status has been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update celebrity status",
        variant: "destructive",
      });
    },
  });

  // Redirect if not admin
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600">
              Please sign in with admin credentials to access the dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Unauthorized</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600">
              You do not have admin privileges to access this dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">goZembil Admin Dashboard</h1>
            <p className="text-gray-600">Manage your platform efficiently</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <UserCheck className="w-3 h-3 mr-1" />
              Admin Access
            </Badge>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
              <div className="text-xs text-muted-foreground mt-2">
                <span className="text-yellow-600">{stats?.pendingOrders || 0} pending</span>
                <span className="mx-2">•</span>
                <span className="text-green-600">{stats?.deliveredOrders || 0} delivered</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats?.totalRevenue?.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground">
                +12.5% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalVendors || 0}</div>
              <div className="text-xs text-muted-foreground">
                {stats?.pendingVendors || 0} pending approval
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Celebrities</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalCelebrities || 0}</div>
              <div className="text-xs text-muted-foreground">
                {stats?.pendingCelebrities || 0} pending approval
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="vendors">Vendors</TabsTrigger>
            <TabsTrigger value="celebrities">Celebrities</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Orders Management */}
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>Orders Management</CardTitle>
                <CardDescription>
                  View and manage all platform orders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {ordersLoading ? (
                    <div className="text-center py-8">Loading orders...</div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No orders found</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Order ID</th>
                            <th className="text-left p-2">Customer</th>
                            <th className="text-left p-2">Total</th>
                            <th className="text-left p-2">Status</th>
                            <th className="text-left p-2">Date</th>
                            <th className="text-left p-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map((order: AdminOrder) => (
                            <tr key={order.id} className="border-b hover:bg-gray-50">
                              <td className="p-2">#{order.id}</td>
                              <td className="p-2">{order.recipientName}</td>
                              <td className="p-2">${order.total}</td>
                              <td className="p-2">
                                <Badge variant={
                                  order.status === 'delivered' ? 'default' :
                                  order.status === 'shipped' ? 'secondary' :
                                  order.status === 'processing' ? 'outline' : 'destructive'
                                }>
                                  {order.status}
                                </Badge>
                              </td>
                              <td className="p-2">
                                {new Date(order.createdAt).toLocaleDateString()}
                              </td>
                              <td className="p-2">
                                <div className="flex space-x-2">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => setSelectedOrder(order)}
                                      >
                                        <Eye className="w-3 h-3 mr-1" />
                                        View
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl">
                                      <DialogHeader>
                                        <DialogTitle>Order #{selectedOrder?.id}</DialogTitle>
                                        <DialogDescription>
                                          Order details and status management
                                        </DialogDescription>
                                      </DialogHeader>
                                      {selectedOrder && (
                                        <div className="space-y-4">
                                          <div className="grid grid-cols-2 gap-4">
                                            <div>
                                              <Label>Customer</Label>
                                              <p className="text-sm text-gray-600">{selectedOrder.recipientName}</p>
                                            </div>
                                            <div>
                                              <Label>Email</Label>
                                              <p className="text-sm text-gray-600">{selectedOrder.recipientEmail}</p>
                                            </div>
                                            <div>
                                              <Label>Total</Label>
                                              <p className="text-sm text-gray-600">${selectedOrder.total}</p>
                                            </div>
                                            <div>
                                              <Label>Payment Method</Label>
                                              <p className="text-sm text-gray-600">{selectedOrder.paymentMethod}</p>
                                            </div>
                                          </div>
                                          
                                          <div>
                                            <Label>Update Status</Label>
                                            <Select 
                                              defaultValue={selectedOrder.status}
                                              onValueChange={(value) => {
                                                updateOrderMutation.mutate({
                                                  orderId: selectedOrder.id,
                                                  status: value
                                                });
                                              }}
                                            >
                                              <SelectTrigger>
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="pending">Pending</SelectItem>
                                                <SelectItem value="processing">Processing</SelectItem>
                                                <SelectItem value="shipped">Shipped</SelectItem>
                                                <SelectItem value="delivered">Delivered</SelectItem>
                                                <SelectItem value="cancelled">Cancelled</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>

                                          <div>
                                            <Label>Order Items</Label>
                                            <div className="mt-2 space-y-2">
                                              {selectedOrder.items?.map((item, index) => (
                                                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                                  <span>{item.productName}</span>
                                                  <span className="text-sm text-gray-600">
                                                    {item.quantity} × ${item.price}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </DialogContent>
                                  </Dialog>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vendor Management */}
          <TabsContent value="vendors">
            <Card>
              <CardHeader>
                <CardTitle>Vendor Management</CardTitle>
                <CardDescription>
                  Review and approve vendor registrations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {vendorsLoading ? (
                    <div className="text-center py-8">Loading vendors...</div>
                  ) : pendingVendors.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No pending vendors</div>
                  ) : (
                    <div className="grid gap-4">
                      {pendingVendors.map((vendor: PendingVendor) => (
                        <Card key={vendor.id}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="space-y-2">
                                <h3 className="font-semibold">{vendor.businessName}</h3>
                                <p className="text-sm text-gray-600">Owner: {vendor.ownerName}</p>
                                <p className="text-sm text-gray-600">Email: {vendor.email}</p>
                                <p className="text-sm text-gray-600">Type: {vendor.businessType}</p>
                                <p className="text-sm text-gray-600">Phone: {vendor.phone}</p>
                                <Badge variant="outline">
                                  {vendor.status}
                                </Badge>
                              </div>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => updateVendorStatusMutation.mutate({
                                    vendorId: vendor.id,
                                    status: 'approved'
                                  })}
                                  disabled={updateVendorStatusMutation.isPending}
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => updateVendorStatusMutation.mutate({
                                    vendorId: vendor.id,
                                    status: 'rejected'
                                  })}
                                  disabled={updateVendorStatusMutation.isPending}
                                >
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Celebrity Management */}
          <TabsContent value="celebrities">
            <Card>
              <CardHeader>
                <CardTitle>Celebrity Management</CardTitle>
                <CardDescription>
                  Review and approve celebrity registrations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {celebritiesLoading ? (
                    <div className="text-center py-8">Loading celebrities...</div>
                  ) : pendingCelebrities.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No pending celebrities</div>
                  ) : (
                    <div className="grid gap-4">
                      {pendingCelebrities.map((celebrity: PendingCelebrity) => (
                        <Card key={celebrity.id}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="space-y-2">
                                <h3 className="font-semibold">{celebrity.fullName}</h3>
                                <p className="text-sm text-gray-600">Stage Name: {celebrity.stageName}</p>
                                <p className="text-sm text-gray-600">Email: {celebrity.email}</p>
                                <p className="text-sm text-gray-600">Phone: {celebrity.phone}</p>
                                <p className="text-sm text-gray-600">Bio: {celebrity.bio?.substring(0, 100)}...</p>
                                <Badge variant="outline">
                                  {celebrity.status}
                                </Badge>
                              </div>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => updateCelebrityStatusMutation.mutate({
                                    celebrityId: celebrity.id,
                                    status: 'approved'
                                  })}
                                  disabled={updateCelebrityStatusMutation.isPending}
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => updateCelebrityStatusMutation.mutate({
                                    celebrityId: celebrity.id,
                                    status: 'rejected'
                                  })}
                                  disabled={updateCelebrityStatusMutation.isPending}
                                >
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Management */}
          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle>Product Management</CardTitle>
                <CardDescription>
                  Manage platform products and categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  Product management interface coming soon
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Management */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage platform users and accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  User management interface coming soon
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Platform Settings</CardTitle>
                <CardDescription>
                  Configure platform settings and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  Settings interface coming soon
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}