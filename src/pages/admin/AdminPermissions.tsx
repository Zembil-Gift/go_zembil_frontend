import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { 
  Key, 
  Search,
  Loader2,
  Lock,
  CheckCircle,
  XCircle,
  List,
  Grid
} from 'lucide-react';
import { 
  rolePermissionService, 
  Permission
} from '@/services/rolePermissionService';

export default function AdminPermissions() {
  const { isSuperAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grouped'>('grouped');

  const canView = isSuperAdmin();

  // Fetch all permissions
  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['admin', 'permissions'],
    queryFn: () => rolePermissionService.getAllPermissions(),
    enabled: canView,
  });

  // Get unique categories from permissions
  const categories = [...new Set(permissions.map((p: Permission) => p.category))].sort();

  // Filter permissions
  const filteredPermissions = permissions.filter((permission: Permission) => {
    const matchesSearch = 
      permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || permission.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  // Group permissions by category
  const permissionsByCategory = rolePermissionService.groupPermissionsByCategory(filteredPermissions);

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      'USER_MANAGEMENT': 'bg-blue-100 text-blue-800',
      'ADMIN_MANAGEMENT': 'bg-purple-100 text-purple-800',
      'VENDOR_MANAGEMENT': 'bg-orange-100 text-orange-800',
      'VENDOR_SELF_SERVICE': 'bg-amber-100 text-amber-800',
      'PRODUCT_MANAGEMENT': 'bg-green-100 text-green-800',
      'EVENT_MANAGEMENT': 'bg-pink-100 text-pink-800',
      'SERVICE_MANAGEMENT': 'bg-cyan-100 text-cyan-800',
      'ORDER_MANAGEMENT': 'bg-indigo-100 text-indigo-800',
      'FINANCE': 'bg-emerald-100 text-emerald-800',
      'SHOPPING': 'bg-rose-100 text-rose-800',
      'REVIEW': 'bg-yellow-100 text-yellow-800',
      'DELIVERY': 'bg-teal-100 text-teal-800',
      'DASHBOARD': 'bg-slate-100 text-slate-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (!canView) {
    return (
      <AdminLayout 
        title="Permissions" 
        description="View all system permissions"
      >
        <Card>
          <CardContent className="py-12 text-center">
            <Lock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-500">
              Only Super Admins can view permissions.
            </p>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="Permissions" 
      description="View all available system permissions"
    >
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search permissions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {rolePermissionService.formatCategoryName(category)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex border rounded-md">
          <button
            onClick={() => setViewMode('grouped')}
            className={`px-3 py-2 ${viewMode === 'grouped' ? 'bg-eagle-green text-white' : 'bg-white'}`}
            title="Grouped view"
            aria-label="Grouped view"
          >
            <Grid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-2 ${viewMode === 'table' ? 'bg-eagle-green text-white' : 'bg-white'}`}
            title="Table view"
            aria-label="Table view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center">
              <Key className="h-8 w-8 text-eagle-green mr-3" />
              <div>
                <div className="text-2xl font-bold text-eagle-green">{permissions.length}</div>
                <p className="text-sm text-gray-500">Total Permissions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center">
              <Grid className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-blue-600">{categories.length}</div>
                <p className="text-sm text-gray-500">Categories</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {permissions.filter((p: Permission) => p.isActive).length}
                </div>
                <p className="text-sm text-gray-500">Active Permissions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-eagle-green" />
        </div>
      ) : viewMode === 'grouped' ? (
        /* Grouped View */
        <div className="space-y-4">
          {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
            <Card key={category}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {rolePermissionService.formatCategoryName(category)}
                  </CardTitle>
                  <Badge className={getCategoryColor(category)}>
                    {categoryPermissions.length} permissions
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categoryPermissions.map((permission) => (
                    <div
                      key={permission.permissionId}
                      className="border rounded-lg p-3 hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{permission.name}</div>
                          <p className="text-xs text-gray-500 mt-1">{permission.description}</p>
                        </div>
                        {permission.isActive ? (
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                        )}
                      </div>
                      <Badge variant="outline" className="mt-2 text-xs font-mono">
                        {permission.code}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Table View */
        <Card>
          <CardContent className="p-0">
            {filteredPermissions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Permission</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPermissions.map((permission: Permission) => (
                    <TableRow key={permission.permissionId}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{permission.name}</div>
                          <div className="text-sm text-gray-500">{permission.description}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {permission.code}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getCategoryColor(permission.category)}>
                          {rolePermissionService.formatCategoryName(permission.category)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {permission.isActive ? (
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Key className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No permissions found</h3>
                <p className="text-gray-500">
                  {searchTerm || categoryFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'No permissions have been created yet'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </AdminLayout>
  );
}
