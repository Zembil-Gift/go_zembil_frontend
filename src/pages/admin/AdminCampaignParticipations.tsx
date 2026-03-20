import { Fragment, useState, useMemo } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  useQueries,
} from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  campaignService,
  CampaignActionProgress,
  CampaignActionProgressObject,
  CampaignActionProgressProduct,
  CampaignPayoutReportItem,
  CampaignParticipation,
  EventCampaign,
  ParticipationStatus,
  TargetRole,
} from "@/services/campaignService";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getProductImageUrl } from "@/utils/imageUtils";
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  MessageSquare,
  Loader2,
  FileText,
  Package,
  Gift,
  DollarSign,
} from "lucide-react";

// ==================== Helpers ====================

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatOptionalDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return formatDateTime(iso);
}

function truncate(str: string | null, maxLen: number): string {
  if (!str) return "—";
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + "…";
}

interface SubmittedDataResult {
  display: string;
  isUrl: boolean;
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

function extractFromParsedValue(value: unknown): SubmittedDataResult | null {
  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) return null;
    return { display: normalized, isUrl: isHttpUrl(normalized) };
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const extracted = extractFromParsedValue(item);
      if (extracted) return extracted;
    }
    return null;
  }

  if (!value || typeof value !== "object") return null;

  const data = value as Record<string, unknown>;
  const prioritizedUrlKeys = [
    "proofUrl",
    "url",
    "link",
    "fileUrl",
    "fileLink",
    "attachmentUrl",
  ];

  for (const key of prioritizedUrlKeys) {
    const candidate = data[key];
    if (typeof candidate === "string" && isHttpUrl(candidate)) {
      return { display: candidate.trim(), isUrl: true };
    }
  }

  const prioritizedTextKeys = ["proofText", "text", "message", "note", "value"];
  for (const key of prioritizedTextKeys) {
    const candidate = data[key];
    if (typeof candidate === "string" && candidate.trim()) {
      const normalized = candidate.trim();
      return { display: normalized, isUrl: isHttpUrl(normalized) };
    }
  }

  for (const nested of Object.values(data)) {
    const extracted = extractFromParsedValue(nested);
    if (extracted) return extracted;
  }

  return null;
}

function extractSubmittedValue(raw: string | null): SubmittedDataResult {
  if (!raw) return { display: "—", isUrl: false };

  try {
    const parsed = JSON.parse(raw);
    const extracted = extractFromParsedValue(parsed);
    if (extracted) return extracted;
    return { display: "—", isUrl: false };
  } catch {
    const normalized = raw.trim();
    return {
      display: normalized || "—",
      isUrl: isHttpUrl(normalized),
    };
  }
}

