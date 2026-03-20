import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Eye,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Search,
  Shield,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import { adminService } from "@/services/adminService";
import { CreateAdminRequest, userService } from "@/services/userService";
import { Role, rolePermissionService } from "@/services/rolePermissionService";

export default function AdminUsers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isPreparingEditForm, setIsPreparingEditForm] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showAddAdminDialog, setShowAddAdminDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newRole, setNewRole] = useState<string>("");
  const [showConfirmAdmin, setShowConfirmAdmin] = useState(false);
  const [editFormData, setEditFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
  });
  const [editVendorFormData, setEditVendorFormData] = useState({
    businessName: "",
    description: "",
    businessEmail: "",
    businessPhone: "",
    city: "",
  });
  const [showVendorFields, setShowVendorFields] = useState(false);
  const [adminFormData, setAdminFormData] = useState<CreateAdminRequest>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    username: "",
    phoneNumber: "",
    preferredCurrency: "ETB",
  });
  const { toast } = useToast();
  const { isSuperAdmin, hasPermission } = useAuth();
  const queryClient = useQueryClient();

  hasPermission("USER_UPDATE") || hasPermission("USER_DELETE");
  isSuperAdmin() || hasPermission("ADMIN_CREATE");
  const canAssignRoles = isSuperAdmin();

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      try {
        return await adminService.getUsers(0, 100);
      } catch (error) {
        console.error("Failed to fetch users:", error);
        return {
          content: [],
          totalElements: 0,
          totalPages: 0,
          size: 0,
          number: 0,
        };
      }
    },
  });

  const { data: currencies = [] } = useQuery({
    queryKey: ["currencies", "active"],
    queryFn: async () => {
      try {
        return await adminService.getActiveCurrencies();
      } catch (error) {
        console.error("Failed to fetch currencies:", error);
        return [];
      }
    },
  });

  // Fetch all roles for super admin role assignment
  const { data: roles = [] } = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: () => rolePermissionService.getAllRoles(),
    enabled: canAssignRoles,
  });

  const users = usersData?.content || [];

  const filteredUsers = users.filter((user: any) => {
    const matchesSearch =
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole =
      roleFilter === "all" ||
      user.role?.toLowerCase() === roleFilter.toLowerCase();

    return matchesSearch && matchesRole;
  });

  const getRoleColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "bg-purple-100 text-purple-800";
      case "vendor":
        return "bg-blue-100 text-blue-800";
      case "customer":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Mutation for updating user role
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: string }) =>
      adminService.updateUserRole(userId, role),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({
        title: "Role updated",
        description: `User role has been changed to ${variables.role}`,
      });
      setShowRoleDialog(false);
      setShowConfirmAdmin(false);
      setSelectedUser(null);
      setNewRole("");
    },
    onError: (error: any) => {
      toast({
        title: "Error updating role",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  // Mutation for creating admin
  const createAdminMutation = useMutation({
    mutationFn: (data: CreateAdminRequest) => userService.createAdmin(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({
        title: "Admin created",
        description: "New admin user has been created successfully",
      });
      setShowAddAdminDialog(false);
      setAdminFormData({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        username: "",
        phoneNumber: "",
        preferredCurrency: "ETB",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating admin",
        description: error.message || "Failed to create admin user",
        variant: "destructive",
      });
    },
  });

  // Mutation for deactivating user (soft delete)
  const deactivateUserMutation = useMutation({
    mutationFn: (userId: number) => adminService.deactivateUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({
        title: "User deactivated",
        description: "User account has been deactivated successfully",
      });
      setShowDeleteDialog(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error deactivating user",
        description: error.message || "Failed to deactivate user",
        variant: "destructive",
      });
    },
  });

  // Mutation for reactivating user
  const reactivateUserMutation = useMutation({
    mutationFn: (userId: number) => adminService.reactivateUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({
        title: "User reactivated",
        description: "User account has been reactivated successfully",
      });
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error reactivating user",
        description: error.message || "Failed to reactivate user",
        variant: "destructive",
      });
    },
  });

  const updateUserInfoMutation = useMutation({
    mutationFn: async ({
      userId,
      userData,
      vendorData,
    }: {
      userId: number;
      userData: {
        firstName?: string;
        lastName?: string;
        email?: string;
        phoneNumber?: string;
      };
      vendorData: {
        businessName?: string;
        description?: string;
        businessEmail?: string;
        businessPhone?: string;
        city?: string;
      };
    }) => {
      const updates: any = {};

      if (Object.keys(userData).length > 0) {
        const updatedUser = await adminService.updateUserInfo(userId, userData);
        Object.assign(updates, updatedUser || {});
      }

      if (Object.keys(vendorData).length > 0) {
        const updatedVendor = await adminService.updateVendorInfoByUserId(
          userId,
          vendorData
        );
        Object.assign(updates, updatedVendor || {});
      }

      return updates;
    },
    onSuccess: (updatedData) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setSelectedUser((prev: any) => ({ ...prev, ...updatedData }));
      setShowEditDialog(false);
      toast({
        title: "Update successful",
        description: "User information has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating information",
        description: error.message || "Failed to update user information",
        variant: "destructive",
      });
    },
  });

  const handleRoleChange = (user: any) => {
    setSelectedUser(user);
    setNewRole(user.role?.toUpperCase() || "CUSTOMER");
    setShowRoleDialog(true);
  };

  const handleConfirmRoleChange = () => {
    if (!selectedUser || !newRole) return;

    // If promoting to admin, show extra confirmation
    if (newRole === "ADMIN" && selectedUser.role?.toUpperCase() !== "ADMIN") {
      setShowConfirmAdmin(true);
      return;
    }

    updateRoleMutation.mutate({
      userId: selectedUser.userId || selectedUser.id,
      role: newRole,
    });
  };

  const handleViewUser = (user: any) => {
    setSelectedUser(user);
    setShowVendorFields(false);
    setShowViewDialog(true);
  };

  const handleDeactivateUser = (user: any) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const handleConfirmDeactivate = () => {
    if (!selectedUser) return;
    deactivateUserMutation.mutate(selectedUser.userId || selectedUser.id);
  };

  const handleReactivateUser = (user: any) => {
    reactivateUserMutation.mutate(user.userId || user.id);
  };

  const handleCreateAdmin = () => {
    if (
      !adminFormData.firstName ||
      !adminFormData.lastName ||
      !adminFormData.email ||
      !adminFormData.password ||
      !adminFormData.username ||
      !adminFormData.phoneNumber
    ) {
      toast({
        title: "Validation error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    createAdminMutation.mutate(adminFormData);
  };

  const isVendorUser = (user: any) => {
    const roleValue = String(user?.role || "").toLowerCase();
    return roleValue.includes("vendor");
  };

  const getVendorPrefillFromDetails = (details: any) => {
    const vendorSource =
      details?.vendor ||
      details?.vendorResponse ||
      details?.vendorProfile ||
      details?.data?.vendor ||
      details?.data?.vendorResponse ||
      details?.data?.vendorProfile ||
      details?.data ||
      details;
    return {
      businessName: vendorSource?.businessName || "",
      description: vendorSource?.description || "",
      businessEmail: vendorSource?.businessEmail || "",
      businessPhone: vendorSource?.businessPhone || "",
      city: vendorSource?.city || "",
    };
  };

  const getUserPrefillFromDetails = (details: any) => {
    const userSource = details?.user || {};
    const rootSource = details || {};
    return {
      firstName: userSource?.firstName || rootSource?.firstName || "",
      lastName: userSource?.lastName || rootSource?.lastName || "",
      email: userSource?.email || rootSource?.email || "",
      phoneNumber:
        userSource?.phoneNumber ||
        userSource?.phone ||
        rootSource?.phoneNumber ||
        rootSource?.phone ||
        "",
    };
  };

  const handleOpenEditUser = async () => {
    if (!selectedUser) return;

    setIsPreparingEditForm(true);
    try {
      const userId = selectedUser.userId || selectedUser.id;
      let detailsForPrefill: any;

      if (isVendorUser(selectedUser)) {
        const [userDetails, vendorDetails] = await Promise.all([
          adminService.getUserById(userId),
          adminService.getVendorByUserId(userId),
        ]);

        const userPrefill = getUserPrefillFromDetails(userDetails);
        const vendorPrefill = getVendorPrefillFromDetails(vendorDetails);

        detailsForPrefill = {
          ...userDetails,
          ...vendorDetails,
          ...userPrefill,
          ...vendorPrefill,
          user: { ...userPrefill },
          vendor: { ...vendorPrefill },
        };
      } else {
        detailsForPrefill = await adminService.getUserById(userId);
      }

      const userPrefill = getUserPrefillFromDetails(detailsForPrefill);
      const vendorPrefill = getVendorPrefillFromDetails(detailsForPrefill);
      const sourceUser = {
        ...selectedUser,
        ...detailsForPrefill,
        ...userPrefill,
        ...vendorPrefill,
      };
      setSelectedUser(sourceUser);

      const hasVendorData = Object.values(vendorPrefill).some(
        (value) => typeof value === "string" && value.trim() !== ""
      );
      setShowVendorFields(isVendorUser(sourceUser) || hasVendorData);

      setEditFormData({
        ...getUserPrefillFromDetails(sourceUser),
      });

      setEditVendorFormData({
        ...getVendorPrefillFromDetails(sourceUser),
      });

      setShowViewDialog(false);
      setShowEditDialog(true);
    } catch (error: any) {
      toast({
        title: "Error loading user details",
        description: error.message || "Failed to prepare edit form",
        variant: "destructive",
      });
    } finally {
      setIsPreparingEditForm(false);
    }
  };

  const handleUpdateUserInfo = () => {
    if (!selectedUser) return;

    const nextValues = {
      firstName: editFormData.firstName.trim(),
      lastName: editFormData.lastName.trim(),
      email: editFormData.email.trim(),
      phoneNumber: editFormData.phoneNumber.trim(),
    };

    if (!nextValues.firstName || !nextValues.lastName || !nextValues.email) {
      toast({
        title: "Validation error",
        description: "First name, last name, and email are required",
        variant: "destructive",
      });
      return;
    }

    const patch: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phoneNumber?: string;
    } = {};
    const isVendor = showVendorFields;

    const nextVendorValues = {
      businessName: editVendorFormData.businessName.trim(),
      description: editVendorFormData.description.trim(),
      businessEmail: editVendorFormData.businessEmail.trim(),
      businessPhone: editVendorFormData.businessPhone.trim(),
      city: editVendorFormData.city.trim(),
    };

    const vendorPatch: {
      businessName?: string;
      description?: string;
      businessEmail?: string;
      businessPhone?: string;
      city?: string;
    } = {};

    if (nextValues.firstName !== (selectedUser.firstName || "")) {
      patch.firstName = nextValues.firstName;
    }
    if (nextValues.lastName !== (selectedUser.lastName || "")) {
      patch.lastName = nextValues.lastName;
    }
    if (nextValues.email !== (selectedUser.email || "")) {
      patch.email = nextValues.email;
    }
    if (nextValues.phoneNumber !== (selectedUser.phoneNumber || "")) {
      patch.phoneNumber = nextValues.phoneNumber;
    }

    if (isVendor) {
      if (!nextVendorValues.businessName || !nextVendorValues.businessEmail) {
        toast({
          title: "Validation error",
          description:
            "Business name and business email are required for vendors",
          variant: "destructive",
        });
        return;
      }

      if (nextVendorValues.businessName !== (selectedUser.businessName || "")) {
        vendorPatch.businessName = nextVendorValues.businessName;
      }
      if (nextVendorValues.description !== (selectedUser.description || "")) {
        vendorPatch.description = nextVendorValues.description;
      }
      if (
        nextVendorValues.businessEmail !== (selectedUser.businessEmail || "")
      ) {
        vendorPatch.businessEmail = nextVendorValues.businessEmail;
      }
      if (
        nextVendorValues.businessPhone !== (selectedUser.businessPhone || "")
      ) {
        vendorPatch.businessPhone = nextVendorValues.businessPhone;
      }
      if (nextVendorValues.city !== (selectedUser.city || "")) {
        vendorPatch.city = nextVendorValues.city;
      }
    }

    if (
      Object.keys(patch).length === 0 &&
      Object.keys(vendorPatch).length === 0
    ) {
      toast({
        title: "No changes",
        description: "Update at least one field to save",
      });
      return;
    }

    updateUserInfoMutation.mutate({
      userId: selectedUser.userId || selectedUser.id,
      userData: patch,
      vendorData: vendorPatch,
    });
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
        <Button onClick={() => setShowAddAdminDialog(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Admin
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-eagle-green">
              {users.length}
            </div>
            <p className="text-sm text-gray-500">Total Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {
                users.filter((u: any) => u.role?.toLowerCase() === "customer")
                  .length
              }
            </div>
            <p className="text-sm text-gray-500">Customers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">
              {
                users.filter((u: any) => u.role?.toLowerCase() === "vendor")
                  .length
              }
            </div>
            <p className="text-sm text-gray-500">Vendors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold ">
              {
                users.filter((u: any) => u.role?.toLowerCase() === "admin")
                  .length
              }
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
                        {user.role?.charAt(0).toUpperCase() +
                          user.role?.slice(1).toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          user.isActive !== false
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }
                      >
                        {user.isActive !== false ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewUser(user)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRoleChange(user)}
                        >
                          <UserCog className="h-4 w-4 mr-1" />
                          Role
                        </Button>
                        {/* Don't show deactivate/reactivate for super admins */}
                        {user.role !== "SUPER_ADMIN" &&
                          (user.isActive !== false ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeactivateUser(user)}
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            >
                              <UserX className="h-4 w-4 mr-1" />
                              Deactivate
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReactivateUser(user)}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              disabled={reactivateUserMutation.isPending}
                            >
                              <UserCheck className="h-4 w-4 mr-1" />
                              Reactivate
                            </Button>
                          ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No users found
              </h3>
              <p className="text-gray-500">
                {searchTerm || roleFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Users will appear here when they register"}
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
            <DialogDescription>View user information</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center justify-center mb-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-eagle-green to-viridian-green flex items-center justify-center text-white text-2xl font-bold">
                  {selectedUser.firstName?.charAt(0)}
                  {selectedUser.lastName?.charAt(0)}
                </div>
              </div>
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-eagle-green">
                  {selectedUser.firstName} {selectedUser.lastName}
                </h3>
                <Badge className={getRoleColor(selectedUser.role)}>
                  {selectedUser.role?.charAt(0).toUpperCase() +
                    selectedUser.role?.slice(1).toLowerCase()}
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
                    <span>
                      {selectedUser.city}, {selectedUser.country || "Ethiopia"}
                    </span>
                  </div>
                )}
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-500">Joined</span>
                  <span>
                    {selectedUser.createdAt
                      ? new Date(selectedUser.createdAt).toLocaleDateString()
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-500">Status</span>
                  <Badge
                    className={
                      selectedUser.isActive !== false
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }
                  >
                    {selectedUser.isActive !== false ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
            <Button
              variant="outline"
              onClick={handleOpenEditUser}
              disabled={isPreparingEditForm}
            >
              {isPreparingEditForm ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Pencil className="h-4 w-4 mr-1" />
              )}
              Edit User
            </Button>
            <Button
              onClick={() => {
                setShowViewDialog(false);
                handleRoleChange(selectedUser);
              }}
            >
              <UserCog className="h-4 w-4 mr-1" />
              Change Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User Information</DialogTitle>
            <DialogDescription>
              Update first name, last name, email, and phone number.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editFirstName">First Name</Label>
                <Input
                  id="editFirstName"
                  value={editFormData.firstName}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      firstName: e.target.value,
                    })
                  }
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editLastName">Last Name</Label>
                <Input
                  id="editLastName"
                  value={editFormData.lastName}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      lastName: e.target.value,
                    })
                  }
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEmail">Email</Label>
              <Input
                id="editEmail"
                type="email"
                value={editFormData.email}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, email: e.target.value })
                }
                placeholder="john.doe@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPhoneNumber">Phone Number</Label>
              <Input
                id="editPhoneNumber"
                value={editFormData.phoneNumber}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    phoneNumber: e.target.value,
                  })
                }
                placeholder="+251911000000"
              />
            </div>
            {showVendorFields && (
              <>
                <div className="border-t pt-4 mt-2">
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    Vendor Information
                  </p>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="editBusinessName">Business Name</Label>
                      <Input
                        id="editBusinessName"
                        value={editVendorFormData.businessName}
                        onChange={(e) =>
                          setEditVendorFormData({
                            ...editVendorFormData,
                            businessName: e.target.value,
                          })
                        }
                        placeholder="Business name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editDescription">Description</Label>
                      <Input
                        id="editDescription"
                        value={editVendorFormData.description}
                        onChange={(e) =>
                          setEditVendorFormData({
                            ...editVendorFormData,
                            description: e.target.value,
                          })
                        }
                        placeholder="Business description"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editBusinessEmail">Business Email</Label>
                      <Input
                        id="editBusinessEmail"
                        type="email"
                        value={editVendorFormData.businessEmail}
                        onChange={(e) =>
                          setEditVendorFormData({
                            ...editVendorFormData,
                            businessEmail: e.target.value,
                          })
                        }
                        placeholder="business@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editBusinessPhone">Business Phone</Label>
                      <Input
                        id="editBusinessPhone"
                        value={editVendorFormData.businessPhone}
                        onChange={(e) =>
                          setEditVendorFormData({
                            ...editVendorFormData,
                            businessPhone: e.target.value,
                          })
                        }
                        placeholder="+251911000000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editVendorCity">City</Label>
                      <Input
                        id="editVendorCity"
                        value={editVendorFormData.city}
                        onChange={(e) =>
                          setEditVendorFormData({
                            ...editVendorFormData,
                            city: e.target.value,
                          })
                        }
                        placeholder="Addis Ababa"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateUserInfo}
              disabled={updateUserInfoMutation.isPending}
            >
              {updateUserInfoMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              )}
              Save Changes
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
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-eagle-green to-viridian-green flex items-center justify-center text-white text-xl font-bold">
                {selectedUser?.firstName?.charAt(0)}
                {selectedUser?.lastName?.charAt(0)}
              </div>
            </div>
            <div className="text-center mb-4">
              <p className="text-sm text-gray-500">Current Role</p>
              <Badge className={getRoleColor(selectedUser?.role)}>
                {selectedUser?.role?.charAt(0).toUpperCase() +
                  selectedUser?.role?.slice(1).toLowerCase()}
              </Badge>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">New Role</label>
              {canAssignRoles && roles.length > 0 ? (
                /* Super admin sees all roles from database */
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role: Role) => (
                      <SelectItem key={role.roleId} value={role.code}>
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          {role.name}
                          {role.isSystemRole && (
                            <Badge variant="outline" className="ml-1 text-xs">
                              System
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                /* Regular admins see limited role options */
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
                      <div className="flex items-center gap-2">Admin</div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            {newRole === "ADMIN" &&
              selectedUser?.role?.toUpperCase() !== "ADMIN" && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> Promoting this user to Admin will
                    grant them full administrative access to the system.
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
              disabled={
                updateRoleMutation.isPending ||
                newRole === selectedUser?.role?.toUpperCase()
              }
            >
              {updateRoleMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              )}
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
              You are about to promote{" "}
              <strong>
                {selectedUser?.firstName} {selectedUser?.lastName}
              </strong>{" "}
              to Admin.
              <br />
              <br />
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
                  role: "ADMIN",
                });
              }}
            >
              {updateRoleMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              )}
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
                  onChange={(e) =>
                    setAdminFormData({
                      ...adminFormData,
                      firstName: e.target.value,
                    })
                  }
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={adminFormData.lastName}
                  onChange={(e) =>
                    setAdminFormData({
                      ...adminFormData,
                      lastName: e.target.value,
                    })
                  }
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={adminFormData.username}
                onChange={(e) =>
                  setAdminFormData({
                    ...adminFormData,
                    username: e.target.value,
                  })
                }
                placeholder="johndoe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={adminFormData.email}
                onChange={(e) =>
                  setAdminFormData({ ...adminFormData, email: e.target.value })
                }
                placeholder="john.doe@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number *</Label>
              <Input
                id="phoneNumber"
                value={adminFormData.phoneNumber}
                onChange={(e) =>
                  setAdminFormData({
                    ...adminFormData,
                    phoneNumber: e.target.value,
                  })
                }
                placeholder="+251911000000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={adminFormData.password}
                onChange={(e) =>
                  setAdminFormData({
                    ...adminFormData,
                    password: e.target.value,
                  })
                }
                placeholder="Min 8 chars, letters & numbers"
              />
              <p className="text-xs text-gray-500">
                Must be at least 8 characters with letters and numbers
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Preferred Currency</Label>
              <Select
                value={adminFormData.preferredCurrency}
                onValueChange={(value) =>
                  setAdminFormData({
                    ...adminFormData,
                    preferredCurrency: value,
                  })
                }
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
            <Button
              variant="outline"
              onClick={() => setShowAddAdminDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateAdmin}
              disabled={createAdminMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {createAdminMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              )}
              Create Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate User Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-orange-600" />
              Deactivate User
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate{" "}
              <strong>
                {selectedUser?.firstName} {selectedUser?.lastName}
              </strong>
              ?
              <br />
              <br />
              This will prevent the user from logging in. You can reactivate
              their account later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-orange-600 hover:bg-orange-700"
              onClick={handleConfirmDeactivate}
            >
              {deactivateUserMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              )}
              Yes, Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
