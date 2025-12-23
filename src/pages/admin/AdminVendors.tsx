import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Store, 
  Search,
  Eye,
  Loader2,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  CheckCircle,
  XCircle,
  Building,
  FileText,
  Clock
} from 'lucide-react';
import { adminService } from '@/services/adminService';

export default function AdminVendors() {
  const [searchTerm, setSearchTerm] = useState('');
  const [, setSelectedVendor] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [vendorDetail, setVendorDetail] = useState<any>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [actionVendor, setActionVendor] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: vendorsData, isLoading } = useQuery({
    queryKey: ['admin', 'vendors'],
    queryFn: async () => {
      try {
        const response = await adminService.getVendors(0, 100);
        return response.content || [];
      } catch (error) {
        console.error('Failed to fetch vendors:', error);
        return [];
      }
    },
  });

  const vendors = vendorsData || [];

  const approveMutation = useMutation({
    mutationFn: (vendorId: number) => adminService.approveVendor(vendorId),
    onSuccess: () => {
      toast({
        title: 'Vendor Approved',
        description: 'The vendor has been successfully approved.',
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'vendors'] });
      setShowApproveDialog(false);
      setActionVendor(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve vendor',
        variant: 'destructive',
      });
    },
  });

  const declineMutation = useMutation({
    mutationFn: (vendorId: number) => adminService.declineVendor(vendorId),
    onSuccess: () => {
      toast({
        title: 'Vendor Declined',
        description: 'The vendor has been declined and removed from the system.',
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'vendors'] });
      setShowDeclineDialog(false);
      setActionVendor(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to decline vendor',
        variant: 'destructive',
      });
    },
  });

  const filteredVendors = vendors.filter((vendor: any) => {
    return vendor.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.businessEmail?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const approvedCount = vendors.filter((v: any) => v.isApproved).length;
  const pendingCount = vendors.filter((v: any) => !v.isApproved).length;
  const payoutEnabledCount = vendors.filter((v: any) => v.payoutEnabled).length;

  const handleViewVendor = async (vendor: any) => {
    setSelectedVendor(vendor);
    setShowDetailDialog(true);
    setIsLoadingDetail(true);
    
    try {
      const detail = await adminService.getVendorById(vendor.id);
      setVendorDetail(detail);
    } catch (error) {
      console.error('Failed to fetch vendor details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load vendor details',
        variant: 'destructive',
      });
      // Use the basic vendor info as fallback
      setVendorDetail(vendor);
    } finally {
      setIsLoadingDetail(false);
    }
  };
  return (
    <AdminLayout 
      title="Vendor Management" 
      description="View and manage all registered vendors"
    >
      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-gotham-bold text-eagle-green">{vendors.length}</div>
            <p className="text-sm text-gray-500">Total Vendors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-gotham-bold text-green-600">{approvedCount}</div>
            <p className="text-sm text-gray-500">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-gotham-bold text-amber-600">{pendingCount}</div>
            <p className="text-sm text-gray-500">Pending Approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-gotham-bold text-blue-600">{payoutEnabledCount}</div>
            <p className="text-sm text-gray-500">Payout Enabled</p>
          </CardContent>
        </Card>
      </div>

      {/* Vendors Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-eagle-green" />
            </div>
          ) : filteredVendors.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payout</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendors.map((vendor: any) => (
                  <TableRow key={vendor.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-eagle-green">{vendor.businessName}</div>
                        {vendor.categoryName && (
                          <div className="text-sm text-gray-500">{vendor.categoryName}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="h-3 w-3 mr-1" />
                          {vendor.businessEmail}
                        </div>
                        {vendor.businessPhone && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Phone className="h-3 w-3 mr-1" />
                            {vendor.businessPhone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {vendor.city || vendor.country ? (
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="h-3 w-3 mr-1" />
                          {vendor.city && vendor.country ? `${vendor.city}, ${vendor.country}` : vendor.city || vendor.country}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {vendor.isApproved ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approved
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {vendor.payoutEnabled ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Enabled
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-600">
                            <XCircle className="h-3 w-3 mr-1" />
                            Not Set Up
                          </Badge>
                        )}
                        <div className="flex gap-1 text-xs">
                          {vendor.stripeConnectedAccountId && (
                            <Badge variant="outline" className="text-xs">Stripe</Badge>
                          )}
                          {vendor.chapaSubaccountId && (
                            <Badge variant="outline" className="text-xs">Chapa</Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleViewVendor(vendor)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!vendor.isApproved && (
                          <>
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => {
                                setActionVendor(vendor);
                                setShowApproveDialog(true);
                              }}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => {
                                setActionVendor(vendor);
                                setShowDeclineDialog(true);
                              }}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Store className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No vendors found</h3>
              <p className="text-gray-500">
                {searchTerm ? 'Try adjusting your search' : 'Vendors will appear here when they register'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vendor Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-eagle-green" />
              Vendor Details
            </DialogTitle>
            <DialogDescription>
              Complete vendor information and statistics
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingDetail ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-eagle-green" />
            </div>
          ) : vendorDetail && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">Information</TabsTrigger>
                <TabsTrigger value="payout">Payout</TabsTrigger>
              </TabsList>
              
              {/* Information Tab */}
              <TabsContent value="info" className="space-y-4 mt-4">
                {/* Header */}
                <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-eagle-green/5 to-viridian-green/5 rounded-lg">
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-eagle-green to-viridian-green flex items-center justify-center text-white text-xl font-gotham-bold">
                    {vendorDetail.businessName?.charAt(0) || 'V'}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-gotham-bold text-eagle-green">
                      {vendorDetail.businessName}
                    </h3>
                    {vendorDetail.categoryName && (
                      <Badge variant="outline" className="mt-1">{vendorDetail.categoryName}</Badge>
                    )}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Business Email</p>
                      <p className="text-sm font-medium">{vendorDetail.businessEmail}</p>
                    </div>
                  </div>
                  {vendorDetail.businessPhone && (
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-500">Business Phone</p>
                        <p className="text-sm font-medium">{vendorDetail.businessPhone}</p>
                      </div>
                    </div>
                  )}
                  {(vendorDetail.city || vendorDetail.country) && (
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-500">Location</p>
                        <p className="text-sm font-medium">
                          {vendorDetail.city && vendorDetail.country 
                            ? `${vendorDetail.city}, ${vendorDetail.country}` 
                            : vendorDetail.city || vendorDetail.country}
                        </p>
                      </div>
                    </div>
                  )}
                  {vendorDetail.contactName && (
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <Building className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-500">Contact Name</p>
                        <p className="text-sm font-medium">{vendorDetail.contactName}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Business Details */}
                {vendorDetail.description && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <p className="text-xs text-gray-500 uppercase">Business Description</p>
                    </div>
                    <p className="text-sm">{vendorDetail.description}</p>
                  </div>
                )}

                {/* Timestamps */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Joined</p>
                      <p className="text-sm font-medium">
                        {vendorDetail.createdAt ? new Date(vendorDetail.createdAt).toLocaleDateString() : '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Building className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Vendor ID</p>
                      <p className="text-sm font-medium">{vendorDetail.id}</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Payout Tab */}
              <TabsContent value="payout" className="space-y-4 mt-4">
                <div className="flex items-center gap-3 p-4 rounded-lg border">
                  <CreditCard className="h-8 w-8 text-gray-400" />
                  <div className="flex-1">
                    <h4 className="font-medium">Payout Status</h4>
                    <p className="text-sm text-gray-500">Current payout configuration</p>
                  </div>
                  {vendorDetail.payoutEnabled ? (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Enabled
                    </Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-600">
                      <XCircle className="h-3 w-3 mr-1" />
                      Not Configured
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Stripe */}
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">Stripe Connect</h4>
                        {vendorDetail.stripeConnectedAccountId ? (
                          <Badge className="bg-green-100 text-green-800">Connected</Badge>
                        ) : (
                          <Badge variant="outline">Not Connected</Badge>
                        )}
                      </div>
                      {vendorDetail.stripeConnectedAccountId && (
                        <p className="text-xs text-gray-500 font-mono truncate">
                          {vendorDetail.stripeConnectedAccountId}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Chapa */}
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">Chapa Subaccount</h4>
                        {vendorDetail.chapaSubaccountId ? (
                          <Badge className="bg-green-100 text-green-800">Connected</Badge>
                        ) : (
                          <Badge variant="outline">Not Connected</Badge>
                        )}
                      </div>
                      {vendorDetail.chapaSubaccountId && (
                        <p className="text-xs text-gray-500 font-mono truncate">
                          {vendorDetail.chapaSubaccountId}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {vendorDetail.defaultCurrency && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Supported Payment Providers</p>
                    <p className="text-sm font-medium">
                      {vendorDetail.supportedPaymentProviders?.join(', ') || 'None configured'}
                    </p>
                  </div>
                )}
              </TabsContent>

            </Tabs>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Vendor</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve <strong>{actionVendor?.businessName}</strong>? 
              This will allow them to start selling products and hosting events on the platform.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowApproveDialog(false);
                setActionVendor(null);
              }}
              disabled={approveMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => actionVendor && approveMutation.mutate(actionVendor.id)}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Confirmation Dialog */}
      <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Vendor</DialogTitle>
            <DialogDescription>
              Are you sure you want to decline <strong>{actionVendor?.businessName}</strong>? 
              This will permanently delete the vendor account and all associated data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeclineDialog(false);
                setActionVendor(null);
              }}
              disabled={declineMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => actionVendor && declineMutation.mutate(actionVendor.id)}
              disabled={declineMutation.isPending}
            >
              {declineMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Declining...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Decline
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
