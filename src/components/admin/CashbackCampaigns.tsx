import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Wallet,
  Pencil,
  Trash2,
  Plus,
  Loader2,
  Infinity as InfinityIcon,
  ChevronLeft,
  ChevronRight,
  Check,
  ImageIcon,
} from 'lucide-react';
import {
  adminService,
  CashbackBasis,
  CashbackCampaignDto,
  SaveCashbackCampaignRequest,
} from '@/services/adminService';
import { formatPrice, toMinorUnits, fromMinorUnits } from '@/lib/currency';

/** Form state — amounts in major units for editing, converted on save. */
interface CampaignForm {
  code: string;
  description: string;
  enabled: boolean;
  percent: number;
  basis: CashbackBasis;
  minOrderSubtotal: number;
  maxCashback: string;
  startsAt: string;
  endsAt: string;
  perCustomerLimit: string;
  creditExpiryDays: string;
}

const EMPTY_FORM: CampaignForm = {
  code: '',
  description: '',
  enabled: false,
  percent: 0,
  basis: 'SUBTOTAL',
  minOrderSubtotal: 0,
  maxCashback: '',
  startsAt: '',
  endsAt: '',
  perCustomerLimit: '',
  creditExpiryDays: '',
};

const STEPS = ['Campaign', 'Percent', 'Qualifying', 'Limits'] as const;

/** What the percent is taken from — the admin's call, per campaign. */
const BASIS_OPTIONS: { value: CashbackBasis; label: string; hint: string }[] = [
  {
    value: 'SUBTOTAL',
    label: 'Product subtotal',
    hint: 'Products only — excludes delivery, platform fee and service fee.',
  },
  {
    value: 'ORDER_TOTAL',
    label: 'Full order total',
    hint: 'Everything the customer paid, delivery and fees included.',
  },
];

const basisLabel = (basis: CashbackBasis) =>
  BASIS_OPTIONS.find((o) => o.value === basis)?.label ?? basis;

/** ISO instant → value for <input type="datetime-local"> (local time, no seconds). */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const toIso = (local: string): string | null => (local ? new Date(local).toISOString() : null);

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;

