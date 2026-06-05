import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  partnershipApplicationService,
  PartnershipApplication,
  PartnershipApplicationStatus,
  PARTNERSHIP_STATUSES,
  PARTNERSHIP_STATUS_LABELS,
} from "@/services/partnershipApplicationService";
import { SUPPORTED_COUNTRIES } from "@/lib/countryConfig";
import {
  Store,
  Search,
  Eye,
  Loader2,
  Mail,
  Phone,
  MapPin,
  Plus,
  Building2,
  Globe,
} from "lucide-react";

const STATUS_COLORS: Record<PartnershipApplicationStatus, string> = {
  LEAD: "bg-blue-100 text-blue-800",
  CONTACTED: "bg-yellow-100 text-yellow-800",
  MOU_PENDING: "bg-orange-100 text-orange-800",
  MOU_SIGNED: "bg-purple-100 text-purple-800",
  PROFILE_CREATED: "bg-indigo-100 text-indigo-800",
  PRODUCTS_ADDED: "bg-cyan-100 text-cyan-800",
  ACTIVE: "bg-green-100 text-green-800",
  INACTIVE: "bg-gray-100 text-gray-800",
};

export default function AdminPartnershipApplications() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedApp, setSelectedApp] = useState<PartnershipApplication | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<PartnershipApplicationStatus>("LEAD");
  const [createForm, setCreateForm] = useState({
    businessName: "",
    businessEmail: "",
    businessPhone: "",
    description: "",
    city: "",
    country: "",
    status: "LEAD" as PartnershipApplicationStatus,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["admin", "partnership-applications", statusFilter],
    queryFn: () =>
      partnershipApplicationService.listApplications(statusFilter !== "all" ? statusFilter : undefined),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: number;
      status: PartnershipApplicationStatus;
    }) => partnershipApplicationService.updateStatus(id, status),
    onSuccess: () => {
      toast({
        title: "Status Updated",
        description: "The application status has been updated.",
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "partnership-applications"],
      });
      setShowStatusDialog(false);
      setSelectedApp(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: () =>
      partnershipApplicationService.createApplication({
        businessName: createForm.businessName || undefined,
        businessEmail: createForm.businessEmail || undefined,
        businessPhone: createForm.businessPhone || undefined,
        description: createForm.description || undefined,
        city: createForm.city || undefined,
        country: createForm.country || undefined,
      }),
    onSuccess: (data) => {
      toast({
        title: "Application Created",
        description: "Partnership application has been created.",
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "partnership-applications"],
      });
      // If admin set a status other than LEAD, update it
      if (createForm.status !== "LEAD") {
        partnershipApplicationService
          .updateStatus(data.id, createForm.status)
          .then(() => {
            queryClient.invalidateQueries({
              queryKey: ["admin", "partnership-applications"],
            });
          });
      }
      setShowCreateDialog(false);
      setCreateForm({
        businessName: "",
        businessEmail: "",
        businessPhone: "",
        description: "",
        city: "",
        country: "",
        status: "LEAD",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create application",
        variant: "destructive",
      });
    },
  });

  const filtered = search
    ? applications.filter(
        (app) =>
          app.businessName?.toLowerCase().includes(search.toLowerCase()) ||
          app.businessEmail?.toLowerCase().includes(search.toLowerCase()) ||
          app.city?.toLowerCase().includes(search.toLowerCase())
      )
    : applications;

  return (
    <AdminLayout
      title="Partnership Applications"
      description="Manage partnership applications from potential vendors"
    >
      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search applications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {PARTNERSHIP_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {PARTNERSHIP_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-eagle-green text-white hover:bg-viridian-green whitespace-nowrap">
                <Plus className="w-4 h-4 mr-2" />
                New Application
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Partnership Application</DialogTitle>
                <DialogDescription>
                  Create a new partnership application manually.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Business Name</Label>
                  <Input
                    value={createForm.businessName}
                    onChange={(e) =>
                      setCreateForm((p) => ({
                        ...p,
                        businessName: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Business Email</Label>
                    <Input
                      type="email"
                      value={createForm.businessEmail}
                      onChange={(e) =>
                        setCreateForm((p) => ({
                          ...p,
                          businessEmail: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Business Phone</Label>
                    <Input
                      value={createForm.businessPhone}
                      onChange={(e) =>
                        setCreateForm((p) => ({
                          ...p,
                          businessPhone: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={createForm.description}
                    onChange={(e) =>
                      setCreateForm((p) => ({
                        ...p,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>City</Label>
                    <Input
                      value={createForm.city}
                      onChange={(e) =>
                        setCreateForm((p) => ({ ...p, city: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Country</Label>
                    <Select
                      value={createForm.country}
                      onValueChange={(v) =>
                        setCreateForm((p) => ({ ...p, country: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {SUPPORTED_COUNTRIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={createForm.status}
                    onValueChange={(v) =>
                      setCreateForm((p) => ({
                        ...p,
                        status: v as PartnershipApplicationStatus,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PARTNERSHIP_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {PARTNERSHIP_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending}
                  className="bg-eagle-green hover:bg-viridian-green"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-eagle-green">
              {applications.length}
            </div>
            <p className="text-sm text-gray-500">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">
              {applications.filter((a) => a.status === "LEAD").length}
            </div>
            <p className="text-sm text-gray-500">Leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {applications.filter((a) => a.status === "ACTIVE").length}
            </div>
            <p className="text-sm text-gray-500">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-gray-600">
              {applications.filter((a) => a.status === "INACTIVE").length}
            </div>
            <p className="text-sm text-gray-500">Inactive</p>
          </CardContent>
        </Card>
      </div>

      {/* Applications Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-eagle-green" />
            </div>
          ) : filtered.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-eagle-green" />
                        <span className="font-medium">{app.businessName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="h-3 w-3 mr-1" />
                          {app.businessEmail}
                        </div>
                        {app.businessPhone && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Phone className="h-3 w-3 mr-1" />
                            {app.businessPhone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-3 w-3 mr-1" />
                        {[app.city, app.country].filter(Boolean).join(", ") || "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          STATUS_COLORS[app.status] || "bg-gray-100 text-gray-800"
                        }
                        variant="outline"
                      >
                        {PARTNERSHIP_STATUS_LABELS[app.status] || app.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedApp(app);
                            setShowDetailDialog(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedApp(app);
                            setNewStatus(app.status);
                            setShowStatusDialog(true);
                          }}
                        >
                          <Globe className="w-4 h-4" />
                          Change Status
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Store className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No applications found</p>
              <p className="text-sm mt-1">
                {statusFilter !== "all"
                  ? "Try changing the status filter."
                  : "Applications will appear here when submitted."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="w-5 h-5 text-eagle-green" />
              {selectedApp?.businessName || "Application Detail"}
            </DialogTitle>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Business Email</Label>
                  <p className="text-sm font-medium">{selectedApp.businessEmail}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Business Phone</Label>
                  <p className="text-sm font-medium">
                    {selectedApp.businessPhone || "—"}
                  </p>
                </div>
              </div>
              {selectedApp.description && (
                <div>
                  <Label className="text-xs text-gray-500">Description</Label>
                  <p className="text-sm">{selectedApp.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">City</Label>
                  <p className="text-sm font-medium">
                    {selectedApp.city || "—"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Country</Label>
                  <p className="text-sm font-medium">
                    {selectedApp.country || "—"}
                  </p>
                </div>
              </div>
              {selectedApp.categoryName && (
                <div>
                  <Label className="text-xs text-gray-500">Product Category</Label>
                  <p className="text-sm font-medium">
                    {selectedApp.categoryName}
                  </p>
                </div>
              )}
              {selectedApp.vendorCategoryName && (
                <div>
                  <Label className="text-xs text-gray-500">Business Category</Label>
                  <p className="text-sm font-medium">
                    {selectedApp.vendorCategoryName}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Status</Label>
                  <Badge
                    className={
                      STATUS_COLORS[selectedApp.status] || "bg-gray-100 text-gray-800"
                    }
                    variant="outline"
                  >
                    {PARTNERSHIP_STATUS_LABELS[selectedApp.status] ||
                      selectedApp.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Created</Label>
                  <p className="text-sm font-medium">
                    {new Date(selectedApp.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setNewStatus(selectedApp.status);
                    setShowStatusDialog(true);
                    setShowDetailDialog(false);
                  }}
                >
                  Change Status
                </Button>
                <Button
                  onClick={() => setShowDetailDialog(false)}
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Status</DialogTitle>
            <DialogDescription>
              Change the status for {selectedApp?.businessName}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select
              value={newStatus}
              onValueChange={(v) =>
                setNewStatus(v as PartnershipApplicationStatus)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PARTNERSHIP_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {PARTNERSHIP_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowStatusDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedApp) {
                  updateStatusMutation.mutate({
                    id: selectedApp.id,
                    status: newStatus,
                  });
                }
              }}
              disabled={updateStatusMutation.isPending}
              className="bg-eagle-green text-white hover:bg-viridian-green"
            >
              {updateStatusMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
