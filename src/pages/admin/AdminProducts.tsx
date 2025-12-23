import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Search, 
  Loader2,
  Package,
  Eye,
  AlertTriangle,
  Check,
  X,
  DollarSign,
  Clock
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import { useToast } from '@/hooks/use-toast';
import { getProductImageUrl } from '@/utils/imageUtils';

interface Product {
  id: number;
  name: string;
  description: string;
  summary?: string;
  cover?: string;
  images?: Array<{
    id: number;
    url: string;
    fullUrl?: string;
    originalFilename?: string;
    altText?: string;
    sortOrder: number;
    isPrimary: boolean;
    fileSize?: number;
    contentType?: string;
    createdAt?: string;
  }>;
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'DRAFT' | 'INACTIVE' | 'ARCHIVED';
  vendorId: number;
  vendorName?: string;
  categoryName?: string;
  subCategoryId?: number;
  price?: {
    id: number;
    amount: number;
    vendorAmount?: number;
    unitAmountMinor?: number;
    vendorAmountMinor?: number;
    currencyCode: string;
  };
  productSku?: Array<{
    id: number;
    skuCode: string;
    stockQuantity: number;
    isDefault?: boolean;
    attributes?: Array<{
      id: number;
      name: string;
      value: string;
    }>;
    price?: {
      id?: number;
      amount: number;
      vendorAmount?: number;
      unitAmountMinor?: number;
      vendorAmountMinor?: number;
      currencyCode: string;
    };
  }>;
  createdAt: string;
}

