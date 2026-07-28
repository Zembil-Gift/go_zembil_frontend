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
  Gift,
  Pencil,
  Trash2,
  Plus,
  Loader2,
  Info,
  Infinity as InfinityIcon,
  ChevronLeft,
  ChevronRight,
  Check,
  Store,
  ImageIcon,
} from 'lucide-react';
import {
  adminService,
  FreeGiftTierDto,
  SaveFreeGiftTierRequest,
} from '@/services/adminService';
import { formatPrice, toMinorUnits, fromMinorUnits } from '@/lib/currency';

/** Form state — amounts in major units for editing, converted on save. */
interface TierForm {
  code: string;
  description: string;
  enabled: boolean;
  thresholdAmount: number;
  currencyCode: string;
  startsAt: string;
  endsAt: string;
  vendorId: number | null;
  giftProductId: number | null;
  giftStock: string;
  perCustomerLimit: string;
}

const EMPTY_FORM: TierForm = {
  code: '',
  description: '',
  enabled: false,
  thresholdAmount: 0,
  currencyCode: '',
  startsAt: '',
  endsAt: '',
  vendorId: null,
  giftProductId: null,
  giftStock: '',
  perCustomerLimit: '',
};

const STEPS = ['Campaign', 'Gift', 'Threshold', 'Limits'] as const;

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

