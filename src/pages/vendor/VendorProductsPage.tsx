import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { vendorService, VendorProfile, Product } from "@/services/vendorService";
import { getProductImageUrl } from "@/utils/imageUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Package,
  Plus,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { RejectionReasonWithModal } from "@/components/RejectionReasonModal";

export default function VendorProductsPage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const isVendor = user?.role?.toUpperCase() === 'VENDOR';

  const [searchQuery, setSearchQuery] = useState("");

  // State for deactivate dialog
  const [deactivateProductDialog, setDeactivateProductDialog] = useState<{ open: boolean; productId: number | null; productName: string }>({
    open: false, productId: null, productName: ''
  });

  // Fetch vendor profile
  const { data: vendorProfile } = useQuery<VendorProfile>({
    queryKey: ['vendor', 'profile'],
    queryFn: () => vendorService.getMyProfile(),
    enabled: isAuthenticated && isVendor,
  });

  // Fetch vendor products
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['vendor', 'my-products'],
    queryFn: () => vendorService.getMyProducts(),
    enabled: isAuthenticated && isVendor,
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

  const products: Product[] = productsData?.content || [];

  const { data: subCategoryNameMap = {} } = useQuery<Record<number, string>>({
    queryKey: ['vendor', 'sub-category-name-map'],
    queryFn: async () => {
      const categoriesRes = await fetch('/api/categories', { credentials: 'include' });
      const categories = await categoriesRes.json();

      const subCategoryGroups = await Promise.allSettled(
        (categories || []).map(async (cat: any) => {
          const res = await fetch(`/api/categories/${cat.id}/sub-categories`, { credentials: 'include' });
          return await res.json();
        })
      );

      const flatSubs = subCategoryGroups
        .filter((result): result is PromiseFulfilledResult<any[]> => result.status === 'fulfilled')
        .flatMap((result) => result.value || []);

      return flatSubs.reduce((acc: Record<number, string>, sub: any) => {
        if (sub?.id) {
          acc[sub.id] = sub.name;
        }
        return acc;
      }, {});
    },
  });

  const getSubCategoryName = (product: Product) => {
    if (product.subCategoryName) return product.subCategoryName;
    if (!product.subCategoryId) return 'N/A';
    return subCategoryNameMap[product.subCategoryId] || `#${product.subCategoryId}`;
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.categoryName && product.categoryName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (product.summary && product.summary.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
      case 'APPROVED':
      case 'ENABLED':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'PENDING':
      case 'PENDING_APPROVAL':
        return <Badge className="bg-amber-100 text-amber-800">Pending</Badge>;
      case 'REJECTED':
      case 'DISABLED':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case 'DRAFT':
        return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
      case 'INACTIVE':
        return <Badge className="bg-slate-100 text-slate-800">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h2 className="text-xl font-semibold">My Products</h2>
          <p className="text-sm text-muted-foreground">Manage your product catalog</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
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
      </div>

      {filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">
              {searchQuery ? "No products match your search" : "No products yet"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "Try a different search term" : "Start by creating your first product"}
            </p>
            {!searchQuery && (
              vendorProfile?.isApproved ? (
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
              )
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredProducts.map((product) => (
            <Card key={product.id}>
              <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4">
                <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                  <img 
                    src={getProductImageUrl(product.images, product.cover)} 
                    alt={product.name} 
                    className="h-16 w-16 rounded object-cover flex-shrink-0"
                    onError={(e) => { e.currentTarget.classList.add('hidden'); const fallback = e.currentTarget.nextElementSibling; if (fallback) fallback.classList.remove('hidden'); }}
                  />
                  <div className="h-16 w-16 rounded bg-gray-200 hidden items-center justify-center">
                    <Package className="h-8 w-8 text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-semibold sm:whitespace-normal">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">{product.categoryName}</p>
                    <p className="text-xs text-muted-foreground">Subcategory: {getSubCategoryName(product)}</p>
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
                <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/vendor/products/${product.id}`}>View Details</Link>
                  </Button>
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
    </div>
  );
}
