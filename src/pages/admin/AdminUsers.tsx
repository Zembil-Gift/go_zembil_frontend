import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
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
  Users, 
  Search,
  Eye,
  Loader2,
  Mail,
  Phone,
  MapPin,
  Shield,
  UserCog,
  UserPlus,
  Trash2
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import { userService, CreateAdminRequest } from '@/services/userService';

export default function AdminUsers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showAddAdminDialog, setShowAddAdminDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newRole, setNewRole] = useState<string>('');
  const [showConfirmAdmin, setShowConfirmAdmin] = useState(false);
  const [adminFormData, setAdminFormData] = useState<CreateAdminRequest>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    username: '',
    phoneNumber: '',
    preferredCurrency: 'ETB'
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      try {
        const response = await adminService.getUsers(0, 100);
        return response;
      } catch (error) {
        console.error('Failed to fetch users:', error);
        return { content: [], totalElements: 0, totalPages: 0, size: 0, number: 0 };
      }
    },
  });

  const { data: currencies = [] } = useQuery({
    queryKey: ['currencies', 'active'],
    queryFn: async () => {
      try {
        return await adminService.getActiveCurrencies();
      } catch (error) {
        console.error('Failed to fetch currencies:', error);
        return [];
      }
    },
  });

  const users = usersData?.content || [];

  const filteredUsers = users.filter((user: any) => {
    const matchesSearch = 
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role?.toLowerCase() === roleFilter.toLowerCase();
    
    return matchesSearch && matchesRole;
  });

  const getRoleColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'vendor': return 'bg-blue-100 text-blue-800';
      case 'customer': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Mutation for updating user role
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: string }) =>
      adminService.updateUserRole(userId, role),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast({
        title: 'Role updated',
        description: `User role has been changed to ${variables.role}`,
      });
      setShowRoleDialog(false);
      setShowConfirmAdmin(false);
      setSelectedUser(null);
      setNewRole('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating role',
        description: error.message || 'Failed to update user role',
        variant: 'destructive',
      });
    },
  });

  // Mutation for creating admin
  const createAdminMutation = useMutation({
    mutationFn: (data: CreateAdminRequest) => userService.createAdmin(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast({
        title: 'Admin created',
        description: 'New admin user has been created successfully',
      });
      setShowAddAdminDialog(false);
      setAdminFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        username: '',
        phoneNumber: '',
        preferredCurrency: 'ETB'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating admin',
        description: error.message || 'Failed to create admin user',
        variant: 'destructive',
      });
    },
  });

  // Mutation for deleting user
  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => adminService.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast({
        title: 'User deleted',
        description: 'User has been deleted successfully',
      });
      setShowDeleteDialog(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting user',
        description: error.message || 'Failed to delete user',
        variant: 'destructive',
      });
    },
  });

  const handleRoleChange = (user: any) => {
    setSelectedUser(user);
    setNewRole(user.role?.toUpperCase() || 'CUSTOMER');
    setShowRoleDialog(true);
  };

  const handleConfirmRoleChange = () => {
    if (!selectedUser || !newRole) return;
    
    // If promoting to admin, show extra confirmation
    if (newRole === 'ADMIN' && selectedUser.role?.toUpperCase() !== 'ADMIN') {
      setShowConfirmAdmin(true);
      return;
    }
    
    updateRoleMutation.mutate({ userId: selectedUser.userId || selectedUser.id, role: newRole });
  };

  const handleViewUser = (user: any) => {
    setSelectedUser(user);
    setShowViewDialog(true);
  };

  const handleDeleteUser = (user: any) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (!selectedUser) return;
    deleteUserMutation.mutate(selectedUser.userId || selectedUser.id);
  };

  const handleCreateAdmin = () => {
    if (!adminFormData.firstName || !adminFormData.lastName || !adminFormData.email || 
        !adminFormData.password || !adminFormData.username || !adminFormData.phoneNumber) {
      toast({
        title: 'Validation error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }
    createAdminMutation.mutate(adminFormData);
  };

  return (
    <AdminLayout 
      title="User Management" 
      description="View and manage all registered users"
    >
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="customer">Customers</SelectItem>
            <SelectItem value="vendor">Vendors</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setShowAddAdminDialog(true)} className="bg-eagle-green hover:bg-viridian-green">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Admin
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-gotham-bold text-eagle-green">{users.length}</div>
            <p className="text-sm text-gray-500">Total Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-gotham-bold text-green-600">
              {users.filter((u: any) => u.role?.toLowerCase() === 'customer').length}
            </div>
            <p className="text-sm text-gray-500">Customers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-gotham-bold text-blue-600">
              {users.filter((u: any) => u.role?.toLowerCase() === 'vendor').length}
            </div>
            <p className="text-sm text-gray-500">Vendors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-gotham-bold ">
              {users.filter((u: any) => u.role?.toLowerCase() === 'admin').length}
            </div>
            <p className="text-sm text-gray-500">Admins</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-eagle-green" />
            </div>
          ) : filteredUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user: any) => (
                  <TableRow key={user.userId || user.id}>
                    <TableCell>
                      <div className="font-medium text-eagle-green">
                        {user.firstName} {user.lastName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="h-3 w-3 mr-1" />
                          {user.email}
                        </div>
                        {user.phoneNumber && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Phone className="h-3 w-3 mr-1" />
                            {user.phoneNumber}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleColor(user.role)}>
                        {user.role?.charAt(0).toUpperCase() + user.role?.slice(1).toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={user.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {user.isActive !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleViewUser(user)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleRoleChange(user)}>
                          <UserCog className="h-4 w-4 mr-1" />
                          Role
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleDeleteUser(user)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-500">
                {searchTerm || roleFilter !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'Users will appear here when they register'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View User Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              View user information
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center justify-center mb-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-eagle-green to-viridian-green flex items-center justify-center text-white text-2xl font-gotham-bold">
                  {selectedUser.firstName?.charAt(0)}{selectedUser.lastName?.charAt(0)}
                </div>
              </div>
              <div className="text-center mb-4">
                <h3 className="text-lg font-gotham-bold text-eagle-green">
                  {selectedUser.firstName} {selectedUser.lastName}
                </h3>
                <Badge className={getRoleColor(selectedUser.role)}>
                  {selectedUser.role?.charAt(0).toUpperCase() + selectedUser.role?.slice(1).toLowerCase()}
                </Badge>
              </div>
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span>{selectedUser.email}</span>
                </div>
                {selectedUser.phoneNumber && (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span>{selectedUser.phoneNumber}</span>
                  </div>
                )}
                {selectedUser.city && (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span>{selectedUser.city}, {selectedUser.country || 'Ethiopia'}</span>
                  </div>
                )}
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-500">Joined</span>
                  <span>{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : '-'}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-500">Status</span>
                  <Badge className={selectedUser.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {selectedUser.isActive !== false ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setShowViewDialog(false);
              handleRoleChange(selectedUser);
            }}>
              <UserCog className="h-4 w-4 mr-1" />
              Change Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update role for {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-eagle-green to-viridian-green flex items-center justify-center text-white text-xl font-gotham-bold">
                {selectedUser?.firstName?.charAt(0)}{selectedUser?.lastName?.charAt(0)}
              </div>
            </div>
            <div className="text-center mb-4">
              <p className="text-sm text-gray-500">Current Role</p>
              <Badge className={getRoleColor(selectedUser?.role)}>
                {selectedUser?.role?.charAt(0).toUpperCase() + selectedUser?.role?.slice(1).toLowerCase()}
              </Badge>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">New Role</label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CUSTOMER">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Customer
                    </div>
                  </SelectItem>
                  <SelectItem value="VENDOR">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Vendor
                    </div>
                  </SelectItem>
                  <SelectItem value="ADMIN">
                    <div className="flex items-center gap-2">
                      Admin
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newRole === 'ADMIN' && selectedUser?.role?.toUpperCase() !== 'ADMIN' && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> Promoting this user to Admin will grant them full administrative access to the system.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmRoleChange}
              disabled={updateRoleMutation.isPending || newRole === selectedUser?.role?.toUpperCase()}
            >
              {updateRoleMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Admin Promotion Alert */}
      <AlertDialog open={showConfirmAdmin} onOpenChange={setShowConfirmAdmin}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              Confirm Admin Promotion
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to promote <strong>{selectedUser?.firstName} {selectedUser?.lastName}</strong> to Admin.
              <br /><br />
              This will give them full access to:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All orders and transactions</li>
                <li>User and vendor management</li>
                <li>Product and event approvals</li>
                <li>Financial reports and settings</li>
                <li>System configuration</li>
              </ul>
              <br />
              Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                updateRoleMutation.mutate({ 
                  userId: selectedUser.userId || selectedUser.id, 
                  role: 'ADMIN' 
                });
              }}
            >
              {updateRoleMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Yes, Make Admin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Admin Dialog */}
      <Dialog open={showAddAdminDialog} onOpenChange={setShowAddAdminDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Create Admin User
            </DialogTitle>
            <DialogDescription>
              Add a new administrator to the system
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={adminFormData.firstName}
                  onChange={(e) => setAdminFormData({ ...adminFormData, firstName: e.target.value })}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={adminFormData.lastName}
                  onChange={(e) => setAdminFormData({ ...adminFormData, lastName: e.target.value })}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={adminFormData.username}
                onChange={(e) => setAdminFormData({ ...adminFormData, username: e.target.value })}
                placeholder="johndoe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={adminFormData.email}
                onChange={(e) => setAdminFormData({ ...adminFormData, email: e.target.value })}
                placeholder="john.doe@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number *</Label>
              <Input
                id="phoneNumber"
                value={adminFormData.phoneNumber}
                onChange={(e) => setAdminFormData({ ...adminFormData, phoneNumber: e.target.value })}
                placeholder="+251911000000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={adminFormData.password}
                onChange={(e) => setAdminFormData({ ...adminFormData, password: e.target.value })}
                placeholder="Min 8 chars, letters & numbers"
              />
              <p className="text-xs text-gray-500">Must be at least 8 characters with letters and numbers</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Preferred Currency</Label>
              <Select 
                value={adminFormData.preferredCurrency} 
                onValueChange={(value) => setAdminFormData({ ...adminFormData, preferredCurrency: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.code} ({currency.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAdminDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateAdmin}
              disabled={createAdminMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {createAdminMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Create Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Delete User
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedUser?.firstName} {selectedUser?.lastName}</strong>?
              <br /><br />
              This action cannot be undone. This will permanently delete the user account and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleConfirmDelete}
            >
              {deleteUserMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Yes, Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
