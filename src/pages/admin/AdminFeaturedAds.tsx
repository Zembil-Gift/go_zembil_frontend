import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Search, 
  Loader2,
  Star,
  Megaphone,
  Package,
  Calendar,
  Briefcase,
  Image as ImageIcon,
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import {ServicePackageResponse } from '@/services/serviceService';
import { apiService } from '@/services/apiService';
import { useToast } from '@/hooks/use-toast';

interface ProductSkuItem {
  id: number;
  skuCode: string;
  productId: number;
  productName: string;
  vendorName?: string;
  status: string;
  isFeatured?: boolean;
  isAd?: boolean;
  stockQuantity?: number;
  price?: {
    unitAmountMinor?: number;
    currencyCode?: string;
  };
  images?: Array<{
    url: string;
    isPrimary?: boolean;
  }>;
}

interface EventItem {
  id: number;
  title: string;
  vendorName?: string;
  status?: string;
  bannerImageUrl?: string;
  isFeatured?: boolean;
  isAd?: boolean;
  eventDate?: string;
  startingPriceMinor?: number;
  currency?: string;
}

interface ServicePackageItem extends ServicePackageResponse {
  serviceName?: string;
  vendorName?: string;
}

export default function AdminFeaturedAds() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('products');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all products (which include their SKUs)
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['admin', 'all-products-featured', searchTerm],
    queryFn: async () => {
      const response = await adminService.getAllProducts(0, 100, 'ACTIVE', searchTerm || undefined);
      return response.content || [];
    },
  });

  // Extract SKUs from products for easier display
  const productSkus: ProductSkuItem[] = (productsData || []).flatMap((product: any) => {
    return (product.productSku || []).map((sku: any) => ({
      id: sku.id,
      skuCode: sku.skuCode,
      productId: product.id,
      productName: product.name,
      vendorName: product.vendorName,
      status: sku.status || product.status,
      isFeatured: sku.isFeatured,
      isAd: sku.isAd,
      stockQuantity: sku.stockQuantity,
      price: sku.price,
      images: sku.images,
    }));
  });

  // Fetch all events
  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['admin', 'all-events-featured'],
    queryFn: async () => {
      const response = await adminService.getAllEvents(0, 100, 'APPROVED');
      return response.content || [];
    },
  });

  // Fetch all approved service packages
  const { data: servicePackagesData, isLoading: servicePackagesLoading } = useQuery({
    queryKey: ['admin', 'all-service-packages-featured'],
    queryFn: async () => {
      const response = await apiService.getRequest<{ content: ServicePackageItem[] }>('/api/admin/service-packages?status=APPROVED&page=0&size=100');
      return response.content || [];
    },
  });

  const events: EventItem[] = eventsData || [];
  const servicePackages: ServicePackageItem[] = servicePackagesData || [];

  // SKU featured/ad mutations (products use SKU-level featured/ad)
  const setSkuFeaturedMutation = useMutation({
    mutationFn: ({ skuId, featured }: { skuId: number; featured: boolean }) =>
      adminService.setSkuFeatured(skuId, featured),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-products-featured'] });
      toast({ title: 'Success', description: 'SKU featured status updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to update featured status', variant: 'destructive' });
    },
  });

  const setSkuAdMutation = useMutation({
    mutationFn: ({ skuId, isAd }: { skuId: number; isAd: boolean }) =>
      adminService.setSkuAd(skuId, isAd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-products-featured'] });
      toast({ title: 'Success', description: 'SKU ad status updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to update ad status', variant: 'destructive' });
    },
  });

  // Event featured/ad mutations
  const setEventFeaturedMutation = useMutation({
    mutationFn: ({ eventId, featured }: { eventId: number; featured: boolean }) =>
      adminService.setEventFeatured(eventId, featured),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-events-featured'] });
      toast({ title: 'Success', description: 'Event featured status updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to update featured status', variant: 'destructive' });
    },
  });

  const setEventAdMutation = useMutation({
    mutationFn: ({ eventId, isAd }: { eventId: number; isAd: boolean }) =>
      adminService.setEventAd(eventId, isAd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-events-featured'] });
      toast({ title: 'Success', description: 'Event ad status updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to update ad status', variant: 'destructive' });
    },
  });

  // Service package featured/ad mutations
  const setServicePackageFeaturedMutation = useMutation({
    mutationFn: ({ packageId, featured }: { packageId: number; featured: boolean }) =>
      adminService.setServicePackageFeatured(packageId, featured),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-service-packages-featured'] });
      toast({ title: 'Success', description: 'Service package featured status updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to update featured status', variant: 'destructive' });
    },
  });

  const setServicePackageAdMutation = useMutation({
    mutationFn: ({ packageId, isAd }: { packageId: number; isAd: boolean }) =>
      adminService.setServicePackageAd(packageId, isAd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-service-packages-featured'] });
      toast({ title: 'Success', description: 'Service package ad status updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to update ad status', variant: 'destructive' });
    },
  });

  const formatPrice = (amountMinor: number | undefined, currency: string = 'ETB') => {
    if (amountMinor === undefined || amountMinor === null) return 'N/A';
    return `${(amountMinor / 100).toFixed(2)} ${currency}`;
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Count featured and ads (using SKU-level counts for products)
  const featuredSkusCount = productSkus.filter(s => s.isFeatured).length;
  const adSkusCount = productSkus.filter(s => s.isAd).length;
  const featuredEventsCount = events.filter(e => e.isFeatured).length;
  const adEventsCount = events.filter(e => e.isAd).length;
  const featuredPackagesCount = servicePackages.filter(sp => sp.isFeatured).length;
  const adPackagesCount = servicePackages.filter(sp => sp.isAd).length;

  return (
    <AdminLayout
      title="Featured & Advertisements"
      description="Manage featured items and advertisements across products, events, and services"
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-eagle-green" />
              Product SKUs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-lg font-bold">{featuredSkusCount}</span>
                <span className="text-sm text-muted-foreground">Featured</span>
              </div>
              <div className="flex items-center gap-1">
                <Megaphone className="h-4 w-4 text-blue-500" />
                <span className="text-lg font-bold">{adSkusCount}</span>
                <span className="text-sm text-muted-foreground">Ads</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-eagle-green" />
              Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-lg font-bold">{featuredEventsCount}</span>
                <span className="text-sm text-muted-foreground">Featured</span>
              </div>
              <div className="flex items-center gap-1">
                <Megaphone className="h-4 w-4 text-blue-500" />
                <span className="text-lg font-bold">{adEventsCount}</span>
                <span className="text-sm text-muted-foreground">Ads</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-eagle-green" />
              Service Packages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-lg font-bold">{featuredPackagesCount}</span>
                <span className="text-sm text-muted-foreground">Featured</span>
              </div>
              <div className="flex items-center gap-1">
                <Megaphone className="h-4 w-4 text-blue-500" />
                <span className="text-lg font-bold">{adPackagesCount}</span>
                <span className="text-sm text-muted-foreground">Ads</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Product SKUs
            <Badge className="ml-1 bg-eagle-green text-white">{productSkus.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Events
            <Badge className="ml-1 bg-eagle-green text-white">{events.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Service Packages
            <Badge className="ml-1 bg-eagle-green text-white">{servicePackages.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Product SKUs Tab */}
        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-eagle-green" />
                Product SKUs - Featured & Ads Management
              </CardTitle>
              <CardDescription>
                Toggle featured and advertisement status for product SKUs (variants)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {productsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-eagle-green" />
                </div>
              ) : productSkus.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No product SKUs found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Image</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead className="text-center">Featured</TableHead>
                        <TableHead className="text-center">Ad</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productSkus.map((sku) => {
                        const skuImage = sku.images?.find(img => img.isPrimary)?.url || sku.images?.[0]?.url;
                        return (
                          <TableRow key={sku.id}>
                            <TableCell>
                              <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100">
                                {skuImage ? (
                                  <img
                                    src={skuImage}
                                    alt={sku.skuCode}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="h-6 w-6 text-gray-400" />
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{sku.skuCode}</div>
                              <div className="text-sm text-muted-foreground">ID: {sku.id}</div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{sku.productName}</div>
                              <div className="text-sm text-muted-foreground">ID: {sku.productId}</div>
                            </TableCell>
                            <TableCell>{sku.vendorName || 'N/A'}</TableCell>
                            <TableCell>
                              {formatPrice(sku.price?.unitAmountMinor, sku.price?.currencyCode)}
                            </TableCell>
                            <TableCell>{sku.stockQuantity ?? 'N/A'}</TableCell>
                            <TableCell className="text-center">
                              <Switch
                                checked={sku.isFeatured || false}
                                onCheckedChange={(checked) =>
                                  setSkuFeaturedMutation.mutate({ skuId: sku.id, featured: checked })
                                }
                                disabled={setSkuFeaturedMutation.isPending}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch
                                checked={sku.isAd || false}
                                onCheckedChange={(checked) =>
                                  setSkuAdMutation.mutate({ skuId: sku.id, isAd: checked })
                                }
                                disabled={setSkuAdMutation.isPending}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-eagle-green" />
                Events - Featured & Ads Management
              </CardTitle>
              <CardDescription>
                Toggle featured and advertisement status for approved events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-eagle-green" />
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No approved events found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Image</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Starting Price</TableHead>
                        <TableHead className="text-center">Featured</TableHead>
                        <TableHead className="text-center">Ad</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell>
                            <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100">
                              {event.bannerImageUrl ? (
                                <img
                                  src={event.bannerImageUrl}
                                  alt={event.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="h-6 w-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{event.title}</div>
                            <div className="text-sm text-muted-foreground">ID: {event.id}</div>
                          </TableCell>
                          <TableCell>{event.vendorName || 'N/A'}</TableCell>
                          <TableCell>{formatDate(event.eventDate)}</TableCell>
                          <TableCell>
                            {formatPrice(event.startingPriceMinor, event.currency)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={event.isFeatured || false}
                              onCheckedChange={(checked) =>
                                setEventFeaturedMutation.mutate({ eventId: event.id, featured: checked })
                              }
                              disabled={setEventFeaturedMutation.isPending}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={event.isAd || false}
                              onCheckedChange={(checked) =>
                                setEventAdMutation.mutate({ eventId: event.id, isAd: checked })
                              }
                              disabled={setEventAdMutation.isPending}
                            />
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

        {/* Services Tab */}
        <TabsContent value="services">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-eagle-green" />
                Service Packages - Featured & Ads Management
              </CardTitle>
              <CardDescription>
                Toggle featured and advertisement status for approved service packages
              </CardDescription>
            </CardHeader>
            <CardContent>
              {servicePackagesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-eagle-green" />
                </div>
              ) : servicePackages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No approved service packages found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Image</TableHead>
                        <TableHead>Package Name</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead className="text-center">Featured</TableHead>
                        <TableHead className="text-center">Ad</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {servicePackages.map((pkg) => (
                        <TableRow key={pkg.id}>
                          <TableCell>
                            <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100">
                              {pkg.primaryImageUrl ? (
                                <img
                                  src={pkg.primaryImageUrl}
                                  alt={pkg.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="h-6 w-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{pkg.name}</div>
                            <div className="text-sm text-muted-foreground">ID: {pkg.id}</div>
                          </TableCell>
                          <TableCell>
                            <div>{pkg.serviceName || 'N/A'}</div>
                            <div className="text-sm text-muted-foreground">{pkg.vendorName || ''}</div>
                          </TableCell>
                          <TableCell>
                            {formatPrice(pkg.basePriceMinor, pkg.currency)}
                          </TableCell>
                          <TableCell>
                            {pkg.durationMinutes ? `${pkg.durationMinutes} min` : 'N/A'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={pkg.isFeatured || false}
                              onCheckedChange={(checked) =>
                                setServicePackageFeaturedMutation.mutate({ packageId: pkg.id, featured: checked })
                              }
                              disabled={setServicePackageFeaturedMutation.isPending}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={pkg.isAd || false}
                              onCheckedChange={(checked) =>
                                setServicePackageAdMutation.mutate({ packageId: pkg.id, isAd: checked })
                              }
                              disabled={setServicePackageAdMutation.isPending}
                            />
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
      </Tabs>
    </AdminLayout>
  );
}
