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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Store,
  Package,
  ShoppingCart,
  Plus,
  Edit,
  Eye,
  DollarSign,
  AlertCircle,
  Star,
} from "lucide-react";
import { useTranslation } from "react-i18next";

// Type definitions for vendor dashboard
interface VendorProfile {
  businessName: string;
  email: string;
  phone: string;
  address: string;
  status: string;
  rating?: string;
  totalOrders?: number;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  inventory: number;
  isActive: boolean;
  images?: string[];
}

interface Order {
  orderId: number;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  items?: unknown[];
  totalAmountMinor: number;
  currency: string;
  status: string;
  createdAt: string;
}

interface Category {
  id: number;
  name: string;
}

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
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");
  const [_selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");

  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Redirect to home if not authenticated or not a vendor
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== "vendor")) {
      toast({
        title: t("Access Denied"),
        description: t("You need vendor access to view this page."),
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  // Fetch vendor profile
  const { data: vendorProfile } = useQuery<VendorProfile>({
    queryKey: ["/api/vendor/profile"],
    enabled: isAuthenticated && user?.role === "vendor",
    retry: false,
  });

  // Fetch vendor products
  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/vendor/products"],
    enabled: isAuthenticated && user?.role === "vendor",
    retry: false,
  });

  // Fetch vendor orders
  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/vendor/orders"],
    enabled: isAuthenticated && user?.role === "vendor",
    retry: false,
  });

  // Fetch categories for product form
  const { data: categories = [] } = useQuery<Category[]>({
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
        title: t("Product created"),
        description: t("Your product has been added successfully."),
      });
      setIsProductDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: t("Unauthorized"),
          description: t("You are logged out. Logging in again..."),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: t("Error"),
        description: t("Failed to create product. Please try again."),
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
        title: t("Order updated"),
        description: t("Order status has been updated successfully."),
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: t("Unauthorized"),
          description: t("You are logged out. Logging in again..."),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: t("Error"),
        description: t("Failed to update order status."),
        variant: "destructive",
      });
    },
  });

  const acceptOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      return await apiRequest("POST", `/api/vendor/orders/${orderId}/accept`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/orders"] });
      toast({
        title: t("Order accepted"),
        description: t("Order has been confirmed and customer notified."),
      });
    },
    onError: (_error) => {
      toast({
        title: t("Error"),
        description: t("Failed to accept order."),
        variant: "destructive",
      });
    },
  });

  const denyOrderMutation = useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: number; reason: string }) => {
      return await apiRequest("POST", `/api/vendor/orders/${orderId}/deny?reason=${encodeURIComponent(reason)}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/orders"] });
      toast({
        title: t("Order denied"),
        description: t("Order has been cancelled and customer notified."),
      });
    },
    onError: (_error) => {
      toast({
        title: t("Error"),
        description: t("Failed to deny order."),
        variant: "destructive",
      });
    },
  });

  const calculateMetrics = () => {
    const totalProducts = products.length;
    const activeProducts = products.filter((p) => p.isActive).length;
    const totalOrders = orders.length;
    const completedOrders = orders.filter((o) => o.status === "DELIVERED").length;
    const placedOrders = orders.filter((o) => o.status === "PLACED").length;
    const pendingOrders = orders.filter((o) => ["PENDING", "PLACED", "CONFIRMED", "PROCESSING"].includes(o.status)).length;
    const totalRevenue = orders
      .filter((o) => o.status === "DELIVERED")
      .reduce((sum: number, order) => sum + (order.totalAmountMinor / 100), 0);

    return {
      totalProducts,
      activeProducts,
      totalOrders,
      completedOrders,
      placedOrders,
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
    const lowerStatus = status?.toLowerCase();
    switch (lowerStatus) {
      case "pending": return "bg-amber-100 text-amber-800";
      case "placed": return "bg-purple-100 text-purple-800";
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
            {t("Vendor Dashboard")}
          </h1>
          <p className="text-gray-600">
            {t("Welcome back,")} {user?.firstName || "Vendor"}{t("! Manage your store and track your performance.")}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">{t("Overview")}</TabsTrigger>
            <TabsTrigger value="products">{t("Products")}</TabsTrigger>
            <TabsTrigger value="orders">{t("Orders")}</TabsTrigger>
            <TabsTrigger value="custom-orders">{t("Custom Orders")}</TabsTrigger>
            <TabsTrigger value="settings">{t("Settings")}</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("Total Products")}</CardTitle>
                  <Package className="h-4 w-4 text-ethiopian-gold" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.totalProducts}</div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.activeProducts} {t("active")}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("Total Orders")}</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-ethiopian-gold" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.totalOrders}</div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.placedOrders} {t("awaiting approval")}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("Revenue")}</CardTitle>
                  <DollarSign className="h-4 w-4 text-ethiopian-gold" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.totalRevenue.toFixed(2)} {t("ETB")}</div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.completedOrders} {t("completed orders")}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("Store Rating")}</CardTitle>
                  <Star className="h-4 w-4 text-ethiopian-gold" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {vendorProfile?.rating ? parseFloat(vendorProfile.rating).toFixed(1) : "N/A"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {vendorProfile?.totalOrders || 0} {t("total orders")}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Orders */}
            <Card>
              <CardHeader>
                <CardTitle>{t("Recent Orders")}</CardTitle>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ethiopian-gold"></div>
                  </div>
                ) : orders.length > 0 ? (
                  <div className="space-y-4">
                    {orders.slice(0, 5).map((order: any) => (
                      <div key={order.orderId} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div>
                            <p className="font-medium">{t("Order #")}{order.orderNumber}</p>
                            <p className="text-sm text-gray-600">{order.customerName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(order.status)}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1).toLowerCase()}
                          </Badge>
                          <p className="text-sm text-gray-600 mt-1">{(order.totalAmountMinor / 100).toFixed(2)} {order.currency}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ShoppingCart size={48} className="text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">{t("No orders yet")}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-charcoal">{t("Your Products")}</h2>
              <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-ethiopian-gold hover:bg-amber text-white">
                    <Plus size={16} className="mr-2" />
                    {t("Add Product")}
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
                              <FormLabel>{t("Product Name")}</FormLabel>
                              <FormControl>
                                <Input placeholder={t("Enter product name")} {...field} />
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
                              <FormLabel>{t("Category")}</FormLabel>
                              <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={t("Select category")} />
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
                            <FormLabel>{t("Description")}</FormLabel>
                            <FormControl>
                              <Textarea placeholder={t("Describe your product...")} rows={3} {...field} />
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
                              <FormLabel>{t("Price (ETB)")}</FormLabel>
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
                              <FormLabel>{t("Inventory")}</FormLabel>
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
                              <FormLabel>{t("Delivery Days")}</FormLabel>
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
                              <FormLabel>{t("Weight (kg)")}</FormLabel>
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
                              <FormLabel>{t("SKU (Optional)")}</FormLabel>
                              <FormControl>
                                <Input placeholder={t("ZEM-001")} {...field} />
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
                              <FormLabel>{t("Tags")}</FormLabel>
                              <FormControl>
                                <Input placeholder={t("handmade, authentic")} {...field} />
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
                          {t("Cancel")}
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
                        <span className="text-ethiopian-gold font-bold text-lg">{product.price} {t("ETB")}</span>
                        <span className="text-sm text-gray-500">{t("Stock:")} {product.inventory}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditProduct(product)}
                          className="flex-1"
                        >
                          <Edit size={14} className="mr-1" />
                          {t("Edit")}
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          <Eye size={14} className="mr-1" />
                          {t("View")}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package size={64} className="text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t("No products yet")}</h3>
                <p className="text-gray-500 mb-6">{t("Start by adding your first product to the marketplace")}</p>
                <Button 
                  onClick={() => setIsProductDialogOpen(true)}
                  className="bg-ethiopian-gold hover:bg-amber text-white"
                >
                  {t("Add Your First Product")}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-charcoal">{t("Order Management")}</h2>
            </div>

            {/* Order Status Filter Tabs */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={orderStatusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setOrderStatusFilter('all')}
              >
                {t("All (")}{orders.length})
              </Button>
              <Button
                variant={orderStatusFilter === 'PLACED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setOrderStatusFilter('PLACED')}
                className={orderStatusFilter !== 'PLACED' && orders.filter((o: any) => o.status === 'PLACED').length > 0 ? 'border-purple-500 text-purple-700' : ''}
              >
                {t("Awaiting Approval (")}{orders.filter((o: any) => o.status === 'PLACED').length})
              </Button>
              <Button
                variant={orderStatusFilter === 'CONFIRMED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setOrderStatusFilter('CONFIRMED')}
              >
                {t("Confirmed (")}{orders.filter((o: any) => o.status === 'CONFIRMED').length})
              </Button>
              <Button
                variant={orderStatusFilter === 'PROCESSING' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setOrderStatusFilter('PROCESSING')}
              >
                {t("Processing (")}{orders.filter((o: any) => o.status === 'PROCESSING').length})
              </Button>
              <Button
                variant={orderStatusFilter === 'SHIPPED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setOrderStatusFilter('SHIPPED')}
              >
                {t("Shipped (")}{orders.filter((o: any) => o.status === 'SHIPPED').length})
              </Button>
              <Button
                variant={orderStatusFilter === 'DELIVERED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setOrderStatusFilter('DELIVERED')}
              >
                {t("Delivered (")}{orders.filter((o: any) => o.status === 'DELIVERED').length})
              </Button>
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
                        <TableHead>{t("Order ID")}</TableHead>
                        <TableHead>{t("Customer")}</TableHead>
                        <TableHead>{t("Items")}</TableHead>
                        <TableHead>{t("Total")}</TableHead>
                        <TableHead>{t("Status")}</TableHead>
                        <TableHead>{t("Date")}</TableHead>
                        <TableHead>{t("Actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders
                        .filter((order: any) => orderStatusFilter === 'all' || order.status === orderStatusFilter)
                        .map((order: any) => (
                        <TableRow key={order.orderId}>
                          <TableCell className="font-medium">
                            #{order.orderNumber}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{order.customerName}</p>
                              <p className="text-sm text-gray-600">{order.customerPhone}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {order.items?.length || 0} {t("items")}
                          </TableCell>
                          <TableCell className="font-medium">
                            {(order.totalAmountMinor / 100).toFixed(2)} {order.currency}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(order.status.toLowerCase())}>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1).toLowerCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(order.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {order.status === 'PLACED' ? (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => acceptOrderMutation.mutate(order.orderId)}
                                  disabled={acceptOrderMutation.isPending}
                                >
                                  {acceptOrderMutation.isPending ? 'Accepting...' : 'Accept'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    const reason = prompt('Please provide a reason for denying this order:');
                                    if (reason && reason.trim()) {
                                      denyOrderMutation.mutate({ orderId: order.orderId, reason: reason.trim() });
                                    } else if (reason !== null) {
                                      toast({
                                        title: t("Rejection reason required"),
                                        description: t("Please provide a valid reason for denying this order."),
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                  disabled={denyOrderMutation.isPending}
                                >
                                  {denyOrderMutation.isPending ? 'Denying...' : 'Deny'}
                                </Button>
                              </div>
                            ) : (
                              <Select
                                value={order.status}
                                onValueChange={(status) => 
                                  updateOrderStatusMutation.mutate({ orderId: order.orderId, status })
                                }
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">{t("Pending")}</SelectItem>
                                  <SelectItem value="placed">{t("Placed")}</SelectItem>
                                  <SelectItem value="confirmed">{t("Confirmed")}</SelectItem>
                                  <SelectItem value="processing">{t("Processing")}</SelectItem>
                                  <SelectItem value="shipped">{t("Shipped")}</SelectItem>
                                  <SelectItem value="delivered">{t("Delivered")}</SelectItem>
                                  <SelectItem value="cancelled">{t("Cancelled")}</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
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
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t("No orders yet")}</h3>
                <p className="text-gray-500">{t("Orders will appear here when customers purchase your products")}</p>
              </div>
            )}
          </TabsContent>

          {/* Custom Orders Tab */}
          <TabsContent value="custom-orders" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-charcoal">{t("Custom Order Requests")}</h2>
            </div>

            <div className="text-center py-12">
              <AlertCircle size={64} className="text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t("No custom orders")}</h3>
              <p className="text-gray-500">{t("Custom order requests from customers will appear here")}</p>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-charcoal">{t("Vendor Settings")}</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t("Business Information")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {vendorProfile ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">{t("Business Name")}</label>
                        <p className="text-gray-600">{vendorProfile.businessName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">{t("Email")}</label>
                        <p className="text-gray-600">{vendorProfile.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">{t("Phone")}</label>
                        <p className="text-gray-600">{vendorProfile.phone}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">{t("Address")}</label>
                        <p className="text-gray-600">{vendorProfile.address}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">{t("Status")}</label>
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
                      <p className="text-gray-600">{t("Vendor profile not found")}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("Store Statistics")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-ethiopian-gold">{metrics.totalProducts}</div>
                      <div className="text-sm text-gray-600">{t("Total Products")}</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-ethiopian-gold">{metrics.totalOrders}</div>
                      <div className="text-sm text-gray-600">{t("Total Orders")}</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-ethiopian-gold">
                        {vendorProfile?.rating ? parseFloat(vendorProfile.rating).toFixed(1) : "N/A"}
                      </div>
                      <div className="text-sm text-gray-600">{t("Store Rating")}</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-ethiopian-gold">{metrics.totalRevenue.toFixed(0)}</div>
                      <div className="text-sm text-gray-600">{t("Revenue (ETB)")}</div>
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
