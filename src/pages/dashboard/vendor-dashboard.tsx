import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Store,
  Package,
  ShoppingCart,
  TrendingUp,
  Plus,
  Edit,
  Eye,
  DollarSign,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Star,
  MoreHorizontal,
  Settings
} from "lucide-react";

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.string().min(1, "Price is required"),
  categoryId: z.number().min(1, "Category is required"),
  inventory: z.number().min(0, "Inventory must be 0 or greater"),
  deliveryDays: z.number().min(1, "Delivery days must be at least 1"),
  tags: z.string().optional(),
  weight: z.string().optional(),
  sku: z.string().optional(),
});

type ProductForm = z.infer<typeof productSchema>;

export default function VendorDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Redirect to home if not authenticated or not a vendor
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== "vendor")) {
      toast({
        title: "Access Denied",
        description: "You need vendor access to view this page.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  // Fetch vendor profile
  const { data: vendorProfile } = useQuery({
    queryKey: ["/api/vendor/profile"],
    enabled: isAuthenticated && user?.role === "vendor",
    retry: false,
  });

  // Fetch vendor products
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["/api/vendor/products"],
    enabled: isAuthenticated && user?.role === "vendor",
    retry: false,
  });

  // Fetch vendor orders
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/vendor/orders"],
    enabled: isAuthenticated && user?.role === "vendor",
    retry: false,
  });

  // Fetch categories for product form
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    enabled: isAuthenticated && user?.role === "vendor",
  });

  const form = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      categoryId: 0,
      inventory: 0,
      deliveryDays: 3,
      tags: "",
      weight: "",
      sku: "",
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async (productData: ProductForm) => {
      const payload = {
        ...productData,
        price: productData.price,
        tags: productData.tags ? productData.tags.split(",").map(tag => tag.trim()) : [],
        weight: productData.weight ? parseFloat(productData.weight) : null,
      };
      return await apiRequest("POST", "/api/vendor/products", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/products"] });
      toast({
        title: "Product created",
        description: "Your product has been added successfully.",
      });
      setIsProductDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create product. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      return await apiRequest("PUT", `/api/orders/${orderId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/orders"] });
      toast({
        title: "Order updated",
        description: "Order status has been updated successfully.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update order status.",
        variant: "destructive",
      });
    },
  });

  const calculateMetrics = () => {
    const totalProducts = products.length;
    const activeProducts = products.filter((p: any) => p.isActive).length;
    const totalOrders = orders.length;
    const completedOrders = orders.filter((o: any) => o.status === "delivered").length;
    const pendingOrders = orders.filter((o: any) => ["pending", "confirmed", "processing"].includes(o.status)).length;
    const totalRevenue = orders
      .filter((o: any) => o.status === "delivered")
      .reduce((sum: number, order: any) => sum + parseFloat(order.total || "0"), 0);

    return {
      totalProducts,
      activeProducts,
      totalOrders,
      completedOrders,
      pendingOrders,
      totalRevenue,
    };
  };

  const onSubmit = (data: ProductForm) => {
    createProductMutation.mutate(data);
  };

  const handleEditProduct = (product: any) => {
    setSelectedProduct(product);
    setIsEditMode(true);
    form.reset({
      name: product.name,
      description: product.description,
      price: product.price,
      categoryId: product.categoryId,
      inventory: product.inventory,
      deliveryDays: product.deliveryDays,
      tags: product.tags?.join(", ") || "",
      weight: product.weight?.toString() || "",
      sku: product.sku || "",
    });
    setIsProductDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-amber-100 text-amber-800";
      case "confirmed": return "bg-blue-100 text-blue-800";
      case "processing": return "bg-purple-100 text-purple-800";
      case "shipped": return "bg-orange-100 text-orange-800";
      case "delivered": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-ethiopian-gold"></div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "vendor") {
    return null;
  }

  const metrics = calculateMetrics();

  return (
    <div className="min-h-screen bg-gray-50">
      

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-charcoal mb-2">
            Vendor Dashboard
          </h1>
          <p className="text-gray-600">
            Welcome back, {user?.firstName || "Vendor"}! Manage your store and track your performance.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="custom-orders">Custom Orders</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                  <Package className="h-4 w-4 text-ethiopian-gold" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.totalProducts}</div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.activeProducts} active
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-ethiopian-gold" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.totalOrders}</div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.pendingOrders} pending
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-ethiopian-gold" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.totalRevenue.toFixed(2)} ETB</div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.completedOrders} completed orders
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Store Rating</CardTitle>
                  <Star className="h-4 w-4 text-ethiopian-gold" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {vendorProfile?.rating ? parseFloat(vendorProfile.rating).toFixed(1) : "N/A"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {vendorProfile?.totalOrders || 0} total orders
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Orders */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ethiopian-gold"></div>
                  </div>
                ) : orders.length > 0 ? (
                  <div className="space-y-4">
                    {orders.slice(0, 5).map((order: any) => (
                      <div key={order.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div>
                            <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                            <p className="text-sm text-gray-600">{order.recipientName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(order.status)}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </Badge>
                          <p className="text-sm text-gray-600 mt-1">{order.total} ETB</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ShoppingCart size={48} className="text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No orders yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-charcoal">Your Products</h2>
              <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-ethiopian-gold hover:bg-amber text-white">
                    <Plus size={16} className="mr-2" />
                    Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{isEditMode ? "Edit Product" : "Add New Product"}</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Product Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter product name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="categoryId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category</FormLabel>
                              <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {categories.map((category: any) => (
                                    <SelectItem key={category.id} value={category.id.toString()}>
                                      {category.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Describe your product..." rows={3} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="price"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Price (ETB)</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="0.00" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="inventory"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Inventory</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="0" 
                                  {...field} 
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="deliveryDays"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Delivery Days</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="3" 
                                  {...field} 
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 3)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="weight"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Weight (kg)</FormLabel>
                              <FormControl>
                                <Input placeholder="1.5" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="sku"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>SKU (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="ZEM-001" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="tags"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tags</FormLabel>
                              <FormControl>
                                <Input placeholder="handmade, authentic" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex justify-end space-x-2 pt-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => {
                            setIsProductDialogOpen(false);
                            setIsEditMode(false);
                            form.reset();
                          }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createProductMutation.isPending}
                          className="bg-ethiopian-gold hover:bg-amber text-white"
                        >
                          {createProductMutation.isPending ? "Creating..." : isEditMode ? "Update Product" : "Create Product"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {productsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ethiopian-gold"></div>
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product: any) => (
                  <Card key={product.id} className="overflow-hidden">
                    <div className="aspect-video bg-gray-200 relative">
                      {product.images?.[0] ? (
                        <img 
                          src={product.images[0]} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={48} className="text-gray-400" />
                        </div>
                      )}
                      <Badge 
                        className={`absolute top-2 right-2 ${
                          product.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {product.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg mb-2 line-clamp-2">{product.name}</h3>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-ethiopian-gold font-bold text-lg">{product.price} ETB</span>
                        <span className="text-sm text-gray-500">Stock: {product.inventory}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditProduct(product)}
                          className="flex-1"
                        >
                          <Edit size={14} className="mr-1" />
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          <Eye size={14} className="mr-1" />
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package size={64} className="text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No products yet</h3>
                <p className="text-gray-500 mb-6">Start by adding your first product to the marketplace</p>
                <Button 
                  onClick={() => setIsProductDialogOpen(true)}
                  className="bg-ethiopian-gold hover:bg-amber text-white"
                >
                  Add Your First Product
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-charcoal">Order Management</h2>
            </div>

            {ordersLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ethiopian-gold"></div>
              </div>
            ) : orders.length > 0 ? (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order: any) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">
                            #{order.id.slice(0, 8)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{order.recipientName}</p>
                              <p className="text-sm text-gray-600">{order.recipientPhone}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {order.items?.length || 0} items
                          </TableCell>
                          <TableCell className="font-medium">
                            {order.total} ETB
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(order.status)}>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(order.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={order.status}
                              onValueChange={(status) => 
                                updateOrderStatusMutation.mutate({ orderId: order.id, status })
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="processing">Processing</SelectItem>
                                <SelectItem value="shipped">Shipped</SelectItem>
                                <SelectItem value="delivered">Delivered</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-12">
                <ShoppingCart size={64} className="text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
                <p className="text-gray-500">Orders will appear here when customers purchase your products</p>
              </div>
            )}
          </TabsContent>

          {/* Custom Orders Tab */}
          <TabsContent value="custom-orders" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-charcoal">Custom Order Requests</h2>
            </div>

            <div className="text-center py-12">
              <AlertCircle size={64} className="text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No custom orders</h3>
              <p className="text-gray-500">Custom order requests from customers will appear here</p>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-charcoal">Vendor Settings</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Business Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {vendorProfile ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Business Name</label>
                        <p className="text-gray-600">{vendorProfile.businessName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Email</label>
                        <p className="text-gray-600">{vendorProfile.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Phone</label>
                        <p className="text-gray-600">{vendorProfile.phone}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Address</label>
                        <p className="text-gray-600">{vendorProfile.address}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Status</label>
                        <Badge className={
                          vendorProfile.status === "approved" 
                            ? "bg-green-100 text-green-800" 
                            : vendorProfile.status === "pending"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                        }>
                          {vendorProfile.status.charAt(0).toUpperCase() + vendorProfile.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Store size={48} className="text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Vendor profile not found</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Store Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-ethiopian-gold">{metrics.totalProducts}</div>
                      <div className="text-sm text-gray-600">Total Products</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-ethiopian-gold">{metrics.totalOrders}</div>
                      <div className="text-sm text-gray-600">Total Orders</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-ethiopian-gold">
                        {vendorProfile?.rating ? parseFloat(vendorProfile.rating).toFixed(1) : "N/A"}
                      </div>
                      <div className="text-sm text-gray-600">Store Rating</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-ethiopian-gold">{metrics.totalRevenue.toFixed(0)}</div>
                      <div className="text-sm text-gray-600">Revenue (ETB)</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      
    </div>
  );
}
