import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  vendorService,
  VendorProfile,
  VendorPayoutHistoryItem,
  VendorPayoutOverview,
} from "@/services/vendorService";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  CreditCard,
  Plus,
  AlertCircle,
  CheckCircle,
  DollarSign,
  ExternalLink,
  RefreshCw,
  Clock3,
  XCircle,
  Wallet,
  Loader2,
  Filter,
} from "lucide-react";

// Helper function to check if vendor is Ethiopian
const isEthiopianVendor = (
  vendorProfile: VendorProfile | undefined
): boolean => {
  if (!vendorProfile) return false;
  return vendorProfile.countryCode === "ET";
};

export default function VendorPaymentsPage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isVendor = user?.role?.toUpperCase() === "VENDOR";
  const [payoutPage, setPayoutPage] = useState(0);
  const [pageSize] = useState(10);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  // Fetch vendor profile
  const { data: vendorProfile } = useQuery<VendorProfile>({
    queryKey: ["vendor", "profile"],
    queryFn: () => vendorService.getMyProfile(),
    enabled: isAuthenticated && isVendor,
  });

  // Fetch onboarding status
  const { data: onboardingStatus, isLoading } = useQuery({
    queryKey: ["vendor", "onboarding-status"],
    queryFn: () => vendorService.getOnboardingStatus(),
    enabled: isAuthenticated && isVendor,
  });

  const {
    data: payoutOverview,
    isLoading: isPayoutOverviewLoading,
    isFetching: isPayoutOverviewFetching,
  } = useQuery<VendorPayoutOverview>({
    queryKey: ["vendor-payout-overview", payoutPage, pageSize, sortDirection],
    queryFn: () =>
      vendorService.getPayoutOverview(
        payoutPage,
        pageSize,
        `createdAt,${sortDirection}`
      ),
    enabled: isAuthenticated && isVendor,
  });

  // Stripe onboarding mutation
  const stripeOnboardingMutation = useMutation({
    mutationFn: () =>
      vendorService.startStripeOnboarding(
        `${window.location.origin}/vendor/onboarding/refresh`,
        `${window.location.origin}/vendor/onboarding/return`
      ),
    onSuccess: (data) => {
      if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl;
      } else {
        toast({
          title: "Stripe onboarding started",
          description: data.message,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Stripe dashboard mutation
  const stripeDashboardMutation = useMutation({
    mutationFn: () => vendorService.getStripeDashboard(),
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const payoutRequestMutation = useMutation({
    mutationFn: () => vendorService.requestPayoutNow(),
    onSuccess: (data) => {
      toast({ title: "Payout request submitted", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["vendor-payout-overview"] });
    },
    onError: (error: any) => {
      const status = error?.response?.status;
      if (status === 401) {
        toast({
          title: "Session expired",
          description: "Please sign in again.",
          variant: "destructive",
        });
        return;
      }
      if (status === 403) {
        toast({
          title: "Access denied",
          description: "You are not allowed to request payouts.",
          variant: "destructive",
        });
        return;
      }
      if (status === 400) {
        toast({
          title: "Invalid request",
          description:
            error.message || "Unable to process payout sweep request.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Unable to request payout",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const formatMoney = (
    amount: number | null | undefined,
    currency?: string | null
  ) => {
    if (amount === undefined || amount === null) return "-";
    const safeCurrency = currency?.toUpperCase();
    if (!safeCurrency) {
      return amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
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

  const formatDateTime = (value?: string | null) => {
    if (!value) return "-";
    return new Date(value).toLocaleString();
  };

  const getPayoutStatusBadge = (status: string) => {
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

  const canRequestPayout = payoutOverview?.requestPayout?.allowed ?? false;

  const filteredHistory = useMemo(() => {
    const rows = payoutOverview?.history || [];
    const sortedRows = [...rows].sort((a, b) => {
      const first = new Date(a.createdAt).getTime();
      const second = new Date(b.createdAt).getTime();
      return sortDirection === "desc" ? second - first : first - second;
    });

    return sortedRows.filter((row) => {
      const matchesStatus =
        statusFilter === "ALL" || row.status?.toUpperCase() === statusFilter;
      if (!matchesStatus) return false;

      const createdAt = row.createdAt ? new Date(row.createdAt) : null;
      if (startDateFilter && createdAt) {
        const start = new Date(`${startDateFilter}T00:00:00`);
        if (createdAt < start) return false;
      }
      if (endDateFilter && createdAt) {
        const end = new Date(`${endDateFilter}T23:59:59`);
        if (createdAt > end) return false;
      }
      return true;
    });
  }, [
    payoutOverview?.history,
    sortDirection,
    statusFilter,
    startDateFilter,
    endDateFilter,
  ]);

  const currentPageNumber = payoutOverview?.historyPage ?? payoutPage;
  const totalHistoryPages = Math.max(payoutOverview?.historyTotalPages ?? 1, 1);
  const totalFilteredPayouts = payoutOverview?.historyTotalElements ?? 0;

  const triggerPayoutRequest = () => {
    payoutRequestMutation.mutate();
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
      case "APPROVED":
      case "ENABLED":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "PENDING":
      case "PENDING_APPROVAL":
        return <Badge className="bg-amber-100 text-amber-800">Pending</Badge>;
      case "NOT_STARTED":
        return <Badge className="bg-gray-100 text-gray-800">Not Started</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Payment Setup</h2>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Stripe Setup - Only show for non-Ethiopian vendors */}
        {!isEthiopianVendor(vendorProfile) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Stripe Connect
              </CardTitle>
              <CardDescription>
                Accept international payments via Stripe
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Status:</span>
                {getStatusBadge(
                  onboardingStatus?.stripeStatus || "NOT_STARTED"
                )}
              </div>
              {onboardingStatus?.stripeAccountId && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Account ID:</span>
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                    {onboardingStatus.stripeAccountId}
                  </code>
                </div>
              )}
              <Separator />
              <div className="flex gap-2">
                {!onboardingStatus?.stripeEnabled ? (
                  <Button
                    onClick={() => stripeOnboardingMutation.mutate()}
                    disabled={stripeOnboardingMutation.isPending}
                    className="flex-1"
                  >
                    {stripeOnboardingMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    {onboardingStatus?.stripeStatus === "NOT_STARTED"
                      ? "Start Setup"
                      : "Continue Setup"}
                  </Button>
                ) : (
                  <Button
                    onClick={() => stripeDashboardMutation.mutate()}
                    disabled={stripeDashboardMutation.isPending}
                    variant="outline"
                    className="flex-1"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Stripe Dashboard
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chapa Setup */}
        <Card
          className={isEthiopianVendor(vendorProfile) ? "md:col-span-1" : ""}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Chapa (Ethiopian Birr)
            </CardTitle>
            <CardDescription>Accept ETB payments via Chapa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Status:</span>
              {getStatusBadge(onboardingStatus?.chapaStatus || "NOT_STARTED")}
            </div>
            {onboardingStatus?.chapaSubaccountId && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subaccount ID:</span>
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                  {onboardingStatus.chapaSubaccountId}
                </code>
              </div>
            )}
            <Separator />
            <Button
              asChild
              variant={onboardingStatus?.chapaEnabled ? "outline" : "default"}
              className="w-full"
            >
              <Link to="/vendor/payments/chapa">
                {onboardingStatus?.chapaEnabled
                  ? "Manage Chapa"
                  : "Set Up Chapa"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Payment Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {onboardingStatus?.canReceivePayments ? (
              <>
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <p className="font-medium text-green-700">
                    You can receive payments!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Your payment setup is complete. Funds will be transferred to
                    your connected accounts.
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="h-8 w-8 text-amber-500" />
                <div>
                  <p className="font-medium text-amber-700">
                    Payment setup incomplete
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Complete your Stripe or Chapa setup to receive payouts from
                    your sales.
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Vendor Payouts
            </CardTitle>
            <CardDescription>
              Trigger an immediate sweep of all mature payouts eligible for
              withdrawal.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={() => {
                queryClient.invalidateQueries({
                  queryKey: ["vendor-payout-overview"],
                });
            }}
            disabled={isPayoutOverviewFetching}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${
                isPayoutOverviewFetching ? "animate-spin" : ""
              }`}
            />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-green-200">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">
                  Available To Request
                </p>
                <p className="text-lg font-semibold text-green-700">
                  {isPayoutOverviewLoading
                    ? "..."
                    : formatMoney(
                        payoutOverview?.summary?.availableToRequestAmount
                      )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {payoutOverview?.summary?.availableToRequestCount ?? 0} payouts
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Completed</p>
                <p className="text-lg font-semibold">
                  {isPayoutOverviewLoading
                    ? "..."
                    : formatMoney(
                        payoutOverview?.summary?.totalCompletedAmount
                      )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {payoutOverview?.summary?.completedCount ?? 0} completed
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Pending Amount</p>
                <p className="text-lg font-semibold text-amber-700">
                  {isPayoutOverviewLoading
                    ? "..."
                    : formatMoney(
                        payoutOverview?.summary?.totalPendingAmount
                      )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {payoutOverview?.summary?.pendingCount ?? 0} pending
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">
                  Processing / Failed
                </p>
                <p className="text-lg font-semibold">
                  {(payoutOverview?.summary?.processingCount ?? 0).toLocaleString()} /{" "}
                  {(payoutOverview?.summary?.failedCount ?? 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  Total payouts:{" "}
                  {(payoutOverview?.summary?.totalPayouts ?? 0).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Payout Provider</p>
              <p className="mt-1 text-sm font-medium">
                {payoutOverview?.payoutPolicy?.provider || "-"}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Delay: {(payoutOverview?.payoutPolicy?.payoutDelayDays ?? 0).toLocaleString()} days
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Next Eligible Payout</p>
              <p className="mt-1 text-sm font-medium">
                {formatDateTime(payoutOverview?.payoutPolicy?.nextEligiblePayoutAt)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Stripe request payout supported: {payoutOverview?.payoutPolicy?.stripeRequestPayoutSupported ? "Yes" : "No"}
              </p>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                This action starts payout transfer for all currently eligible
                mature payouts.
              </p>
              <Button
                onClick={triggerPayoutRequest}
                disabled={payoutRequestMutation.isPending || !canRequestPayout}
              >
                {payoutRequestMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Clock3 className="h-4 w-4 mr-2" />
                )}
                Request Immediate Payout
              </Button>
            </div>
            {!canRequestPayout && (
              <p className="mt-2 text-sm text-muted-foreground">
                {payoutOverview?.requestPayout?.reasonIfBlocked ||
                  "No eligible payouts are currently available for manual request."}
              </p>
            )}
            {canRequestPayout && (
              <p className="mt-2 text-sm text-muted-foreground">
                Eligible now: {payoutOverview?.requestPayout?.eligiblePayoutCount ?? 0} payouts ({formatMoney(
                  payoutOverview?.requestPayout?.eligibleAmount
                )})
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <CardTitle>Payout History</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"));
                setPayoutPage(0);
              }}
            >
              Sort: {sortDirection === "desc" ? "Newest First" : "Oldest First"}
            </Button>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="space-y-1">
              <label htmlFor="statusFilter" className="text-sm font-medium">
                Status
              </label>
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
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="startDate" className="text-sm font-medium">
                Start date
              </label>
              <Input
                id="startDate"
                type="date"
                value={startDateFilter}
                onChange={(e) => {
                  setStartDateFilter(e.target.value);
                  setPayoutPage(0);
                }}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="endDate" className="text-sm font-medium">
                End date
              </label>
              <Input
                id="endDate"
                type="date"
                value={endDateFilter}
                onChange={(e) => {
                  setEndDateFilter(e.target.value);
                  setPayoutPage(0);
                }}
              />
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                setStatusFilter("ALL");
                setStartDateFilter("");
                setEndDateFilter("");
                setPayoutPage(0);
              }}
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isPayoutOverviewLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Net</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Eligible</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-center text-muted-foreground"
                      >
                        No payout history found for the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredHistory.map((item: VendorPayoutHistoryItem) => (
                      <TableRow key={item.payoutId}>
                        <TableCell className="font-medium">
                          #{item.payoutId}
                        </TableCell>
                        <TableCell>
                          {getPayoutStatusBadge(item.status)}
                        </TableCell>
                        <TableCell>{item.payoutMethod}</TableCell>
                        <TableCell>
                          {formatMoney(item.payoutAmount, item.payoutCurrency)}
                        </TableCell>
                        <TableCell>
                          {formatMoney(item.netAmount, item.originalCurrency)}
                        </TableCell>
                        <TableCell>{item.orderNumber || "-"}</TableCell>
                        <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {formatDateTime(item.eligibleAt)}
                            {typeof item.daysUntilEligible === "number" &&
                              item.daysUntilEligible > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  In {item.daysUntilEligible} day(s)
                                </p>
                              )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {item.transferReference || "-"}
                            {item.failureReason && (
                              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                                <XCircle className="h-3 w-3" />
                                {item.failureReason}
                              </p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing page {(currentPageNumber ?? 0) + 1} of{" "}
                  {Math.max(totalHistoryPages, 1)} ({totalFilteredPayouts.toLocaleString()} total payouts)
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPayoutPage((prev) => Math.max(prev - 1, 0))
                    }
                    disabled={(currentPageNumber ?? 0) <= 0 || isPayoutOverviewFetching}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPayoutPage((prev) =>
                        Math.min(prev + 1, totalHistoryPages - 1)
                      )
                    }
                    disabled={
                      currentPageNumber >= totalHistoryPages - 1 ||
                      totalHistoryPages <= 1 ||
                      isPayoutOverviewFetching
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
  );
}
