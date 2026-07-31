import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Wallet,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import { adminService, CashbackAccrualDto } from '@/services/adminService';
import { formatPrice, fromMinorUnits } from '@/lib/currency';

const PAGE_SIZE = 20;

/**
 * Read-only tracker of who took part in a cashback campaign. An order books a
 * PENDING accrual at checkout; delivery turns it into APPROVED wallet credit,
 * and a cancelled or fully credit-paid order leaves it REJECTED. Nothing here
 * to review — accrual is automatic — only to audit.
 */
export default function CashbackAccrualsTab() {
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [page, setPage] = useState(0);

  const { data: campaigns = [] } = useQuery({
    queryKey: ['admin', 'cashback'],
    queryFn: () => adminService.getCashbackCampaigns(),
  });

  const settingId = campaignFilter === 'all' ? undefined : Number(campaignFilter);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'cashback', 'accruals', settingId, page],
    queryFn: () => adminService.getCashbackAccruals(settingId, page, PAGE_SIZE),
  });

  const accruals = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  const amount = (a: CashbackAccrualDto) =>
    a.amountMinor != null && a.currencyCode
      ? formatPrice(fromMinorUnits(a.amountMinor, a.currencyCode), a.currencyCode)
      : '—';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select
          value={campaignFilter}
          onValueChange={(v) => {
            setCampaignFilter(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="All campaigns" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All campaigns</SelectItem>
            {campaigns.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {data && (
          <span className="text-sm text-muted-foreground">
            {data.totalElements} participation{data.totalElements === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary-blue" />
        </div>
      ) : accruals.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium text-muted-foreground">
              No cashback earned yet
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Customers appear here as their orders qualify for a campaign.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium">Customer</th>
                  <th className="text-left py-3 px-4 font-medium">Campaign</th>
                  <th className="text-right py-3 px-4 font-medium">Cashback</th>
                  <th className="text-right py-3 px-4 font-medium">Earned on</th>
                  <th className="text-left py-3 px-4 font-medium">Order</th>
                  <th className="text-left py-3 px-4 font-medium">Accrued</th>
                  <th className="text-left py-3 px-4 font-medium">Released</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {accruals.map((a) => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="py-3 px-4">
                      <div className="font-medium">{a.customerName || '—'}</div>
                      <div className="text-xs text-muted-foreground">{a.customerEmail}</div>
                    </td>
                    <td className="py-3 px-4">{a.campaignName || '—'}</td>
                    <td className="py-3 px-4 text-right font-medium">{amount(a)}</td>
                    <td className="py-3 px-4 text-right">
                      {a.basisMinor != null && a.currencyCode
                        ? formatPrice(
                            fromMinorUnits(a.basisMinor, a.currencyCode),
                            a.currencyCode
                          )
                        : '—'}
                      <div className="text-xs text-muted-foreground">
                        {a.basis === 'ORDER_TOTAL' ? 'order total' : 'subtotal'}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">{a.orderNumber || '—'}</td>
                    <td className="py-3 px-4">{formatDate(a.accruedAt)}</td>
                    <td className="py-3 px-4">{formatDate(a.releasedAt)}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={a.status} reason={a.voidReason} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string | null): string {
  return iso
    ? new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';
}

/** PENDING = promised, APPROVED = in the wallet, REJECTED = voided (reason on hover). */
function StatusBadge({ status, reason }: { status: string | null; reason: string | null }) {
  if (status === 'APPROVED') {
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-800">
        <CheckCircle className="inline h-3 w-3 mr-1" />
        In wallet
      </Badge>
    );
  }
  if (status === 'REJECTED') {
    return (
      <Badge variant="secondary" className="bg-red-100 text-red-800" title={reason || ''}>
        <XCircle className="inline h-3 w-3 mr-1" />
        Voided
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
      <Clock className="inline h-3 w-3 mr-1" />
      Pending
    </Badge>
  );
}
