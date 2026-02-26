import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { vendorService, Product } from '@/services/vendorService';
import { getProductImageUrl } from '@/utils/imageUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Package,
  DollarSign,
  Image as ImageIcon,
  Tag,
  Calendar,
  Eye,
  Edit,
  AlertTriangle,
  CheckCircle,
  Clock,
  Layers,
  Gift,
} from 'lucide-react';
import { RejectionReasonWithModal } from '@/components/RejectionReasonModal';

export default function VendorProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const productId = id ? parseInt(id, 10) : null;

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => vendorService.getProductById(productId!),
    enabled: isAuthenticated && !!productId,
  });

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string; icon: React.ElementType }> = {
      ACTIVE: { label: 'Active', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      PENDING: { label: 'Pending Review', className: 'bg-amber-100 text-amber-800', icon: Clock },
      REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-800', icon: AlertTriangle },
      INACTIVE: { label: 'Inactive', className: 'bg-slate-100 text-slate-800', icon: Package },
      DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-800', icon: Edit },
    };

    const config = statusMap[status?.toUpperCase()] || { label: status, className: '', icon: Package };
    const Icon = config.icon;

    return (
      <Badge className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Package className="h-16 w-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Product not found</h3>
        <Button asChild className="mt-4">
          <Link to="/vendor/products">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 md:gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link to="/vendor/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">{product.name}</h1>
            <p className="text-sm text-muted-foreground">{product.categoryName}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {getStatusBadge(product.status || '')}
          <Button asChild variant="outline" size="sm" className="md:size-default">
            <Link to={`/vendor/products/${product.id}/edit`}>
              <Edit className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Edit</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="md:size-default">
            <Link to={`/vendor/products/${product.id}/price`}>
              <DollarSign className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Update Price</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Rejection Notice */}
      {product.status === 'REJECTED' && product.rejectionReason && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-red-900">Rejection Reason</h3>
                <RejectionReasonWithModal
                  reason={product.rejectionReason}
                  title="Product rejection reason"
                  className="text-red-700 mt-1"
                  truncateLength={120}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Product Images */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Product Images
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              {product.images && product.images.length > 0 ? (
                product.images.map((image, index) => (
                  <div key={image.id || index} className="relative">
                    <img
                      src={image.fullUrl || image.url}
                      alt={image.altText || product.name}
                      className="w-full h-40 sm:h-48 object-cover rounded-lg"
                    />
                    {image.isPrimary && (
                      <Badge className="absolute top-2 right-2 bg-blue-500">Primary</Badge>
                    )}
                  </div>
                ))
              ) : (
                <div className="col-span-2 flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg">
                  <ImageIcon className="h-12 w-12 text-gray-300 mb-2" />
                  <p className="text-sm text-muted-foreground">No images uploaded</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Product Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Product Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Summary</Label>
              <p className="mt-1">{product.summary || 'No summary provided'}</p>
            </div>

            <Separator />

            <div>
              <Label className="text-sm font-medium text-muted-foreground">Description</Label>
              <p className="mt-1 whitespace-pre-wrap">{product.description || 'No description provided'}</p>
            </div>

            {product.occasion && (
              <>
                <Separator />
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Occasion</Label>
                  <p className="mt-1">
                    {product.occasion === 'NEW_YEAR' ? 'New Year' :
                     product.occasion === 'BIRTHDAY' ? 'Birthday' :
                     product.occasion === 'TIMKET' ? 'Timket' :
                     product.occasion === 'EASTER' ? 'Easter' :
                     product.occasion === 'CHRISTMAS' ? 'Christmas' :
                     product.occasion}
                  </p>
                </div>
              </>
            )}

            {product.tags && product.tags.length > 0 && (
              <>
                <Separator />
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {product.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                <p className="mt-1 text-sm">{product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                <p className="mt-1 text-sm">{product.updatedAt ? new Date(product.updatedAt).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>

            {/* Gift Wrapping Details */}
            <Separator />
            <div>
              <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-3">
                <Gift className="h-4 w-4" />
                Gift Wrapping
              </Label>
              {product.giftWrappable ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-700 font-medium">Gift wrapping enabled</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
                    <div>
                      <Label className="text-xs text-muted-foreground">Your Vendor Price</Label>
                      <p className="text-lg font-semibold text-eagle-green">
                        {product.giftWrapPrice != null && product.giftWrapPrice > 0
                          ? `${product.giftWrapCurrencyCode || product.price?.currencyCode || ''} ${Number(product.giftWrapPrice).toFixed(2)}`
                          : 'Free'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Customer Price</Label>
                      <p className="text-lg font-semibold">
                        {product.giftWrapCustomerPrice != null && product.giftWrapCustomerPrice > 0
                          ? `${product.giftWrapCurrencyCode || product.price?.currencyCode || ''} ${Number(product.giftWrapCustomerPrice).toFixed(2)}`
                          : 'Free'}
                      </p>
                    </div>
                  </div>
                  {product.giftWrapCurrencyCode && (
                    <p className="text-xs text-muted-foreground">
                      Prices shown in {product.giftWrapCurrencyCode}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Gift wrapping is not enabled for this product</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product SKUs/Variants */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Product Variants ({product.productSku?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {product.productSku && product.productSku.length > 0 ? (
            <div className="space-y-4">
              {product.productSku.map((sku, index) => (
                <Card key={sku.id || index} className="border-2">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{sku.skuName || `Variant ${index + 1}`}</h4>
                          {sku.isDefault && <Badge variant="outline" className="text-xs">Default</Badge>}
                        </div>

                        {sku.skuCode && (
                          <div>
                            <Label className="text-xs text-muted-foreground">SKU Code</Label>
                            <p className="text-sm">{sku.skuCode}</p>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs text-muted-foreground">Price</Label>
                            <p className="text-lg font-semibold">
                              {sku.price?.currencyCode || 'USD'} {(sku.price?.vendorAmount || sku.price?.amount || 0).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Stock</Label>
                            <p className="text-lg font-semibold">{sku.stockQuantity || 0}</p>
                          </div>
                        </div>

                        {sku.attributes && sku.attributes.length > 0 && (
                          <div>
                            <Label className="text-xs text-muted-foreground mb-2 block">Attributes</Label>
                            <div className="flex flex-wrap gap-2">
                              {sku.attributes.map((attr, attrIndex) => (
                                <Badge key={attrIndex} variant="secondary" className="text-xs">
                                  {attr.name}: {attr.value}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {sku.images && sku.images.length > 0 && (
                        <div className="ml-4">
                          <img
                            src={sku.images[0].fullUrl || sku.images[0].url}
                            alt={sku.skuName || 'Product variant'}
                            className="w-24 h-24 object-cover rounded-lg"
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg">
              <Layers className="h-12 w-12 text-gray-300 mb-2" />
              <p className="text-sm text-muted-foreground">No variants configured</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`text-sm font-medium ${className || ''}`}>{children}</div>;
}
