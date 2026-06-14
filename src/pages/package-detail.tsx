import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Package as PackageIcon,
  ShoppingCart,
  Store,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  packageService,
  ProductPackageItemResponse,
} from "@/services/packageService";
import { formatPrice, getCurrencyDecimals } from "@/lib/currency";
import { trackViewItem } from "@/lib/analytics";
import { format } from "date-fns";

const toMajor = (minor?: number, currency?: string): number => {
  if (typeof minor !== "number") return 0;
  const decimals = getCurrencyDecimals(currency || "ETB");
  return minor / Math.pow(10, decimals);
};

const selectDefaultSku = (item: ProductPackageItemResponse): number | undefined => {
  const skus = item.availableSkus || [];
  const requiredQuantity = Math.max(1, item.requiredQuantity || 1);
  const active = skus.filter((sku) => {
    const stock = sku.stockQty ?? sku.quantity ?? 0;
    return (sku.status || "").toUpperCase() === "ACTIVE" && stock >= requiredQuantity;
  });
  const preferred = active.find((sku) => sku.isDefault);
  if (preferred?.id) return preferred.id;
  return active[0]?.id;
};

// ─── Image carousel ──────────────────────────────────────────────────────────
function ImageCarousel({ images, altBase }: { images: string[]; altBase: string }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => { setIdx(0); }, [images]);

  if (images.length === 0) {
    return (
      <div className="flex h-full min-h-[180px] items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400">
        No image
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative overflow-hidden rounded-xl bg-white aspect-square">
        <img
          src={images[idx]}
          alt={`${altBase} ${idx + 1}`}
          className="h-full w-full object-contain transition-all duration-300"
        />
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setIdx((i) => (i - 1 + images.length) % images.length)}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1 shadow hover:bg-white"
            >
              <ChevronLeft className="h-3 w-3 text-slate-600" />
            </button>
            <button
              type="button"
              onClick={() => setIdx((i) => (i + 1) % images.length)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1 shadow hover:bg-white"
            >
              <ChevronRight className="h-3 w-3 text-slate-600" />
            </button>
            <span className="absolute bottom-1.5 right-1.5 rounded bg-black/40 px-1.5 py-0.5 text-[10px] text-white">
              {idx + 1}/{images.length}
            </span>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-1 flex-wrap">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              className={`h-8 w-8 overflow-hidden rounded-md border-2 transition-all ${
                i === idx ? "border-eagle-green opacity-100" : "border-transparent opacity-40 hover:opacity-70"
              }`}
            >
              <img src={img} alt={`thumb ${i + 1}`} className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Custom dropdown — never stretches its container ─────────────────────────
function SkuDropdown({
  options,
  selectedSkuId,
  onSkuChange,
}: {
  options: ProductPackageItemResponse["availableSkus"];
  selectedSkuId: number | undefined;
  onSkuChange: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.id === selectedSkuId);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const label = selected
    ? (selected.name || selected.sku || `SKU #${selected.id}`)
    : "Choose option…";

  const price = (sku: (typeof options)[number]) =>
    formatPrice(toMajor(sku.priceMinor || 0, sku.priceCurrency || "ETB"), sku.priceCurrency || "ETB");

  return (
    <div ref={ref} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left shadow-sm transition hover:border-eagle-green/40 focus:outline-none focus:ring-2 focus:ring-eagle-green/30"
      >
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">{label}</span>
        {selected && (
          <span className="shrink-0 text-[11px] font-semibold text-eagle-green ml-1">
            {price(selected)}
          </span>
        )}
        <ChevronDown className={`ml-1 h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {options.map((sku) => {
            const isActive = sku.id === selectedSkuId;
            return (
              <button
                key={sku.id}
                type="button"
                onClick={() => { onSkuChange(sku.id); setOpen(false); }}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition hover:bg-slate-50 ${
                  isActive ? "bg-eagle-green/5" : ""
                }`}
              >
                <span className={`min-w-0 flex-1 truncate text-xs ${isActive ? "font-semibold text-eagle-green" : "text-slate-700"}`}>
                  {sku.name || sku.sku || `SKU #${sku.id}`}
                </span>
                <span className={`shrink-0 text-[11px] font-semibold ${isActive ? "text-eagle-green" : "text-slate-500"}`}>
                  {price(sku)}
                </span>
                {isActive && <CheckCircle2 className="h-3 w-3 shrink-0 text-eagle-green" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Single package item row ─────────────────────────────────────────────────
// Layout: [image | info+dropdown] — image gets fixed width, info flexes in remaining space
function PackageItemRow({
  item,
  selectedSkuId,
  onSkuChange,
}: {
  item: ProductPackageItemResponse;
  selectedSkuId: number | undefined;
  onSkuChange: (skuId: number) => void;
}) {
  const requiredQuantity = Math.max(1, item.requiredQuantity || 1);
  const options = (item.availableSkus || []).filter((sku) => {
    const stock = sku.stockQty ?? sku.quantity ?? 0;
    return (sku.status || "").toUpperCase() === "ACTIVE" && stock >= requiredQuantity;
  });
  const selectedSku = options.find((s) => s.id === selectedSkuId);

  const previewImages = useMemo(() => {
    if (selectedSku?.images?.length) return selectedSku.images;
    if (item.productImages?.length) return item.productImages;
    if (item.productImage) return [item.productImage];
    return [];
  }, [selectedSku, item.productImages, item.productImage]);

  const isUnavailable = options.length === 0;

  return (
    <div className="flex flex-row rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* LEFT: fixed-size image panel */}
      <div className="w-[140px] sm:w-[180px] shrink-0 bg-slate-50/80 border-r border-slate-100 p-2.5 flex flex-col justify-center gap-1.5">
        <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400 text-center">
          {selectedSku?.images?.length ? "Selected" : "Preview"}
        </p>
        <ImageCarousel
          images={previewImages}
          altBase={item.productName || `Product ${item.productId}`}
        />
      </div>

      {/* RIGHT: info + custom dropdown — constrained, never expands card */}
      <div className="flex-1 min-w-0 p-3 sm:p-4 flex flex-col justify-center gap-2.5">
        {/* Product name + qty badge */}
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-eagle-green text-sm leading-tight truncate min-w-0">
            {item.productName || `Product #${item.productId}`}
          </p>
          <span className="shrink-0 text-[10px] font-bold text-eagle-green bg-eagle-green/10 px-2 py-0.5 rounded-full">
            ×{requiredQuantity}
          </span>
        </div>

        {item.description && (
          <p className="text-xs text-slate-500 line-clamp-2 -mt-1">{item.description}</p>
        )}

        {isUnavailable ? (
          <div className="flex items-center gap-1.5 text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">
            <XCircle className="h-3.5 w-3.5 shrink-0" />
            No options available
          </div>
        ) : (
          <SkuDropdown
            options={options}
            selectedSkuId={selectedSkuId}
            onSkuChange={onSkuChange}
          />
        )}

        {/* Subtotal chip */}
        {selectedSku?.priceMinor != null && (
          <div className="flex items-center justify-between text-xs bg-eagle-green/5 border border-eagle-green/10 rounded-lg px-3 py-1.5">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-bold text-eagle-green">
              {formatPrice(
                toMajor(selectedSku.priceMinor, selectedSku.priceCurrency || "ETB") * requiredQuantity,
                selectedSku.priceCurrency || "ETB"
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PackageDetailPage() {
  const { packageId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [skuSelections, setSkuSelections] = useState<Record<number, number>>({});

  const numericPackageId = Number(packageId);

  const { data: packageDetail, isLoading } = useQuery({
    queryKey: ["packages", "detail", numericPackageId],
    queryFn: () => packageService.getPackageDetail(numericPackageId),
    enabled: Number.isFinite(numericPackageId) && numericPackageId > 0,
  });

  useEffect(() => {
    if (!packageDetail?.items?.length) return;
    setSkuSelections((previous) => {
      const next: Record<number, number> = {};
      for (const item of packageDetail.items) {
        const requiredQuantity = Math.max(1, item.requiredQuantity || 1);
        const options = (item.availableSkus || []).filter((sku) => {
          const stock = sku.stockQty ?? sku.quantity ?? 0;
          return (sku.status || "").toUpperCase() === "ACTIVE" && stock >= requiredQuantity;
        });
        const existingSelection = previous[item.id];
        if (existingSelection && options.some((sku) => sku.id === existingSelection)) {
          next[item.id] = existingSelection;
          continue;
        }
        const defaultSku = selectDefaultSku(item);
        if (defaultSku) next[item.id] = defaultSku;
      }
      return next;
    });
  }, [packageDetail]);

  const packageEstimatedTotal = useMemo(() => {
    if (!packageDetail?.items?.length) {
      return { amount: 0, currency: packageDetail?.displayCurrency || "ETB" };
    }
    if (typeof packageDetail.startingFromPriceMinor === "number") {
      return {
        amount: toMajor(packageDetail.startingFromPriceMinor, packageDetail.displayCurrency || "ETB"),
        currency: packageDetail.displayCurrency || "ETB",
      };
    }
    let total = 0;
    let currency = "ETB";
    packageDetail.items.forEach((item) => {
      const sku = (item.availableSkus || []).find((e) => e.id === skuSelections[item.id]);
      total += toMajor(sku?.priceMinor || 0, sku?.priceCurrency || "ETB") * (item.requiredQuantity || 1);
      currency = sku?.priceCurrency || currency;
    });
    if (packageDetail.giftWrappable && packageDetail.giftWrapPrice) {
      total += toMajor(packageDetail.giftWrapPrice, packageDetail.giftWrapCurrency || currency);
      currency = packageDetail.giftWrapCurrency || currency;
    }
    return { amount: total, currency };
  }, [packageDetail, skuSelections]);

  useEffect(() => {
    if (!packageDetail) return;
    trackViewItem(
      {
        item_id: packageDetail.id,
        item_name: packageDetail.name,
        item_category: packageDetail.subCategoryName,
        item_brand: packageDetail.vendorBusinessName || packageDetail.vendorName,
        price: packageEstimatedTotal.amount,
      },
      packageEstimatedTotal.currency
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packageDetail?.id]);

  const addToCartMutation = useMutation({
    mutationFn: () => {
      if (!packageDetail) throw new Error("Package not found");
      const selectionRows = packageDetail.items.map((item) => ({
        packageItemId: item.id,
        productSkuId: skuSelections[item.id],
      }));
      if (selectionRows.some((row) => !row.productSkuId || row.productSkuId <= 0)) {
        throw new Error("Please select one option for every package item");
      }
      if (packageDetail.available === false) throw new Error("This package is currently unavailable");
      return packageService.addPackageToCart({
        packageId: packageDetail.id,
        skuSelections: selectionRows,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart", "items"] });
      toast({ title: "Package added", description: "Bundle added to your cart successfully." });
      navigate("/cart");
    },
    onError: (error: any) => {
      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
      if (!isAuthenticated) {
        navigate(`/signin?returnUrl=${returnUrl}`);
        return;
      }
      toast({
        title: "Unable to add package",
        description: error?.message || "Please check selected options and try again.",
        variant: "destructive",
      });
    },
  });

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!Number.isFinite(numericPackageId) || numericPackageId <= 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card>
          <CardContent className="p-10 text-center">
            <h2 className="text-xl font-semibold text-eagle-green mb-2">Invalid package</h2>
            <Button asChild variant="outline"><Link to="/packages">Back to Packages</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !packageDetail) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-eagle-green" />
      </div>
    );
  }

  const canAddToCart =
    (packageDetail.status || "").toUpperCase() === "ACTIVE" &&
    packageDetail.available !== false &&
    packageDetail.items.every((item) => {
      const sku = (item.availableSkus || []).find((s) => s.id === skuSelections[item.id]);
      if (!sku) return false;
      return (sku.stockQty ?? sku.quantity ?? 0) >= Math.max(1, item.requiredQuantity || 1);
    });

  const allSelected = packageDetail.items.every((item) => !!skuSelections[item.id]);
  const hasVendor = !!packageDetail.vendorBusinessName;
  const hasSuppliers = !!(packageDetail.suppliers && packageDetail.suppliers.length > 0);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-light-cream to-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Back */}
        <Button asChild variant="ghost" size="sm" className="text-eagle-green -ml-2">
          <Link to="/packages">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Packages
          </Link>
        </Button>

        {/* ── Header card ── */}
        <Card>
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-xl sm:text-2xl font-bold text-eagle-green leading-tight">
                  {packageDetail.name}
                </h1>
                <Badge
                  className={
                    (packageDetail.status || "").toUpperCase() === "ACTIVE"
                      ? "bg-green-100 text-green-800 text-[10px]"
                      : "bg-slate-100 text-slate-800 text-[10px]"
                  }
                >
                  {packageDetail.status}
                </Badge>
                {packageDetail.available !== false ? (
                  <Badge variant="outline" className="border-green-200 text-green-700 text-[10px]">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Available
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-red-200 text-red-700 text-[10px]">
                    Unavailable
                  </Badge>
                )}
              </div>
              {packageDetail.summary && (
                <p className="text-sm text-eagle-green/80 mb-1">{packageDetail.summary}</p>
              )}
              {packageDetail.description && (
                <p className="text-xs text-eagle-green/60 leading-relaxed">{packageDetail.description}</p>
              )}
              <div className="flex flex-wrap gap-3 mt-3">
                <div className="text-xs bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5">
                  <span className="text-slate-400">Items</span>{" "}
                  <span className="font-semibold text-slate-700">{packageDetail.items.length}</span>
                </div>
                <div className="text-xs bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5">
                  <span className="text-slate-400">Starting from</span>{" "}
                  <span className="font-semibold text-eagle-green">
                    {formatPrice(packageEstimatedTotal.amount, packageEstimatedTotal.currency)}
                  </span>
                </div>
              </div>
            </div>

            {packageDetail.images && packageDetail.images.length > 0 && (
              <div className="flex flex-row gap-2 overflow-x-auto pb-1">
                {packageDetail.images.map((image, index) => (
                  <img
                    key={`${image}-${index}`}
                    src={image}
                    alt={`${packageDetail.name} ${index + 1}`}
                    className="h-28 w-28 shrink-0 rounded-lg object-contain bg-white border border-slate-100"
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Two-column layout ── */}
        <div className="flex flex-col lg:flex-row gap-5 items-start">
          {/* ── Left column: package items ── */}
          <div className="flex-1 min-w-0 space-y-3">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest px-0.5">
              Customize Package · {packageDetail.items.length} item{packageDetail.items.length !== 1 ? "s" : ""}
            </h2>
            {packageDetail.items.map((item) => (
              <PackageItemRow
                key={item.id}
                item={item}
                selectedSkuId={skuSelections[item.id]}
                onSkuChange={(skuId) =>
                  setSkuSelections((prev) => ({ ...prev, [item.id]: skuId }))
                }
              />
            ))}
          </div>

          {/* ── Right sidebar ── */}
          <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4 lg:sticky lg:top-6">
            {/* Order Summary */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <h3 className="text-sm font-semibold text-slate-700">Order Summary</h3>
                <ul className="space-y-3">
                  {packageDetail.items.map((item) => {
                    const requiredQuantity = Math.max(1, item.requiredQuantity || 1);
                    const selectedSku = (item.availableSkus || []).find(
                      (s) => s.id === skuSelections[item.id]
                    );
                    return (
                      <li key={item.id} className="flex items-start gap-2 text-xs">
                        {(() => {
                          const thumb =
                            selectedSku?.images?.[0] ||
                            item.productImages?.[0] ||
                            item.productImage;
                          return thumb ? (
                            <img
                              src={thumb}
                              alt={item.productName || ""}
                              className="h-8 w-8 rounded object-contain bg-slate-50 border border-slate-100 shrink-0 mt-0.5"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded bg-slate-100 shrink-0 mt-0.5 flex items-center justify-center">
                              <PackageIcon className="h-3.5 w-3.5 text-slate-400" />
                            </div>
                          );
                        })()}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-700 truncate">
                            {item.productName || `Product #${item.productId}`}
                          </p>
                          {selectedSku ? (
                            <p className="text-slate-400 truncate">
                              {selectedSku.name || selectedSku.sku || `SKU #${selectedSku.id}`}
                              {" · "}
                              <span className="text-slate-500">×{requiredQuantity}</span>
                            </p>
                          ) : (
                            <p className="text-amber-500 italic">Pending selection</p>
                          )}
                        </div>
                        {selectedSku?.priceMinor != null && (
                          <span className="text-eagle-green font-semibold shrink-0">
                            {formatPrice(
                              toMajor(selectedSku.priceMinor, selectedSku.priceCurrency || "ETB") *
                                requiredQuantity,
                              selectedSku.priceCurrency || "ETB"
                            )}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
                  <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">Total</span>
                  <span className="text-lg font-extrabold text-eagle-green">
                    {formatPrice(packageEstimatedTotal.amount, packageEstimatedTotal.currency)}
                  </span>
                </div>
                {!allSelected && (
                  <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2 text-center">
                    Select an option for each item to continue
                  </p>
                )}
                <button
                  className="w-full flex items-center justify-center gap-2 bg-eagle-green hover:bg-viridian-green text-white text-sm font-bold py-3 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  disabled={!canAddToCart || addToCartMutation.isPending}
                  onClick={() => addToCartMutation.mutate()}
                >
                  {addToCartMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Adding…
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4" />
                      Add Package to Cart
                    </>
                  )}
                </button>
              </CardContent>
            </Card>

            {/* Seller info */}
            {(hasVendor || hasSuppliers) && (
              <Card>
                <CardContent className="p-4 space-y-4">
                  {hasVendor && (
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Sold by</p>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-viridian-green/10 flex items-center justify-center shrink-0">
                          <Store className="h-4 w-4 text-viridian-green" />
                        </div>
                        <div>
                          <p className="font-semibold text-charcoal text-sm leading-tight">
                            {packageDetail.vendorBusinessName}
                          </p>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                            {packageDetail.vendorLocation && (
                              <span className="flex items-center gap-1 text-xs text-slate-500">
                                <MapPin className="h-3 w-3 shrink-0" />
                                {packageDetail.vendorLocation}
                              </span>
                            )}
                            {packageDetail.vendorMemberSince && (
                              <span className="flex items-center gap-1 text-xs text-slate-500">
                                <Calendar className="h-3 w-3 shrink-0" />
                                Since {format(new Date(packageDetail.vendorMemberSince), "MMM yyyy")}
                              </span>
                            )}
                            {packageDetail.vendorTotalPackages != null && (
                              <span className="flex items-center gap-1 text-xs text-slate-500">
                                <PackageIcon className="h-3 w-3 shrink-0" />
                                {packageDetail.vendorTotalPackages} package{packageDetail.vendorTotalPackages !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {hasVendor && hasSuppliers && <div className="border-t border-slate-100" />}
                  {hasSuppliers && (
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Supplied by</p>
                      <div className="space-y-2">
                        {packageDetail.suppliers.map((supplier) => (
                          <div key={supplier.id} className="flex items-start gap-2.5">
                            <div>
                              <p className="font-semibold text-charcoal text-sm leading-tight">
                                {supplier.businessName}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}