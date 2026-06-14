import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  supplierService,
  SupplierReportSummary,
  SupplierReportItem,
  ReportOrderType,
} from "@/services/supplierService";
import {
  ArrowLeft,
  RefreshCw,
  Mail,
  ChevronDown,
  ChevronRight,
  Loader2,
  PackageOpen,
  TrendingUp,
  Users,
  BarChart3,
  Send,
  Eye,
  Store,
} from "lucide-react";

// ── helpers ──────────────────────────────────────────────────────────────────

function formatMinor(minor: number | null | undefined, currency = "USD"): string {
  if (minor == null) return `0.00 ${currency}`;
  return `${(minor / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ORDER_TYPE_LABELS: Record<ReportOrderType, string> = {
  PRODUCT: "Product",
  PRODUCT_PACKAGE_ITEM: "Package Item",
  EVENT: "Event",
  SERVICE: "Service",
  CUSTOM: "Custom Order",
};

const ORDER_TYPE_COLORS: Record<ReportOrderType, string> = {
  PRODUCT: "bg-blue-100 text-blue-800",
  PRODUCT_PACKAGE_ITEM: "bg-indigo-100 text-indigo-800",
  EVENT: "bg-purple-100 text-purple-800",
  SERVICE: "bg-cyan-100 text-cyan-800",
  CUSTOM: "bg-orange-100 text-orange-800",
};

// ── sub-components ───────────────────────────────────────────────────────────

function OverallStats({ summaries }: { summaries: SupplierReportSummary[] }) {
  const totalItems = summaries.reduce((s, r) => s + r.totalItems, 0);
  const totalGross = summaries.reduce((s, r) => s + r.totalGrossAmountMinor, 0);
  const totalNet = summaries.reduce((s, r) => s + r.totalVendorNetAmountMinor, 0);
  const pairs = summaries.length;

  // aggregate by order type across all reports
  const byType: Record<string, { count: number; gross: number; net: number }> = {};
  summaries.forEach((r) =>
    r.byOrderType.forEach(({ orderType, count, grossAmountMinor, vendorNetAmountMinor }) => {
      if (!byType[orderType]) byType[orderType] = { count: 0, gross: 0, net: 0 };
      byType[orderType].count += count;
      byType[orderType].gross += grossAmountMinor;
      byType[orderType].net += vendorNetAmountMinor;
    })
  );

  return (
    <>
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-eagle-green to-eagle-green/80 text-white">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-1 opacity-80">
              <BarChart3 className="w-4 h-4" />
              <span className="text-xs font-medium">Total Sales</span>
            </div>
            <p className="text-3xl font-bold">{totalItems.toLocaleString()}</p>
            <p className="text-xs opacity-70 mt-1">completed orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-1 text-gray-500">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium">Gross Revenue</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{formatMinor(totalGross)}</p>
            <p className="text-xs text-gray-400 mt-1">customer paid</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-1 text-gray-500">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium">Vendor Net</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{formatMinor(totalNet)}</p>
            <p className="text-xs text-gray-400 mt-1">after platform fee</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-1 text-gray-500">
              <Users className="w-4 h-4" />
              <span className="text-xs font-medium">Vendor–Supplier Pairs</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{pairs}</p>
            <p className="text-xs text-gray-400 mt-1">with reports</p>
          </CardContent>
        </Card>
      </div>

      {/* Order-type breakdown chips */}
      {Object.keys(byType).length > 0 && (
        <div className="flex flex-wrap gap-3 mb-6">
          {(Object.keys(byType) as ReportOrderType[]).map((type) => (
            <div
              key={type}
              className="flex items-center gap-2 bg-white border rounded-lg px-4 py-2 shadow-sm"
            >
              <Badge className={ORDER_TYPE_COLORS[type]} variant="outline">
                {ORDER_TYPE_LABELS[type]}
              </Badge>
              <span className="text-sm font-semibold text-gray-800">
                {byType[type].count} sales
              </span>
              <span className="text-xs text-gray-400">
                {formatMinor(byType[type].net)} net
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── vendor-level row + expandable supplier details ────────────────────────────

interface VendorGroup {
  vendorId: number;
  vendorName: string;
  reports: SupplierReportSummary[];
}

function VendorRow({
  group,
  onSend,
  sending,
}: {
  group: VendorGroup;
  onSend: (vendorId: number, supplierId: number) => void;
  sending: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [selectedReport, setSelectedReport] = useState<SupplierReportSummary | null>(null);
  const [showItems, setShowItems] = useState(false);

  const totalItems = group.reports.reduce((s, r) => s + r.totalItems, 0);
  const totalNet = group.reports.reduce((s, r) => s + r.totalVendorNetAmountMinor, 0);
  const sortedDates = group.reports.map((r) => r.lastGeneratedAt).filter(Boolean).sort();
  const lastGenerated = sortedDates[sortedDates.length - 1];

  // determine currency from first non-empty report
  const currency =
    group.reports
      .flatMap((r) => r.byOrderType)
      .find(() => true)
      ? "ETB"
      : "ETB";

  return (
    <>
      {/* Vendor header row */}
      <TableRow
        className="cursor-pointer hover:bg-eagle-green/5 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <TableCell>
          <div className="flex items-center gap-2 font-semibold text-gray-800">
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-eagle-green" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
            <Store className="w-4 h-4 text-eagle-green" />
            {group.vendorName}
          </div>
        </TableCell>
        <TableCell className="text-center">
          <Badge variant="outline" className="bg-gray-50">
            {group.reports.length} supplier{group.reports.length !== 1 ? "s" : ""}
          </Badge>
        </TableCell>
        <TableCell className="text-center font-medium">{totalItems}</TableCell>
        <TableCell className="text-right font-semibold text-green-700">
          {formatMinor(totalNet, currency)}
        </TableCell>
        <TableCell className="text-sm text-gray-400">{formatDate(lastGenerated)}</TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-1 justify-end">
            {group.reports.map((r) => (
              <Button
                key={r.supplierId}
                variant="ghost"
                size="sm"
                title={`Send report for ${r.supplierName}`}
                disabled={sending}
                onClick={() => onSend(group.vendorId, r.supplierId)}
              >
                {sending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Send className="w-3 h-3" />
                )}
              </Button>
            ))}
          </div>
        </TableCell>
      </TableRow>

      {/* Expanded: per-supplier rows */}
      {expanded &&
        group.reports.map((report) => (
          <TableRow key={report.supplierId} className="bg-eagle-green/3">
            <TableCell className="pl-12">
              <div className="text-sm text-gray-600 font-medium">
                ↳ {report.supplierName}
              </div>
              <div className="text-xs text-gray-400">{report.supplierEmail}</div>
            </TableCell>
            <TableCell className="text-center">
              <div className="flex flex-wrap gap-1 justify-center">
                {report.byOrderType.map((t) => (
                  <Badge
                    key={t.orderType}
                    variant="outline"
                    className={`text-[10px] ${ORDER_TYPE_COLORS[t.orderType]}`}
                  >
                    {ORDER_TYPE_LABELS[t.orderType]}: {t.count}
                  </Badge>
                ))}
              </div>
            </TableCell>
            <TableCell className="text-center text-sm">{report.totalItems}</TableCell>
            <TableCell className="text-right text-sm text-green-700">
              {formatMinor(report.totalVendorNetAmountMinor)}
            </TableCell>
            <TableCell className="text-xs text-gray-400">
              {formatDate(report.lastGeneratedAt)}
            </TableCell>
            <TableCell>
              <div className="flex gap-1 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  title="View line items"
                  onClick={() => {
                    setSelectedReport(report);
                    setShowItems(true);
                  }}
                >
                  <Eye className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  title={`Send email to ${report.supplierName} & vendor`}
                  disabled={sending}
                  onClick={() => onSend(group.vendorId, report.supplierId)}
                >
                  {sending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Send className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}

      {/* Line-items dialog */}
      {selectedReport && (
        <LineItemsDialog
          open={showItems}
          onClose={() => setShowItems(false)}
          summary={selectedReport}
        />
      )}
    </>
  );
}

// ── line items dialog ─────────────────────────────────────────────────────────

function LineItemsDialog({
  open,
  onClose,
  summary,
}: {
  open: boolean;
  onClose: () => void;
  summary: SupplierReportSummary;
}) {
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["supplier-report-items", summary.vendorId, summary.supplierId, page],
    queryFn: () =>
      supplierService.getReportItems(summary.vendorId, summary.supplierId, page, 20),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {summary.vendorName} × {summary.supplierName} — Sale Details
          </DialogTitle>
          <p className="text-sm text-gray-500">
            {summary.totalItems} total items · Last generated: {formatDate(summary.lastGeneratedAt)}
          </p>
        </DialogHeader>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {summary.byOrderType.map((t) => (
            <div
              key={t.orderType}
              className="flex items-center gap-2 border rounded-lg px-3 py-1.5 bg-gray-50 text-sm"
            >
              <Badge className={ORDER_TYPE_COLORS[t.orderType]} variant="outline">
                {ORDER_TYPE_LABELS[t.orderType]}
              </Badge>
              <span className="font-medium">{t.count}</span>
              <span className="text-gray-400 text-xs">
                net {formatMinor(t.vendorNetAmountMinor)}
              </span>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-eagle-green" />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Listing</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Vendor Net</TableHead>
                  <TableHead>Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.content.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-400 py-8">
                      No items in this report yet. Generate the report first.
                    </TableCell>
                  </TableRow>
                )}
                {data?.content.map((item: SupplierReportItem) => (
                  <TableRow key={item.itemId}>
                    <TableCell className="font-mono text-xs">{item.orderNumber}</TableCell>
                    <TableCell>
                      <Badge
                        className={ORDER_TYPE_COLORS[item.orderType]}
                        variant="outline"
                      >
                        {ORDER_TYPE_LABELS[item.orderType]}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">
                      {item.listingName}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatMinor(item.grossAmountMinor, item.currency)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-green-700">
                      {formatMinor(item.vendorNetAmountMinor, item.currency)}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {formatDate(item.completedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
                <span>
                  Page {data.number + 1} of {data.totalPages} · {data.totalElements} items
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= data.totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function AdminSupplierReports() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sendingPair, setSendingPair] = useState<string | null>(null);

  const { data: summaries = [], isLoading, isError } = useQuery({
    queryKey: ["admin", "supplier-reports"],
    queryFn: () => supplierService.listAllReports(),
  });

  const generateAllMutation = useMutation({
    mutationFn: () => supplierService.generateAllReports(),
    onSuccess: (result) => {
      toast({
        title: "Reports Generated",
        description: `${result.newItemsAdded} new items added across ${result.supplierPairsProcessed} vendor–supplier pairs.`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "supplier-reports"] });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate reports.",
        variant: "destructive",
      });
    },
  });

  const sendAllMutation = useMutation({
    mutationFn: async () => {
      const results = [];
      for (const s of summaries) {
        results.push(
          await supplierService.sendReport(s.vendorId, s.supplierId)
        );
      }
      return results.length;
    },
    onSuccess: (count) => {
      toast({
        title: "Emails Sent",
        description: `Reports emailed for ${count} vendor–supplier pair${count !== 1 ? "s" : ""}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Sending Emails",
        description: error.message || "Some emails may not have been sent.",
        variant: "destructive",
      });
    },
  });

  const handleSendPair = async (vendorId: number, supplierId: number) => {
    const key = `${vendorId}-${supplierId}`;
    setSendingPair(key);
    try {
      await supplierService.sendReport(vendorId, supplierId);
      toast({
        title: "Report Sent",
        description: "Emails dispatched to vendor and supplier.",
      });
    } catch (err: any) {
      toast({
        title: "Send Failed",
        description: err.message || "Failed to send report.",
        variant: "destructive",
      });
    } finally {
      setSendingPair(null);
    }
  };

  // group summaries by vendor
  const vendorGroups: VendorGroup[] = Object.values(
    summaries.reduce<Record<number, VendorGroup>>((acc, r) => {
      if (!acc[r.vendorId]) {
        acc[r.vendorId] = { vendorId: r.vendorId, vendorName: r.vendorName, reports: [] };
      }
      acc[r.vendorId].reports.push(r);
      return acc;
    }, {})
  );

  const isGenerating = generateAllMutation.isPending;
  const isSendingAll = sendAllMutation.isPending;

  return (
    <AdminLayout
      title="Supplier Sale Reports"
      description="Incremental sales reports for vendor–supplier partnerships"
    >
      {/* Page actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <Button
          variant="ghost"
          className="gap-2 text-eagle-green hover:text-eagle-green"
          onClick={() => navigate("/admin/partnership-applications")}
        >
          <ArrowLeft className="w-4 h-4" />
          Partnership Applications
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => generateAllMutation.mutate()}
            disabled={isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Generate All Reports
          </Button>
          <Button
            onClick={() => sendAllMutation.mutate()}
            disabled={isSendingAll || summaries.length === 0}
            className="bg-eagle-green hover:bg-viridian-green text-white gap-2"
          >
            {isSendingAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Mail className="w-4 h-4" />
            )}
            Send All Emails
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-eagle-green" />
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            <PackageOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="font-medium">Could not load reports</p>
            <p className="text-sm mt-1">Generate reports first to see data here.</p>
          </CardContent>
        </Card>
      ) : summaries.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-gray-500">
            <PackageOpen className="w-14 h-14 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-semibold">No reports generated yet</p>
            <p className="text-sm mt-1 mb-6 text-gray-400">
              Click <strong>Generate All Reports</strong> to build the initial report from all completed orders.
            </p>
            <Button
              onClick={() => generateAllMutation.mutate()}
              disabled={isGenerating}
              className="bg-eagle-green hover:bg-viridian-green text-white gap-2"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Generate Now
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Overall stats + order-type breakdown */}
          <OverallStats summaries={summaries} />

          {/* Vendor table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-eagle-green" />
                Vendors with Supplier Reports
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-center">Suppliers</TableHead>
                    <TableHead className="text-center">Total Sales</TableHead>
                    <TableHead className="text-right">Vendor Net</TableHead>
                    <TableHead>Last Generated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendorGroups.map((group) => (
                    <VendorRow
                      key={group.vendorId}
                      group={group}
                      onSend={handleSendPair}
                      sending={
                        group.reports.some(
                          (r) => sendingPair === `${group.vendorId}-${r.supplierId}`
                        )
                      }
                    />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </AdminLayout>
  );
}
