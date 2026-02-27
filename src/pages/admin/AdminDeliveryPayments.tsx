import { useState } from 'react';
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
  Wallet,
  Eye,
  Loader2,
  CheckCircle2,
  Clock,
  DollarSign,
  User,
  MapPin,
  Truck,
  Navigation,
  Timer,
  AlertCircle,
} from 'lucide-react';
import {
  adminDeliveryService,
  AdminDeliveryAssignmentDto,
} from '@/services/deliveryService';
import { orderService } from '@/services/orderService';

export default function AdminDeliveryPayments() {
  const [paymentFilter, setPaymentFilter] = useState<string>('UNPAID');
  const [selectedAssignment, setSelectedAssignment] = useState<AdminDeliveryAssignmentDto | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [paymentNotes, setPaymentNotes] = useState('');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch assignments based on payment filter
  const { data: assignmentsData, isLoading } = useQuery({
    queryKey: ['admin', 'delivery-payments', paymentFilter],
    queryFn: () => {
      if (paymentFilter === 'all') {
        return adminDeliveryService.getAllAssignments({ status: 'DELIVERED' });
      }
      return adminDeliveryService.getAssignmentsByPaymentStatus(
        paymentFilter as 'UNPAID' | 'PAID'
      );
    },
  });

  // Approve payment mutation
  const approvePaymentMutation = useMutation({
    mutationFn: ({ assignmentId, notes }: { assignmentId: number; notes?: string }) =>
      adminDeliveryService.approveDeliveryPayment(assignmentId, notes),
    onSuccess: () => {
      toast({ title: 'Payment Approved', description: 'Delivery payment has been marked as paid.' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'delivery-payments'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'delivery-assignments'] });
      setShowPaymentDialog(false);
      setSelectedAssignment(null);
      setPaymentNotes('');
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.response?.data?.message || 'Failed to approve payment',
        variant: 'destructive' 
      });
    },
  });

  const formatDeliveryFee = (fee?: number, currency?: string) => {
    if (!fee) return 'N/A';
    const prefix = currency === 'ETB' ? 'ETB ' : '$';
    return `${prefix}${Number(fee).toFixed(2)}`;
  };

  const formatDistance = (meters?: number) => {
    if (!meters) return 'N/A';
    return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const minutes = Math.round(seconds / 60);
    return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes} min`;
  };

  const getPaymentBadge = (status?: string) => {
    if (status === 'PAID') {
      return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
    }
    return <Badge className="bg-amber-100 text-amber-800">Unpaid</Badge>;
  };

  const assignments = assignmentsData?.content || [];

  // Calculate stats
  const unpaidCount = assignments.filter(a => a.deliveryPaymentStatus !== 'PAID').length;
  const unpaidTotal = assignments
    .filter(a => a.deliveryPaymentStatus !== 'PAID')
    .reduce((sum, a) => sum + (a.deliveryFee ? Number(a.deliveryFee) : 0), 0);
  const paidCount = assignments.filter(a => a.deliveryPaymentStatus === 'PAID').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Delivery Payments</h1>
        <p className="text-gray-500">Manage delivery personnel payment approvals</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-lg">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending Payments</p>
                <p className="text-xl font-bold">{paymentFilter === 'UNPAID' ? unpaidCount : '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Unpaid</p>
                <p className="text-xl font-bold">
                  {paymentFilter === 'UNPAID' ? formatDeliveryFee(unpaidTotal, assignments[0]?.deliveryFeeCurrency) : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Paid This View</p>
                <p className="text-xl font-bold">{paymentFilter === 'PAID' ? paidCount : '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assignments Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Delivery Payment Records
            </CardTitle>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UNPAID">Unpaid</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="all">All Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Delivery Person</TableHead>
                  <TableHead>Delivery Fee</TableHead>
                  <TableHead>Distance</TableHead>
                  <TableHead>Delivered At</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <p className="font-medium">#{assignment.orderNumber || assignment.customOrderNumber}</p>
                      <p className="text-sm text-gray-500">
                        {orderService.formatPrice(assignment.totalAmountMinor, assignment.currencyCode)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span>{assignment.deliveryPersonName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-green-700">
                        {formatDeliveryFee(assignment.deliveryFee, assignment.deliveryFeeCurrency)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="flex items-center gap-1">
                          <Navigation className="h-3 w-3 text-gray-400" />
                          {formatDistance(assignment.distanceMeters)}
                        </div>
                        <div className="flex items-center gap-1 text-gray-500">
                          <Timer className="h-3 w-3" />
                          {formatDuration(assignment.estimatedDurationSeconds)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {assignment.deliveredAt 
                        ? new Date(assignment.deliveredAt).toLocaleDateString() 
                        : 'N/A'}
                    </TableCell>
                    <TableCell>{getPaymentBadge(assignment.deliveryPaymentStatus)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedAssignment(assignment);
                            setShowDetailDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {assignment.deliveryPaymentStatus !== 'PAID' && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              setSelectedAssignment(assignment);
                              setPaymentNotes('');
                              setShowPaymentDialog(true);
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {assignments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      {paymentFilter === 'UNPAID' 
                        ? 'No unpaid delivery payments pending' 
                        : 'No records found'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Approve Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-green-600" />
              Approve Delivery Payment
            </DialogTitle>
            <DialogDescription>
              Confirm that the delivery person has been paid for this delivery.
            </DialogDescription>
          </DialogHeader>
          {selectedAssignment && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Order</span>
                  <span className="font-medium">#{selectedAssignment.orderNumber || selectedAssignment.customOrderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Delivery Person</span>
                  <span className="font-medium">{selectedAssignment.deliveryPersonName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Delivery Fee</span>
                  <span className="font-bold text-green-700 text-lg">
                    {formatDeliveryFee(selectedAssignment.deliveryFee, selectedAssignment.deliveryFeeCurrency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Distance</span>
                  <span>{formatDistance(selectedAssignment.distanceMeters)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Delivered</span>
                  <span>
                    {selectedAssignment.deliveredAt
                      ? new Date(selectedAssignment.deliveredAt).toLocaleString()
                      : 'N/A'}
                  </span>
                </div>
              </div>

              <div>
                <Label>Payment Notes (optional)</Label>
                <Textarea
                  placeholder="e.g., Paid via bank transfer, ref #12345"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <p className="text-sm text-amber-700">
                    This confirms the delivery person has been paid outside the system. This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                if (selectedAssignment) {
                  approvePaymentMutation.mutate({
                    assignmentId: selectedAssignment.id,
                    notes: paymentNotes || undefined,
                  });
                }
              }}
              disabled={approvePaymentMutation.isPending}
            >
              {approvePaymentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Delivery Payment Details
            </DialogTitle>
            <DialogDescription>
              Order #{selectedAssignment?.orderNumber || selectedAssignment?.customOrderNumber}
            </DialogDescription>
          </DialogHeader>
          {selectedAssignment && (
            <div className="space-y-4">
              {/* Delivery Person */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <User className="h-4 w-4" /> Delivery Person
                </h4>
                <p className="font-semibold">{selectedAssignment.deliveryPersonName}</p>
              </div>

              {/* Customer & Address */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4" /> Delivery Details
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <Label className="text-gray-500">Customer</Label>
                    <p className="font-medium">{selectedAssignment.customerName || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">City</Label>
                    <p className="font-medium">{selectedAssignment.shippingCity || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Distance</Label>
                    <p className="font-medium">{formatDistance(selectedAssignment.distanceMeters)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Duration</Label>
                    <p className="font-medium">{formatDuration(selectedAssignment.estimatedDurationSeconds)}</p>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium flex items-center gap-2 mb-3">
                  <DollarSign className="h-4 w-4 text-green-600" /> Financial Summary
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <Label className="text-gray-500">Order Total</Label>
                    <p className="font-medium">
                      {orderService.formatPrice(selectedAssignment.totalAmountMinor, selectedAssignment.currencyCode)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Delivery Fee</Label>
                    <p className="font-bold text-green-700 text-lg">
                      {formatDeliveryFee(selectedAssignment.deliveryFee, selectedAssignment.deliveryFeeCurrency)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Status */}
              <div className={`rounded-lg p-4 ${selectedAssignment.deliveryPaymentStatus === 'PAID' ? 'bg-green-50' : 'bg-amber-50'}`}>
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <Wallet className="h-4 w-4" /> Payment Status
                </h4>
                <div className="flex items-center gap-2 mb-2">
                  {getPaymentBadge(selectedAssignment.deliveryPaymentStatus)}
                </div>
                {selectedAssignment.deliveryPaymentStatus === 'PAID' && (
                  <div className="text-sm space-y-1 mt-2">
                    {selectedAssignment.deliveryPaymentApprovedAt && (
                      <p><span className="text-gray-500">Approved:</span> {new Date(selectedAssignment.deliveryPaymentApprovedAt).toLocaleString()}</p>
                    )}
                    {selectedAssignment.deliveryPaymentApprovedByName && (
                      <p><span className="text-gray-500">By:</span> {selectedAssignment.deliveryPaymentApprovedByName}</p>
                    )}
                    {selectedAssignment.deliveryPaymentNotes && (
                      <p><span className="text-gray-500">Notes:</span> {selectedAssignment.deliveryPaymentNotes}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Timeline</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <Label className="text-gray-500">Assigned</Label>
                    <p>{selectedAssignment.assignedAt ? new Date(selectedAssignment.assignedAt).toLocaleString() : 'N/A'}</p>
                  </div>
                  {selectedAssignment.pickedUpAt && (
                    <div>
                      <Label className="text-gray-500">Picked Up</Label>
                      <p>{new Date(selectedAssignment.pickedUpAt).toLocaleString()}</p>
                    </div>
                  )}
                  {selectedAssignment.deliveredAt && (
                    <div>
                      <Label className="text-gray-500">Delivered</Label>
                      <p>{new Date(selectedAssignment.deliveredAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            {selectedAssignment?.deliveryPaymentStatus !== 'PAID' && (
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  setShowDetailDialog(false);
                  setPaymentNotes('');
                  setShowPaymentDialog(true);
                }}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve Payment
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
