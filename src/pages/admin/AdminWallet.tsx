import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { useToast } from '@/hooks/use-toast';
import {
  Wallet,
  Gift,
  ShoppingBag,
  Ban,
  RotateCcw,
  Pencil,
  Loader2,
  AlertTriangle,
  Clock,
  Users,
  Table as TableIcon,
  LineChart as LineChartIcon,
} from 'lucide-react';
import {
  adminService,
  UpdateWalletPolicyRequest,
  WalletStatsDto,
} from '@/services/adminService';
import { formatCurrency } from '@/lib/currency';

/**
 * Series colours validated for colour-vision deficiency at all pairs
 * (worst pair ΔE 16.8 deutan / 28.5 normal vision on a light surface).
 * Two are brand tokens; the violet replaces eagle-green, which sits too dark
 * and too close to grey to carry series identity.
 */
const SERIES = {
  granted: { label: 'Granted', color: '#4A3AA7' },
  spent: { label: 'Spent', color: '#11A0A0' },
  expired: { label: 'Expired', color: '#E94E1B' },
} as const;

const chartConfig = {
  granted: { label: SERIES.granted.label, color: SERIES.granted.color },
  spent: { label: SERIES.spent.label, color: SERIES.spent.color },
  expired: { label: SERIES.expired.label, color: SERIES.expired.color },
} satisfies ChartConfig;

type RangePreset = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM';

const RANGE_LABELS: Record<RangePreset, string> = {
  DAY: 'Today',
  WEEK: 'This week',
  MONTH: 'This month',
  YEAR: 'This year',
  CUSTOM: 'Custom',
};

/** Presets are rolling windows ending now, so the newest data is always in view. */
function presetRange(preset: Exclude<RangePreset, 'CUSTOM'>): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date(to);
  if (preset === 'DAY') from.setDate(from.getDate() - 1);
  if (preset === 'WEEK') from.setDate(from.getDate() - 7);
  if (preset === 'MONTH') from.setDate(from.getDate() - 30);
  if (preset === 'YEAR') from.setFullYear(from.getFullYear() - 1);
  return { from, to };
}

