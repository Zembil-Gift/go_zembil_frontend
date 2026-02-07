import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  CheckCircle,
  MoreVertical,
  Power,
  Trash2,
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
  CreateDeliveryPersonRequest,
} from '@/services/deliveryService';

export default function AdminDeliveryPersonnel() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<DeliveryPersonDto | null>(null);
  
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
      // ... other statuses if relevant for person status
    };
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', label: status };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const persons = personsData?.content || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button onClick={() => setShowAddDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Delivery Person
          </Button>
        </div>
      </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Delivery Personnel List</CardTitle>
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
    </div>
  );
}