export default function AdminProducts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; productId?: number; type: 'product' | 'price' }>({ 
    open: false, 
    type: 'product' 
  });
  const [rejectReason, setRejectReason] = useState('');

  // Fetch all products
  const { data: allProductsData, isLoading: allProductsLoading } = useQuery({
    queryKey: ['admin', 'all-products', searchTerm],
    queryFn: async () => {
      const response = await adminService.getAllProducts(0, 100, undefined, searchTerm);
      return response.content || [];
    },
  });

  // Fetch pending products
  const { data: pendingProductsData, isLoading: pendingLoading } = useQuery({
    queryKey: ['admin', 'pending-products'],
    queryFn: async () => {
      const response = await adminService.getPendingProducts(0, 100);
      return response.content || [];
    },
  });

  // Fetch price update requests
  const { data: priceRequestsData, isLoading: priceRequestsLoading } = useQuery({
    queryKey: ['admin', 'product-price-requests'],
    queryFn: async () => {
      const response = await adminService.getProductPriceUpdateRequests(0, 100);
      return response.content || [];
    },
  });

  const allProducts = allProductsData || [];
  const pendingProducts = pendingProductsData || [];
  const priceRequests = priceRequestsData || [];
  const pendingPriceRequests = priceRequests.filter((r: any) => r.status === 'PENDING');

  // Approve product mutation
  const approveProductMutation = useMutation({
    mutationFn: (productId: number) => adminService.approveProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-products'] });
      toast({ title: 'Success', description: 'Product approved successfully' });
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
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-products'] });
      toast({ title: 'Success', description: 'Product rejected' });
      setRejectDialog({ open: false, type: 'product' });
      setRejectReason('');
      setSelectedProduct(null);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to reject product', variant: 'destructive' });
    },
  });

  // Approve product price update mutation
  const approveProductPriceUpdateMutation = useMutation({
    mutationFn: (requestId: number) => adminService.approveProductPriceUpdate(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'product-price-requests'] });
      toast({
        title: 'Price Update Approved',
        description: 'The product price has been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve price update',
        variant: 'destructive',
      });
    },
  });

  // Reject product price update mutation
  const rejectProductPriceUpdateMutation = useMutation({
    mutationFn: ({ requestId, reason }: { requestId: number; reason: string }) => 
      adminService.rejectProductPriceUpdate(requestId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'product-price-requests'] });
      toast({
        title: 'Price Update Rejected',
        description: 'The price update request has been rejected.',
      });
      setRejectDialog({ open: false, type: 'price' });
      setRejectReason('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject price update',
        variant: 'destructive',
      });
    },
  });

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast({
        title: 'Reason Required',
        description: 'Please provide a reason for rejection.',
        variant: 'destructive',
      });
      return;
    }

    if (rejectDialog.type === 'product' && rejectDialog.productId) {
      rejectProductMutation.mutate({ productId: rejectDialog.productId, reason: rejectReason });
    } else if (rejectDialog.type === 'price' && rejectDialog.productId) {
      rejectProductPriceUpdateMutation.mutate({ requestId: rejectDialog.productId, reason: rejectReason });
    }
  };

  const formatPrice = (product: Product) => {
    if (product.price) {
      return `${product.price.amount.toLocaleString()} ${product.price.currencyCode}`;
    }
    // Fallback to first SKU price
    if (product.productSku && product.productSku.length > 0 && product.productSku[0].price) {
      return `${product.productSku[0].price.amount.toLocaleString()} ${product.productSku[0].price.currencyCode}`;
    }
    return 'N/A';
  };

  const formatCurrency = (amountMinor: number, _currency: string = 'USD') => {
    const amount = amountMinor / 100;
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStock = (product: Product) => {
    if (product.productSku && product.productSku.length > 0) {
      return product.productSku.reduce((sum, sku) => sum + (sku.stockQuantity || 0), 0);
    }
    return 0;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      'PENDING': { color: 'bg-amber-100 text-amber-800', label: 'Pending' },
      'ACTIVE': { color: 'bg-green-100 text-green-800', label: 'Active' },
      'APPROVED': { color: 'bg-green-100 text-green-800', label: 'Approved' },
      'REJECTED': { color: 'bg-red-100 text-red-800', label: 'Rejected' },
      'DRAFT': { color: 'bg-gray-100 text-gray-800', label: 'Draft' },
      'INACTIVE': { color: 'bg-gray-100 text-gray-800', label: 'Inactive' },
      'ARCHIVED': { color: 'bg-gray-100 text-gray-800', label: 'Archived' },
    };
    const badge = badges[status] || badges['DRAFT'];
    return <Badge className={badge.color}>{badge.label}</Badge>;
  };

  return (
    <AdminLayout 
      title="Product Management" 
      description="Manage products and price update requests"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="all" className="relative">
            All Products
            {allProducts && (
              <Badge className="ml-2 bg-eagle-green text-white">{allProducts.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending" className="relative">
            Pending Products
            {pendingProducts.length > 0 && (
              <Badge className="ml-2 bg-amber-500 text-white">{pendingProducts.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="price-requests" className="relative">
            Price Update Requests
            {pendingPriceRequests.length > 0 && (
              <Badge className="ml-2 bg-blue-500 text-white">{pendingPriceRequests.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* All Products Tab */}
        <TabsContent value="all">
          <Card className="mb-6">
            <CardContent className="pt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-eagle-green" />
                All Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              {allProductsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-eagle-green" />
                </div>
              ) : allProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No products found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {(product.images?.length || product.cover) ? (
                                <img 
                                  src={getProductImageUrl(product.images as any, product.cover)} 
                                  alt={product.name} 
                                  className="h-10 w-10 rounded object-cover"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center">
                                  <Package className="h-5 w-5 text-gray-400" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-sm text-muted-foreground">{product.categoryName || 'Uncategorized'}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{product.vendorName || `Vendor #${product.vendorId}`}</TableCell>
                          <TableCell className="text-sm">{formatPrice(product)}</TableCell>
                          <TableCell className="text-sm">{getStock(product)}</TableCell>
                          <TableCell>{getStatusBadge(product.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setShowViewDialog(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {product.status === 'PENDING' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => approveProductMutation.mutate(product.id)}
                                    disabled={approveProductMutation.isPending}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => setRejectDialog({ open: true, productId: product.id, type: 'product' })}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Products Tab */}
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                Products Awaiting Approval
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-eagle-green" />
                </div>
              ) : pendingProducts.length > 0 ? (
                <div className="space-y-4">
                  {pendingProducts.map((product: any) => (
                    <div 
                      key={product.id} 
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {(product.images?.length || product.cover) ? (
                              <img 
                                src={getProductImageUrl(product.images as any, product.cover)} 
                                alt={product.name}
                                className="h-16 w-16 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="h-16 w-16 rounded-lg bg-gray-100 flex items-center justify-center">
                                <Package className="h-8 w-8 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <h3 className="font-gotham-bold text-eagle-green text-lg">{product.name}</h3>
                              <p className="text-sm text-gray-600">{product.categoryName || 'Uncategorized'}</p>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 line-clamp-2">{product.description}</p>
                          <div className="flex gap-4 mt-2 text-sm text-gray-600">
                            <span>Price: {formatPrice(product)}</span>
                            <span>Stock: {getStock(product)}</span>
                            <span>Vendor: {product.vendorName || `#${product.vendorId}`}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 lg:flex-col">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedProduct(product);
                              setShowViewDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button
                            onClick={() => approveProductMutation.mutate(product.id)}
                            disabled={approveProductMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            className="border-red-300 text-red-600 hover:bg-red-50"
                            onClick={() => setRejectDialog({ open: true, productId: product.id, type: 'product' })}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No pending products</h3>
                  <p className="text-gray-500">All products have been reviewed</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Price Update Requests Tab */}
        <TabsContent value="price-requests">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-500" />
                Price Update Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {priceRequestsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-eagle-green" />
                </div>
              ) : priceRequests.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product / SKU</TableHead>
                      <TableHead className="text-right">Current Customer Price</TableHead>
                      <TableHead className="text-right">Current Vendor Price</TableHead>
                      <TableHead className="text-right">Requested Customer Price</TableHead>
                      <TableHead className="text-right">Requested Vendor Price</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {priceRequests.map((request: any) => {
                      const currentCustomer = request.currentPrice?.unitAmountMinor || 0;
                      const currentVendor = request.currentPrice?.vendorAmountMinor || 0;
                      const newCustomer = request.newPrice?.unitAmountMinor || 0;
                      const newVendor = request.newPrice?.vendorAmountMinor || 0;
                      const currency = request.currentPrice?.currencyCode || request.newPrice?.currencyCode || 'ETB';
                      
                      return (
                        <TableRow key={request.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{request.productName}</div>
                              {request.skuCode && (
                                <div className="text-sm text-gray-500 font-mono">SKU: {request.skuCode}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(currentCustomer)} {currency}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatCurrency(currentVendor)} {currency}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            <span className={newCustomer > currentCustomer ? 'text-red-600' : newCustomer < currentCustomer ? 'text-green-600' : ''}>
                              {formatCurrency(newCustomer)} {currency}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatCurrency(newVendor)} {currency}
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-gray-600 max-w-xs truncate" title={request.reason}>
                              {request.reason}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              request.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                              request.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }>
                              {request.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {request.status === 'PENDING' ? (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => approveProductPriceUpdateMutation.mutate(request.id)}
                                  disabled={approveProductPriceUpdateMutation.isPending}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setRejectDialog({ open: true, productId: request.id, type: 'price' })}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">Processed</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No price update requests</h3>
                  <p className="text-gray-500">All requests have been processed</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Product Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription>
              View product information
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="flex gap-4">
                {(selectedProduct.images?.length || selectedProduct.cover) ? (
                  <img 
                    src={getProductImageUrl(selectedProduct.images as any, selectedProduct.cover)} 
                    alt={selectedProduct.name}
                    className="h-32 w-32 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-32 w-32 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Package className="h-16 w-16 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{selectedProduct.name}</h3>
                  <p className="text-muted-foreground text-sm mb-2">{selectedProduct.categoryName}</p>
                  {getStatusBadge(selectedProduct.status)}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Base Price</p>
                  <p className="font-medium">{formatPrice(selectedProduct)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Stock</p>
                  <p className="font-medium">{getStock(selectedProduct)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Vendor</p>
                  <p className="font-medium">{selectedProduct.vendorName || `Vendor #${selectedProduct.vendorId}`}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">{new Date(selectedProduct.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              
              {selectedProduct.description && (
                <div>
                  <p className="text-muted-foreground text-sm">Description</p>
                  <p className="text-sm mt-1">{selectedProduct.description}</p>
                </div>
              )}

              {/* SKU Prices Section */}
              {selectedProduct.productSku && selectedProduct.productSku.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-eagle-green" />
                    SKU Prices
                  </h4>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>SKU Code</TableHead>
                          <TableHead>Attributes</TableHead>
                          <TableHead className="text-right">Customer Price</TableHead>
                          <TableHead className="text-right">Vendor Price</TableHead>
                          <TableHead className="text-right">Platform Fee</TableHead>
                          <TableHead className="text-right">Stock</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedProduct.productSku.map((sku) => {
                          const customerPrice = sku.price?.unitAmountMinor || (sku.price?.amount ? sku.price.amount * 100 : 0);
                          const vendorPrice = sku.price?.vendorAmountMinor || (sku.price?.vendorAmount ? sku.price.vendorAmount * 100 : 0);
                          const platformFee = customerPrice - vendorPrice;
                          const currency = sku.price?.currencyCode || 'ETB';
                          
                          return (
                            <TableRow key={sku.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm">{sku.skuCode}</span>
                                  {sku.isDefault && (
                                    <Badge variant="outline" className="text-xs">Default</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {sku.attributes && sku.attributes.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {sku.attributes.map((attr, idx) => (
                                      <Badge key={idx} variant="secondary" className="text-xs">
                                        {attr.name}: {attr.value}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(customerPrice)} {currency}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {formatCurrency(vendorPrice)} {currency}
                              </TableCell>
                              <TableCell className="text-right text-green-600">
                                {formatCurrency(platformFee)} {currency}
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge variant={sku.stockQuantity > 0 ? "outline" : "destructive"}>
                                  {sku.stockQuantity}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
            {selectedProduct?.status === 'PENDING' && (
              <>
                <Button
                  variant="outline"
                  className="text-red-600"
                  onClick={() => {
                    setShowViewDialog(false);
                    setRejectDialog({ open: true, productId: selectedProduct.id, type: 'product' });
                  }}
                >
                  Reject
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    setShowViewDialog(false);
                    approveProductMutation.mutate(selectedProduct.id);
                  }}
                >
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ ...rejectDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Reject {rejectDialog.type === 'product' ? 'Product' : 'Price Update'}
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejection. This will be sent to the vendor.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, type: 'product' })}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={rejectProductMutation.isPending || rejectProductPriceUpdateMutation.isPending}
            >
              {(rejectProductMutation.isPending || rejectProductPriceUpdateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
