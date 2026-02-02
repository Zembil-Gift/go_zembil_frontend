import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  Shield, 
  Plus,
  Edit,
  Trash2,
  Loader2,
  Search,
  Key,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { 
  rolePermissionService, 
  Role, 
  Permission, 
  CreateRoleRequest 
} from '@/services/rolePermissionService';

export default function AdminRoles() {
  const { isSuperAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const [formData, setFormData] = useState<CreateRoleRequest>({
    code: '',
    name: '',
    description: '',
    permissionIds: []
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user is super admin
  const canManageRoles = isSuperAdmin();

  // Fetch all roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: () => rolePermissionService.getAllRoles(),
    enabled: canManageRoles,
  });

  // Fetch all permissions
  const { data: permissions = [] } = useQuery({
    queryKey: ['admin', 'permissions'],
    queryFn: () => rolePermissionService.getAllPermissions(),
    enabled: canManageRoles,
  });

  // Group permissions by category
  const permissionsByCategory = rolePermissionService.groupPermissionsByCategory(permissions);

  // Filtered roles
  const filteredRoles = roles.filter((role: Role) =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: (data: CreateRoleRequest) => rolePermissionService.createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
      toast({
        title: 'Role created',
        description: 'New role has been created successfully',
      });
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating role',
        description: error.message || 'Failed to create role',
        variant: 'destructive',
      });
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ roleId, data }: { roleId: number; data: any }) =>
      rolePermissionService.updateRole(roleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
      toast({
        title: 'Role updated',
        description: 'Role has been updated successfully',
      });
      setShowEditDialog(false);
      setSelectedRole(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating role',
        description: error.message || 'Failed to update role',
        variant: 'destructive',
      });
    },
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: (roleId: number) => rolePermissionService.deleteRole(roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
      toast({
        title: 'Role deleted',
        description: 'Role has been deleted successfully',
      });
      setShowDeleteDialog(false);
      setSelectedRole(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting role',
        description: error.message || 'Failed to delete role',
        variant: 'destructive',
      });
    },
  });

  // Assign permissions mutation
  const assignPermissionsMutation = useMutation({
    mutationFn: ({ roleId, permissionIds }: { roleId: number; permissionIds: number[] }) =>
      rolePermissionService.assignPermissionsToRole(roleId, permissionIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
      toast({
        title: 'Permissions updated',
        description: 'Role permissions have been updated successfully',
      });
      setShowPermissionsDialog(false);
      setSelectedRole(null);
      setSelectedPermissions([]);
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating permissions',
        description: error.message || 'Failed to update permissions',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      permissionIds: []
    });
    setSelectedPermissions([]);
  };

  const handleCreateRole = () => {
    if (!formData.code || !formData.name) {
      toast({
        title: 'Validation error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }
    createRoleMutation.mutate({
      ...formData,
      permissionIds: selectedPermissions
    });
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setFormData({
      code: role.code,
      name: role.name,
      description: role.description || '',
      permissionIds: role.permissions?.map(p => p.permissionId) || []
    });
    setShowEditDialog(true);
  };

  const handleUpdateRole = () => {
    if (!selectedRole) return;
    updateRoleMutation.mutate({
      roleId: selectedRole.roleId,
      data: {
        name: formData.name,
        description: formData.description,
      }
    });
  };

  const handleDeleteRole = (role: Role) => {
    if (role.isSystemRole) {
      toast({
        title: 'Cannot delete system role',
        description: 'System roles cannot be deleted',
        variant: 'destructive',
      });
      return;
    }
    setSelectedRole(role);
    setShowDeleteDialog(true);
  };

  const handleManagePermissions = (role: Role) => {
    setSelectedRole(role);
    setSelectedPermissions(role.permissions?.map(p => p.permissionId) || []);
    setShowPermissionsDialog(true);
  };

  const handlePermissionToggle = (permissionId: number) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSelectAllCategory = (categoryPermissions: Permission[]) => {
    const categoryIds = categoryPermissions.map(p => p.permissionId);
    const allSelected = categoryIds.every(id => selectedPermissions.includes(id));
    
    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(id => !categoryIds.includes(id)));
    } else {
      setSelectedPermissions(prev => [...new Set([...prev, ...categoryIds])]);
    }
  };

  const handleSavePermissions = () => {
    if (!selectedRole) return;
    assignPermissionsMutation.mutate({
      roleId: selectedRole.roleId,
      permissionIds: selectedPermissions
    });
  };

  if (!canManageRoles) {
    return (
      <AdminLayout 
        title="Role Management" 
        description="Manage roles and permissions"
      >
        <Card>
          <CardContent className="py-12 text-center">
            <Lock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-500">
              Only Super Admins can manage roles and permissions.
            </p>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="Role Management" 
      description="Create and manage roles with granular permissions"
    >
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search roles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Role
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-eagle-green mr-3" />
              <div>
                <div className="text-2xl font-bold text-eagle-green">{roles.length}</div>
                <p className="text-sm text-gray-500">Total Roles</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center">
              <Key className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-blue-600">{permissions.length}</div>
                <p className="text-sm text-gray-500">Total Permissions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center">
              <Lock className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {roles.filter((r: Role) => r.isSystemRole).length}
                </div>
                <p className="text-sm text-gray-500">System Roles</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Roles Table */}
      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
          <CardDescription>
            Manage roles and their associated permissions. System roles cannot be deleted.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {rolesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-eagle-green" />
            </div>
          ) : filteredRoles.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoles.map((role: Role) => (
                  <TableRow key={role.roleId}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-eagle-green">{role.name}</div>
                        <div className="text-sm text-gray-500">{role.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {role.code}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-blue-100 text-blue-800">
                        {role.permissions?.length || 0} permissions
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {role.isSystemRole ? (
                        <Badge className="bg-purple-100 text-purple-800">
                          <Lock className="h-3 w-3 mr-1" />
                          System
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800">
                          <Unlock className="h-3 w-3 mr-1" />
                          Custom
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {role.isActive ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleManagePermissions(role)}
                        >
                          <Key className="h-4 w-4 mr-1" />
                          Permissions
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditRole(role)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!role.isSystemRole && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteRole(role)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No roles found</h3>
              <p className="text-gray-500">
                {searchTerm ? 'Try adjusting your search' : 'Create a role to get started'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Role Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>
              Create a new role and assign permissions to it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Role Code *</Label>
                <Input
                  id="code"
                  placeholder="e.g., CONTENT_MANAGER"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    code: e.target.value.toUpperCase().replace(/\s+/g, '_')
                  }))}
                />
                <p className="text-xs text-gray-500">Unique identifier (uppercase, underscores)</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Role Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Content Manager"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this role can do..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Permissions</Label>
              <p className="text-sm text-gray-500 mb-2">
                Select the permissions this role should have.
              </p>
              <ScrollArea className="h-[300px] border rounded-md p-4">
                <Accordion type="multiple" className="w-full">
                  {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
                    <AccordionItem key={category} value={category}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <span>{rolePermissionService.formatCategoryName(category)}</span>
                          <Badge variant="outline">
                            {categoryPermissions.filter(p => selectedPermissions.includes(p.permissionId)).length}
                            /{categoryPermissions.length}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-end mb-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSelectAllCategory(categoryPermissions)}
                            >
                              {categoryPermissions.every(p => selectedPermissions.includes(p.permissionId))
                                ? 'Deselect All'
                                : 'Select All'}
                            </Button>
                          </div>
                          {categoryPermissions.map((permission) => (
                            <div
                              key={permission.permissionId}
                              className="flex items-start space-x-3 p-2 rounded hover:bg-gray-50"
                            >
                              <Checkbox
                                id={`perm-${permission.permissionId}`}
                                checked={selectedPermissions.includes(permission.permissionId)}
                                onCheckedChange={() => handlePermissionToggle(permission.permissionId)}
                              />
                              <div className="flex-1">
                                <label
                                  htmlFor={`perm-${permission.permissionId}`}
                                  className="text-sm font-medium cursor-pointer"
                                >
                                  {permission.name}
                                </label>
                                <p className="text-xs text-gray-500">{permission.description}</p>
                                <Badge variant="outline" className="text-xs mt-1 font-mono">
                                  {permission.code}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateRole}
              disabled={createRoleMutation.isPending}
            >
              {createRoleMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update role name and description. Use the Permissions button to manage permissions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-code">Role Code</Label>
              <Input
                id="edit-code"
                value={formData.code}
                disabled
                className="bg-gray-100"
              />
              <p className="text-xs text-gray-500">Role code cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-name">Role Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateRole}
              disabled={updateRoleMutation.isPending}
            >
              {updateRoleMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Permissions Dialog */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Permissions - {selectedRole?.name}</DialogTitle>
            <DialogDescription>
              Select the permissions this role should have access to.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="flex items-center justify-between mb-4">
              <Badge className="bg-blue-100 text-blue-800">
                {selectedPermissions.length} of {permissions.length} permissions selected
              </Badge>
            </div>

            <ScrollArea className="h-[400px] border rounded-md p-4">
              <Accordion type="multiple" className="w-full">
                {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => {
                  const selectedCount = categoryPermissions.filter(
                    p => selectedPermissions.includes(p.permissionId)
                  ).length;
                  
                  return (
                    <AccordionItem key={category} value={category}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <span className="font-medium">
                            {rolePermissionService.formatCategoryName(category)}
                          </span>
                          <Badge 
                            variant="outline"
                            className={selectedCount === categoryPermissions.length ? 'bg-green-100' : ''}
                          >
                            {selectedCount}/{categoryPermissions.length}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-1">
                          <div className="flex items-center justify-end mb-2 border-b pb-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSelectAllCategory(categoryPermissions)}
                            >
                              {categoryPermissions.every(p => selectedPermissions.includes(p.permissionId))
                                ? 'Deselect All'
                                : 'Select All'}
                            </Button>
                          </div>
                          {categoryPermissions.map((permission) => (
                            <div
                              key={permission.permissionId}
                              className="flex items-start space-x-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                              onClick={() => handlePermissionToggle(permission.permissionId)}
                            >
                              <Checkbox
                                checked={selectedPermissions.includes(permission.permissionId)}
                                onCheckedChange={() => handlePermissionToggle(permission.permissionId)}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{permission.name}</span>
                                  <Badge variant="outline" className="text-xs font-mono">
                                    {permission.code}
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-500">{permission.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPermissionsDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSavePermissions}
              disabled={assignPermissionsMutation.isPending}
            >
              {assignPermissionsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Delete Role
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the role "{selectedRole?.name}"? 
              This action cannot be undone. Users with this role will lose their permissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedRole && deleteRoleMutation.mutate(selectedRole.roleId)}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteRoleMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
