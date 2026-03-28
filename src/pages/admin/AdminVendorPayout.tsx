import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminService, AdminVendorPayoutDto } from "@/services/adminService";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, RefreshCw, Wallet } from "lucide-react";

export default function AdminVendorPayout() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [payoutPage, setPayoutPage] = useState(0);
  const [pageSize] = useState(20);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [vendorIdInput, setVendorIdInput] = useState("");

  const parsedVendorId = vendorIdInput.trim() ? Number(vendorIdInput.trim()) : undefined;
  const vendorId = Number.isFinite(parsedVendorId) ? parsedVendorId : undefined;

  const {
    data: payouts,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["admin", "vendor-payouts", payoutPage, pageSize, sortDirection, statusFilter, vendorId],
    queryFn: () =>
      adminService.getVendorPayouts({
        vendorId,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        page: payoutPage,
        size: pageSize,
        sort: `createdAt,${sortDirection}`,
      }),
  });

  const restartPayoutMutation = useMutation({
    mutationFn: (payoutId: number) => adminService.restartVendorPayout(payoutId),
    onSuccess: (updatedPayout) => {
      toast({
        title: "Payout restarted",
        description: `Payout #${updatedPayout.id} moved to ${updatedPayout.status}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "vendor-payouts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Restart failed",
        description: error?.message || "Unable to restart payout. Please try again.",
        variant: "destructive",
      });
    },
  });

  const formatMoney = (amount?: number, currency?: string) => {
    if (amount === undefined || amount === null) return "-";
    const safeCurrency = (currency || "USD").toUpperCase();
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: safeCurrency,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${safeCurrency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    }
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return "-";
    return new Date(value).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "COMPLETED":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case "PENDING":
        return <Badge className="bg-amber-100 text-amber-800">Pending</Badge>;
      case "PROCESSING":
        return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>;
      case "FAILED":
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      case "SKIPPED":
        return <Badge className="bg-slate-100 text-slate-800">Skipped</Badge>;
      default:
        return <Badge variant="outline">{status || "Unknown"}</Badge>;
    }
  };

  const rows: AdminVendorPayoutDto[] = payouts?.content || [];
  const currentPageNumber = payouts?.pageable?.pageNumber ?? payouts?.number ?? payoutPage;
  const totalPages = payouts?.totalPages ?? 0;

  return (
    <AdminLayout
      title="Vendor Payout"
      description="Track vendor payout execution, conversion values, and platform fee tracking details."
    >
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Vendor Payouts
              </CardTitle>
              <CardDescription>
                Pulled from /api/admin/payouts with optional status and vendor filters.
              </CardDescription>
            </div>
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="space-y-1">
                <label htmlFor="vendorId" className="text-sm font-medium">Vendor ID</label>
                <Input
                  id="vendorId"
                  type="number"
                  placeholder="e.g. 34"
                  value={vendorIdInput}
                  onChange={(e) => {
                    setVendorIdInput(e.target.value);
                    setPayoutPage(0);
                  }}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="statusFilter" className="text-sm font-medium">Status</label>
                <select
                  id="statusFilter"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPayoutPage(0);
                  }}
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="ALL">All</option>
                  <option value="PENDING">Pending</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="FAILED">Failed</option>
                  <option value="SKIPPED">Skipped</option>
                </select>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"));
                  setPayoutPage(0);
                }}
              >
                Sort: {sortDirection === "desc" ? "Newest First" : "Oldest First"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setVendorIdInput("");
                  setStatusFilter("ALL");
                  setSortDirection("desc");
                  setPayoutPage(0);
                }}
              >
                Clear Filters
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payout ID</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Payout Amount</TableHead>
                      <TableHead>Net Amount</TableHead>
                      <TableHead>Fee Tracking</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Attempts</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center text-muted-foreground">
                          No vendor payouts found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">#{item.id}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">{item.vendorName || `Vendor #${item.vendorId}`}</div>
                              <div className="text-muted-foreground">ID: {item.vendorId}</div>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(item.status)}</TableCell>
                          <TableCell>{item.payoutMethod || "-"}</TableCell>
                          <TableCell>{formatMoney(item.payoutAmount, item.payoutCurrency)}</TableCell>
                          <TableCell>{formatMoney(item.netAmount, item.originalCurrency)}</TableCell>
                          <TableCell>
                            {item.trackedPlatformFee
                              ? formatMoney(item.feeTrackingAmount, item.feeTrackingCurrency)
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {item.feeTrackingExchangeRate
                              ? item.feeTrackingExchangeRate.toLocaleString(undefined, { maximumFractionDigits: 4 })
                              : "-"}
                          </TableCell>
                          <TableCell>{item.transferAttempts ?? 0}</TableCell>
                          <TableCell>
                            <div className="text-xs">
                              <div>{formatDateTime(item.createdAt)}</div>
                              {item.failureReason && (
                                <div className="text-red-600 mt-1">{item.failureReason}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.status?.toUpperCase() === "FAILED" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => restartPayoutMutation.mutate(item.id)}
                                disabled={
                                  restartPayoutMutation.isPending &&
                                  restartPayoutMutation.variables === item.id
                                }
                              >
                                {restartPayoutMutation.isPending &&
                                restartPayoutMutation.variables === item.id ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : null}
                                Restart
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing page {(currentPageNumber ?? 0) + 1} of {Math.max(totalPages, 1)}
                    {" "}({(payouts?.totalElements ?? 0).toLocaleString()} total records)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPayoutPage((prev) => Math.max(prev - 1, 0))}
                      disabled={(currentPageNumber ?? 0) <= 0 || isFetching}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPayoutPage((prev) => prev + 1)}
                      disabled={(currentPageNumber ?? 0) + 1 >= Math.max(totalPages, 1) || isFetching}
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
    </AdminLayout>
  );
}
