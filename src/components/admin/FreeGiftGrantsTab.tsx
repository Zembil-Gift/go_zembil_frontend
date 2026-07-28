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
import { Gift, Loader2, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { adminService } from '@/services/adminService';
import { formatPrice, fromMinorUnits } from '@/lib/currency';

const PAGE_SIZE = 20;

/**
 * Read-only report of free gifts handed to customers. Gifts are granted
 * automatically at checkout, so grants arrive already approved — there is
 * nothing here to review, only to audit.
 */
export default function FreeGiftGrantsTab() {
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [page, setPage] = useState(0);

  const { data: tiers = [] } = useQuery({
    queryKey: ['admin', 'free-gift'],
    queryFn: () => adminService.getFreeGiftTiers(),
  });

  const settingId = campaignFilter === 'all' ? undefined : Number(campaignFilter);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'free-gift', 'grants', settingId, page],
    queryFn: () => adminService.getFreeGiftGrants(settingId, page, PAGE_SIZE),
  });

  const grants = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

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
            {tiers.map((t) => (
              <SelectItem key={t.id} value={String(t.id)}>
                {t.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {data && (
          <span className="text-sm text-muted-foreground">
            {data.totalElements} gift{data.totalElements === 1 ? '' : 's'} granted
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary-blue" />
        </div>
      ) : grants.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Gift className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium text-muted-foreground">No gifts granted yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Gifts appear here as customers pass a campaign's spend threshold.
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
                  <th className="text-left py-3 px-4 font-medium">Gift</th>
                  <th className="text-right py-3 px-4 font-medium">Qualifying spend</th>
                  <th className="text-left py-3 px-4 font-medium">Order</th>
                  <th className="text-left py-3 px-4 font-medium">Granted</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {grants.map((g) => (
                  <tr key={g.id} className="border-b last:border-0">
                    <td className="py-3 px-4">
                      <div className="font-medium">{g.customerName || '—'}</div>
                      <div className="text-xs text-muted-foreground">{g.customerEmail}</div>
                    </td>
                    <td className="py-3 px-4">{g.campaignName || '—'}</td>
                    <td className="py-3 px-4">{g.giftProductName || '—'}</td>
                    <td className="py-3 px-4 text-right">
                      {g.qualifyingSubtotalMinor != null && g.currencyCode
                        ? formatPrice(
                            fromMinorUnits(g.qualifyingSubtotalMinor, g.currencyCode),
                            g.currencyCode
                          )
                        : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">{g.orderNumber || '—'}</td>
                    <td className="py-3 px-4">
                      {g.grantedAt
                        ? new Date(g.grantedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <CheckCircle className="inline h-3 w-3 mr-1" />
                        {g.status}
                      </Badge>
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