export default function CashbackCampaigns() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CampaignForm>(EMPTY_FORM);
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  /** Images already on the campaign being edited — shown so "replace" is not a surprise. */
  const [editingImageUrls, setEditingImageUrls] = useState<string[]>([]);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['admin', 'cashback'],
    queryFn: () => adminService.getCashbackCampaigns(),
  });

  const { data: currencies = [] } = useQuery({
    queryKey: ['admin', 'active-currencies'],
    queryFn: () => adminService.getActiveCurrencies(),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'cashback'] });
    // The storefront home banner reads the public endpoint under this key.
    queryClient.invalidateQueries({ queryKey: ['cashback'] });
  };

  const onError = (error: any) =>
    toast({
      title: 'Error',
      description: error?.message || 'Failed to save the campaign',
      variant: 'destructive',
    });

  const saveMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number | null; data: SaveCashbackCampaignRequest }) => {
      const saved =
        id === null
          ? await adminService.createCashbackCampaign(data)
          : await adminService.updateCashbackCampaign(id, data);
      // The image endpoint is keyed by id, so it can only run once the row exists.
      if (pendingImages.length > 0) {
        try {
          return await adminService.uploadCashbackImages(saved.id, pendingImages);
        } catch (e: any) {
          toast({
            title: 'Campaign saved, images failed',
            description: e?.message || 'The banner images could not be uploaded.',
            variant: 'destructive',
          });
        }
      }
      return saved;
    },
    onSuccess: (saved) => {
      invalidate();
      toast({ title: 'Campaign saved', description: `"${saved.code}" was saved.` });
      setDialogOpen(false);
    },
    onError,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminService.deleteCashbackCampaign(id),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Campaign deleted' });
    },
    onError,
  });

  const defaultCurrency = currencies.find((c) => c.isDefault)?.code ?? 'ETB';

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setPendingImages([]);
    setEditingImageUrls([]);
    setStep(0);
    setDialogOpen(true);
  };

  const openEdit = (campaign: CashbackCampaignDto) => {
    setEditingId(campaign.id);
    setForm({
      code: campaign.code,
      description: campaign.description ?? '',
      enabled: campaign.enabled,
      percent: campaign.percent,
      basis: campaign.basis,
      minOrderSubtotal: fromMinorUnits(campaign.minOrderSubtotalMinor, defaultCurrency),
      maxCashback:
        campaign.maxCashbackMinor === null
          ? ''
          : String(fromMinorUnits(campaign.maxCashbackMinor, defaultCurrency)),
      startsAt: toLocalInput(campaign.startsAt),
      endsAt: toLocalInput(campaign.endsAt),
      perCustomerLimit: campaign.perCustomerLimit === null ? '' : String(campaign.perCustomerLimit),
      creditExpiryDays: campaign.creditExpiryDays === null ? '' : String(campaign.creditExpiryDays),
    });
    setPendingImages([]);
    setEditingImageUrls(campaign.imageUrls ?? []);
    setStep(0);
    setDialogOpen(true);
  };

  const handleSave = () => {
    saveMutation.mutate({
      id: editingId,
      data: {
        code: form.code.trim(),
        description: form.description.trim() || null,
        enabled: form.enabled,
        percent: form.percent,
        basis: form.basis,
        minOrderSubtotalMinor: toMinorUnits(form.minOrderSubtotal, defaultCurrency),
        startsAt: toIso(form.startsAt),
        endsAt: toIso(form.endsAt),
        // Blank means "no limit" — send null so the server clears any cap.
        maxCashbackMinor:
          form.maxCashback === '' ? null : toMinorUnits(Number(form.maxCashback), defaultCurrency),
        perCustomerLimit: form.perCustomerLimit === '' ? null : Number(form.perCustomerLimit),
        creditExpiryDays: form.creditExpiryDays === '' ? null : Number(form.creditExpiryDays),
      },
    });
  };

  // Per-step gating, so the wizard can't reach a state the server would reject.
  const stepValid = (index: number): boolean => {
    switch (index) {
      case 0:
        return form.code.trim().length > 0;
      case 1:
        // A 0% campaign can be saved but not enabled — same rule as the server.
        return form.percent >= 0 && form.percent <= 100 && (!form.enabled || form.percent > 0);
      case 2:
        return form.minOrderSubtotal >= 0;
      default:
        return true;
    }
  };

  const canSave = [0, 1, 2].every(stepValid);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={openCreate} className="bg-primary-blue text-white hover:bg-primary-blue/90">
          <Plus className="mr-2 h-4 w-4" />
          New Cashback Campaign
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary-blue" />
          <span className="ml-3 text-muted-foreground">Loading campaigns...</span>
        </div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium text-muted-foreground">No cashback campaigns yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create one to give customers a percent of every purchase back as wallet credit.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="relative overflow-hidden">
              <div
                className={`absolute top-0 left-0 right-0 h-1 ${campaign.activeNow ? 'bg-green-500' : 'bg-gray-300'}`}
              />
              {campaign.imageUrl && (
                <img src={campaign.imageUrl} alt={campaign.code} className="w-full h-28 object-cover" />
              )}
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-amber-500/10 shrink-0">
                      <Wallet className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{campaign.code}</CardTitle>
                      <Badge
                        variant="secondary"
                        className={`mt-1 text-xs ${
                          campaign.activeNow ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {campaign.activeNow ? 'Live' : campaign.enabled ? 'Enabled — not live' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(campaign)} title="Edit campaign">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (window.confirm(`Delete the campaign "${campaign.code}"? This cannot be undone.`)) {
                          deleteMutation.mutate(campaign.id);
                        }
                      }}
                      title="Delete campaign"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 text-center py-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-amber-600">{campaign.percent}%</div>
                    <div className="text-xs text-muted-foreground mt-1">Back to wallet</div>
                  </div>
                  <div className="flex-1 text-center py-4 bg-gray-50 rounded-lg">
                    <div className="text-lg font-semibold">
                      {formatPrice(
                        fromMinorUnits(campaign.minOrderSubtotalMinor, defaultCurrency),
                        defaultCurrency
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Spend to qualify</div>
                  </div>
                </div>

                <div className="rounded-lg border p-2 text-sm">
                  <p className="text-xs text-muted-foreground">Percent taken from</p>
                  <p className="font-medium">{basisLabel(campaign.basis)}</p>
                  <p className="text-xs text-muted-foreground">Real money paid only</p>
                </div>

                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg border p-2">
                    <p className="text-xs text-muted-foreground">Max per order</p>
                    <p className="font-medium flex items-center gap-1">
                      {campaign.maxCashbackMinor === null ? (
                        <>
                          <InfinityIcon className="h-4 w-4" /> None
                        </>
                      ) : (
                        formatPrice(
                          fromMinorUnits(campaign.maxCashbackMinor, defaultCurrency),
                          defaultCurrency
                        )
                      )}
                    </p>
                  </div>
                  <div className="rounded-lg border p-2">
                    <p className="text-xs text-muted-foreground">Per customer</p>
                    <p className="font-medium flex items-center gap-1">
                      {campaign.perCustomerLimit === null ? (
                        <>
                          <InfinityIcon className="h-4 w-4" /> Unlimited
                        </>
                      ) : (
                        `${campaign.perCustomerLimit}×`
                      )}
                    </p>
                  </div>
                  <div className="rounded-lg border p-2">
                    <p className="text-xs text-muted-foreground">Credit expires</p>
                    <p className="font-medium flex items-center gap-1">
                      {campaign.creditExpiryDays === null ? (
                        <>
                          <InfinityIcon className="h-4 w-4" /> Never
                        </>
                      ) : (
                        `${campaign.creditExpiryDays}d`
                      )}
                    </p>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground border-t pt-3">
                  <p>
                    Runs: {formatDate(campaign.startsAt) ?? 'immediately'} →{' '}
                    {formatDate(campaign.endsAt) ?? 'no end date'}
                  </p>
                  <p>Credit lands in the wallet once the order is delivered.</p>
                  {campaign.updatedBy && (
                    <p>
                      Last updated by: <span className="font-medium">{campaign.updatedBy}</span>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId === null ? 'New Cashback Campaign' : 'Edit Campaign'}</DialogTitle>
            <DialogDescription>
              Step {step + 1} of {STEPS.length} — {STEPS[step]}
            </DialogDescription>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                    i < step
                      ? 'bg-green-500 text-white'
                      : i === step
                        ? 'bg-primary-blue text-white'
                        : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && <div className="h-px flex-1 bg-gray-200" />}
              </div>
            ))}
          </div>

          <div className="space-y-4 py-4">
            {/* Step 1 — Campaign identity + banner */}
            {step === 0 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="code">Campaign name</Label>
                  <Input
                    id="code"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="E.g., New Year 5% Back"
                  />
                  <p className="text-xs text-muted-foreground">Must be unique.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Shown to customers on the home page banner"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image">Banner images</Label>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setPendingImages(Array.from(e.target.files ?? []))}
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" />
                    {pendingImages.length > 0
                      ? `Selected ${pendingImages.length} image(s): ${pendingImages
                          .map((f) => f.name)
                          .join(', ')}`
                      : 'The home page banner cycles through them every 15 seconds. Uploaded when you save.'}
                  </p>
                  {editingImageUrls.length > 0 && (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {editingImageUrls.map((url) => (
                          <img
                            key={url}
                            src={url}
                            alt=""
                            className="h-14 w-20 rounded object-cover border"
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {pendingImages.length > 0
                          ? 'These current images will be replaced by your selection.'
                          : `${editingImageUrls.length} image(s) on this campaign. Selecting new files replaces all of them.`}
                      </p>
                    </>
                  )}
                </div>
              </>
            )}

            {/* Step 2 — The percent and what it is taken from */}
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="percent">Cashback percent</Label>
                  <div className="relative">
                    <Input
                      id="percent"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={form.percent}
                      onChange={(e) => setForm({ ...form, percent: parseFloat(e.target.value) || 0 })}
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      %
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Credited to the customer's wallet, not refunded to their card.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="basis">Take the percent from</Label>
                  <Select
                    value={form.basis}
                    onValueChange={(value) => setForm({ ...form, basis: value as CashbackBasis })}
                  >
                    <SelectTrigger id="basis">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BASIS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {BASIS_OPTIONS.find((o) => o.value === form.basis)?.hint}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Either way, only the part of an order paid with real money earns —
                    wallet credits spent at checkout never earn more credits.
                  </p>
                </div>
              </>
            )}

            {/* Step 3 — What qualifies */}
            {step === 2 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="minSubtotal">Minimum order subtotal</Label>
                  <Input
                    id="minSubtotal"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.minOrderSubtotal}
                    onChange={(e) =>
                      setForm({ ...form, minOrderSubtotal: parseFloat(e.target.value) || 0 })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Amounts are in {defaultCurrency}. 0 = every order qualifies, in any currency.
                  </p>
                </div>
              </>
            )}

            {/* Step 4 — Limits, schedule, activation */}
            {step === 3 && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="maxCashback">Max cashback per order</Label>
                    <Input
                      id="maxCashback"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.maxCashback}
                      onChange={(e) => setForm({ ...form, maxCashback: e.target.value })}
                      placeholder="No cap"
                    />
                    <p className="text-xs text-muted-foreground">
                      Caps what one large order can pay out. Blank = uncapped.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="perCustomerLimit">Limit per customer</Label>
                    <Input
                      id="perCustomerLimit"
                      type="number"
                      min="1"
                      value={form.perCustomerLimit}
                      onChange={(e) => setForm({ ...form, perCustomerLimit: e.target.value })}
                      placeholder="Unlimited"
                    />
                    <p className="text-xs text-muted-foreground">
                      Orders that may earn, counted for this campaign only.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="creditExpiryDays">Credit expires after (days)</Label>
                  <Input
                    id="creditExpiryDays"
                    type="number"
                    min="1"
                    value={form.creditExpiryDays}
                    onChange={(e) => setForm({ ...form, creditExpiryDays: e.target.value })}
                    placeholder="Never expires"
                  />
                  <p className="text-xs text-muted-foreground">
                    Counted from the day the credit lands in the wallet. Blank = never expires.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="startsAt">Starts (optional)</Label>
                    <Input
                      id="startsAt"
                      type="datetime-local"
                      value={form.startsAt}
                      onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endsAt">Ends (optional)</Label>
                    <Input
                      id="endsAt"
                      type="datetime-local"
                      value={form.endsAt}
                      onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label htmlFor="enabled">Enabled</Label>
                    <p className="text-xs text-muted-foreground">
                      Turn on to make this campaign live within its dates.
                    </p>
                  </div>
                  <Switch
                    id="enabled"
                    checked={form.enabled}
                    onCheckedChange={(checked) => setForm({ ...form, enabled: checked })}
                  />
                </div>

                {/* Summary, so the last step shows what is about to be saved. */}
                <div className="rounded-lg bg-gray-50 p-3 text-sm space-y-1">
                  <p className="font-medium">Summary</p>
                  <p className="text-muted-foreground">
                    Spend{' '}
                    <span className="font-medium text-foreground">
                      {formatPrice(form.minOrderSubtotal, defaultCurrency)}
                    </span>{' '}
                    and get{' '}
                    <span className="font-medium text-foreground">{form.percent}%</span> of the{' '}
                    {basisLabel(form.basis).toLowerCase()} back as wallet credit
                    {form.maxCashback &&
                      `, up to ${formatPrice(Number(form.maxCashback), defaultCurrency)} per order`}
                    {form.perCustomerLimit && `, on up to ${form.perCustomerLimit} order(s) per customer`}
                    . Credit is promised at checkout and becomes spendable once the order is delivered
                    {form.creditExpiryDays && `, then expires after ${form.creditExpiryDays} day(s)`}. Only
                    the part of an order paid with real money earns.
                  </p>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="flex-row justify-between sm:justify-between">
            <Button
              variant="outline"
              onClick={() => (step === 0 ? setDialogOpen(false) : setStep(step - 1))}
            >
              {step === 0 ? (
                'Cancel'
              ) : (
                <>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Back
                </>
              )}
            </Button>

            {step < STEPS.length - 1 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!stepValid(step)}
                className="bg-primary-blue text-white hover:bg-primary-blue/90"
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending || !canSave}
                className="bg-primary-blue text-white hover:bg-primary-blue/90"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Campaign'
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
