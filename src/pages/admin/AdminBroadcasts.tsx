import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import {
  BroadcastMessageResponse,
  BroadcastTargetRole,
  BroadcastVendorType,
  CreateBroadcastMessageRequest,
  broadcastService,
} from "@/services/broadcastService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
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
import { Edit, Loader2, Megaphone, Plus, Trash2 } from "lucide-react";

const TARGET_ROLES: BroadcastTargetRole[] = ["ALL", "VENDOR", "CUSTOMER"];
const VENDOR_TYPES: BroadcastVendorType[] = ["PRODUCT", "SERVICE", "HYBRID"];

interface BroadcastFormState {
  title: string;
  message: string;
  targetRole: BroadcastTargetRole;
  vendorTypes: BroadcastVendorType[];
  effectiveFrom: string;
  effectiveTo: string;
  isActive: boolean;
}

const emptyForm: BroadcastFormState = {
  title: "",
  message: "",
  targetRole: "ALL",
  vendorTypes: [],
  effectiveFrom: "",
  effectiveTo: "",
  isActive: true,
};

const toDateTimeLocalInput = (iso: string | null | undefined) => {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toIsoOrNull = (value: string) => {
  if (!value) return null;
  return new Date(value).toISOString();
};

const formatDateTime = (iso: string | null) => {
  if (!iso) return "No end date";
  return new Date(iso).toLocaleString();
};

export default function AdminBroadcasts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [isActiveFilter, setIsActiveFilter] = useState<
    "all" | "true" | "false"
  >("all");
  const [targetRoleFilter, setTargetRoleFilter] = useState<
    "all" | BroadcastTargetRole
  >("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMessage, setEditingMessage] =
    useState<BroadcastMessageResponse | null>(null);
  const [formState, setFormState] = useState<BroadcastFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const [deletingMessage, setDeletingMessage] =
    useState<BroadcastMessageResponse | null>(null);

  const listParams = useMemo(
    () => ({
      page,
      size,
      sort: "effectiveFrom,desc",
      ...(isActiveFilter !== "all"
        ? { isActive: isActiveFilter === "true" }
        : {}),
      ...(targetRoleFilter !== "all" ? { targetRole: targetRoleFilter } : {}),
    }),
    [isActiveFilter, page, size, targetRoleFilter]
  );

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "broadcasts", listParams],
    queryFn: () => broadcastService.adminList(listParams),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateBroadcastMessageRequest) =>
      broadcastService.adminCreate(payload),
    onSuccess: () => {
      toast({ title: "Broadcast created" });
      setDialogOpen(false);
      setFormState(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["admin", "broadcasts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create broadcast",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: CreateBroadcastMessageRequest;
    }) => broadcastService.adminUpdate(id, payload),
    onSuccess: () => {
      toast({ title: "Broadcast updated" });
      setDialogOpen(false);
      setEditingMessage(null);
      setFormState(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["admin", "broadcasts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update broadcast",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => broadcastService.adminSoftDelete(id),
    onSuccess: () => {
      toast({ title: "Broadcast deleted" });
      setDeletingMessage(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "broadcasts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete broadcast",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const openCreateDialog = () => {
    setEditingMessage(null);
    setFormState(emptyForm);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (message: BroadcastMessageResponse) => {
    setEditingMessage(message);
    setFormError(null);
    setFormState({
      title: message.title,
      message: message.message,
      targetRole: message.targetRole,
      vendorTypes: message.vendorTypes || [],
      effectiveFrom: toDateTimeLocalInput(message.effectiveFrom),
      effectiveTo: toDateTimeLocalInput(message.effectiveTo),
      isActive: message.isActive,
    });
    setDialogOpen(true);
  };

  const toggleVendorType = (type: BroadcastVendorType) => {
    setFormState((prev) => ({
      ...prev,
      vendorTypes: prev.vendorTypes.includes(type)
        ? prev.vendorTypes.filter((item) => item !== type)
        : [...prev.vendorTypes, type],
    }));
  };

  const buildPayload = (): CreateBroadcastMessageRequest | null => {
    const title = formState.title.trim();
    const message = formState.message.trim();

    if (!title) {
      setFormError("Title is required.");
      return null;
    }
    if (title.length > 255) {
      setFormError("Title must be at most 255 characters.");
      return null;
    }
    if (!message) {
      setFormError("Message is required.");
      return null;
    }
    if (message.length > 5000) {
      setFormError("Message must be at most 5000 characters.");
      return null;
    }
    if (!formState.effectiveFrom) {
      setFormError("Effective from is required.");
      return null;
    }

    const effectiveFromIso = toIsoOrNull(formState.effectiveFrom);
    const effectiveToIso = toIsoOrNull(formState.effectiveTo);

    if (!effectiveFromIso) {
      setFormError("Effective from is invalid.");
      return null;
    }

    if (
      effectiveToIso &&
      new Date(effectiveToIso).getTime() < new Date(effectiveFromIso).getTime()
    ) {
      setFormError(
        "Effective to must be greater than or equal to effective from."
      );
      return null;
    }

    const vendorTypes =
      formState.targetRole === "CUSTOMER" ? [] : formState.vendorTypes;

    setFormError(null);

    return {
      title,
      message,
      targetRole: formState.targetRole,
      vendorTypes,
      effectiveFrom: effectiveFromIso,
      effectiveTo: effectiveToIso,
      isActive: formState.isActive,
    };
  };

  const handleSave = () => {
    const payload = buildPayload();
    if (!payload) return;

    if (editingMessage) {
      updateMutation.mutate({ id: editingMessage.id, payload });
      return;
    }
    createMutation.mutate(payload);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminLayout
      title="Broadcast Messages"
      description="Create, update, and manage platform-wide broadcast notifications."
    >
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Megaphone className="h-5 w-5" />
              Broadcast Controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="w-full sm:w-[180px]">
                  <Label className="mb-1 block">Status</Label>
                  <Select
                    value={isActiveFilter}
                    onValueChange={(v: "all" | "true" | "false") => {
                      setPage(0);
                      setIsActiveFilter(v);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full sm:w-[180px]">
                  <Label className="mb-1 block">Audience</Label>
                  <Select
                    value={targetRoleFilter}
                    onValueChange={(v: "all" | BroadcastTargetRole) => {
                      setPage(0);
                      setTargetRoleFilter(v);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {TARGET_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                New Broadcast
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="py-10 text-center text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading broadcasts...
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Audience</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data?.content || []).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="max-w-[300px]">
                              <p className="font-medium truncate">
                                {item.title}
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {item.message}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge variant="outline">{item.targetRole}</Badge>
                              {item.vendorTypes?.length > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  {item.vendorTypes.join(", ")}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs text-muted-foreground">
                              <p>From: {formatDateTime(item.effectiveFrom)}</p>
                              <p>To: {formatDateTime(item.effectiveTo)}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.isActive ? (
                              <Badge className="bg-green-600 text-white">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => openEditDialog(item)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                className="text-red-600"
                                onClick={() => setDeletingMessage(item)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {data?.content?.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center py-10 text-muted-foreground"
                          >
                            No broadcast messages found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {(data?.number ?? 0) + 1} of{" "}
                    {Math.max(data?.totalPages ?? 1, 1)}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={Boolean(data?.first ?? true)}
                      onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      disabled={Boolean(data?.last ?? true)}
                      onClick={() => setPage((prev) => prev + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMessage ? "Update broadcast" : "Create broadcast"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formState.title}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, title: e.target.value }))
                }
                maxLength={255}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={formState.message}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, message: e.target.value }))
                }
                rows={6}
                maxLength={5000}
              />
            </div>

            <div className="space-y-2">
              <Label>Target role</Label>
              <Select
                value={formState.targetRole}
                onValueChange={(value: BroadcastTargetRole) =>
                  setFormState((prev) => ({
                    ...prev,
                    targetRole: value,
                    vendorTypes: value === "CUSTOMER" ? [] : prev.vendorTypes,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formState.targetRole !== "CUSTOMER" && (
              <div className="space-y-2">
                <Label>Vendor types (optional)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {VENDOR_TYPES.map((type) => (
                    <label
                      key={type}
                      className="flex items-center gap-2 rounded-md border px-3 py-2"
                    >
                      <Checkbox
                        checked={formState.vendorTypes.includes(type)}
                        onCheckedChange={() => toggleVendorType(type)}
                      />
                      <span className="text-sm">{type}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="effectiveFrom">Effective from</Label>
                <Input
                  id="effectiveFrom"
                  type="datetime-local"
                  value={formState.effectiveFrom}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      effectiveFrom: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="effectiveTo">Effective to (optional)</Label>
                <Input
                  id="effectiveTo"
                  type="datetime-local"
                  value={formState.effectiveTo}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      effectiveTo: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <label className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Checkbox
                checked={formState.isActive}
                onCheckedChange={(checked) =>
                  setFormState((prev) => ({
                    ...prev,
                    isActive: checked === true,
                  }))
                }
              />
              <span className="text-sm">Active</span>
            </label>

            {formError && <p className="text-sm text-red-600">{formError}</p>}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingMessage ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deletingMessage)}
        onOpenChange={(open) => {
          if (!open) setDeletingMessage(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete broadcast</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete the broadcast message "
              {deletingMessage?.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deletingMessage) {
                  deleteMutation.mutate(deletingMessage.id);
                }
              }}
            >
              {deleteMutation.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </span>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