function formatMinorCurrency(
  amountMinor: number,
  currency: string = "ETB"
): string {
  const amount = amountMinor / 100;
  const symbol =
    currency === "ETB" ? "ETB " : currency === "USD" ? "$" : `${currency} `;
  return `${symbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getProgressObjects(
  progress: CampaignActionProgress | null
): CampaignActionProgressObject[] {
  if (!progress) return [];
  return (
    progress.soldObjects ||
    progress.orderedObjects ||
    progress.qualifyingObjects ||
    []
  );
}

function getProgressObjectsLabel(progress: CampaignActionProgress): string {
  return progress.actionType === "COMPLETE_MIN_SALES"
    ? "Sold Products"
    : "Ordered Products";
}

function formatObjectValue(
  progress: CampaignActionProgress,
  object: CampaignActionProgressObject
): string {
  if (progress.valueUnit === "MINOR_CURRENCY") {
    return formatMinorCurrency(
      object.amountMinor || 0,
      object.product?.price?.currencyCode || "ETB"
    );
  }

  return `${object.quantity || 0} item${
    (object.quantity || 0) === 1 ? "" : "s"
  }`;
}

function toIsoOrUndefined(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function formatRewardValue(value: number | string | null): string {
  if (value == null) return "—";
  return String(value);
}

// ==================== Status Badge ====================

function ParticipationStatusBadge({ status }: { status: ParticipationStatus }) {
  const styles: Record<ParticipationStatus, string> = {
    PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
    APPROVED: "bg-green-100 text-green-800 border-green-200",
    REJECTED: "bg-red-100 text-red-800 border-red-200",
    COMPLETED: "bg-blue-100 text-blue-800 border-blue-200",
    PAID: "bg-purple-100 text-purple-800 border-purple-200",
  };

  return (
    <Badge
      variant="outline"
      className={styles[status] || "bg-gray-100 text-gray-600"}
    >
      {status === "PENDING" && <Clock className="inline h-3 w-3 mr-1" />}
      {status === "APPROVED" && <CheckCircle className="inline h-3 w-3 mr-1" />}
      {status === "REJECTED" && <XCircle className="inline h-3 w-3 mr-1" />}
      {status === "COMPLETED" && (
        <CheckCircle className="inline h-3 w-3 mr-1" />
      )}
      {status === "PAID" && <CheckCircle className="inline h-3 w-3 mr-1" />}
      {status}
    </Badge>
  );
}

// ==================== Paid Submissions Tab ====================

interface PaidSubmissionsTabContentProps {
  campaigns: EventCampaign[];
}

function PaidSubmissionsTabContent({
  campaigns,
}: PaidSubmissionsTabContentProps) {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [participantRole, setParticipantRole] = useState<
    "ALL" | "VENDOR" | "CUSTOMER"
  >("ALL");

  const parsedCampaignId = selectedCampaignId
    ? Number(selectedCampaignId)
    : null;

  const {
    data: payoutReport = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [
      "admin",
      "campaign-payout-report",
      parsedCampaignId,
      from,
      to,
      participantRole,
    ],
    queryFn: () =>
      campaignService.getCampaignPayoutReport(parsedCampaignId as number, {
        from: toIsoOrUndefined(from),
        to: toIsoOrUndefined(to),
        participantRole:
          participantRole === "ALL" ? undefined : participantRole,
      }),
    enabled: parsedCampaignId != null,
  });

  const totals = useMemo(() => {
    return payoutReport.reduce(
      (acc, item) => {
        acc.count += 1;
        acc.totalPayoutMinor += item.payoutAmountMinor || 0;
        if (item.participation.salesSnapshotAmountMinor != null) {
          acc.totalSalesSnapshotMinor +=
            item.participation.salesSnapshotAmountMinor;
        }
        return acc;
      },
      { count: 0, totalPayoutMinor: 0, totalSalesSnapshotMinor: 0 }
    );
  }, [payoutReport]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Campaign</p>
              <Select
                value={selectedCampaignId}
                onValueChange={setSelectedCampaignId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select campaign" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={String(campaign.id)}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">From (paidAt)</p>
              <Input
                type="datetime-local"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">To (paidAt)</p>
              <Input
                type="datetime-local"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Participant Role</p>
              <Select
                value={participantRole}
                onValueChange={(value) =>
                  setParticipantRole(value as "ALL" | "VENDOR" | "CUSTOMER")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Roles</SelectItem>
                  <SelectItem value="VENDOR">Vendor</SelectItem>
                  <SelectItem value="CUSTOMER">Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {parsedCampaignId != null && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">
                  Paid Participations
                </p>
                <p className="text-lg font-semibold">{totals.count}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Total Payout</p>
                <p className="text-lg font-semibold">
                  {formatMinorCurrency(totals.totalPayoutMinor)}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">
                  Sales Snapshot Total
                </p>
                <p className="text-lg font-semibold">
                  {formatMinorCurrency(totals.totalSalesSnapshotMinor)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {!parsedCampaignId ? (
            <div className="text-center py-14 text-muted-foreground">
              Select a campaign to load paid submissions report.
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-14">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="text-center py-14 text-red-600">
              {error instanceof Error
                ? error.message
                : "Failed to load payout report"}
            </div>
          ) : payoutReport.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              No paid submissions found for the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paid At</TableHead>
                    <TableHead>Participant</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Payout</TableHead>
                    <TableHead>Reward Type</TableHead>
                    <TableHead>Reward Value</TableHead>
                    <TableHead className="text-right">Sales Snapshot</TableHead>
                    <TableHead>Approved At</TableHead>
                    <TableHead>Reward Window</TableHead>
                    <TableHead>Submitted Data</TableHead>
                    <TableHead>Payout Note</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payoutReport.map((item: CampaignPayoutReportItem) => (
                    <TableRow key={item.participation.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatOptionalDateTime(item.paidAt)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {item.participation.participantName || "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.participation.participantEmail || "—"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {item.participation.participantRole}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.participation.campaignName}</TableCell>
                      <TableCell>
                        <Badge className="bg-purple-100 text-purple-800">
                          PAID
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.payoutAmountMinor != null
                          ? formatMinorCurrency(item.payoutAmountMinor)
                          : "—"}
                      </TableCell>
                      <TableCell>{item.rewardType || "—"}</TableCell>
                      <TableCell>
                        {formatRewardValue(item.rewardValue)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.participation.salesSnapshotAmountMinor != null
                          ? formatMinorCurrency(
                              item.participation.salesSnapshotAmountMinor
                            )
                          : "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatOptionalDateTime(item.participation.approvedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <p>
                            Start:{" "}
                            {formatOptionalDateTime(
                              item.participation.rewardStartDate
                            )}
                          </p>
                          <p>
                            End:{" "}
                            {formatOptionalDateTime(
                              item.participation.rewardEndDate
                            )}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        <span
                          className="block truncate"
                          title={item.participation.submittedData || ""}
                        >
                          {item.participation.submittedData || "—"}
                        </span>
                      </TableCell>

                      <TableCell className="max-w-[220px]">
                        <span
                          className="block truncate"
                          title={item.payoutAmountNote || ""}
                        >
                          {item.payoutAmountNote || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatOptionalDateTime(item.participation.createdAt)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatOptionalDateTime(item.participation.updatedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== Participation Tab Content ====================

type StatusFilter = "ALL" | ParticipationStatus;

interface ParticipationTabContentProps {
  role: TargetRole;
  campaigns: EventCampaign[];
}

function ParticipationTabContent({
  role,
  campaigns,
}: ParticipationTabContentProps) {
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [reviewingParticipation, setReviewingParticipation] =
    useState<CampaignParticipation | null>(null);
  const [expandedProgressRows, setExpandedProgressRows] = useState<
    Record<number, boolean>
  >({});
  const [adminNote, setAdminNote] = useState("");
  const [selectedProgressProduct, setSelectedProgressProduct] =
    useState<CampaignActionProgressProduct | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const statusParam: ParticipationStatus | undefined =
    statusFilter === "ALL" ? undefined : statusFilter;

  const { data: participations = [], isLoading } = useQuery({
    queryKey: ["admin", "campaign-participations", role, statusParam],
    queryFn: () => campaignService.getParticipationsByRole(role, statusParam),
  });

  const reviewMutation = useMutation({
    mutationFn: ({
      id,
      status,
      adminNote,
    }: {
      id: number;
      status: "APPROVED" | "REJECTED";
      adminNote?: string;
    }) =>
      campaignService.reviewParticipation(id, {
        status,
        adminNote: adminNote || undefined,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "campaign-participations", role],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "admin",
          "campaign-participations",
          role === "VENDOR" ? "CUSTOMER" : "VENDOR",
        ],
      });
      toast({
        title: "Success",
        description: `Participation ${
          variables.status === "APPROVED" ? "approved" : "rejected"
        } successfully`,
      });
      setReviewingParticipation(null);
      setAdminNote("");
    },
    onError: (error: unknown) => {
      const msg =
        error instanceof Error
          ? error.message
          : "Failed to review participation";
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: (participationId: number) =>
      campaignService.completeParticipation(participationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "campaign-participations", role],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "admin",
          "campaign-participations",
          role === "VENDOR" ? "CUSTOMER" : "VENDOR",
        ],
      });
      toast({
        title: "Success",
        description: "Participation marked as completed",
      });
    },
    onError: (error: unknown) => {
      const msg =
        error instanceof Error
          ? error.message
          : "Failed to complete participation";
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      });
    },
  });

  const filtered = useMemo(() => {
    let list = participations;
    if (campaignFilter !== "all") {
      const id = Number(campaignFilter);
      list = list.filter((p) => p.campaignId === id);
    }
    return list;
  }, [participations, campaignFilter]);

  const campaignById = useMemo(() => {
    return campaigns.reduce<Record<number, EventCampaign>>((acc, campaign) => {
      acc[campaign.id] = campaign;
      return acc;
    }, {});
  }, [campaigns]);

  const actionProgressQueries = useQueries({
    queries: filtered.map((participation) => {
      const campaign = campaignById[participation.campaignId];
      const isImplementedAction =
        campaign?.actionType === "COMPLETE_MIN_SALES" ||
        campaign?.actionType === "COMPLETE_MIN_ORDERS";

      return {
        queryKey: [
          "admin",
          "campaign-participation-progress",
          participation.id,
        ],
        queryFn: () => campaignService.getActionProgress(participation.id),
        enabled: isImplementedAction,
        staleTime: 30_000,
        retry: false,
      };
    }),
  });

  const progressByParticipationId = useMemo(() => {
    return filtered.reduce<Record<number, CampaignActionProgress | null>>(
      (acc, participation, index) => {
        const query = actionProgressQueries[index];
        acc[participation.id] = query?.data ?? null;
        return acc;
      },
      {}
    );
  }, [filtered, actionProgressQueries]);

  const formatProgressSummary = (
    progress: CampaignActionProgress | null
  ): string => {
    if (!progress) return "";
    if (progress.valueUnit === "MINOR_CURRENCY") {
      return `Sales: ${(progress.effectiveActualValue / 100).toLocaleString(
        undefined,
        {
          maximumFractionDigits: 2,
        }
      )} / ${(progress.requiredValue / 100).toLocaleString(undefined, {
        maximumFractionDigits: 2,
      })}`;
    }
    return `Orders: ${progress.effectiveActualValue.toLocaleString()} / ${progress.requiredValue.toLocaleString()}`;
  };

  const formatProductPrice = (product: CampaignActionProgressProduct) => {
    if (product.price) {
      return `${product.price.amount.toLocaleString()} ${
        product.price.currencyCode
      }`;
    }
    if (
      product.productSku &&
      product.productSku.length > 0 &&
      product.productSku[0].price
    ) {
      return `${product.productSku[0].price.amount.toLocaleString()} ${
        product.productSku[0].price.currencyCode
      }`;
    }
    return "N/A";
  };

  const getProductStock = (product: CampaignActionProgressProduct) => {
    if (product.productSku && product.productSku.length > 0) {
      return product.productSku.reduce(
        (sum, sku) => sum + (sku.stockQuantity || 0),
        0
      );
    }
    return 0;
  };

  const getProductStatusBadge = (status?: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      PENDING: { color: "bg-amber-100 text-amber-800", label: "Pending" },
      ACTIVE: { color: "bg-green-100 text-green-800", label: "Active" },
      APPROVED: { color: "bg-green-100 text-green-800", label: "Approved" },
      REJECTED: { color: "bg-red-100 text-red-800", label: "Rejected" },
      DRAFT: { color: "bg-gray-100 text-gray-800", label: "Draft" },
      INACTIVE: { color: "bg-gray-100 text-gray-800", label: "Inactive" },
      ARCHIVED: { color: "bg-gray-100 text-gray-800", label: "Archived" },
    };

    const badge = badges[status || ""] || badges.DRAFT;
    return <Badge className={badge.color}>{badge.label}</Badge>;
  };

  const toggleExpandProgress = (participationId: number) => {
    setExpandedProgressRows((prev) => ({
      ...prev,
      [participationId]: !prev[participationId],
    }));
  };

  const handleReview = (status: "APPROVED" | "REJECTED") => {
    if (!reviewingParticipation) return;
    reviewMutation.mutate({
      id: reviewingParticipation.id,
      status,
      adminNote: adminNote.trim() || undefined,
    });
  };

  const handleCloseReview = () => {
    setReviewingParticipation(null);
    setAdminNote("");
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={campaignFilter} onValueChange={setCampaignFilter}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="All campaigns" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All campaigns</SelectItem>
            {campaigns.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No participations found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Participant Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Campaign Name</TableHead>
                    <TableHead>Submitted Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => {
                    const progress = progressByParticipationId[p.id];
                    const progressSummary = formatProgressSummary(progress);
                    const progressObjects = getProgressObjects(progress);
                    const hasProgressObjects = progressObjects.length > 0;
                    const submittedData = extractSubmittedValue(
                      p.submittedData
                    );
                    const submittedDataLabel = progress
                      ? progressSummary || "View Progress"
                      : truncate(submittedData.display, 60);
                    const isExpanded = !!expandedProgressRows[p.id];

                    return (
                      <Fragment key={p.id}>
                        <TableRow>
                          <TableCell className="font-medium">
                            {p.participantName || "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {p.participantEmail || "—"}
                          </TableCell>
                          <TableCell>{p.campaignName}</TableCell>
                          <TableCell className="max-w-[220px] text-sm">
                            {progress ? (
                              <button
                                type="button"
                                className="text-left text-blue-700 hover:underline"
                                onClick={() => toggleExpandProgress(p.id)}
                              >
                                {submittedDataLabel}
                              </button>
                            ) : submittedData.isUrl ? (
                              <a
                                href={submittedData.display}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="truncate block text-blue-700 hover:underline"
                              >
                                {submittedDataLabel}
                              </a>
                            ) : (
                              <span className="truncate block">
                                {submittedDataLabel}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <ParticipationStatusBadge status={p.status} />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatDateTime(p.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {p.status === "APPROVED" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => completeMutation.mutate(p.id)}
                                  disabled={completeMutation.isPending}
                                >
                                  {completeMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                  )}
                                  Mark Complete
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setReviewingParticipation(p);
                                  setAdminNote(p.adminNote || "");
                                }}
                                title={
                                  p.status === "PENDING"
                                    ? "Review"
                                    : "View details"
                                }
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                {p.status === "PENDING" ? "Review" : "View"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {isExpanded && progress && (
                          <TableRow>
                            <TableCell colSpan={7} className="bg-muted/20">
                              <div className="space-y-2 py-2">
                                <p className="text-xs font-medium text-muted-foreground">
                                  {getProgressObjectsLabel(progress)}
                                </p>
                                {hasProgressObjects ? (
                                  <div className="space-y-2">
                                    {progressObjects.map((object, index) => {
                                      const product = object.product;
                                      const canViewProduct = !!product;
                                      return (
                                        <div
                                          key={`${
                                            object.orderId || "order"
                                          }-${index}`}
                                          className="rounded-md border bg-white p-3"
                                        >
                                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="space-y-1">
                                              <div className="flex items-center gap-2 text-sm">
                                                <span className="font-medium">
                                                  {product?.name ||
                                                    object.orderType ||
                                                    "Order Item"}
                                                </span>
                                                {object.orderNumber && (
                                                  <span className="text-xs text-muted-foreground">
                                                    {object.orderNumber}
                                                  </span>
                                                )}
                                              </div>
                                              <div className="text-xs text-muted-foreground">
                                                {object.soldAt
                                                  ? formatDateTime(
                                                      object.soldAt
                                                    )
                                                  : "—"}
                                                {object.quantity != null && (
                                                  <span className="ml-2">
                                                    Qty: {object.quantity}
                                                  </span>
                                                )}
                                                <span className="ml-2">
                                                  {formatObjectValue(
                                                    progress,
                                                    object
                                                  )}
                                                </span>
                                              </div>
                                            </div>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              disabled={!canViewProduct}
                                              onClick={() => {
                                                if (product) {
                                                  setSelectedProgressProduct(
                                                    product
                                                  );
                                                }
                                              }}
                                            >
                                              <Eye className="h-4 w-4 mr-1" />
                                              View Product
                                            </Button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground">
                                    No sold/ordered product details available.
                                  </p>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Details Dialog */}
      <Dialog
        open={!!selectedProgressProduct}
        onOpenChange={(open) => {
          if (!open) setSelectedProgressProduct(null);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription>View product information</DialogDescription>
          </DialogHeader>
          {selectedProgressProduct && (
            <div className="space-y-4">
              <div className="flex gap-4">
                {selectedProgressProduct.images?.length ||
                selectedProgressProduct.cover ? (
                  <img
                    src={getProductImageUrl(
                      selectedProgressProduct.images,
                      selectedProgressProduct.cover
                    )}
                    alt={selectedProgressProduct.name}
                    className="h-32 w-32 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-32 w-32 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Package className="h-16 w-16 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">
                    {selectedProgressProduct.name}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-2">
                    {selectedProgressProduct.categoryName || "Uncategorized"}
                  </p>
                  <p className="text-muted-foreground text-xs mb-2">
                    Subcategory:{" "}
                    {selectedProgressProduct.subCategoryName || "N/A"}
                  </p>
                  {getProductStatusBadge(selectedProgressProduct.status)}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Base Price</p>
                  <p className="font-medium">
                    {formatProductPrice(selectedProgressProduct)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Stock</p>
                  <p className="font-medium">
                    {getProductStock(selectedProgressProduct)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Vendor</p>
                  <p className="font-medium">
                    {selectedProgressProduct.vendorName ||
                      (selectedProgressProduct.vendorId != null
                        ? `Vendor #${selectedProgressProduct.vendorId}`
                        : "—")}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">
                    {selectedProgressProduct.createdAt
                      ? new Date(
                          selectedProgressProduct.createdAt
                        ).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
              </div>

              {selectedProgressProduct.description && (
                <div>
                  <p className="text-muted-foreground text-sm">Description</p>
                  <p className="text-sm mt-1">
                    {selectedProgressProduct.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Gift Wrappable</p>
                  <p className="font-medium flex items-center gap-1">
                    {selectedProgressProduct.giftWrappable ? (
                      <>
                        <Gift className="h-4 w-4 text-green-600" />
                        <span className="text-green-600">Yes</span>
                      </>
                    ) : (
                      <span className="text-gray-400">No</span>
                    )}
                  </p>
                </div>
                {selectedProgressProduct.giftWrappable &&
                  selectedProgressProduct.giftWrapPrice != null &&
                  selectedProgressProduct.giftWrapPrice > 0 && (
                    <div>
                      <p className="text-muted-foreground">
                        Gift Wrap Vendor Price
                      </p>
                      <p className="font-medium">
                        {selectedProgressProduct.giftWrapPrice}{" "}
                        {selectedProgressProduct.giftWrapCurrencyCode || ""}
                      </p>
                    </div>
                  )}
                {selectedProgressProduct.giftWrappable &&
                  selectedProgressProduct.giftWrapCustomerPrice != null &&
                  selectedProgressProduct.giftWrapCustomerPrice > 0 && (
                    <div>
                      <p className="text-muted-foreground">
                        Gift Wrap Customer Price
                      </p>
                      <p className="font-medium">
                        {selectedProgressProduct.giftWrapCustomerPrice}{" "}
                        {selectedProgressProduct.giftWrapCurrencyCode || ""}
                      </p>
                    </div>
                  )}
              </div>

              {selectedProgressProduct.productSku &&
                selectedProgressProduct.productSku.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-eagle-green" />
                      SKU Prices
                    </h4>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>SKU Code</TableHead>
                            <TableHead>Attributes</TableHead>
                            <TableHead className="text-right">
                              Customer Price
                            </TableHead>
                            <TableHead className="text-right">
                              Vendor Price
                            </TableHead>
                            <TableHead className="text-right">
                              Platform Fee
                            </TableHead>
                            <TableHead className="text-right">Stock</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedProgressProduct.productSku.map((sku) => {
                            const customerPrice =
                              sku.price?.unitAmountMinor ||
                              (sku.price?.amount ? sku.price.amount * 100 : 0);
                            const vendorPrice =
                              sku.price?.vendorAmountMinor ||
                              (sku.price?.vendorAmount
                                ? sku.price.vendorAmount * 100
                                : 0);
                            const platformFee = customerPrice - vendorPrice;
                            const currency = sku.price?.currencyCode || "ETB";

                            return (
                              <TableRow key={sku.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm">
                                      {sku.skuCode || "—"}
                                    </span>
                                    {sku.isDefault && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        Default
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {sku.attributes &&
                                  sku.attributes.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {sku.attributes.map((attr, idx) => (
                                        <Badge
                                          key={`${sku.id}-${attr.name}-${idx}`}
                                          variant="secondary"
                                          className="text-xs"
                                        >
                                          {attr.name}: {attr.value}
                                        </Badge>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">
                                      -
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatMinorCurrency(customerPrice, currency)}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                  {formatMinorCurrency(vendorPrice, currency)}
                                </TableCell>
                                <TableCell className="text-right text-green-600">
                                  {formatMinorCurrency(platformFee, currency)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge
                                    variant={
                                      sku.stockQuantity > 0
                                        ? "outline"
                                        : "destructive"
                                    }
                                  >
                                    {sku.stockQuantity}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedProgressProduct(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog
        open={!!reviewingParticipation}
        onOpenChange={(open) => !open && handleCloseReview()}
      >
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {reviewingParticipation?.status === "PENDING"
                ? "Review Participation"
                : "Participation Details"}
            </DialogTitle>
          </DialogHeader>

          {reviewingParticipation && (
            <div className="space-y-4">
              {/* Participant info */}
              <div className="rounded-lg border p-4 space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">
                  Participant
                </h4>
                <p className="font-medium">
                  {reviewingParticipation.participantName || "—"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {reviewingParticipation.participantEmail || "—"}
                </p>
              </div>

              {/* Campaign info */}
              <div className="rounded-lg border p-4 space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">
                  Campaign
                </h4>
                <p className="font-medium">
                  {reviewingParticipation.campaignName}
                </p>
              </div>

              {/* Submitted data */}
              <div className="rounded-lg border p-4 space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  Submitted Data
                </h4>
                {(() => {
                  const progress =
                    progressByParticipationId[reviewingParticipation.id];
                  if (!progress) return null;
                  const progressObjects = getProgressObjects(progress);
                  return (
                    <div className="bg-blue-50 border border-blue-100 rounded-md p-3">
                      <p className="text-xs font-medium text-blue-800 mb-2">
                        {getProgressObjectsLabel(progress)}
                      </p>
                      {progressObjects.length > 0 ? (
                        <div className="space-y-2">
                          {progressObjects.map((object, index) => (
                            <div
                              key={`${object.orderId || "order"}-${index}`}
                              className="rounded-md border border-blue-200 bg-white p-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-blue-900 truncate">
                                    {object.product?.name ||
                                      object.orderType ||
                                      "Order Item"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {object.orderNumber || "—"}
                                    {object.quantity != null && (
                                      <span className="ml-2">
                                        Qty: {object.quantity}
                                      </span>
                                    )}
                                    <span className="ml-2">
                                      {formatObjectValue(progress, object)}
                                    </span>
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={!object.product}
                                  onClick={() => {
                                    if (object.product) {
                                      setSelectedProgressProduct(
                                        object.product
                                      );
                                    }
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View Product
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No sold/ordered product details available.
                        </p>
                      )}
                    </div>
                  );
                })()}
                {(() => {
                  const { display, isUrl } = extractSubmittedValue(
                    reviewingParticipation.submittedData
                  );
                  if (isUrl) {
                    return (
                      <a
                        href={display}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline break-all"
                      >
                        {display}
                      </a>
                    );
                  }
                  return <p className="text-sm break-words">{display}</p>;
                })()}
              </div>

              {/* Admin note */}
              {reviewingParticipation.status === "PENDING" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Admin note (optional)
                  </label>
                  <Textarea
                    placeholder="Add a note for the participant..."
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              )}

              {/* Existing admin note when viewing approved/rejected */}
              {reviewingParticipation.status !== "PENDING" &&
                reviewingParticipation.adminNote && (
                  <div className="rounded-lg border p-4 space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">
                      Admin note
                    </h4>
                    <p className="text-sm">
                      {reviewingParticipation.adminNote}
                    </p>
                  </div>
                )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={handleCloseReview}>
                  Close
                </Button>
                {reviewingParticipation.status === "PENDING" && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => handleReview("REJECTED")}
                      disabled={reviewMutation.isPending}
                    >
                      {reviewMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      Reject
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleReview("APPROVED")}
                      disabled={reviewMutation.isPending}
                    >
                      {reviewMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Approve
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== Page ====================

export default function AdminCampaignParticipations() {
  const { data: campaigns = [] } = useQuery({
    queryKey: ["admin", "campaigns"],
    queryFn: () => campaignService.getAllCampaigns(),
  });

  return (
    <AdminLayout
      title="Campaign Participations"
      description="Review and manage vendor and user campaign submissions"
    >
      <div className="space-y-6">
        <Tabs defaultValue="vendor" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="vendor">Vendor Submissions</TabsTrigger>
            <TabsTrigger value="user">Customer Submissions</TabsTrigger>
            <TabsTrigger value="paid">Paid Submissions</TabsTrigger>
          </TabsList>
          <TabsContent value="vendor" className="mt-4">
            <ParticipationTabContent role="VENDOR" campaigns={campaigns} />
          </TabsContent>
          <TabsContent value="user" className="mt-4">
            <ParticipationTabContent role="CUSTOMER" campaigns={campaigns} />
          </TabsContent>
          <TabsContent value="paid" className="mt-4">
            <PaidSubmissionsTabContent campaigns={campaigns} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