function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function minor(amount: number | null | undefined, currency: string | null): string {
  return formatCurrency((amount ?? 0) / 100, currency || 'ETB');
}

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  loading,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ElementType;
  accent?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            {loading ? (
              <Skeleton className="mt-2 h-7 w-24" />
            ) : (
              <p className="mt-1 text-2xl font-semibold text-eagle-green tabular-nums break-words">
                {value}
              </p>
            )}
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </div>
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted"
            style={accent ? { color: accent } : undefined}
            aria-hidden="true"
          >
            <Icon className="h-4 w-4" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminWallet() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [preset, setPreset] = useState<RangePreset>('MONTH');
  const [customFrom, setCustomFrom] = useState(() =>
    toDateInput(presetRange('MONTH').from)
  );
  const [customTo, setCustomTo] = useState(() => toDateInput(new Date()));
  const [showTable, setShowTable] = useState(false);

  const range = useMemo(() => {
    if (preset !== 'CUSTOM') return presetRange(preset);
    const from = new Date(`${customFrom}T00:00:00`);
    // Inclusive end date: the backend window is exclusive, so cover the whole day.
    const to = new Date(`${customTo}T00:00:00`);
    to.setDate(to.getDate() + 1);
    return { from, to };
  }, [preset, customFrom, customTo]);

  const rangeValid = range.from < range.to && !isNaN(range.from.getTime()) && !isNaN(range.to.getTime());

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'wallet-stats', range.from.toISOString(), range.to.toISOString()],
    queryFn: () =>
      adminService.getWalletStats({
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      }),
    enabled: rangeValid,
  });

  const { data: policy, isLoading: policyLoading } = useQuery({
    queryKey: ['admin', 'wallet-policy'],
    queryFn: () => adminService.getWalletPolicy(),
  });

  const { data: currencies = [] } = useQuery({
    queryKey: ['admin', 'currencies', 'all'],
    queryFn: () => adminService.getAllCurrencies(),
  });

  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  // `active` is deliberately absent: the switch above owns on/off, and the
  // backend leaves it untouched when the field is omitted.
  const [policyForm, setPolicyForm] = useState<UpdateWalletPolicyRequest>({
    walletCurrencyCode: '',
    maxOrderCoveragePercentage: 50,
    description: '',
  });

  const invalidateWallet = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'wallet-policy'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'wallet-stats'] });
    queryClient.invalidateQueries({ queryKey: ['wallet'] });
  };

  const onPolicyError = (error: any) => {
    toast({
      title: 'Error',
      description: error.message || 'Failed to update the wallet policy',
      variant: 'destructive',
    });
  };

  const updateSettings = useMutation({
    mutationFn: (data: UpdateWalletPolicyRequest) => adminService.updateWalletPolicy(data),
    onSuccess: (updated) => {
      invalidateWallet();
      toast({
        title: 'Credit settings updated',
        description: `Credits may now cover up to ${updated.maxOrderCoveragePercentage}% of an order, in ${updated.walletCurrencyCode}.`,
      });
      setPolicyDialogOpen(false);
    },
    onError: onPolicyError,
  });

  /**
   * The on/off switch resends the stored currency and cap because the endpoint
   * takes the whole policy; only `active` changes.
   */
  const toggleWallet = useMutation({
    mutationFn: (active: boolean) =>
      adminService.updateWalletPolicy({
        walletCurrencyCode: policy?.walletCurrencyCode ?? '',
        maxOrderCoveragePercentage: policy?.maxOrderCoveragePercentage ?? 0,
        description: policy?.description ?? undefined,
        active,
      }),
    onSuccess: (updated) => {
      invalidateWallet();
      toast({
        title: updated.active ? 'Reward wallet switched on' : 'Reward wallet switched off',
        description: updated.active
          ? 'Credits now apply to orders in ' + updated.walletCurrencyCode + '.'
          : 'Credits are no longer applied to any order. Existing balances are untouched.',
      });
    },
    onError: onPolicyError,
  });

  const openPolicyDialog = () => {
    setPolicyForm({
      walletCurrencyCode: policy?.walletCurrencyCode || '',
      maxOrderCoveragePercentage: policy?.maxOrderCoveragePercentage ?? 50,
      description: policy?.description || '',
    });
    setPolicyDialogOpen(true);
  };

  const currency = stats?.currencyCode ?? policy?.walletCurrencyCode ?? null;

  const chartData = useMemo(
    () =>
      (stats?.series ?? []).map((point) => ({
        bucket: point.bucketStart,
        granted: point.grantedMinor / 100,
        spent: point.spentMinor / 100,
        expired: point.expiredMinor / 100,
        refunded: point.refundedMinor / 100,
      })),
    [stats]
  );

  const bucketLabel = (iso: string) => {
    const d = new Date(iso);
    if (stats?.bucket === 'HOUR') {
      return d.toLocaleTimeString(undefined, { hour: 'numeric' });
    }
    if (stats?.bucket === 'YEAR') return String(d.getFullYear());
    if (stats?.bucket === 'MONTH') {
      return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <AdminLayout
      title="Reward Wallet"
      description="Configure how much of an order reward credits may cover, and track credits issued, used and expired."
    >
      <div className="space-y-6">
        {/* ── On/off ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-viridian-green" />
              Reward wallet
            </CardTitle>
            <CardDescription>
              Reward credits are promotional only — they never hold real money and never pay out as
              cash. The customer always covers the remainder of an order.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {policyLoading ? (
              <Skeleton className="h-14 w-full" />
            ) : (
              <div className="flex items-start justify-between gap-4 rounded-md border p-4">
                <div className="min-w-0">
                  <Label htmlFor="wallet-active" className="text-sm font-medium">
                    {policy?.active ? 'Wallet is on' : 'Wallet is off'}
                  </Label>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {policy?.active
                      ? 'Credits are applied at checkout, up to the cap below.'
                      : 'Credits are not applied to any order and none can be issued. Existing balances are kept.'}
                  </p>
                  {!policy?.configured && (
                    <p className="mt-2 flex items-start gap-1.5 text-sm text-amber-700">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      Set a currency and a coverage cap below before switching the wallet on.
                    </p>
                  )}
                </div>
                <Switch
                  id="wallet-active"
                  checked={!!policy?.active}
                  // Nothing to switch on until a currency and cap exist.
                  disabled={!policy?.configured || toggleWallet.isPending}
                  onCheckedChange={(checked) => toggleWallet.mutate(checked)}
                  aria-label="Enable the reward wallet"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Credit settings ── */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Credit settings</CardTitle>
              <CardDescription>
                Which currency credits are held in, and the most of an order they may cover.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={openPolicyDialog} disabled={policyLoading}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </CardHeader>
          <CardContent>
            {policyLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : policy?.configured ? (
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Max order coverage
                  </p>
                  <p className="mt-1 text-3xl font-semibold text-eagle-green">
                    {(policy.maxOrderCoveragePercentage ?? 0).toFixed(1)}%
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    On a 1,000 order, credits can pay at most{' '}
                    {(((policy.maxOrderCoveragePercentage ?? 0) / 100) * 1000).toFixed(0)}.
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Currency</p>
                  <p className="mt-1 text-3xl font-semibold text-eagle-green">
                    {policy.walletCurrencyCode}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Credits apply only to orders placed in this currency.
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
                  <div className="mt-2">
                    <Badge variant={policy.active ? 'default' : 'secondary'}>
                      {policy.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {policy.updatedBy && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Last updated by {policy.updatedBy}
                      {policy.updatedAt
                        ? ` on ${new Date(policy.updatedAt).toLocaleDateString()}`
                        : ''}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-amber-900">Not configured yet</p>
                  <p className="mt-1 text-sm text-amber-800">
                    Set a currency and a coverage cap to make the wallet usable. Until then no
                    credits can be issued or applied.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Range filter ── */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-1 rounded-md border p-1">
            {(Object.keys(RANGE_LABELS) as RangePreset[]).map((key) => (
              <Button
                key={key}
                size="sm"
                variant={preset === key ? 'default' : 'ghost'}
                onClick={() => setPreset(key)}
              >
                {RANGE_LABELS[key]}
              </Button>
            ))}
          </div>

          {preset === 'CUSTOM' && (
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <Label htmlFor="wallet-from" className="text-xs">
                  From
                </Label>
                <Input
                  id="wallet-from"
                  type="date"
                  value={customFrom}
                  max={customTo}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="h-9 w-40"
                />
              </div>
              <div>
                <Label htmlFor="wallet-to" className="text-xs">
                  To
                </Label>
                <Input
                  id="wallet-to"
                  type="date"
                  value={customTo}
                  min={customFrom}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-9 w-40"
                />
              </div>
            </div>
          )}

          {!rangeValid && (
            <p className="text-sm text-destructive">Pick a start date before the end date.</p>
          )}
        </div>

        {/* ── Flow stats (windowed) ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Credits granted"
            value={minor(stats?.grantedMinor, currency)}
            hint={`${stats?.grantCount ?? 0} grants in range`}
            icon={Gift}
            accent={SERIES.granted.color}
            loading={statsLoading}
          />
          <StatTile
            label="Credits used"
            value={minor(stats?.spentMinor, currency)}
            hint={`${stats?.ordersUsingCredits ?? 0} orders · avg ${minor(
              stats?.avgCreditPerOrderMinor,
              currency
            )}`}
            icon={ShoppingBag}
            accent={SERIES.spent.color}
            loading={statsLoading}
          />
          <StatTile
            label="Credits expired"
            value={minor(stats?.expiredMinor, currency)}
            hint={
              stats?.expiryRate != null
                ? `${stats.expiryRate.toFixed(1)}% of credits issued lapsed unused`
                : 'Nothing issued in range'
            }
            icon={Ban}
            accent={SERIES.expired.color}
            loading={statsLoading}
          />
          <StatTile
            label="Credits refunded"
            value={minor(stats?.refundedMinor, currency)}
            hint={`${stats?.refundCount ?? 0} returns from cancelled or refunded orders`}
            icon={RotateCcw}
            loading={statsLoading}
          />
        </div>

        {/* ── Position stats (as of now) ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Outstanding credits"
            value={minor(stats?.outstandingMinor, currency)}
            hint="Unspent across all wallets, right now"
            icon={Wallet}
            loading={statsLoading}
          />
          <StatTile
            label="Expiring in 30 days"
            value={minor(stats?.expiringNext30DaysMinor, currency)}
            hint="Will lapse unless spent"
            icon={Clock}
            loading={statsLoading}
          />
          <StatTile
            label="Redemption rate"
            value={stats?.redemptionRate != null ? `${stats.redemptionRate.toFixed(1)}%` : '—'}
            hint="Share of issued credits actually spent"
            icon={ShoppingBag}
            loading={statsLoading}
          />
          <StatTile
            label="Wallets with credit"
            value={`${stats?.fundedWallets ?? 0}`}
            hint={`of ${stats?.totalWallets ?? 0} wallets · ${
              stats?.activeWallets ?? 0
            } active in range`}
            icon={Users}
            loading={statsLoading}
          />
        </div>

        {/* ── Movement ── */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Credit movement</CardTitle>
              <CardDescription>
                Granted, used and expired per{' '}
                {(stats?.bucket ?? 'day').toLowerCase()}
                {currency ? ` · amounts in ${currency}` : ''}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowTable((s) => !s)}>
              {showTable ? (
                <>
                  <LineChartIcon className="mr-2 h-4 w-4" />
                  Chart
                </>
              ) : (
                <>
                  <TableIcon className="mr-2 h-4 w-4" />
                  Table
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : chartData.length === 0 ? (
              <div className="flex h-[280px] flex-col items-center justify-center text-center">
                <Wallet className="h-8 w-8 text-muted-foreground/40" />
                <p className="mt-2 text-sm font-medium text-eagle-green">
                  No credit activity in this range
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pick a wider range, or issue credits to see movement here.
                </p>
              </div>
            ) : showTable ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">
                    Reward credit movement per {(stats?.bucket ?? 'day').toLowerCase()}
                  </caption>
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th scope="col" className="py-2 pr-4 font-medium">Period</th>
                      <th scope="col" className="py-2 pr-4 text-right font-medium">Granted</th>
                      <th scope="col" className="py-2 pr-4 text-right font-medium">Spent</th>
                      <th scope="col" className="py-2 pr-4 text-right font-medium">Refunded</th>
                      <th scope="col" className="py-2 text-right font-medium">Expired</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((row) => (
                      <tr key={row.bucket} className="border-b last:border-b-0">
                        <th scope="row" className="py-2 pr-4 text-left font-normal">
                          {bucketLabel(row.bucket)}
                        </th>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {formatCurrency(row.granted, currency || 'ETB')}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {formatCurrency(row.spent, currency || 'ETB')}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {formatCurrency(row.refunded, currency || 'ETB')}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {formatCurrency(row.expired, currency || 'ETB')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="bucket"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={24}
                    tickFormatter={bucketLabel}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={64}
                    tickFormatter={(value: number) => value.toLocaleString()}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(value) => bucketLabel(String(value))}
                        formatter={(value, name) => [
                          `${formatCurrency(Number(value), currency || 'ETB')} `,
                          chartConfig[name as keyof typeof chartConfig]?.label ?? name,
                        ]}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  {(['granted', 'spent', 'expired'] as const).map((key) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={key}
                      stroke={SERIES[key].color}
                      strokeWidth={2}
                      dot={{ r: 3, strokeWidth: 0, fill: SERIES[key].color }}
                      activeDot={{ r: 5, strokeWidth: 2, stroke: '#ffffff' }}
                    />
                  ))}
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Policy dialog ── */}
      <Dialog open={policyDialogOpen} onOpenChange={setPolicyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Credit Settings</DialogTitle>
            <DialogDescription>
              Sets which currency credits are held in and how much of an order they may cover. The
              customer always pays the rest, so an order is never fully funded by credits. Turning
              the wallet on or off is a separate switch.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="walletCurrency">Credit currency</Label>
              <Select
                value={policyForm.walletCurrencyCode}
                onValueChange={(value) =>
                  setPolicyForm((f) => ({ ...f, walletCurrencyCode: value }))
                }
              >
                <SelectTrigger id="walletCurrency" className="mt-1">
                  <SelectValue placeholder="Select a currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Credits only apply to orders placed in this currency. Changing it after credits
                have been issued leaves existing balances denominated in the old currency.
              </p>
            </div>

            <div>
              <Label htmlFor="maxCoverage">Maximum order coverage (%)</Label>
              <Input
                id="maxCoverage"
                type="number"
                min={0}
                max={100}
                step={0.1}
                className="mt-1"
                value={policyForm.maxOrderCoveragePercentage}
                onChange={(e) =>
                  setPolicyForm((f) => ({
                    ...f,
                    maxOrderCoveragePercentage: Number(e.target.value),
                  }))
                }
              />
              <p className="mt-1 text-xs text-muted-foreground">
                At {policyForm.maxOrderCoveragePercentage || 0}%, a 1,000 order can have at most{' '}
                {(((policyForm.maxOrderCoveragePercentage || 0) / 100) * 1000).toFixed(0)} paid
                from credits.
              </p>
            </div>

            <div>
              <Label htmlFor="walletDescription">Description</Label>
              <Textarea
                id="walletDescription"
                className="mt-1"
                rows={2}
                value={policyForm.description ?? ''}
                onChange={(e) => setPolicyForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Why this cap was chosen"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPolicyDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => updateSettings.mutate(policyForm)}
              disabled={
                updateSettings.isPending ||
                !policyForm.walletCurrencyCode ||
                policyForm.maxOrderCoveragePercentage < 0 ||
                policyForm.maxOrderCoveragePercentage > 100
              }
            >
              {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
