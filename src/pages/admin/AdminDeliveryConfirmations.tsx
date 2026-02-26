import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle, 
  XCircle,
  Eye,
  Loader2,
  Package,
  Gift,
  Clock,
  Image as ImageIcon,
  MapPin,
  Truck,
  RefreshCw
} from 'lucide-react';
import adminService, { AdminOrderDto } from '@/services/adminService';
import { AuthenticatedImage, useAuthenticatedImageViewer } from '@/components/AuthenticatedImage';

export default function AdminDeliveryConfirmations() {
  const [searchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderDto | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { openImage } = useAuthenticatedImageViewer();

  // Fetch product orders pending delivery confirmation
  const { data: ordersData, isLoading: loadingOrders, refetch: refetchOrders } = useQuery({
    queryKey: ['admin', 'pending-delivery-confirmations'],
    queryFn: () => adminService.getOrdersPendingDeliveryConfirmation(0, 100),
  });

  // Fetch custom orders pending delivery confirmation
  const { data: customOrdersData, isLoading: loadingCustomOrders, refetch: refetchCustomOrders } = useQuery({
    queryKey: ['admin', 'pending-custom-delivery-confirmations'],
    queryFn: () => adminService.getCustomOrdersPendingDeliveryConfirmation(0, 100),
  });

  const isLoading = loadingOrders || loadingCustomOrders;

  const refetch = () => {
    refetchOrders();
    refetchCustomOrders();
  };

  // Confirm delivery mutation for product orders
  const confirmMutation = useMutation({
    mutationFn: (order: AdminOrderDto) => {
      if (order.orderType === 'CUSTOM') {
        return adminService.confirmCustomOrderDelivery(order.id);
      }
      return adminService.confirmOrderDelivery(order.id);
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Delivery confirmed successfully. Revenue has been recognized.' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-delivery-confirmations'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-custom-delivery-confirmations'] });
      setShowConfirmDialog(false);
      setSelectedOrder(null);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.response?.data?.message || 'Failed to confirm delivery',
        variant: 'destructive' 
      });
    },
  });

  // Reject delivery confirmation mutation
  const rejectMutation = useMutation({
    mutationFn: ({ order, reason }: { order: AdminOrderDto; reason: string }) => {
      if (order.orderType === 'CUSTOM') {
        return adminService.rejectCustomOrderDeliveryConfirmation(order.id, reason);
      }
      return adminService.rejectOrderDeliveryConfirmation(order.id, reason);
    },
    onSuccess: (_, variables) => {
      const msg = variables.order.orderType === 'CUSTOM'
        ? 'Custom order delivery confirmation rejected. Order status has been reverted.'
        : 'Order has been set back to SHIPPED status for re-delivery.';
      toast({ title: 'Delivery Confirmation Rejected', description: msg });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-delivery-confirmations'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-custom-delivery-confirmations'] });
      setShowRejectDialog(false);
      setSelectedOrder(null);
      setRejectReason('');
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.response?.data?.message || 'Failed to reject delivery confirmation',
        variant: 'destructive' 
      });
    },
  });

  // Merge product orders and custom orders into a unified list
  const productOrders: AdminOrderDto[] = (ordersData?.content || []).map((o: AdminOrderDto) => ({ ...o, orderType: o.orderType || 'REGULAR' }));
  const customOrders: AdminOrderDto[] = (customOrdersData?.content || []).map((o: AdminOrderDto) => ({ ...o, orderType: 'CUSTOM' }));
  const allOrders = useMemo(() => [...productOrders, ...customOrders], [productOrders, customOrders]);
  
  // Filter orders by search term
  const filteredOrders = allOrders.filter((order: AdminOrderDto) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      order.orderNumber?.toLowerCase().includes(search) ||
      order.userEmail?.toLowerCase().includes(search) ||
      order.recipientName?.toLowerCase().includes(search) ||
      order.deliveryPersonName?.toLowerCase().includes(search)
    );
  });

  const handleViewDetails = (order: AdminOrderDto) => {
    setSelectedOrder(order);
    setShowDetailsDialog(true);
  };

  const handleConfirmClick = (order: AdminOrderDto) => {
    setSelectedOrder(order);
    setShowConfirmDialog(true);
  };

  const handleRejectClick = (order: AdminOrderDto) => {
    setSelectedOrder(order);
    setShowRejectDialog(true);
  };

  const formatCurrency = (amount: number | null | undefined, currency: string = 'ETB') => {
    if (amount === undefined || amount === null || isNaN(amount)) {
       return `${currency} 0.00`;
    }
    // If amount is small (likely major unit like 100.00) just display it
    // If amount is huge (likely minor unit like 10000), divide by 100?
    // Backend sends 'totalAmount' as BigDecimal (major).
    // Let's assume input is major units.
    return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };


  const getImageUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return `${baseUrl}${cleanUrl}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Confirmations</h1>
          <p className="text-gray-500 mt-1">Review delivery proof images and confirm deliveries to recognize revenue</p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-100 rounded-lg">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pending Review</p>
                  <p className="text-xl font-bold">{filteredOrders.length}</p>
                </div>
              </div>


        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Orders Awaiting Delivery Confirmation
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">All Caught Up!</h3>
                <p className="text-gray-500">No orders pending delivery confirmation.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Delivery Person</TableHead>
                    <TableHead>Delivered At</TableHead>
                    <TableHead>Proof Image</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order: AdminOrderDto) => (
                    <TableRow key={`${order.orderType}-${order.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.orderNumber}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.orderType === 'CUSTOM' ? (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            <Gift className="h-3 w-3 mr-1" />
                            Custom
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            <Package className="h-3 w-3 mr-1" />
                            Product
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{order.userEmail}</p>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.recipientName || 'N/A'}</p>
                          {order.shippingAddress && (
                            <p className="text-sm text-gray-500">
                              {order.shippingAddress.city}, {order.shippingAddress.country}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-gray-400" />
                          <span>{order.deliveryPersonName || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.deliveredAt ? (
                          <p className="text-sm">{formatDate(order.deliveredAt)}</p>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-50">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {order.deliveryProofImageUrl ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openImage(order.deliveryProofImageUrl!)}
                          >
                            <ImageIcon className="h-4 w-4 mr-1 text-green-600" />
                            View
                          </Button>
                        ) : (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700">
                            No Proof
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{formatCurrency(order.totalAmount, order.currency)}</p>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(order)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleConfirmClick(order)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Confirm
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => handleRejectClick(order)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

      {/* Order Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details - {selectedOrder?.orderNumber}</DialogTitle>
            <DialogDescription>
              Review the delivery information and proof images
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Customer</Label>
                  <p className="font-medium">{selectedOrder.userEmail}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Total Amount</Label>
                  <p className="font-medium">{formatCurrency(selectedOrder.totalAmount, selectedOrder.currency)}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Recipient</Label>
                  <p className="font-medium">{selectedOrder.recipientName || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Delivery Person</Label>
                  <p className="font-medium">{selectedOrder.deliveryPersonName || 'N/A'}</p>
                </div>
              </div>

              {/* Shipping Address */}
              {selectedOrder.shippingAddress && (
                <div>
                  <Label className="text-gray-500 flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    Shipping Address
                  </Label>
                  <p className="font-medium">
                    {selectedOrder.shippingAddress.addressLine1 || selectedOrder.shippingAddress.street}, {selectedOrder.shippingAddress.city}
                  </p>
                  <p className="text-gray-500">
                    {selectedOrder.shippingAddress.state}, {selectedOrder.shippingAddress.country}
                  </p>
                </div>
              )}

              {/* Order Items */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div>
                  <Label className="text-gray-500">Order Items</Label>
                  <div className="mt-2 space-y-2">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-medium">
                          {formatCurrency(item.totalPrice || (item.unitPrice * item.quantity), selectedOrder.currency)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Proof Images */}
              <div className="space-y-4">
                <Label className="text-gray-500">Proof Images</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Pickup Proof</p>
                    {selectedOrder.pickupProofImageUrl ? (
                      <AuthenticatedImage
                        src={selectedOrder.pickupProofImageUrl}
                        alt="Pickup proof"
                        className="w-full h-48 object-cover rounded-lg border cursor-pointer hover:opacity-90"
                        onClick={() => openImage(selectedOrder.pickupProofImageUrl!)}
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-100 rounded-lg border flex items-center justify-center">
                        <p className="text-gray-400">No pickup proof</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Delivery Proof</p>
                    {selectedOrder.deliveryProofImageUrl ? (
                      <AuthenticatedImage
                        src={selectedOrder.deliveryProofImageUrl}
                        alt="Delivery proof"
                        className="w-full h-48 object-cover rounded-lg border cursor-pointer hover:opacity-90"
                        onClick={() => openImage(selectedOrder.deliveryProofImageUrl!)}
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-100 rounded-lg border flex items-center justify-center">
                        <p className="text-gray-400">No delivery proof</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-gray-500">Order Created</Label>
                  <p>{formatDate(selectedOrder.createdAt)}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Delivered At</Label>
                  <p>{formatDate(selectedOrder.deliveredAt)}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => {
                setShowDetailsDialog(false);
                handleRejectClick(selectedOrder!);
              }}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                setShowDetailsDialog(false);
                handleConfirmClick(selectedOrder!);
              }}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Confirm Delivery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delivery Alert Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delivery</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to confirm delivery for order <strong>{selectedOrder?.orderNumber}</strong>?
              <br /><br />
              This action will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Mark the delivery as officially confirmed</li>
                <li>Recognize revenue for this order</li>
                <li>Send a confirmation email to the customer</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirmMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedOrder && confirmMutation.mutate(selectedOrder)}
              disabled={confirmMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {confirmMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirm Delivery
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Delivery Confirmation Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Delivery Confirmation</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting the delivery confirmation for order <strong>{selectedOrder?.orderNumber}</strong>.
              The order will be set back to SHIPPED status for re-delivery.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejectReason">Reason for Rejection *</Label>
              <Textarea
                id="rejectReason"
                placeholder="e.g., Delivery proof image is unclear, wrong recipient signature, etc."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedOrder && rejectMutation.mutate({ 
                order: selectedOrder, 
                reason: rejectReason 
              })}
              disabled={!rejectReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject Confirmation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full Image Viewer Dialog */}
      <Dialog open={!!selectedImageUrl} onOpenChange={() => setSelectedImageUrl(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Proof Image</DialogTitle>
          </DialogHeader>
          {selectedImageUrl && (
            <div className="flex items-center justify-center">
              <img
                src={getImageUrl(selectedImageUrl)}
                alt="Proof image"
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setSelectedImageUrl(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
