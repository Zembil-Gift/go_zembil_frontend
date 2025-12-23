import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Truck, 
  Search,
  UserPlus,
  Eye,
  Loader2,
  Phone,
  Mail,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  MoreVertical,
  Power,
  Trash2,
  Image as ImageIcon,
  User,
  Calendar
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  adminDeliveryService,
  DeliveryPersonDto,
  DeliveryAssignmentDto,
  CreateDeliveryPersonRequest,
  OrderReadyForDeliveryDto,
} from '@/services/deliveryService';

export default function AdminDelivery() {
  const [activeTab, setActiveTab] = useState('persons');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<DeliveryPersonDto | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<DeliveryAssignmentDto | null>(null);
  const [showAssignmentDetailDialog, setShowAssignmentDetailDialog] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedDeliveryPersonId, setSelectedDeliveryPersonId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CreateDeliveryPersonRequest>({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    phoneNumber: '',
    vehicleType: '',
    vehicleNumber: '',
    notes: '',
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch delivery persons
  const { data: personsData, isLoading: loadingPersons } = useQuery({
    queryKey: ['admin', 'delivery-persons', searchTerm],
    queryFn: () => adminDeliveryService.getAllDeliveryPersons({ search: searchTerm || undefined }),
  });

  // Fetch assignments
  const { data: assignmentsData, isLoading: loadingAssignments } = useQuery({
    queryKey: ['admin', 'delivery-assignments', statusFilter],
    queryFn: () => adminDeliveryService.getAllAssignments({ 
      status: statusFilter !== 'all' ? statusFilter : undefined 
    }),
  });

  // Fetch available delivery persons for assignment
  const { data: availablePersonsData } = useQuery({
    queryKey: ['admin', 'available-delivery-persons'],
    queryFn: () => adminDeliveryService.getAvailableDeliveryPersons(),
    enabled: showAssignDialog,
  });

  // Fetch unassigned orders (confirmed/processing without delivery assignment)
  const { data: ordersData } = useQuery({
    queryKey: ['admin', 'orders-ready-for-delivery'],
    queryFn: () => adminDeliveryService.getOrdersReadyForDelivery({ page: 0, size: 100 }),
    enabled: showAssignDialog,
  });

  // Create delivery person mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateDeliveryPersonRequest) => adminDeliveryService.createDeliveryPerson(data),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Delivery person created successfully' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'delivery-persons'] });
      setShowAddDialog(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.response?.data?.message || 'Failed to create delivery person',
        variant: 'destructive' 
      });
    },
  });

  // Activate/Deactivate mutations
  const activateMutation = useMutation({
    mutationFn: (id: number) => adminDeliveryService.activateDeliveryPerson(id),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Delivery person activated' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'delivery-persons'] });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => adminDeliveryService.deactivateDeliveryPerson(id),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Delivery person deactivated' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'delivery-persons'] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminDeliveryService.deleteDeliveryPerson(id),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Delivery person deleted' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'delivery-persons'] });
      setShowDeleteDialog(false);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.response?.data?.message || 'Cannot delete delivery person with active assignments',
        variant: 'destructive' 
      });
    },
  });

  // Assign order mutation
  const assignMutation = useMutation({
    mutationFn: (data: { orderId: number; deliveryPersonId: number }) => 
      adminDeliveryService.assignOrderToDeliveryPerson(data),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Order assigned to delivery person' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'delivery-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders-ready-for-delivery'] });
      setShowAssignDialog(false);
      setSelectedOrderId(null);
      setSelectedDeliveryPersonId(null);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.response?.data?.message || 'Failed to assign order',
        variant: 'destructive' 
      });
    },
  });

  // Cancel assignment mutation
  const cancelAssignmentMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => 
      adminDeliveryService.cancelAssignment(id, reason),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Assignment cancelled' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'delivery-assignments'] });
    },
  });

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      username: '',
      password: '',
      phoneNumber: '',
      vehicleType: '',
      vehicleNumber: '',
      notes: '',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      AVAILABLE: { color: 'bg-green-100 text-green-800', label: 'Available' },
      BUSY: { color: 'bg-yellow-100 text-yellow-800', label: 'Busy' },
      OFFLINE: { color: 'bg-gray-100 text-gray-800', label: 'Offline' },
      ON_BREAK: { color: 'bg-blue-100 text-blue-800', label: 'On Break' },
      ASSIGNED: { color: 'bg-blue-100 text-blue-800', label: 'Assigned' },
      ACCEPTED: { color: 'bg-indigo-100 text-indigo-800', label: 'Accepted' },
      PICKED_UP: { color: 'bg-purple-100 text-purple-800', label: 'Picked Up' },
      IN_TRANSIT: { color: 'bg-orange-100 text-orange-800', label: 'In Transit' },
      ARRIVED: { color: 'bg-cyan-100 text-cyan-800', label: 'Arrived' },
      DELIVERED: { color: 'bg-green-100 text-green-800', label: 'Delivered' },
      FAILED: { color: 'bg-red-100 text-red-800', label: 'Failed' },
      RETURNED: { color: 'bg-amber-100 text-amber-800', label: 'Returned' },
      CANCELLED: { color: 'bg-gray-100 text-gray-800', label: 'Cancelled' },
    };
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', label: status };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const persons = personsData?.content || [];
  const assignments = assignmentsData?.content || [];
  const availablePersons = availablePersonsData?.content || [];
  const unassignedOrders: OrderReadyForDeliveryDto[] = ordersData?.content || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Delivery Management</h1>
            <p className="text-gray-500 mt-1">Manage delivery personnel and order assignments</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowAssignDialog(true)} variant="outline">
              <Package className="h-4 w-4 mr-2" />
              Assign Order
            </Button>
            <Button onClick={() => setShowAddDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Delivery Person
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Truck className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Personnel</p>
                  <p className="text-2xl font-bold">{persons.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Available</p>
                  <p className="text-2xl font-bold">
                    {persons.filter(p => p.status === 'AVAILABLE' && p.active).length}
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
                  <p className="text-sm text-gray-500">Active Deliveries</p>
                  <p className="text-2xl font-bold">
                    {assignments.filter(a => !['DELIVERED', 'FAILED', 'CANCELLED'].includes(a.status)).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Package className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Completed Today</p>
                  <p className="text-2xl font-bold">
                    {assignments.filter(a => a.status === 'DELIVERED').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="persons">Delivery Personnel</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
          </TabsList>

          <TabsContent value="persons" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Delivery Personnel</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by name, email..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingPersons ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Deliveries</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {persons.map((person) => (
                        <TableRow key={person.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{person.firstName} {person.lastName}</p>
                              <p className="text-sm text-gray-500">{person.employeeId}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {person.email}
                              </div>
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {person.phoneNumber}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {person.vehicleType && (
                              <div className="text-sm">
                                <p>{person.vehicleType}</p>
                                <p className="text-gray-500">{person.vehicleNumber}</p>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(person.status)}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{person.successfulDeliveries}/{person.totalDeliveries}</p>
                              <p className="text-gray-500">{person.activeAssignments} active</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={person.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                              {person.active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setSelectedPerson(person);
                                  setShowViewDialog(true);
                                }}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                {person.active ? (
                                  <DropdownMenuItem 
                                    onClick={() => deactivateMutation.mutate(person.id)}
                                    className="text-yellow-600"
                                  >
                                    <Power className="h-4 w-4 mr-2" />
                                    Deactivate
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem 
                                    onClick={() => activateMutation.mutate(person.id)}
                                    className="text-green-600"
                                  >
                                    <Power className="h-4 w-4 mr-2" />
                                    Activate
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedPerson(person);
                                    setShowDeleteDialog(true);
                                  }}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                      {persons.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            No delivery personnel found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignments" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Delivery Assignments</CardTitle>
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
                        <TableHead>Order</TableHead>
                        <TableHead>Delivery Person</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assigned At</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignments.map((assignment) => (
                        <TableRow key={assignment.id}>
                          <TableCell>
                            <p className="font-medium">#{assignment.orderNumber}</p>
                            <p className="text-sm text-gray-500">
                              {(assignment.totalAmountMinor / 100).toFixed(2)} {assignment.currencyCode}
                            </p>
                          </TableCell>
                          <TableCell>{assignment.deliveryPersonName}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{assignment.customerName}</p>
                              <p className="text-gray-500">{assignment.customerPhone}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{assignment.shippingAddress}</p>
                              <p className="text-gray-500">{assignment.shippingCity}</p>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(assignment.status)}</TableCell>
                          <TableCell>
                            {assignment.assignedAt && new Date(assignment.assignedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setSelectedAssignment(assignment);
                                  setShowAssignmentDetailDialog(true);
                                }}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                {!['DELIVERED', 'CANCELLED'].includes(assignment.status) && (
                                  <DropdownMenuItem 
                                    onClick={() => cancelAssignmentMutation.mutate({ 
                                      id: assignment.id, 
                                      reason: 'Cancelled by admin' 
                                    })}
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
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            No assignments found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Delivery Person Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Delivery Person</DialogTitle>
            <DialogDescription>
              Create a new delivery person account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name</Label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Username</Label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <div>
              <Label>Phone Number</Label>
              <Input
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Vehicle Type (Optional)</Label>
                <Select
                  value={formData.vehicleType || ''}
                  onValueChange={(value) => setFormData({ ...formData, vehicleType: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="Motorcycle">Motorcycle</SelectItem>
                    <SelectItem value="Bicycle">Bicycle</SelectItem>
                    <SelectItem value="Scooter">Scooter</SelectItem>
                    <SelectItem value="Car">Car</SelectItem>
                    <SelectItem value="Van">Van</SelectItem>
                    <SelectItem value="Truck">Truck</SelectItem>
                    <SelectItem value="Public Transport">Public Transport</SelectItem>
                    <SelectItem value="Walking">Walking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vehicle Number</Label>
                <Input
                  placeholder="e.g., AB-1234"
                  value={formData.vehicleNumber}
                  onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createMutation.mutate(formData)}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Order Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Order to Delivery Person</DialogTitle>
            <DialogDescription>
              Select an order and a delivery person
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Order</Label>
              <Select 
                value={selectedOrderId?.toString() || ''} 
                onValueChange={(v) => setSelectedOrderId(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an order" />
                </SelectTrigger>
                <SelectContent>
                  {unassignedOrders.map((order) => (
                    <SelectItem key={order.id} value={order.id.toString()}>
                      #{order.orderNumber} - {order.customerName} ({order.shippingCity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Select Delivery Person</Label>
              <Select 
                value={selectedDeliveryPersonId?.toString() || ''} 
                onValueChange={(v) => setSelectedDeliveryPersonId(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select delivery person" />
                </SelectTrigger>
                <SelectContent>
                  {availablePersons.map((person) => (
                    <SelectItem key={person.id} value={person.id.toString()}>
                      {person.firstName} {person.lastName} ({person.employeeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (selectedOrderId && selectedDeliveryPersonId) {
                  assignMutation.mutate({ 
                    orderId: selectedOrderId, 
                    deliveryPersonId: selectedDeliveryPersonId 
                  });
                }
              }}
              disabled={!selectedOrderId || !selectedDeliveryPersonId || assignMutation.isPending}
            >
              {assignMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Person Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delivery Person Details</DialogTitle>
          </DialogHeader>
          {selectedPerson && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Name</Label>
                  <p className="font-medium">{selectedPerson.firstName} {selectedPerson.lastName}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Employee ID</Label>
                  <p className="font-medium">{selectedPerson.employeeId}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Email</Label>
                  <p>{selectedPerson.email}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Phone</Label>
                  <p>{selectedPerson.phoneNumber}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Vehicle</Label>
                  <p>{selectedPerson.vehicleType} - {selectedPerson.vehicleNumber}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedPerson.status)}</div>
                </div>
                <div>
                  <Label className="text-gray-500">Total Deliveries</Label>
                  <p>{selectedPerson.totalDeliveries}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Success Rate</Label>
                  <p>
                    {selectedPerson.totalDeliveries > 0 
                      ? ((selectedPerson.successfulDeliveries / selectedPerson.totalDeliveries) * 100).toFixed(1)
                      : 0}%
                  </p>
                </div>
              </div>
              {selectedPerson.notes && (
                <div>
                  <Label className="text-gray-500">Notes</Label>
                  <p>{selectedPerson.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Delivery Person?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedPerson?.firstName} {selectedPerson?.lastName}'s account.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700"
              onClick={() => selectedPerson && deleteMutation.mutate(selectedPerson.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assignment Detail Dialog */}
      <Dialog open={showAssignmentDetailDialog} onOpenChange={setShowAssignmentDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Assignment Details
            </DialogTitle>
            <DialogDescription>
              Order #{selectedAssignment?.orderNumber}
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
                    <p className="font-medium">{selectedAssignment.customerName || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Phone</Label>
                    <p className="font-medium">{selectedAssignment.customerPhone || 'N/A'}</p>
                  </div>
                </div>
                <div className="text-sm">
                  <Label className="text-gray-500">Address</Label>
                  <p className="font-medium">
                    {selectedAssignment.shippingAddress}
                    {selectedAssignment.shippingCity && `, ${selectedAssignment.shippingCity}`}
                  </p>
                </div>
              </div>

              {/* Delivery Person Info */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Delivery Person
                </h4>
                <p className="font-medium">{selectedAssignment.deliveryPersonName}</p>
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
                    <p>{selectedAssignment.assignedAt ? new Date(selectedAssignment.assignedAt).toLocaleString() : 'N/A'}</p>
                  </div>
                  {selectedAssignment.pickedUpAt && (
                    <div>
                      <Label className="text-gray-500">Picked Up At</Label>
                      <p>{new Date(selectedAssignment.pickedUpAt).toLocaleString()}</p>
                    </div>
                  )}
                  {selectedAssignment.deliveredAt && (
                    <div>
                      <Label className="text-gray-500">Delivered At</Label>
                      <p>{new Date(selectedAssignment.deliveredAt).toLocaleString()}</p>
                    </div>
                  )}
                  {selectedAssignment.expectedDeliveryAt && (
                    <div>
                      <Label className="text-gray-500">Expected By</Label>
                      <p>{new Date(selectedAssignment.expectedDeliveryAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Total */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Order Total</span>
                  <span className="text-xl font-bold">
                    {(selectedAssignment.totalAmountMinor / 100).toFixed(2)} {selectedAssignment.currencyCode}
                  </span>
                </div>
              </div>

              {/* Recipient Info (if delivered) */}
              {selectedAssignment.recipientName && (
                <div className="bg-green-50 rounded-lg p-4">
                  <Label className="text-gray-500">Received By</Label>
                  <p className="font-medium text-green-700">{selectedAssignment.recipientName}</p>
                </div>
              )}

              {/* Failure Reason (if failed) */}
              {selectedAssignment.failureReason && (
                <div className="bg-red-50 rounded-lg p-4">
                  <Label className="text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Failure Reason
                  </Label>
                  <p className="text-red-700">{selectedAssignment.failureReason}</p>
                </div>
              )}

              {/* Notes */}
              {selectedAssignment.notes && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <Label className="text-gray-500">Notes</Label>
                  <p>{selectedAssignment.notes}</p>
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
                      Uploaded: {new Date(selectedAssignment.proofUploadedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignmentDetailDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
