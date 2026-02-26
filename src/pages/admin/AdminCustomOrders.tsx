import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2,
  Eye,
  Truck,
  Package,
  CheckCircle,
  DollarSign,
  User,
  Store,
  FileText,
} from 'lucide-react';
import { customOrderService } from '@/services/customOrderService';
import { adminDeliveryService, DeliveryPersonDto } from '@/services/deliveryService';
import type { CustomOrder } from '@/types/customOrders';

export default function AdminCustomOrders() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<CustomOrder | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedDeliveryPersonId, setSelectedDeliveryPersonId] = useState<string>('');

  // Fetch completed orders ready for delivery
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['admin', 'custom-orders-for-delivery'],
    queryFn: () => customOrderService.getCompletedForDelivery(0, 100),
  });

  const completedOrders = ordersData?.content || [];

  // Fetch available delivery persons
  const { data: deliveryPersonsData } = useQuery({
    queryKey: ['admin', 'available-delivery-persons'],
    queryFn: () => adminDeliveryService.getAvailableDeliveryPersons(),
    enabled: showAssignDialog,
  });

  const availableDeliveryPersons: DeliveryPersonDto[] = deliveryPersonsData?.content || [];

  // Assign delivery mutation
  const assignDeliveryMutation = useMutation({
    mutationFn: ({ orderId, deliveryPersonId }: { orderId: number; deliveryPersonId: number }) =>
      customOrderService.assignDelivery(orderId, deliveryPersonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'custom-orders-for-delivery'] });
      toast({ title: 'Success', description: 'Delivery person assigned successfully' });
      setShowAssignDialog(false);
      setShowViewDialog(false);
      setSelectedOrder(null);
      setSelectedDeliveryPersonId('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign delivery person',
        variant: 'destructive',
      });
    },
  });

  const handleAssignDelivery = () => {
    if (!selectedOrder || !selectedDeliveryPersonId) {
      toast({
        title: 'Selection Required',
        description: 'Please select a delivery person.',
        variant: 'destructive',
      });
      return;
    }
    assignDeliveryMutation.mutate({
      orderId: selectedOrder.id,
      deliveryPersonId: parseInt(selectedDeliveryPersonId),
    });
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge className={customOrderService.getStatusBadgeColor(status as any)}>
        {customOrderService.getStatusText(status as any)}
      </Badge>
    );
  };

  return (
    <AdminLayout
      title="Custom Order Delivery"
      description="Assign delivery persons to completed custom orders"
    >
      <div className="space-y-6">
        {/* Stats Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-teal-100 rounded-lg">
                <Package className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Ready for Delivery</p>
                <p className="text-2xl font-bold">{completedOrders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Completed Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-teal-600" />
              Completed Orders Awaiting Delivery Assignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-eagle-green" />
              </div>
            ) : completedOrders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No orders ready for delivery</h3>
                <p className="text-gray-500">All completed orders have been assigned</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <p className="font-medium">#{order.orderNumber}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium">{order.customerName}</p>
                            <p className="text-sm text-gray-500">{order.customerEmail}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-gray-400" />
                          <span>{order.vendorName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span>{order.templateName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          {customOrderService.formatPrice(
                            order.finalPrice ?? order.basePrice ?? 0,
                            order.currency
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>
                        {order.statusHistory
                          .filter((h) => h.status === 'COMPLETED')
                          .map((h) => new Date(h.createdAt).toLocaleDateString())[0] || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowViewDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowAssignDialog(true);
                            }}
                            className="bg-eagle-green hover:bg-eagle-green/90 text-white"
                          >
                            <Truck className="h-4 w-4 mr-1" />
                            Assign
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
      </div>

      {/* View Order Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Review the order details before assigning delivery
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-500">Order Number</Label>
                  <p className="font-medium">#{selectedOrder.orderNumber}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                </div>
              </div>

              {/* Customer Info */}
              <div>
                <Label className="text-sm text-gray-500 mb-2 block">Customer</Label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">{selectedOrder.customerName}</p>
                  <p className="text-sm text-gray-600">{selectedOrder.customerEmail}</p>
                </div>
              </div>

              {/* Vendor Info */}
              <div>
                <Label className="text-sm text-gray-500 mb-2 block">Vendor</Label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">{selectedOrder.vendorName}</p>
                </div>
              </div>

              {/* Template & Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-500">Template</Label>
                  <p className="font-medium">{selectedOrder.templateName}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Final Price</Label>
                  <p className="font-medium text-lg text-green-600">
                    {customOrderService.formatPrice(
                      selectedOrder.finalPrice ?? selectedOrder.basePrice ?? 0,
                      selectedOrder.currency
                    )}
                  </p>
                </div>
              </div>

              {/* Order Values */}
              {selectedOrder.values && selectedOrder.values.length > 0 && (
                <div>
                  <Label className="text-sm text-gray-500 mb-2 block">
                    Customization Values
                  </Label>
                  <div className="border rounded-lg divide-y">
                    {selectedOrder.values.map((value) => (
                      <div key={value.id} className="p-3">
                        <p className="text-sm text-gray-500">{value.fieldName}</p>
                        <p className="font-medium">
                          {value.textValue ||
                            value.numberValue?.toString() ||
                            (value.fileUrl && (
                              <a
                                href={value.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                View File
                              </a>
                            )) ||
                            '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Description */}
              {selectedOrder.additionalDescription && (
                <div>
                  <Label className="text-sm text-gray-500">Additional Notes</Label>
                  <p className="text-gray-700 mt-1">{selectedOrder.additionalDescription}</p>
                </div>
              )}

              {/* Status History */}
              <div>
                <Label className="text-sm text-gray-500 mb-2 block">Status History</Label>
                <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                  {selectedOrder.statusHistory
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((history) => (
                      <div key={history.id} className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(history.status)}
                          <span className="text-sm text-gray-500">by {history.changedBy}</span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(history.createdAt).toLocaleString()}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setShowViewDialog(false);
                setShowAssignDialog(true);
              }}
              className="bg-eagle-green hover:bg-eagle-green/90 text-white"
            >
              <Truck className="h-4 w-4 mr-2" />
              Assign Delivery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Delivery Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Delivery Person</DialogTitle>
            <DialogDescription>
              Select a delivery person to assign to order #{selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Delivery Person</Label>
              <Select
                value={selectedDeliveryPersonId}
                onValueChange={setSelectedDeliveryPersonId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a delivery person" />
                </SelectTrigger>
                <SelectContent>
                  {availableDeliveryPersons.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No delivery persons available
                    </SelectItem>
                  ) : (
                    availableDeliveryPersons.map((person) => (
                      <SelectItem key={person.id} value={person.id.toString()}>
                        <div className="flex items-center gap-2">
                          <span>
                            {person.firstName} {person.lastName}
                          </span>
                          {person.vehicleType && (
                            <span className="text-gray-500">({person.vehicleType})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedOrder && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Order Summary</p>
                <p className="font-medium">{selectedOrder.templateName}</p>
                <p className="text-sm">
                  Customer: {selectedOrder.customerName}
                </p>
                <p className="text-sm text-green-600">
                  {customOrderService.formatPrice(
                    selectedOrder.finalPrice ?? selectedOrder.basePrice ?? 0,
                    selectedOrder.currency
                  )}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAssignDialog(false);
                setSelectedDeliveryPersonId('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignDelivery}
              disabled={assignDeliveryMutation.isPending || !selectedDeliveryPersonId}
              className="bg-eagle-green hover:bg-eagle-green/90 text-white"
            >
              {assignDeliveryMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Assign Delivery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
