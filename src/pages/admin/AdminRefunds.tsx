import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  adminService,
  AdminRefundDto,
  AdminRefundStatus,
  AdminRefundSummaryDto,
} from "@/services/adminService";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  ArrowUpDown,
  Eye,
  Loader2,
  RefreshCw,
  RotateCw,
  Undo2,
} from "lucide-react";

const PAGE_SIZE = 20;
const STATUS_FILTERS: Array<"ALL" | AdminRefundStatus> = [
  "ALL",
  "REQUESTED",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
];

const summaryCardStyles: Record<keyof AdminRefundSummaryDto, string> = {
  total: "bg-slate-100 text-slate-900",
  requested: "bg-amber-100 text-amber-900",
  processing: "bg-blue-100 text-blue-900",
  completed: "bg-emerald-100 text-emerald-900",
  failed: "bg-red-100 text-red-900",
};

export default function AdminRefunds() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<"ALL" | AdminRefundStatus>(
    "ALL"
  );
  const [providerFilter, setProviderFilter] = useState("CHAPA");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const [selectedRefundId, setSelectedRefundId] = useState<number | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["admin", "refunds", "summary"],
    queryFn: () => adminService.getRefundSummary(),
  });

  const {
    data: refunds,
    isLoading: refundsLoading,
    isFetching: refundsFetching,
    refetch,
  } = useQuery({
    queryKey: [
      "admin",
      "refunds",
      page,
      statusFilter,
      providerFilter,
      sortDirection,
    ],
    queryFn: () =>
      adminService.getRefunds({
        status: statusFilter === "ALL" ? undefined : statusFilter,
        provider: providerFilter.trim() || undefined,
        page,
        size: PAGE_SIZE,
        sort: `requestedAt,${sortDirection}`,
      }),
  });

  const { data: selectedRefund, isLoading: selectedRefundLoading } = useQuery({
    queryKey: ["admin", "refunds", "details", selectedRefundId],
    queryFn: () => adminService.getRefundById(selectedRefundId as number),
    enabled: selectedRefundId !== null,
  });

  const reconcileMutation = useMutation({
    mutationFn: () => adminService.reconcileChapaRefunds(),
    onSuccess: (message) => {
      toast({
        title: "CHAPA reconciliation completed",
        description: message || "CHAPA refunds reconciled successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "refunds"] });
    },
    onError: (error: any) => {
      toast({
        title: "CHAPA reconciliation failed",
        description: error?.message || "Unable to reconcile CHAPA refunds.",
        variant: "destructive",
      });
    },
  });

  const reconcileStripeMutation = useMutation({
    mutationFn: () => adminService.reconcileStripeRefunds(),
    onSuccess: (message) => {
      toast({
        title: "Stripe reconciliation completed",
        description: message || "Stripe refunds reconciled successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "refunds"] });
    },
    onError: (error: any) => {
      toast({
        title: "Stripe reconciliation failed",
        description: error?.message || "Unable to reconcile Stripe refunds.",
        variant: "destructive",
      });
    },
  });

  const rows: AdminRefundDto[] = refunds?.content || [];
  const currentPage = refunds?.pageable?.pageNumber ?? refunds?.number ?? page;
  const totalPages = Math.max(refunds?.totalPages ?? 0, 1);

  const formatDateTime = (value?: string) => {
    if (!value) return "-";
    return new Date(value).toLocaleString();
  };

  const formatMinorMoney = (amountMinor?: number, currency?: string) => {
    if (amountMinor === undefined || amountMinor === null) return "-";

    const safeCurrency = (currency || "USD").toUpperCase();
    const amount = amountMinor / 100;

    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: safeCurrency,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${safeCurrency} ${amount.toLocaleString(undefined, {
        maximumFractionDigits: 2,
      })}`;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status?.toUpperCase()) {
      case "REQUESTED":
        return <Badge className="bg-amber-100 text-amber-900">Requested</Badge>;
      case "PROCESSING":
        return <Badge className="bg-blue-100 text-blue-900">Processing</Badge>;
      case "COMPLETED":
        return (
          <Badge className="bg-emerald-100 text-emerald-900">Completed</Badge>
        );
      case "FAILED":
        return <Badge className="bg-red-100 text-red-900">Failed</Badge>;
      default:
        return <Badge variant="outline">{status || "Unknown"}</Badge>;
    }
  };

  const openDetails = (refundId: number) => {
    setSelectedRefundId(refundId);
    setShowDetailsDialog(true);
  };

  return (
    <AdminLayout
      title="Refunds"
      description="Track refund lifecycle, provider status, and reconciliation results."
    >
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Undo2 className="h-5 w-5" />
                Refund Tracking
              </CardTitle>
              <CardDescription>
                Data source: /api/admin/refunds, /api/admin/refunds/summary, and
                CHAPA reconciliation endpoint.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={refundsFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${
                    refundsFetching ? "animate-spin" : ""
                  }`}
                />
                Refresh
              </Button>
              {/* <Button
                onClick={() => reconcileMutation.mutate()}
                disabled={reconcileMutation.isPending}
                className="bg-eagle-green hover:bg-eagle-green/90"
              >
                {reconcileMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RotateCw className="h-4 w-4 mr-2" />
                )}
                Reconcile CHAPA
              </Button>
              <Button
                onClick={() => reconcileStripeMutation.mutate()}
                disabled={reconcileStripeMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {reconcileStripeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RotateCw className="h-4 w-4 mr-2" />
                )}
                Reconcile Stripe
              </Button> */}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {(
                Object.keys(summaryCardStyles) as Array<
                  keyof AdminRefundSummaryDto
                >
              ).map((key) => (
                <div key={key} className="rounded-lg border bg-background p-4">
                  <p className="text-xs uppercase text-muted-foreground tracking-wide">
                    {key}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-2xl font-bold">
                      {summaryLoading
                        ? "-"
                        : (summary?.[key] ?? 0).toLocaleString()}
                    </p>
                    <Badge className={summaryCardStyles[key]}>{key}</Badge>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <div className="space-y-1">
                <label
                  htmlFor="refund-status-filter"
                  className="text-sm font-medium"
                >
                  Status
                </label>
                <select
                  id="refund-status-filter"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(
                      e.target.value as "ALL" | AdminRefundStatus
                    );
                    setPage(0);
                  }}
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                >
                  {STATUS_FILTERS.map((status) => (
                    <option key={status} value={status}>
                      {status === "ALL" ? "All" : status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="refund-provider-filter"
                  className="text-sm font-medium"
                >
                  Provider
                </label>
                <Input
                  id="refund-provider-filter"
                  placeholder="CHAPA"
                  value={providerFilter}
                  onChange={(e) => {
                    setProviderFilter(e.target.value);
                    setPage(0);
                  }}
                />
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  setSortDirection((prev) =>
                    prev === "desc" ? "asc" : "desc"
                  );
                  setPage(0);
                }}
              >
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Sort: {sortDirection === "desc" ? "Newest" : "Oldest"}
              </Button>

              <Button
                variant="ghost"
                onClick={() => {
                  setStatusFilter("ALL");
                  setProviderFilter("CHAPA");
                  setSortDirection("desc");
                  setPage(0);
                }}
              >
                Reset
              </Button>
            </div>

            {refundsLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Refund ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Provider Ref</TableHead>
                      <TableHead>Failure</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="text-center text-muted-foreground"
                        >
                          No refunds found for the current filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((refund) => (
                        <TableRow key={refund.id}>
                          <TableCell className="font-medium">
                            #{refund.id}
                          </TableCell>
                          <TableCell>{getStatusBadge(refund.status)}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">
                                {refund.provider || "-"}
                              </div>
                              <div className="text-muted-foreground text-xs">
                                {refund.providerStatus || "-"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatMinorMoney(
                              refund.amountMinor,
                              refund.currency
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">
                                {refund.orderNumber ||
                                  `Order #${refund.orderId ?? "-"}`}
                              </div>
                              <div className="text-muted-foreground text-xs">
                                {refund.orderType || "-"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatDateTime(refund.requestedAt)}
                          </TableCell>
                          <TableCell>
                            {refund.providerRef ||
                              refund.refundReference ||
                              "-"}
                          </TableCell>
                          <TableCell className="max-w-[220px] truncate">
                            {refund.failureReason || "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDetails(refund.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing page {currentPage + 1} of {totalPages} (
                    {(refunds?.totalElements ?? 0).toLocaleString()} records)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                      disabled={currentPage <= 0 || refundsFetching}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((prev) => prev + 1)}
                      disabled={
                        currentPage + 1 >= totalPages || refundsFetching
                      }
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

      <Dialog
        open={showDetailsDialog}
        onOpenChange={(open) => {
          setShowDetailsDialog(open);
          if (!open) {
            setSelectedRefundId(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Refund Details</DialogTitle>
            <DialogDescription>
              Full refund tracking details for admin verification.
            </DialogDescription>
          </DialogHeader>

          {selectedRefundLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !selectedRefund ? (
            <p className="text-sm text-muted-foreground">No refund selected.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Refund ID</p>
                <p className="font-medium">#{selectedRefund.id}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium">{selectedRefund.status}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Provider</p>
                <p className="font-medium">{selectedRefund.provider || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Provider Status</p>
                <p className="font-medium">
                  {selectedRefund.providerStatus || "-"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Provider Ref</p>
                <p className="font-medium break-all">
                  {selectedRefund.providerRef || "-"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Refund Reference</p>
                <p className="font-medium break-all">
                  {selectedRefund.refundReference || "-"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Amount</p>
                <p className="font-medium">
                  {formatMinorMoney(
                    selectedRefund.amountMinor,
                    selectedRefund.currency
                  )}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Order</p>
                <p className="font-medium">
                  {selectedRefund.orderNumber ||
                    `Order #${selectedRefund.orderId ?? "-"}`}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Order Type</p>
                <p className="font-medium">{selectedRefund.orderType || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Payment Detail ID</p>
                <p className="font-medium">
                  {selectedRefund.paymentDetailId ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Requested At</p>
                <p className="font-medium">
                  {formatDateTime(selectedRefund.requestedAt)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Verified At</p>
                <p className="font-medium">
                  {formatDateTime(selectedRefund.lastVerifiedAt)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Completed At</p>
                <p className="font-medium">
                  {formatDateTime(selectedRefund.completedAt)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Failed At</p>
                <p className="font-medium">
                  {formatDateTime(selectedRefund.failedAt)}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-muted-foreground">Reason</p>
                <p className="font-medium">{selectedRefund.reason || "-"}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-muted-foreground">Failure Reason</p>
                <p className="font-medium text-red-700">
                  {selectedRefund.failureReason || "-"}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDetailsDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