export default function FreeGiftCampaigns() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<TierForm>(EMPTY_FORM);
  const [vendorSearch, setVendorSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [pendingImage, setPendingImage] = useState<File | null>(null);

  const { data: tiers = [], isLoading } = useQuery({
    queryKey: ['admin', 'free-gift'],
    queryFn: () => adminService.getFreeGiftTiers(),
  });

  const { data: currencies = [] } = useQuery({
    queryKey: ['admin', 'active-currencies'],
    queryFn: () => adminService.getActiveCurrencies(),
  });

  // Vendor lookup by name — the gift is stocked from a real vendor's catalog.
  const { data: vendorPage } = useQuery({
    queryKey: ['admin', 'free-gift', 'vendors', vendorSearch],
    queryFn: () => adminService.getVendors(0, 10, vendorSearch || undefined),
    enabled: dialogOpen && vendorSearch.trim().length > 0,
  });
  const vendors = vendorPage?.content ?? [];

  // Products of the chosen vendor only. vendorId here is the vendor's USER id —
  // ProductSpecification filters on vendor.userId, not the Vendor entity id.
  const { data: productPage, isFetching: isLoadingProducts } = useQuery({
    queryKey: ['admin', 'free-gift', 'products', form.vendorId, productSearch],
    queryFn: () =>
      adminService.getAllProducts(
        0,
        100,
        undefined,
        productSearch || undefined,
        undefined,
        form.vendorId!
      ),
    enabled: dialogOpen && form.vendorId != null,
  });
  const products = productPage?.content ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'free-gift'] });
    // The storefront cart and home banner read the public endpoint under this key.
    queryClient.invalidateQueries({ queryKey: ['free-gift'] });
  };

  const onError = (error: any) =>
    toast({
      title: 'Error',
      description: error?.message || 'Failed to save the campaign',
      variant: 'destructive',
    });

  const saveMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number | null; data: SaveFreeGiftTierRequest }) => {
      const saved =
        id === null
          ? await adminService.createFreeGiftTier(data)
          : await adminService.updateFreeGiftTier(id, data);
      // The image endpoint is keyed by id, so it can only run once the row exists.
      if (pendingImage) {
        try {
          return await adminService.uploadFreeGiftImage(saved.id, pendingImage);
        } catch (e: any) {
          toast({
            title: 'Campaign saved, image failed',
            description: e?.message || 'The banner image could not be uploaded.',
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
    mutationFn: (id: number) => adminService.deleteFreeGiftTier(id),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Campaign deleted' });
    },
    onError,
  });

  const defaultCurrency = currencies.find((c) => c.isDefault)?.code ?? 'ETB';

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, currencyCode: defaultCurrency });
    setVendorSearch('');
    setProductSearch('');
    setPendingImage(null);
    setStep(0);
    setDialogOpen(true);
  };

  const openEdit = (tier: FreeGiftTierDto) => {
    setEditingId(tier.id);
    setForm({
      code: tier.code,
      description: tier.description ?? '',
      enabled: tier.enabled,
      thresholdAmount: fromMinorUnits(tier.thresholdAmountMinor, tier.currencyCode),
      currencyCode: tier.currencyCode,
      startsAt: toLocalInput(tier.startsAt),
      endsAt: toLocalInput(tier.endsAt),
      // Editing keeps the saved product; the vendor picker is only for re-choosing.
      vendorId: null,
      giftProductId: tier.giftProductId,
      giftStock: tier.giftStock === null ? '' : String(tier.giftStock),
      perCustomerLimit: tier.perCustomerLimit === null ? '' : String(tier.perCustomerLimit),
    });
    setVendorSearch('');
    setProductSearch('');
    setPendingImage(null);
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
        thresholdAmountMinor: toMinorUnits(form.thresholdAmount, form.currencyCode),
        currencyCode: form.currencyCode,
        startsAt: toIso(form.startsAt),
        endsAt: toIso(form.endsAt),
        giftProductId: form.giftProductId,
        // Blank means "no limit" — send null so the server clears any cap.
        giftStock: form.giftStock === '' ? null : Number(form.giftStock),
        perCustomerLimit: form.perCustomerLimit === '' ? null : Number(form.perCustomerLimit),
      },
    });
  };

  // Per-step gating, so the wizard can't reach a state the server would reject.
  const stepValid = (index: number): boolean => {
    switch (index) {
      case 0:
        return form.code.trim().length > 0;
      case 1:
        return form.giftProductId !== null;
      case 2:
        return form.thresholdAmount >= 0 && form.currencyCode.length === 3;
      default:
        return true;
    }
  };

  const canSave = [0, 1, 2].every(stepValid);
  const selectedProduct = products.find((p: any) => p.id === form.giftProductId);

  return (
    <div className="space-y-6">
    

      <div className="flex justify-end">
        <Button onClick={openCreate} className="bg-primary-blue text-white hover:bg-primary-blue/90">
          <Plus className="mr-2 h-4 w-4" />
          New Free Gift Campaign
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary-blue" />
          <span className="ml-3 text-muted-foreground">Loading campaigns...</span>
        </div>
      ) : tiers.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Gift className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium text-muted-foreground">No free gift campaigns yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create one to start rewarding customers who spend above a threshold.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tiers.map((tier) => (
            <Card key={tier.id} className="relative overflow-hidden">
              <div
                className={`absolute top-0 left-0 right-0 h-1 ${tier.activeNow ? 'bg-green-500' : 'bg-gray-300'}`}
              />
              {tier.imageUrl && (
                <img
                  src={tier.imageUrl}
                  alt={tier.code}
                  className="w-full h-28 object-cover"
                />
              )}
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-green-500/10 shrink-0">
                      <Gift className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{tier.code}</CardTitle>
                      <Badge
                        variant="secondary"
                        className={`mt-1 text-xs ${
                          tier.activeNow ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {tier.activeNow ? 'Live' : tier.enabled ? 'Enabled — not live' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(tier)} title="Edit campaign">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (window.confirm(`Delete the campaign "${tier.code}"? This cannot be undone.`)) {
                          deleteMutation.mutate(tier.id);
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
                    <div className="text-2xl font-bold text-green-600">
                      {formatPrice(
                        fromMinorUnits(tier.thresholdAmountMinor, tier.currencyCode),
                        tier.currencyCode
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Spend to unlock</div>
                  </div>
                  <div className="flex-1 flex items-center gap-3">
                    {tier.giftProductCover ? (
                      <img
                        src={tier.giftProductCover}
                        alt={tier.giftProductName ?? 'Gift'}
                        className="w-12 h-12 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        <Gift className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Gift</p>
                      <p className="text-sm font-medium truncate">
                        {tier.giftProductName ?? <span className="text-red-500">Not set</span>}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border p-2">
                    <p className="text-xs text-muted-foreground">Gifts remaining</p>
                    <p className="font-medium flex items-center gap-1">
                      {tier.giftStock === null ? (
                        <>
                          <InfinityIcon className="h-4 w-4" /> Unlimited
                        </>
                      ) : (
                        <span className={tier.giftStock === 0 ? 'text-red-500' : ''}>{tier.giftStock}</span>
                      )}
                    </p>
                  </div>
                  <div className="rounded-lg border p-2">
                    <p className="text-xs text-muted-foreground">Per customer</p>
                    <p className="font-medium flex items-center gap-1">
                      {tier.perCustomerLimit === null ? (
                        <>
                          <InfinityIcon className="h-4 w-4" /> Unlimited
                        </>
                      ) : (
                        `${tier.perCustomerLimit}×`
                      )}
                    </p>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground border-t pt-3">
                  <p>
                    Runs: {formatDate(tier.startsAt) ?? 'immediately'} →{' '}
                    {formatDate(tier.endsAt) ?? 'no end date'}
                  </p>
                  {tier.updatedBy && (
                    <p>
                      Last updated by: <span className="font-medium">{tier.updatedBy}</span>
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
            <DialogTitle>
              {editingId === null ? 'New Free Gift Campaign' : 'Edit Campaign'}
            </DialogTitle>
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
                    placeholder="E.g., New Year Mug"
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
                  <Label htmlFor="image">Banner image</Label>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPendingImage(e.target.files?.[0] ?? null)}
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" />
                    {pendingImage
                      ? `Selected: ${pendingImage.name}`
                      : 'Shown on the home page campaign banner. Uploaded when you save.'}
                  </p>
                </div>
              </>
            )}

            {/* Step 2 — Gift product, found via its vendor */}
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="vendorSearch">Find the vendor</Label>
                  <Input
                    id="vendorSearch"
                    value={vendorSearch}
                    onChange={(e) => setVendorSearch(e.target.value)}
                    placeholder="Search vendors by name..."
                  />
                  {vendors.length > 0 && (
                    <div className="max-h-40 overflow-y-auto rounded-md border divide-y">
                      {vendors.map((v: any) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() =>
                            // The product filter matches on the vendor's USER id
                            // (ProductSpecification -> vendor.userId), not vendor.id.
                            (setProductSearch(''),
                            setForm({ ...form, vendorId: v.userId, giftProductId: null }))
                          }
                          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                            form.vendorId === v.userId ? 'bg-blue-50 font-medium' : ''
                          }`}
                        >
                          <Store className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="truncate">{v.businessName ?? v.name}</span>
                          {form.vendorId === v.userId && (
                            <Check className="ml-auto h-4 w-4 text-primary-blue" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {vendorSearch.trim().length > 0 && vendors.length === 0 && (
                    <p className="text-xs text-muted-foreground">No vendors match that name.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="productSearch">Gift product</Label>
                  <Input
                    id="productSearch"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search this vendor's products..."
                    disabled={form.vendorId === null}
                  />
                  <Select
                    value={form.giftProductId ? String(form.giftProductId) : undefined}
                    onValueChange={(value) => setForm({ ...form, giftProductId: Number(value) })}
                    disabled={form.vendorId === null}
                  >
                    <SelectTrigger id="giftProduct">
                      <SelectValue
                        placeholder={
                          form.vendorId === null
                            ? 'Pick a vendor first'
                            : isLoadingProducts
                              ? 'Loading products...'
                              : products.length === 0
                                ? productSearch
                                  ? 'No products match that search'
                                  : 'This vendor has no products'
                                : 'Select a product'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p: any) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedProduct && (
                    <p className="text-xs text-green-700">Gift: {selectedProduct.name}</p>
                  )}
                  {editingId !== null && form.vendorId === null && form.giftProductId !== null && (
                    <p className="text-xs text-muted-foreground">
                      Keeping the currently saved gift. Search a vendor above to change it.
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Step 3 — Spend threshold */}
            {step === 2 && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="threshold">Spend threshold</Label>
                    <Input
                      id="threshold"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.thresholdAmount}
                      onChange={(e) =>
                        setForm({ ...form, thresholdAmount: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      value={form.currencyCode || undefined}
                      onValueChange={(value) => setForm({ ...form, currencyCode: value })}
                    >
                      <SelectTrigger id="currency">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Only carts priced in this currency qualify for the gift.
                </p>
              </>
            )}

            {/* Step 4 — Limits, schedule, activation */}
            {step === 3 && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="giftStock">Total gifts available</Label>
                    <Input
                      id="giftStock"
                      type="number"
                      min="0"
                      value={form.giftStock}
                      onChange={(e) => setForm({ ...form, giftStock: e.target.value })}
                      placeholder="Unlimited"
                    />
                    <p className="text-xs text-muted-foreground">Hides the gift at 0. Blank = unlimited.</p>
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
                      Counted for this campaign only. Blank = unlimited.
                    </p>
                  </div>
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
                      {form.currencyCode
                        ? formatPrice(form.thresholdAmount, form.currencyCode)
                        : form.thresholdAmount}
                    </span>{' '}
                    to receive{' '}
                    <span className="font-medium text-foreground">
                      {selectedProduct?.name ?? 'the selected gift'}
                    </span>
                    {form.perCustomerLimit && `, up to ${form.perCustomerLimit}× per customer`}
                    {form.giftStock && `, ${form.giftStock} available in total`}.
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
