import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { customOrderTemplateService } from "@/services/customOrderTemplateService";
import { vendorService } from "@/services/vendorService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  AlertCircle,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
} from "lucide-react";
import type {
  CustomOrderTemplate,
  CustomOrderTemplateStatus,
  PagedCustomOrderTemplateResponse,
} from "@/types/customOrders";

export default function VendorCustomTemplates() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    CustomOrderTemplateStatus | "ALL"
  >("ALL");
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    template: CustomOrderTemplate | null;
  }>({
    open: false,
    template: null,
  });
  const [deactivateDialog, setDeactivateDialog] = useState<{
    open: boolean;
    template: CustomOrderTemplate | null;
  }>({
    open: false,
    template: null,
  });

  const isVendor = user?.role?.toUpperCase() === "VENDOR";

  // Fetch vendor profile to get vendor ID
  const { data: vendorProfile } = useQuery({
    queryKey: ["vendor", "profile"],
    queryFn: () => vendorService.getMyProfile(),
    enabled: isAuthenticated && isVendor,
  });

  // Fetch vendor's templates
  const {
    data: templatesData,
    isLoading,
    refetch,
  } = useQuery<PagedCustomOrderTemplateResponse>({
    queryKey: ["vendor", "custom-templates", vendorProfile?.id, statusFilter],
    queryFn: async (): Promise<PagedCustomOrderTemplateResponse> => {
      if (!vendorProfile?.id) {
        return {
          content: [],
          totalElements: 0,
          totalPages: 0,
          size: 50,
          number: 0,
          first: true,
          last: true,
          empty: true,
        };
      }
      const status = statusFilter === "ALL" ? undefined : statusFilter;
      return customOrderTemplateService.getByVendor(
        vendorProfile.id,
        0,
        50,
        status
      );
    },
    enabled: isAuthenticated && isVendor && !!vendorProfile?.id,
  });

  const deactivateTemplateMutation = useMutation({
    mutationFn: (templateId: number) =>
      customOrderTemplateService.deactivate(templateId),
    onSuccess: () => {
      toast({
        title: "Template deactivated",
        description:
          "Your template has been archived and hidden from customers.",
      });
      queryClient.invalidateQueries({
        queryKey: ["vendor", "custom-templates"],
      });
      setDeactivateDialog({ open: false, template: null });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to deactivate template.",
        variant: "destructive",
      });
    },
  });

  const reactivateTemplateMutation = useMutation({
    mutationFn: (templateId: number) =>
      customOrderTemplateService.reactivate(templateId),
    onSuccess: () => {
      toast({
        title: "Template reactivated",
        description: "Your template is pending approval again.",
      });
      queryClient.invalidateQueries({
        queryKey: ["vendor", "custom-templates"],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to reactivate template.",
        variant: "destructive",
      });
    },
  });

  const templates: CustomOrderTemplate[] = templatesData?.content || [];

  // Filter templates by search query
  const filteredTemplates = templates.filter(
    (template: CustomOrderTemplate) =>
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.description &&
        template.description
          .toLowerCase()
          .includes(searchQuery.toLowerCase())) ||
      (template.categoryName &&
        template.categoryName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Group templates by status for tabs
  const templatesByStatus = {
    all: filteredTemplates,
    pending: filteredTemplates.filter(
      (t: CustomOrderTemplate) => t.status === "PENDING_APPROVAL"
    ),
    approved: filteredTemplates.filter(
      (t: CustomOrderTemplate) => t.status === "APPROVED"
    ),
    rejected: filteredTemplates.filter(
      (t: CustomOrderTemplate) => t.status === "REJECTED"
    ),
  };

  const getStatusBadge = (status: CustomOrderTemplateStatus) => {
    switch (status) {
      case "PENDING_APPROVAL":
        return (
          <Badge className="bg-amber-100 text-amber-800">
            Pending Approval
          </Badge>
        );
      case "APPROVED":
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case "REJECTED":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case "ARCHIVED":
        return <Badge className="bg-gray-100 text-gray-800">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleDeleteTemplate = async (template: CustomOrderTemplate) => {
    try {
      await customOrderTemplateService.delete(template.id);
      refetch();
      setDeleteDialog({ open: false, template: null });
    } catch (error) {
      console.error("Failed to delete template:", error);
    }
  };

  if (!isAuthenticated || !isVendor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertCircle className="h-16 w-16 text-amber-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-4">
          You need to be a vendor to access this page.
        </p>
        <Button asChild>
          <Link to="/vendor-signup">Become a Vendor</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Custom Order Templates</h2>
        <Button asChild>
          <Link to="/vendor/custom-templates/new">
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Link>
        </Button>
      </div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Templates
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Approval
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {templatesByStatus.pending.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {templatesByStatus.approved.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {templatesByStatus.rejected.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search templates by name, description, or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as CustomOrderTemplateStatus | "ALL")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="PENDING_APPROVAL">
                    Pending Approval
                  </SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates List */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="flex flex-wrap gap-1 w-full h-auto p-1">
          <TabsTrigger
            value="all"
            className="whitespace-normal text-xs sm:text-sm text-center px-2 sm:px-4"
          >
            All ({templatesByStatus.all.length})
          </TabsTrigger>
          <TabsTrigger
            value="pending"
            className="whitespace-normal text-xs sm:text-sm text-center px-2 sm:px-4"
          >
            Pending ({templatesByStatus.pending.length})
          </TabsTrigger>
          <TabsTrigger
            value="approved"
            className="whitespace-normal text-xs sm:text-sm text-center px-2 sm:px-4"
          >
            Approved ({templatesByStatus.approved.length})
          </TabsTrigger>
          <TabsTrigger
            value="rejected"
            className="whitespace-normal text-xs sm:text-sm text-center px-2 sm:px-4"
          >
            Rejected ({templatesByStatus.rejected.length})
          </TabsTrigger>
        </TabsList>

        {Object.entries(templatesByStatus).map(([status, statusTemplates]) => (
          <TabsContent key={status} value={status} className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-eagle-green"></div>
              </div>
            ) : statusTemplates.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {status === "all"
                      ? "No templates yet"
                      : `No ${status} templates`}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {status === "all"
                      ? "Create your first custom order template to get started"
                      : `You don't have any ${status} templates`}
                  </p>
                  {status === "all" && (
                    <Button asChild>
                      <Link to="/vendor/custom-templates/new">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Template
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {statusTemplates.map((template: CustomOrderTemplate) => (
                  <Card
                    key={template.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {template.name}
                            </h3>
                            {getStatusBadge(template.status)}
                          </div>

                          {template.description && (
                            <p className="text-gray-600 mb-3 line-clamp-2">
                              {template.description}
                            </p>
                          )}

                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>
                              Your Price:{" "}
                              {customOrderTemplateService.formatVendorTemplatePrice(
                                template
                              )}
                            </span>
                            {template.categoryName && (
                              <span>Category: {template.categoryName}</span>
                            )}
                            <span>
                              {template.fields.length} customization field
                              {template.fields.length !== 1 ? "s" : ""}
                            </span>
                            <span>
                              Created:{" "}
                              {new Date(
                                template.createdAt
                              ).toLocaleDateString()}
                            </span>
                          </div>

                          {template.status === "REJECTED" &&
                            template.rejectionReason && (
                              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                                <p className="text-sm text-red-800">
                                  <strong>Rejection Reason:</strong>{" "}
                                  {template.rejectionReason}
                                </p>
                              </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <Button asChild variant="outline" size="sm">
                            <Link
                              to={`/vendor/custom-templates/${template.id}`}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Link>
                          </Button>

                          {template.status === "ARCHIVED" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                reactivateTemplateMutation.mutate(template.id)
                              }
                              disabled={reactivateTemplateMutation.isPending}
                              className="text-green-600 hover:text-green-700"
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Reactivate
                            </Button>
                          ) : template.status === "APPROVED" ||
                            template.status === "PENDING_APPROVAL" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setDeactivateDialog({ open: true, template })
                              }
                              disabled={deactivateTemplateMutation.isPending}
                              className="text-red-600 hover:text-red-700"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Deactivate
                            </Button>
                          ) : null}

                          {template.status === "PENDING_APPROVAL" && (
                            <>
                              <Button asChild variant="outline" size="sm">
                                <Link
                                  to={`/vendor/custom-templates/${template.id}/edit`}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </Link>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setDeleteDialog({ open: true, template })
                                }
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, template: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog.template?.name}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteDialog.template &&
                handleDeleteTemplate(deleteDialog.template)
              }
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deactivateDialog.open}
        onOpenChange={(open) => {
          if (!open && !deactivateTemplateMutation.isPending) {
            setDeactivateDialog({ open: false, template: null });
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate "
              {deactivateDialog.template?.name}"? This will hide the template
              from customers. You can reactivate it later, but it will require
              admin approval again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deactivateTemplateMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deactivateDialog.template) {
                  deactivateTemplateMutation.mutate(
                    deactivateDialog.template.id
                  );
                }
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={deactivateTemplateMutation.isPending}
            >
              {deactivateTemplateMutation.isPending
                ? "Deactivating..."
                : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
