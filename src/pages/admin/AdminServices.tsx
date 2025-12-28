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
  Briefcase,
  Eye,
  Check,
  X,
  Clock,
  MapPin,
  DollarSign,
  Ban,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from 'lucide-react';
import { serviceService, ServiceResponse, ServiceStatus } from '@/services/serviceService';
import { adminService, ServicePriceUpdateRequestDto, ServiceCategoryChangeRequestDto } from '@/services/adminService';
import { useToast } from '@/hooks/use-toast';

export default function AdminServices() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedService, setSelectedService] = useState<ServiceResponse | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; serviceId?: number; type: 'reject' | 'suspend' | 'price' | 'category' }>({ 
    open: false, 
    type: 'reject' 
  });
  const [rejectReason, setRejectReason] = useState('');

  // Fetch all services
  const { data: allServicesData, isLoading: allServicesLoading } = useQuery({
    queryKey: ['admin', 'all-services', searchTerm],
    queryFn: async () => {
      const response = await serviceService.getAllServicesAdmin(undefined, searchTerm, 0, 100);
      return response.content || [];
    },
  });

  // Fetch pending services
  const { data: pendingServicesData, isLoading: pendingLoading } = useQuery({
    queryKey: ['admin', 'pending-services'],
    queryFn: async () => {
      const response = await serviceService.getPendingServices(0, 100);
      return response.content || [];
    },
  });

  const allServices = allServicesData || [];
  const pendingServices = pendingServicesData || [];

  // Fetch price update requests
  const { data: priceRequestsData, isLoading: priceRequestsLoading } = useQuery({
    queryKey: ['admin', 'service-price-requests'],
    queryFn: async () => {
      const response = await adminService.getServicePriceUpdateRequests(0, 100);
      return response.content || [];
    },
  });

  const priceRequests = priceRequestsData || [];
  const pendingPriceRequests = priceRequests.filter((r: ServicePriceUpdateRequestDto) => r.status === 'PENDING');

  // Fetch category change requests
  const { data: categoryRequestsData, isLoading: categoryRequestsLoading } = useQuery({
    queryKey: ['admin', 'service-category-requests'],
    queryFn: async () => {
      const response = await adminService.getServiceCategoryChangeRequests(0, 100);
      return response.content || [];
    },
  });

  const categoryRequests = categoryRequestsData || [];
  const pendingCategoryRequests = categoryRequests.filter((r: ServiceCategoryChangeRequestDto) => r.status === 'PENDING');


  // Approve service mutation
  const approveServiceMutation = useMutation({
    mutationFn: (serviceId: number) => serviceService.approveService(serviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-services'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-services'] });
      toast({ title: 'Success', description: 'Service approved successfully' });
      setSelectedService(null);
      setShowViewDialog(false);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to approve service', variant: 'destructive' });
    },
  });

  // Reject service mutation
  const rejectServiceMutation = useMutation({
    mutationFn: ({ serviceId, reason }: { serviceId: number; reason: string }) => 
      serviceService.rejectService(serviceId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-services'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-services'] });
      toast({ title: 'Success', description: 'Service rejected' });
      setRejectDialog({ open: false, type: 'reject' });
      setRejectReason('');
      setSelectedService(null);
      setShowViewDialog(false);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to reject service', variant: 'destructive' });
    },
  });

  // Suspend service mutation
  const suspendServiceMutation = useMutation({
    mutationFn: ({ serviceId, reason }: { serviceId: number; reason: string }) => 
      serviceService.suspendService(serviceId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-services'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-services'] });
      toast({ title: 'Success', description: 'Service suspended' });
      setRejectDialog({ open: false, type: 'suspend' });
      setRejectReason('');
      setSelectedService(null);
      setShowViewDialog(false);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to suspend service', variant: 'destructive' });
    },
  });

  // Approve service price update mutation
  const approveServicePriceUpdateMutation = useMutation({
    mutationFn: (requestId: number) => adminService.approveServicePriceUpdate(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'service-price-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-services'] });
      toast({
        title: 'Price Update Approved',
        description: 'The service price has been updated successfully.',
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

  // Reject service price update mutation
  const rejectServicePriceUpdateMutation = useMutation({
    mutationFn: ({ requestId, reason }: { requestId: number; reason: string }) => 
      adminService.rejectServicePriceUpdate(requestId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'service-price-requests'] });
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

  // Approve service category change mutation
  const approveServiceCategoryChangeMutation = useMutation({
    mutationFn: (requestId: number) => adminService.approveServiceCategoryChange(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'service-category-requests'] });
      toast({
        title: 'Category Change Approved',
        description: 'The category change has been approved successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve category change',
        variant: 'destructive',
      });
    },
  });

  // Reject service category change mutation
  const rejectServiceCategoryChangeMutation = useMutation({
    mutationFn: ({ requestId, reason }: { requestId: number; reason: string }) =>
      adminService.rejectServiceCategoryChange(requestId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'service-category-requests'] });
      toast({
        title: 'Category Change Rejected',
        description: 'The category change request has been rejected.',
      });
      setRejectDialog({ open: false, type: 'price' });
      setRejectReason('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject category change',
        variant: 'destructive',
      });
    },
  });

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast({
        title: 'Reason Required',
        description: 'Please provide a reason.',
        variant: 'destructive',
      });
      return;
    }

    if (rejectDialog.type === 'reject' && rejectDialog.serviceId) {
      rejectServiceMutation.mutate({ serviceId: rejectDialog.serviceId, reason: rejectReason });
    } else if (rejectDialog.type === 'suspend' && rejectDialog.serviceId) {
      suspendServiceMutation.mutate({ serviceId: rejectDialog.serviceId, reason: rejectReason });
    } else if (rejectDialog.type === 'price' && rejectDialog.serviceId) {
      rejectServicePriceUpdateMutation.mutate({ requestId: rejectDialog.serviceId, reason: rejectReason });
    } else if (rejectDialog.type === 'category' && rejectDialog.serviceId) {
      rejectServiceCategoryChangeMutation.mutate({ requestId: rejectDialog.serviceId, reason: rejectReason });
    }
  };

  const getStatusBadge = (status: ServiceStatus) => {
    const badges: Record<string, { color: string; label: string }> = {
      'PENDING_APPROVAL': { color: 'bg-amber-100 text-amber-800', label: 'Pending' },
      'APPROVED': { color: 'bg-green-100 text-green-800', label: 'Approved' },
      'REJECTED': { color: 'bg-red-100 text-red-800', label: 'Rejected' },
      'SUSPENDED': { color: 'bg-orange-100 text-orange-800', label: 'Suspended' },
      'ARCHIVED': { color: 'bg-gray-100 text-gray-800', label: 'Archived' },
    };
    const badge = badges[status] || { color: 'bg-gray-100 text-gray-800', label: status };
    return <Badge className={badge.color}>{badge.label}</Badge>;
  };

  return (
    <AdminLayout 
      title="Service Management" 
      description="Manage vendor services and approval requests"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="all" className="relative">
            All Services
            {allServices.length > 0 && (
              <Badge className="ml-2 bg-eagle-green text-white">{allServices.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending" className="relative">
            Pending Approval
            {pendingServices.length > 0 && (
              <Badge className="ml-2 bg-amber-500 text-white">{pendingServices.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="price-requests" className="relative">
            Price Update Requests
            {pendingPriceRequests.length > 0 && (
              <Badge className="ml-2 bg-blue-500 text-white">{pendingPriceRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="category-requests" className="relative">
            Category Change Requests
            {pendingCategoryRequests.length > 0 && (
              <Badge className="ml-2 bg-purple-500 text-white">{pendingCategoryRequests.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>


        {/* All Services Tab */}
        <TabsContent value="all">
          <Card className="mb-6">
            <CardContent className="pt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search services..."
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
                <Briefcase className="h-5 w-5 text-eagle-green" />
                All Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              {allServicesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-eagle-green" />
                </div>
              ) : allServices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No services found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Service</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allServices.map((service: ServiceResponse) => (
                        <TableRow key={service.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {service.primaryImageUrl ? (
                                <img 
                                  src={service.primaryImageUrl} 
                                  alt={service.title} 
                                  className="h-10 w-10 rounded object-cover"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded bg-eagle-green/10 flex items-center justify-center">
                                  <Briefcase className="h-5 w-5 text-eagle-green" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium">{service.title}</p>
                                <p className="text-sm text-muted-foreground">{service.categoryName || 'Uncategorized'}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{service.vendorName || `Vendor #${service.vendorId}`}</TableCell>
                          <TableCell className="text-sm">{service.city}</TableCell>
                          <TableCell className="text-sm">{serviceService.formatPrice(service.basePriceMinor, service.currency)}</TableCell>
                          <TableCell>{getStatusBadge(service.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedService(service);
                                  setShowViewDialog(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {service.status === 'PENDING_APPROVAL' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => approveServiceMutation.mutate(service.id)}
                                    disabled={approveServiceMutation.isPending}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => setRejectDialog({ open: true, serviceId: service.id, type: 'reject' })}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              {service.status === 'APPROVED' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-orange-600 hover:text-orange-700"
                                  onClick={() => setRejectDialog({ open: true, serviceId: service.id, type: 'suspend' })}
                                >
                                  <Ban className="h-4 w-4" />
                                </Button>
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


        {/* Pending Services Tab */}
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                Services Awaiting Approval
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-eagle-green" />
                </div>
              ) : pendingServices.length > 0 ? (
                <div className="space-y-4">
                  {pendingServices.map((service: ServiceResponse) => (
                    <div 
                      key={service.id} 
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {service.primaryImageUrl ? (
                              <img 
                                src={service.primaryImageUrl} 
                                alt={service.title}
                                className="h-16 w-16 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="h-16 w-16 rounded-lg bg-eagle-green/10 flex items-center justify-center">
                                <Briefcase className="h-8 w-8 text-eagle-green" />
                              </div>
                            )}
                            <div>
                              <h3 className="font-gotham-bold text-eagle-green text-lg">{service.title}</h3>
                              <p className="text-sm text-gray-600">{service.categoryName || 'Uncategorized'}</p>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 line-clamp-2">{service.description}</p>
                          <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              {serviceService.formatPrice(service.basePriceMinor, service.currency)}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {service.city}
                            </span>
                            {service.durationMinutes && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {service.durationMinutes} min
                              </span>
                            )}
                            <span>Vendor: {service.vendorName || `#${service.vendorId}`}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 lg:flex-col">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedService(service);
                              setShowViewDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button
                            onClick={() => approveServiceMutation.mutate(service.id)}
                            disabled={approveServiceMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            className="border-red-300 text-red-600 hover:bg-red-50"
                            onClick={() => setRejectDialog({ open: true, serviceId: service.id, type: 'reject' })}
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
                  <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No pending services</h3>
                  <p className="text-gray-500">All services have been reviewed</p>
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
                      <TableHead>Service</TableHead>
                      <TableHead className="text-right">Current Price</TableHead>
                      <TableHead className="text-right">Requested Price</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {priceRequests.map((request: ServicePriceUpdateRequestDto) => {
                      // Use amount (major units) if available, otherwise convert from minor units
                      const currentPrice = request.currentPrice?.amount ?? (request.currentPrice?.unitAmountMinor ? request.currentPrice.unitAmountMinor / 100 : 0);
                      const newPrice = request.newPrice?.amount ?? (request.newPrice?.unitAmountMinor ? request.newPrice.unitAmountMinor / 100 : 0);
                      const currency = request.currentPrice?.currencyCode || request.newPrice?.currencyCode || 'ETB';
                      const priceDiff = newPrice - currentPrice;
                      const percentChange = currentPrice > 0 ? ((priceDiff / currentPrice) * 100).toFixed(1) : 0;
                      
                      const formatCurrency = (amount: number, curr: string = 'ETB') => {
                        const symbol = curr === 'ETB' ? 'ETB ' : curr === 'USD' ? '$' : `${curr} `;
                        return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                      };
                      
                      return (
                        <TableRow key={request.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{request.serviceName || `Service #${request.serviceId}`}</p>
                              <p className="text-sm text-muted-foreground">
                                {request.vendorName || `Vendor #${request.vendorId}`}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(currentPrice, currency)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(newPrice, currency)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className={`flex items-center justify-end gap-1 ${priceDiff > 0 ? 'text-green-600' : priceDiff < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                              {priceDiff > 0 ? (
                                <TrendingUp className="h-4 w-4" />
                              ) : priceDiff < 0 ? (
                                <TrendingDown className="h-4 w-4" />
                              ) : null}
                              <span>
                                {priceDiff > 0 ? '+' : ''}{formatCurrency(priceDiff, currency)}
                              </span>
                              <span className="text-xs">({percentChange}%)</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm max-w-[200px] truncate" title={request.reason}>
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
                            {request.status === 'PENDING' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => approveServicePriceUpdateMutation.mutate(request.id)}
                                  disabled={approveServicePriceUpdateMutation.isPending}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setRejectDialog({ open: true, serviceId: request.id, type: 'price' })}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                            {request.status !== 'PENDING' && request.rejectionReason && (
                              <p className="text-xs text-red-600 max-w-[150px] truncate" title={request.rejectionReason}>
                                {request.rejectionReason}
                              </p>
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

        {/* Category Change Requests Tab */}
        <TabsContent value="category-requests">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Service Category Change Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categoryRequestsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-eagle-green" />
                </div>
              ) : categoryRequests.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Current Category</TableHead>
                      <TableHead>New Category</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryRequests.map((request: ServiceCategoryChangeRequestDto) => {
                      const isApproving = approveServiceCategoryChangeMutation.isPending;
                      const isRejecting = rejectServiceCategoryChangeMutation.isPending;
                      
                      return (
                        <TableRow key={request.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {request.serviceCover ? (
                                <img 
                                  src={request.serviceCover} 
                                  alt={request.serviceName}
                                  className="h-10 w-10 rounded object-cover"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center">
                                  <Briefcase className="h-5 w-5 text-gray-400" />
                                </div>
                              )}
                              <div>
                                <div className="font-medium">{request.serviceName}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{request.vendorName || 'Unknown'}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">{request.currentCategoryName}</div>
                              <div className="text-xs text-gray-500">{request.currentSubCategoryName}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium text-blue-600">{request.newCategoryName}</div>
                              <div className="text-xs text-blue-500">{request.newSubCategoryName}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm max-w-[200px] truncate" title={request.reason}>
                              {request.reason || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell>
                            {request.status === 'PENDING' && <Badge className="bg-amber-500">Pending</Badge>}
                            {request.status === 'APPROVED' && <Badge className="bg-green-500">Approved</Badge>}
                            {request.status === 'REJECTED' && <Badge variant="destructive">Rejected</Badge>}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-500">
                              {new Date(request.createdAt).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            {request.status === 'PENDING' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  disabled={isApproving || isRejecting}
                                  onClick={() => approveServiceCategoryChangeMutation.mutate(request.id)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  {isApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={isApproving || isRejecting}
                                  variant="destructive"
                                  onClick={() => setRejectDialog({ open: true, serviceId: request.id, type: 'category' })}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                            {request.status !== 'PENDING' && request.rejectionReason && (
                              <p className="text-xs text-red-600 max-w-[150px] truncate" title={request.rejectionReason}>
                                {request.rejectionReason}
                              </p>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No category change requests</h3>
                  <p className="text-gray-500">All requests have been processed</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>


      {/* View Service Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Service Details</DialogTitle>
            <DialogDescription>
              Review the service information below
            </DialogDescription>
          </DialogHeader>
          {selectedService && (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                {selectedService.primaryImageUrl ? (
                  <img 
                    src={selectedService.primaryImageUrl} 
                    alt={selectedService.title}
                    className="h-24 w-24 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-lg bg-eagle-green/10 flex items-center justify-center">
                    <Briefcase className="h-12 w-12 text-eagle-green" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{selectedService.title}</h3>
                  <p className="text-muted-foreground">{selectedService.categoryName || 'Uncategorized'}</p>
                  <div className="mt-2">{getStatusBadge(selectedService.status)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Vendor:</span>
                  <p className="font-medium">{selectedService.vendorName || `Vendor #${selectedService.vendorId}`}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Price:</span>
                  <p className="font-medium">{serviceService.formatPrice(selectedService.basePriceMinor, selectedService.currency)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Location:</span>
                  <p className="font-medium">{selectedService.location}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">City:</span>
                  <p className="font-medium">{selectedService.city}</p>
                </div>
                {selectedService.durationMinutes && (
                  <div>
                    <span className="text-muted-foreground">Duration:</span>
                    <p className="font-medium">{selectedService.durationMinutes} minutes</p>
                  </div>
                )}
                {selectedService.createdAt && (
                  <div>
                    <span className="text-muted-foreground">Created:</span>
                    <p className="font-medium">{new Date(selectedService.createdAt).toLocaleDateString()}</p>
                  </div>
                )}
              </div>

              {selectedService.description && (
                <div>
                  <span className="text-sm text-muted-foreground">Description:</span>
                  <p className="mt-1 text-sm">{selectedService.description}</p>
                </div>
              )}

              {selectedService.availabilityConfig && (
                <div>
                  <span className="text-sm text-muted-foreground">Availability:</span>
                  <div className="mt-1 text-sm space-y-1">
                    {selectedService.availabilityConfig.timeSlots && (
                      <p>Time Slots: {selectedService.availabilityConfig.timeSlots.join(', ')}</p>
                    )}
                    {selectedService.availabilityConfig.maxBookingsPerDay && (
                      <p>Max Bookings/Day: {selectedService.availabilityConfig.maxBookingsPerDay}</p>
                    )}
                    {selectedService.availabilityConfig.advanceBookingDays && (
                      <p>Advance Booking: {selectedService.availabilityConfig.advanceBookingDays} days</p>
                    )}
                  </div>
                </div>
              )}

              {selectedService.policiesConfig && (
                <div>
                  <span className="text-sm text-muted-foreground">Policies:</span>
                  <div className="mt-1 text-sm space-y-1">
                    {selectedService.policiesConfig.cancellationPolicy && (
                      <p>Cancellation: {selectedService.policiesConfig.cancellationPolicy}</p>
                    )}
                    {selectedService.policiesConfig.rescheduleHours && (
                      <p>Reschedule Notice: {selectedService.policiesConfig.rescheduleHours} hours</p>
                    )}
                    {selectedService.policiesConfig.depositRequired && (
                      <p>Deposit: {selectedService.policiesConfig.depositPercentage}%</p>
                    )}
                  </div>
                </div>
              )}

              {selectedService.rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <span className="text-sm font-medium text-red-800">Rejection Reason:</span>
                  <p className="mt-1 text-sm text-red-700">{selectedService.rejectionReason}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
            {selectedService?.status === 'PENDING_APPROVAL' && (
              <>
                <Button
                  onClick={() => approveServiceMutation.mutate(selectedService.id)}
                  disabled={approveServiceMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setShowViewDialog(false);
                    setRejectDialog({ open: true, serviceId: selectedService.id, type: 'reject' });
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </>
            )}
            {selectedService?.status === 'APPROVED' && (
              <Button
                variant="outline"
                className="text-orange-600 hover:text-orange-700"
                onClick={() => {
                  setShowViewDialog(false);
                  setRejectDialog({ open: true, serviceId: selectedService.id, type: 'suspend' });
                }}
              >
                <Ban className="h-4 w-4 mr-2" />
                Suspend
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Reject/Suspend/Price Update Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => {
        if (!open) {
          setRejectDialog({ open: false, type: 'reject' });
          setRejectReason('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              {rejectDialog.type === 'reject' ? 'Reject Service' : 
               rejectDialog.type === 'suspend' ? 'Suspend Service' : 
               'Reject Price Update'}
            </DialogTitle>
            <DialogDescription>
              {rejectDialog.type === 'reject' 
                ? 'Please provide a reason for rejecting this service. The vendor will be notified.'
                : rejectDialog.type === 'suspend'
                ? 'Please provide a reason for suspending this service. The vendor will be notified.'
                : 'Please provide a reason for rejecting this price update. The vendor will be notified.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder={rejectDialog.type === 'reject' 
                ? "Enter rejection reason..."
                : rejectDialog.type === 'suspend'
                ? "Enter suspension reason..."
                : "Enter price update rejection reason..."}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRejectDialog({ open: false, type: 'reject' });
              setRejectReason('');
            }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectServiceMutation.isPending || suspendServiceMutation.isPending || rejectServicePriceUpdateMutation.isPending}
            >
              {(rejectServiceMutation.isPending || suspendServiceMutation.isPending || rejectServicePriceUpdateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {rejectDialog.type === 'reject' ? 'Reject' : 
               rejectDialog.type === 'suspend' ? 'Suspend' : 
               'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
