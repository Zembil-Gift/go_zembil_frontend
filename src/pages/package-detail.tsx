import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Gift,
  Loader2,
  Package as PackageIcon,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  packageService,
  ProductPackageItemResponse,
} from "@/services/packageService";
import { formatPrice, getCurrencyDecimals } from "@/lib/currency";

const toMajor = (minor?: number, currency?: string): number => {
  if (typeof minor !== "number") return 0;
  const decimals = getCurrencyDecimals(currency || "ETB");
  return minor / Math.pow(10, decimals);
};

const selectDefaultSku = (
  item: ProductPackageItemResponse
): number | undefined => {
  const skus = item.availableSkus || [];
  const requiredQuantity = Math.max(1, item.requiredQuantity || 1);
  const active = skus.filter((sku) => {
    const stock = sku.stockQty ?? sku.quantity ?? 0;
    return (
      (sku.status || "").toUpperCase() === "ACTIVE" && stock >= requiredQuantity
    );
  });
  const preferred = active.find((sku) => sku.isDefault);
  if (preferred?.id) return preferred.id;

  return active[0]?.id;
};

export default function PackageDetailPage() {
  const { packageId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  const [skuSelections, setSkuSelections] = useState<Record<number, number>>(
    {}
  );
  const [skuPreviewIndex, setSkuPreviewIndex] = useState<
    Record<number, number>
  >({});

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
          return (
            (sku.status || "").toUpperCase() === "ACTIVE" &&
            stock >= requiredQuantity
          );
        });

        const existingSelection = previous[item.id];
        const isExistingStillValid = options.some(
          (sku) => sku.id === existingSelection
        );

        if (isExistingStillValid && existingSelection) {
          next[item.id] = existingSelection;
          continue;
        }

        const defaultSku = selectDefaultSku(item);
        if (defaultSku) {
          next[item.id] = defaultSku;
        }
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
        amount: toMajor(
          packageDetail.startingFromPriceMinor,
          packageDetail.displayCurrency || "ETB"
        ),
        currency: packageDetail.displayCurrency || "ETB",
      };
    }

    let total = 0;
    let currency = "ETB";

    packageDetail.items.forEach((item) => {
      const selectedSkuId = skuSelections[item.id];
      const sku = (item.availableSkus || []).find(
        (entry) => entry.id === selectedSkuId
      );
      const unit = toMajor(sku?.priceMinor || 0, sku?.priceCurrency || "ETB");
      total += unit * (item.requiredQuantity || 1);
      currency = sku?.priceCurrency || currency;
    });

    if (packageDetail.giftWrappable && packageDetail.giftWrapPrice) {
      total += toMajor(
        packageDetail.giftWrapPrice,
        packageDetail.giftWrapCurrency || currency
      );
      currency = packageDetail.giftWrapCurrency || currency;
    }

    return { amount: total, currency };
  }, [packageDetail, skuSelections]);

  const addToCartMutation = useMutation({
    mutationFn: () => {
      if (!packageDetail) {
        throw new Error("Package not found");
      }

      const selectionRows = packageDetail.items.map((item) => ({
        packageItemId: item.id,
        productSkuId: skuSelections[item.id],
      }));

      const hasMissingSelections = selectionRows.some(
        (row) => !row.productSkuId || row.productSkuId <= 0
      );

      if (hasMissingSelections) {
        throw new Error("Please select one option for every package item");
      }

      if (packageDetail.available === false) {
        throw new Error("This package is currently unavailable");
      }

      return packageService.addPackageToCart({
        packageId: packageDetail.id,
        skuSelections: selectionRows,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart", "items"] });
      toast({
        title: "Package added",
        description: "Bundle added to your cart successfully.",
      });
      navigate("/cart");
    },
    onError: (error: any) => {
      const returnUrl = encodeURIComponent(
        window.location.pathname + window.location.search
      );
      if (!isAuthenticated) {
        navigate(`/signin?returnUrl=${returnUrl}`);
        return;
      }

      toast({
        title: "Unable to add package",
        description:
          error?.message || "Please check selected options and try again.",
        variant: "destructive",
      });
    },
  });

  if (!Number.isFinite(numericPackageId) || numericPackageId <= 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card>
          <CardContent className="p-10 text-center">
            <h2 className="text-xl font-semibold text-eagle-green mb-2">
              Invalid package
            </h2>
            <Button asChild variant="outline">
              <Link to="/packages">Back to Packages</Link>
            </Button>
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
      const selectedSkuId = skuSelections[item.id];
      if (!selectedSkuId) return false;

      const selectedSku = (item.availableSkus || []).find(
        (sku) => sku.id === selectedSkuId
      );
      if (!selectedSku) return false;

      const stock = selectedSku.stockQty ?? selectedSku.quantity ?? 0;
      return stock >= Math.max(1, item.requiredQuantity || 1);
    });

  return (
    <div className="min-h-screen bg-gradient-to-b from-light-cream to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Button asChild variant="ghost" className="text-eagle-green">
          <Link to="/packages">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Packages
          </Link>
        </Button>

        <Card>
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-eagle-green">
                {packageDetail.name}
              </h1>
              <Badge
                className={
                  (packageDetail.status || "").toUpperCase() === "ACTIVE"
                    ? "bg-green-100 text-green-800"
                    : "bg-slate-100 text-slate-800"
                }
              >
                {packageDetail.status}
              </Badge>
              {packageDetail.available !== false ? (
                <Badge
                  variant="outline"
                  className="border-green-200 text-green-700"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Available
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-red-200 text-red-700"
                >
                  Unavailable
                </Badge>
              )}
            </div>

            {packageDetail.images && packageDetail.images.length > 0 && (
              <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {packageDetail.images.map((image, index) => (
                  <img
                    key={`${image}-${index}`}
                    src={image}
                    alt={`${packageDetail.name} ${index + 1}`}
                    className="w-full max-h-36 rounded-lg object-contain bg-white/40"
                  />
                ))}
              </div>
            )}

            {packageDetail.summary && (
              <p className="text-eagle-green/80 mb-2">
                {packageDetail.summary}
              </p>
            )}
            {packageDetail.description && (
              <p className="text-sm text-eagle-green/70">
                {packageDetail.description}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-2">
              <PackageIcon className="h-5 w-5 text-eagle-green" />
              <h2 className="text-xl font-semibold text-eagle-green">
                Customize Package
              </h2>
            </div>

            <div className="space-y-4">
              {packageDetail.items.map((item) => {
                const requiredQuantity = Math.max(
                  1,
                  item.requiredQuantity || 1
                );
                const options = (item.availableSkus || []).filter(
                  (sku) =>
                    (sku.status || "").toUpperCase() === "ACTIVE" &&
                    (sku.stockQty ?? sku.quantity ?? 0) >= requiredQuantity
                );
                const selectedSkuId = skuSelections[item.id];
                const selectedSku = options.find(
                  (sku) => sku.id === selectedSkuId
                );
                const selectedSkuImages = selectedSku?.images || [];
                const productPreviewImages =
                  item.productImages && item.productImages.length > 0
                    ? item.productImages
                    : item.productImage
                    ? [item.productImage]
                    : [];

                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-100 bg-slate-50/30 p-5 sm:p-6 space-y-5 shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-eagle-green">
                          {item.productName || `Product #${item.productId}`}
                        </p>
                        {/* <p className="text-sm text-eagle-green/70">
                          This package includes {requiredQuantity} x of your selected option
                        </p> */}
                        {item.description && (
                          <p className="text-sm text-slate-500 mt-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {productPreviewImages.length > 0 && (
                      <div className="space-y-2.5">
                        <p className="text-xs font-semibold text-eagle-green/60 uppercase tracking-widest">
                          Product Preview
                        </p>
                        <div className="flex gap-3 flex-wrap">
                          {productPreviewImages.map((image, index) => (
                            <img
                              key={`${item.id}-product-${index}`}
                              src={image}
                              alt={`${item.productName || "Product"} ${
                                index + 1
                              }`}
                              className="h-16 w-auto max-w-[96px] rounded-lg object-contain bg-white ring-1 ring-slate-100 shadow-sm"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="md:grid md:grid-cols-[minmax(0,30%)_minmax(0,70%)] md:gap-4 md:items-start space-y-3 md:space-y-0">
                        <div className="space-y-3">
                          <Label htmlFor={`package-item-${item.id}`} className="text-slate-600 font-medium">
                            Select Option
                          </Label>
                          <select
                            id={`package-item-${item.id}`}
                            value={skuSelections[item.id] || ""}
                            onChange={(e) => {
                              const nextSkuId = Number(e.target.value);
                              setSkuSelections((prev) => ({
                                ...prev,
                                [item.id]: nextSkuId,
                              }));
                              setSkuPreviewIndex((prev) => ({
                                ...prev,
                                [item.id]: 0,
                              }));
                            }}
                            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm ring-offset-background transition-shadow focus:outline-none focus:ring-2 focus:ring-eagle-green/30"
                          >
                            <option value="">Select option</option>
                            {options.map((sku) => {
                              const displayPrice = toMajor(
                                sku.priceMinor || 0,
                                sku.priceCurrency || "ETB"
                              );
                              return (
                                <option key={sku.id} value={sku.id}>
                                  {(sku.name || sku.sku || `SKU #${sku.id}`) +
                                    ` • ${formatPrice(
                                      displayPrice,
                                      sku.priceCurrency || "ETB"
                                    )}`}
                                </option>
                              );
                            })}
                          </select>
                          {selectedSku && (
                            <div className="mt-4 rounded-xl border border-eagle-green/10 bg-eagle-green/5 p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                              <p className="text-[10px] font-semibold text-eagle-green/60 uppercase tracking-widest mb-1.5">
                                Your Selection
                              </p>
                              <p className="text-sm font-bold text-eagle-green">
                                {(selectedSku.name ||
                                  selectedSku.sku ||
                                  `SKU #${selectedSku.id}`) +
                                  ` × ${requiredQuantity}`}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="rounded-xl border border-slate-100 bg-white p-5 min-h-[220px] flex flex-col justify-center items-center shadow-sm relative group overflow-hidden">
                          {selectedSku ? (
                            (() => {
                              const previewImages =
                                selectedSkuImages.length > 0
                                  ? selectedSkuImages
                                  : productPreviewImages;
                              const safeIndex = Math.min(
                                skuPreviewIndex[item.id] || 0,
                                Math.max(previewImages.length - 1, 0)
                              );
                              const activeImage = previewImages[safeIndex];

                              return (
                                <div className="space-y-4 w-full flex flex-col items-center">
                                  {activeImage ? (
                                    <img
                                      src={activeImage}
                                      alt={`${
                                        selectedSku.name ||
                                        selectedSku.sku ||
                                        "SKU"
                                      } preview`}
                                      className="w-full max-h-[340px] rounded-lg object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                                    />
                                  ) : (
                                    <div className="h-44 w-full rounded-lg bg-slate-50 flex items-center justify-center text-sm font-medium text-slate-400">
                                      No images available
                                    </div>
                                  )}

                                  {previewImages.length > 1 && (
                                    <div className="flex flex-wrap gap-2.5 justify-center mt-2">
                                      {previewImages.map((image, index) => (
                                        <button
                                          key={`${item.id}-preview-${index}`}
                                          type="button"
                                          onClick={() =>
                                            setSkuPreviewIndex((prev) => ({
                                              ...prev,
                                              [item.id]: index,
                                            }))
                                          }
                                          className={`relative overflow-hidden rounded-md transition-all duration-200 ${
                                            safeIndex === index
                                              ? "ring-2 ring-eagle-green ring-offset-1 scale-105 shadow-md"
                                              : "ring-1 ring-slate-200 opacity-60 hover:opacity-100 hover:scale-105 hover:ring-slate-300"
                                          }`}
                                        >
                                          <img
                                            src={image}
                                            alt={`${
                                              selectedSku.name ||
                                              selectedSku.sku ||
                                              "SKU"
                                            } ${index + 1}`}
                                            className="h-12 w-auto max-w-[64px] object-contain bg-white"
                                          />
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })()
                          ) : (
                            <div className="h-full min-h-[180px] flex flex-col gap-3 items-center justify-center text-center p-6 text-slate-400">
                              <PackageIcon className="h-10 w-10 text-slate-200" />
                              <p className="text-sm">
                                Select an option on the left<br/>
                                <span className="font-semibold text-slate-500">to preview the product</span>
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Your Package Summary</h3>
              <ul className="space-y-4">
                {packageDetail.items.map((item) => {
                  const requiredQuantity = Math.max(1, item.requiredQuantity || 1);
                  const selectedSkuId = skuSelections[item.id];
                  const selectedSku = (item.availableSkus || []).find(s => s.id === selectedSkuId);
                  
                  if (!selectedSku) {
                    return (
                      <li key={item.id} className="flex justify-between text-sm items-center">
                        <span className="text-slate-400 italic flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
                          {item.productName || `Product #${item.productId}`} - Pending selection
                        </span>
                      </li>
                    );
                  }
                  
                  return (
                    <li key={item.id} className="flex justify-between items-start text-sm gap-4">
                      <div className="flex flex-col pl-3 relative">
                        <span className="absolute left-0 top-2 h-1.5 w-1.5 rounded-full bg-eagle-green"></span>
                        <span className="text-slate-700 font-medium">{item.productName || `Product #${item.productId}`}</span>
                        <span className="text-slate-500 text-xs mt-0.5">{selectedSku.name || selectedSku.sku || `SKU #${selectedSku.id}`}</span>
                      </div>
                      <span className="font-semibold text-eagle-green whitespace-nowrap bg-eagle-green/10 px-2 py-1 rounded-md text-xs">
                        Qty: {requiredQuantity}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="grid gap-4 pt-6 mt-6 border-t border-slate-100">
              <div className="rounded-xl border border-eagle-green/20 p-5 bg-gradient-to-r from-eagle-green/5 to-transparent space-y-1 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-eagle-green/60 uppercase tracking-widest mb-1.5">
                    Estimated total
                  </p>
                  <p className="text-3xl font-bold text-eagle-green tracking-tight">
                    {formatPrice(
                      packageEstimatedTotal.amount,
                      packageEstimatedTotal.currency
                    )}
                  </p>
                  {packageDetail.giftWrappable && packageDetail.giftWrapPrice ? (
                    <p className="text-xs font-medium text-eagle-green/70 flex items-center gap-1.5 mt-2.5">
                      <Gift className="h-4 w-4 text-eagle-green" />
                      Includes available gift wrap option
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full bg-eagle-green hover:bg-viridian-green text-white font-medium text-base rounded-xl h-12 shadow-sm hover:shadow-md transition-all active:scale-[0.99]"
              disabled={!canAddToCart || addToCartMutation.isPending}
              onClick={() => addToCartMutation.mutate()}
            >
              {addToCartMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                  Adding Package...
                </>
              ) : (
                "Add Package to Cart"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
