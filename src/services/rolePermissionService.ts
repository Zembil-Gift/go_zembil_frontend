import { apiService } from './apiService';

// Types for Role and Permission Management
export interface Permission {
  permissionId: number;
  code: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  roleId: number;
  code: string;
  name: string;
  description: string;
  isSystemRole: boolean;
  isActive: boolean;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleRequest {
  code: string;
  name: string;
  description: string;
  permissionIds: number[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface AssignPermissionsRequest {
  permissionIds: number[];
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// Permission categories for grouping in UI
export const PERMISSION_CATEGORIES = [
  'USER_MANAGEMENT',
  'ADMIN_MANAGEMENT',
  'VENDOR_MANAGEMENT',
  'VENDOR_SELF_SERVICE',
  'PRODUCT_MANAGEMENT',
  'EVENT_MANAGEMENT',
  'SERVICE_MANAGEMENT',
  'ORDER_MANAGEMENT',
  'FINANCE',
  'SHOPPING',
  'REVIEW',
  'ADDRESS',
  'PROMOTION',
  'CURRENCY',
  'TAX',
  'DELIVERY',
  'CUSTOM_ORDER',
  'DASHBOARD',
  'STORAGE',
  'CHAT',
  'CATEGORY_MANAGEMENT'
] as const;

export type PermissionCategory = typeof PERMISSION_CATEGORIES[number];

class RolePermissionService {
  // ==================== Permission Endpoints ====================

  /**
   * Get all permissions
   */
  async getAllPermissions(): Promise<Permission[]> {
    return await apiService.getRequest<Permission[]>('/api/admin/permissions');
  }

  /**
   * Get permissions by category
   */
  async getPermissionsByCategory(category: string): Promise<Permission[]> {
    return await apiService.getRequest<Permission[]>(`/api/admin/permissions/category/${category}`);
  }

  /**
   * Get a single permission by ID
   */
  async getPermissionById(permissionId: number): Promise<Permission> {
    return await apiService.getRequest<Permission>(`/api/admin/permissions/${permissionId}`);
  }

  // ==================== Role Endpoints ====================

  /**
   * Get all roles
   */
  async getAllRoles(): Promise<Role[]> {
    return await apiService.getRequest<Role[]>('/api/admin/roles');
  }

  /**
   * Get all roles with pagination
   */
  async getRolesPaginated(page: number = 0, size: number = 20): Promise<PageResponse<Role>> {
    return await apiService.getRequest<PageResponse<Role>>(`/api/admin/roles/paged?page=${page}&size=${size}`);
  }

  /**
   * Get a single role by ID
   */
  async getRoleById(roleId: number): Promise<Role> {
    return await apiService.getRequest<Role>(`/api/admin/roles/${roleId}`);
  }

  /**
   * Get a role by code
   */
  async getRoleByCode(code: string): Promise<Role> {
    return await apiService.getRequest<Role>(`/api/admin/roles/code/${code}`);
  }

  /**
   * Create a new role (Super Admin only)
   */
  async createRole(data: CreateRoleRequest): Promise<Role> {
    return await apiService.postRequest<Role>('/api/admin/roles', data);
  }

  /**
   * Update a role
   */
  async updateRole(roleId: number, data: UpdateRoleRequest): Promise<Role> {
    return await apiService.putRequest<Role>(`/api/admin/roles/${roleId}`, data);
  }

  /**
   * Delete a role (only non-system roles)
   */
  async deleteRole(roleId: number): Promise<void> {
    await apiService.deleteRequest(`/api/admin/roles/${roleId}`);
  }

  /**
   * Assign permissions to a role
   */
  async assignPermissionsToRole(roleId: number, permissionIds: number[]): Promise<Role> {
    return await apiService.postRequest<Role>(`/api/admin/roles/${roleId}/permissions`, { permissionIds });
  }

  /**
   * Remove a permission from a role
   */
  async removePermissionFromRole(roleId: number, permissionId: number): Promise<Role> {
    return await apiService.deleteRequest<Role>(`/api/admin/roles/${roleId}/permissions/${permissionId}`);
  }

  /**
   * Get all permissions for a role
   */
  async getRolePermissions(roleId: number): Promise<Permission[]> {
    return await apiService.getRequest<Permission[]>(`/api/admin/roles/${roleId}/permissions`);
  }

  // ==================== User-Role Assignment ====================

  /**
   * Assign a role to a user
   */
  async assignRoleToUser(userId: number, roleCode: string): Promise<void> {
    await apiService.postRequest(`/api/admin/users/${userId}/role`, { roleCode });
  }

  /**
   * Get user's role with permissions
   */
  async getUserRole(userId: number): Promise<Role> {
    return await apiService.getRequest<Role>(`/api/admin/users/${userId}/role`);
  }

  // ==================== Helper Functions ====================

  /**
   * Group permissions by category
   */
  groupPermissionsByCategory(permissions: Permission[]): Record<string, Permission[]> {
    return permissions.reduce((acc, permission) => {
      const category = permission.category || 'OTHER';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);
  }

  /**
   * Format category name for display
   */
  formatCategoryName(category: string): string {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}

export const rolePermissionService = new RolePermissionService();
