import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Gift,
  Eye,
  Loader2,
  Clock,
  MoreVertical,
  XCircle,
  Truck,
  User,
  Calendar,
  ImageIcon,
  AlertCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  adminDeliveryService,
  AdminDeliveryAssignmentDto,
  OrderReadyForDeliveryDto,
} from "@/services/deliveryService";
import { orderService } from "@/services/orderService";

export default function AdminCustomOrderAssignments() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedAssignment, setSelectedAssignment] =
    useState<AdminDeliveryAssignmentDto | null>(null);
  const [showAssignmentDetailDialog, setShowAssignmentDetailDialog] =
    useState(false);
  const [selectedCustomOrderId, setSelectedCustomOrderId] = useState<
    number | null
  >(null);
  const [selectedDeliveryPersonId, setSelectedDeliveryPersonId] = useState<
    number | null
  >(null);
  const [selectedEta, setSelectedEta] = useState<string>("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch custom order assignments
  const { data: assignmentsData, isLoading: loadingAssignments } = useQuery({
    queryKey: ["admin", "custom-order-assignments", statusFilter],
    queryFn: () =>
      adminDeliveryService.getCustomOrderAssignments({
        status: statusFilter !== "all" ? statusFilter : undefined,
      }),
  });

  // Fetch available delivery persons for assignment
  const { data: availablePersonsData } = useQuery({
    queryKey: ["admin", "available-delivery-persons"],
    queryFn: () => adminDeliveryService.getAvailableDeliveryPersons(),
    enabled: showAssignDialog,
  });

  // Fetch unassigned custom orders (completed without delivery assignment)
  const { data: customOrdersData } = useQuery({
    queryKey: ["admin", "custom-orders-ready-for-delivery"],
    queryFn: () =>
      adminDeliveryService.getCustomOrdersReadyForDelivery({
        page: 0,
        size: 100,
      }),
    enabled: showAssignDialog,
  });

  // Assign custom order mutation
  const assignMutation = useMutation({
    mutationFn: (data: {
      customOrderId: number;
      deliveryPersonId: number;
      expectedDeliveryAt: string;
    }) => adminDeliveryService.assignCustomOrderToDeliveryPerson(data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Custom order assigned to delivery person",
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "custom-order-assignments"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "custom-orders-ready-for-delivery"],
      });
      setShowAssignDialog(false);
      setSelectedCustomOrderId(null);
      setSelectedDeliveryPersonId(null);
      setSelectedEta("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to assign custom order",
        variant: "destructive",
      });
    },
  });

  // Cancel assignment mutation
  const cancelAssignmentMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      adminDeliveryService.cancelAssignment(id, reason),
    onSuccess: () => {
      toast({ title: "Success", description: "Assignment cancelled" });
      queryClient.invalidateQueries({
        queryKey: ["admin", "custom-order-assignments"],
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      ASSIGNED: { color: "bg-blue-100 text-blue-800", label: "Assigned" },
      ACCEPTED: { color: "bg-indigo-100 text-indigo-800", label: "Accepted" },
      PICKED_UP: { color: "bg-purple-100 text-purple-800", label: "Picked Up" },
      IN_TRANSIT: {
        color: "bg-orange-100 text-orange-800",
        label: "In Transit",
      },
      DELIVERED: { color: "bg-green-100 text-green-800", label: "Delivered" },
      FAILED: { color: "bg-red-100 text-red-800", label: "Failed" },
      RETURNED: { color: "bg-amber-100 text-amber-800", label: "Returned" },
      CANCELLED: { color: "bg-gray-100 text-gray-800", label: "Cancelled" },
    };
    const config = statusConfig[status] || {
      color: "bg-gray-100 text-gray-800",
      label: status,
    };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const assignments = assignmentsData?.content || [];
  const availablePersons = availablePersonsData?.content || [];
  const unassignedCustomOrders: OrderReadyForDeliveryDto[] =
    customOrdersData?.content || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button onClick={() => setShowAssignDialog(true)} variant="default">
            <Gift className="h-4 w-4 mr-2" />
            Assign Custom Order
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Gift className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Waitlist Custom Orders</p>
                <p className="text-xl font-bold">
                  {unassignedCustomOrders.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Assignments</p>
                <p className="text-xl font-bold">
                  {
                    assignments.filter(
                      (a) =>
                        !["DELIVERED", "FAILED", "CANCELLED"].includes(a.status)
                    ).length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Truck className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-xl font-bold">
                  {assignments.filter((a) => a.status === "DELIVERED").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Custom Order Delivery Assignments</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ASSIGNED">Assigned</SelectItem>
                <SelectItem value="ACCEPTED">Accepted</SelectItem>
                <SelectItem value="PICKED_UP">Picked Up</SelectItem>
                <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loadingAssignments ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Custom Order</TableHead>
                  <TableHead>Delivery Person</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>ETA</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          #
                          {assignment.customOrderNumber ||
                            assignment.orderNumber}
                        </p>
                        <Badge
                          variant="outline"
                          className="text-xs mt-1 bg-purple-50 text-purple-700"
                        >
                          Custom
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{assignment.deliveryPersonName}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{assignment.customerName}</p>
                        <p className="text-gray-500">
                          {assignment.customerPhone}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {assignment.eta || assignment.expectedDeliveryAt ? (
                        <div className="text-sm">
                          {new Date(
                            assignment.eta ||
                              assignment.expectedDeliveryAt ||
                              ""
                          ).toLocaleString()}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(assignment.status)}</TableCell>
                    <TableCell>
                      {assignment.assignedAt &&
                        new Date(assignment.assignedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedAssignment(assignment);
                              setShowAssignmentDetailDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {!["DELIVERED", "CANCELLED"].includes(
                            assignment.status
                          ) && (
                            <DropdownMenuItem
                              onClick={() =>
                                cancelAssignmentMutation.mutate({
                                  id: assignment.id,
                                  reason: "Cancelled by admin",
                                })
                              }
                              className="text-red-600"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancel Assignment
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {assignments.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-gray-500"
                    >
                      No custom order assignments found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Assign Custom Order Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Custom Order to Delivery Person</DialogTitle>
            <DialogDescription>
              Select a completed custom order and a delivery person
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Custom Order</Label>
              <Select
                value={selectedCustomOrderId?.toString() || ""}
                onValueChange={(v) => setSelectedCustomOrderId(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a custom order" />
                </SelectTrigger>
                <SelectContent>
                  {unassignedCustomOrders.map((order) => (
                    <SelectItem key={order.id} value={order.id.toString()}>
                      #{order.orderNumber} - {order.customerName}
                    </SelectItem>
                  ))}
                  {unassignedCustomOrders.length === 0 && (
                    <SelectItem value="none" disabled>
                      No unassigned custom orders found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {selectedCustomOrderId && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                  {(() => {
                    const order = unassignedCustomOrders.find(
                      (o) => o.id === selectedCustomOrderId
                    );
                    return order ? (
                      <>
                        <p>
                          <strong>Customer:</strong> {order.customerName}
                        </p>
                        <p>
                          <strong>Phone:</strong> {order.customerPhone || "N/A"}
                        </p>
                      </>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
            <div>
              <Label>Select Delivery Person</Label>
              <Select
                value={selectedDeliveryPersonId?.toString() || ""}
                onValueChange={(v) => setSelectedDeliveryPersonId(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select delivery person" />
                </SelectTrigger>
                <SelectContent>
                  {availablePersons.map((person) => (
                    <SelectItem key={person.id} value={person.id.toString()}>
                      {person.firstName} {person.lastName} ({person.employeeId})
                      {person.vehicleType ? ` - ${person.vehicleType}` : ""}
                    </SelectItem>
                  ))}
                  {availablePersons.length === 0 && (
                    <SelectItem value="none" disabled>
                      No available delivery persons
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="custom-order-assignment-eta">ETA *</Label>
              <Input
                id="custom-order-assignment-eta"
                type="datetime-local"
                value={selectedEta}
                onChange={(e) => setSelectedEta(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Required: expected delivery date and time.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAssignDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (
                  selectedCustomOrderId &&
                  selectedDeliveryPersonId &&
                  selectedEta
                ) {
                  assignMutation.mutate({
                    customOrderId: selectedCustomOrderId,
                    deliveryPersonId: selectedDeliveryPersonId,
                    expectedDeliveryAt: new Date(selectedEta).toISOString(),
                  });
                }
              }}
              disabled={
                !selectedCustomOrderId ||
                !selectedDeliveryPersonId ||
                !selectedEta ||
                assignMutation.isPending
              }
            >
              {assignMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assignment Detail Dialog */}
      <Dialog
        open={showAssignmentDetailDialog}
        onOpenChange={setShowAssignmentDetailDialog}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Custom Order Assignment Details
            </DialogTitle>
            <DialogDescription>
              Custom Order #
              {selectedAssignment?.customOrderNumber ||
                selectedAssignment?.orderNumber}
            </DialogDescription>
          </DialogHeader>
          {selectedAssignment && (
            <div className="space-y-6">
              {/* Status & Basic Info */}
              <div className="flex items-center justify-between">
                {getStatusBadge(selectedAssignment.status)}
                <span className="text-sm text-gray-500">
                  Attempt #{selectedAssignment.attemptCount}
                </span>
              </div>

              {/* Customer Info */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer Details
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-gray-500">Name</Label>
                    <p className="font-medium">
                      {selectedAssignment.customerName || "N/A"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Phone</Label>
                    <p className="font-medium">
                      {selectedAssignment.customerPhone || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Delivery Person Info */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Delivery Person
                </h4>
                <p className="font-medium">
                  {selectedAssignment.deliveryPersonName}
                </p>
              </div>

              {/* Timeline */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Timeline
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-gray-500">Assigned At</Label>
                    <p>
                      {selectedAssignment.assignedAt
                        ? new Date(
                            selectedAssignment.assignedAt
                          ).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                  {selectedAssignment.pickedUpAt && (
                    <div>
                      <Label className="text-gray-500">Picked Up At</Label>
                      <p>
                        {new Date(
                          selectedAssignment.pickedUpAt
                        ).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {selectedAssignment.deliveredAt && (
                    <div>
                      <Label className="text-gray-500">Delivered At</Label>
                      <p>
                        {new Date(
                          selectedAssignment.deliveredAt
                        ).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recipient Info (if delivered) */}
              {selectedAssignment.recipientName && (
                <div className="bg-green-50 rounded-lg p-4">
                  <Label className="text-gray-500">Received By</Label>
                  <p className="font-medium text-green-700">
                    {selectedAssignment.recipientName}
                  </p>
                </div>
              )}

              {/* Failure Reason (if failed) */}
              {selectedAssignment.failureReason && (
                <div className="bg-red-50 rounded-lg p-4">
                  <Label className="text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Failure Reason
                  </Label>
                  <p className="text-red-700">
                    {selectedAssignment.failureReason}
                  </p>
                </div>
              )}

              {/* Notes */}
              {selectedAssignment.notes && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <Label className="text-gray-500">Notes</Label>
                  <p>{selectedAssignment.notes}</p>
                </div>
              )}

              {/* Pickup Proof Image */}
              {selectedAssignment.pickupImageUrl && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Pickup Proof Photo
                  </h4>
                  <div className="border rounded-lg overflow-hidden">
                    <img
                      src={selectedAssignment.pickupImageUrl}
                      alt="Pickup proof"
                      className="w-full max-h-96 object-contain bg-gray-100"
                    />
                  </div>
                  {selectedAssignment.pickupUploadedAt && (
                    <p className="text-xs text-gray-500">
                      Uploaded:{" "}
                      {new Date(
                        selectedAssignment.pickupUploadedAt
                      ).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {/* Delivery Proof Image */}
              {selectedAssignment.proofImageUrl && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Delivery Proof Photo
                  </h4>
                  <div className="border rounded-lg overflow-hidden">
                    <img
                      src={selectedAssignment.proofImageUrl}
                      alt="Delivery proof"
                      className="w-full max-h-96 object-contain bg-gray-100"
                    />
                  </div>
                  {selectedAssignment.proofUploadedAt && (
                    <p className="text-xs text-gray-500">
                      Uploaded:{" "}
                      {new Date(
                        selectedAssignment.proofUploadedAt
                      ).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {/* Order Total */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Order Total</span>
                  <span className="text-xl font-bold">
                    {orderService.formatPrice(
                      selectedAssignment.totalAmountMinor,
                      selectedAssignment.currencyCode
                    )}
                  </span>
                </div>
              </div>

              {/* No Images Message */}
              {!selectedAssignment.pickupImageUrl &&
                !selectedAssignment.proofImageUrl && (
                  <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                    <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No proof images uploaded yet</p>
                  </div>
                )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAssignmentDetailDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
