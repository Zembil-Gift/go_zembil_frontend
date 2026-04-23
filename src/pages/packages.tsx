import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Gift, Package as PackageIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageNavigator } from "@/components/PageNavigator";
import {
  packageService,
  ProductPackageResponse,
} from "@/services/packageService";
import { formatPrice, getCurrencyDecimals } from "@/lib/currency";

const ITEMS_PER_PAGE = 12;
const IN_MEMORY_FETCH_SIZE = 500;

const toMajor = (minor?: number, currency?: string): number => {
  if (typeof minor !== "number") return 0;
  const decimals = getCurrencyDecimals(currency || "ETB");
  return minor / Math.pow(10, decimals);
};

const getPackageCover = (pkg: ProductPackageResponse): string | undefined => {
  if (pkg.images?.length) {
    return pkg.images[0];
  }

  const image = pkg.items?.find((item) => !!item.productImage)?.productImage;
  return image || undefined;
};

const getEstimatedPackagePrice = (
  pkg: ProductPackageResponse
): {
  amount: number;
  currency: string;
} => {
  if (typeof pkg.startingFromPriceMinor === "number") {
    const currency = pkg.displayCurrency || pkg.giftWrapCurrency || "ETB";
    return {
      amount: toMajor(pkg.startingFromPriceMinor, currency),
      currency,
    };
  }

  const activeSkuPrices = (pkg.items || [])
    .flatMap((item) => item.availableSkus || [])
    .filter((sku) => (sku.status || "").toUpperCase() === "ACTIVE")
    .map((sku) => ({
      amount: toMajor(sku.priceMinor || 0, sku.priceCurrency || "ETB"),
      currency: sku.priceCurrency || "ETB",
    }));

  if (activeSkuPrices.length === 0) {
    return { amount: 0, currency: pkg.giftWrapCurrency || "ETB" };
  }

  return activeSkuPrices.reduce((sum, price) => ({
    amount: sum.amount + price.amount,
    currency: price.currency || sum.currency,
  }));
};

const isPackageSelectable = (pkg: ProductPackageResponse): boolean => {
  const items = pkg.items || [];
  if (items.length === 0) return false;

  return items.every((item) => {
    const requiredQuantity = Math.max(1, item.requiredQuantity || 1);
    return (item.availableSkus || []).some((sku) => {
      const stock = sku.stockQty ?? sku.quantity ?? 0;
      return (
        (sku.status || "").toUpperCase() === "ACTIVE" &&
        stock >= requiredQuantity
      );
    });
  });
};

export default function PackagesPage() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const subCategoryId = params.get("subCategoryId")
    ? Number(params.get("subCategoryId"))
    : undefined;

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      "packages",
      "browse",
      { subCategoryId, size: IN_MEMORY_FETCH_SIZE },
    ],
    queryFn: () =>
      packageService.browsePackages({
        page: 0,
        size: IN_MEMORY_FETCH_SIZE,
        subCategoryId,
      }),
  });

  const packages = data?.content || [];

  const visiblePackages = useMemo(
    () => packages.filter((pkg) => isPackageSelectable(pkg)),
    [packages]
  );

  const filteredPackages = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return visiblePackages;

    return visiblePackages.filter((pkg) => {
      return (
        pkg.name.toLowerCase().includes(normalized) ||
        pkg.summary?.toLowerCase().includes(normalized) ||
        pkg.description?.toLowerCase().includes(normalized) ||
        pkg.vendorName?.toLowerCase().includes(normalized)
      );
    });
  }, [visiblePackages, search]);

  useEffect(() => {
    setPage(0);
  }, [search, subCategoryId]);

  const paginatedPackages = useMemo(() => {
    const start = page * ITEMS_PER_PAGE;
    return filteredPackages.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPackages, page]);

  const totalFilteredPages = Math.max(
    1,
    Math.ceil(filteredPackages.length / ITEMS_PER_PAGE)
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-light-cream to-white">
      <section className="bg-eagle-green">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="h-5 w-5 text-white" />
            <h1 className="text-2xl lg:text-3xl font-bold text-white">
              Package Bundles
            </h1>
          </div>
          <p className="text-sm lg:text-base font-light text-white/80 max-w-2xl">
            Ready-made gift combinations you can customize and order in one
            step.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex-1 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-eagle-green/20 to-viridian-green/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
            <div className="relative bg-white rounded-2xl shadow-lg shadow-eagle-green/5 border border-eagle-green/10 overflow-hidden">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-eagle-green/40 h-5 w-5" />
              <Input
                placeholder="Search packages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 pr-4 h-14 bg-transparent border-0 focus:ring-0 focus-visible:ring-0 font-light text-eagle-green placeholder:text-eagle-green/40 w-full"
              />
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <Card key={idx} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && filteredPackages.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <PackageIcon className="h-14 w-14 text-eagle-green/30 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-eagle-green mb-2">
                No packages found
              </h2>
              <p className="text-eagle-green/70">
                Try adjusting search or check back soon for new bundles.
              </p>
            </CardContent>
          </Card>
        )}

        {!isLoading && filteredPackages.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedPackages.map((pkg) => {
                const cover = getPackageCover(pkg);
                const estimatedPrice = getEstimatedPackagePrice(pkg);
                const isActive = (pkg.status || "").toUpperCase() === "ACTIVE";

                return (
                  <Card
                    key={pkg.id}
                    className="overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="h-48 bg-gray-100">
                      {cover ? (
                        <img
                          src={cover}
                          alt={pkg.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <PackageIcon className="h-10 w-10" />
                        </div>
                      )}
                    </div>

                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-eagle-green line-clamp-2">
                          {pkg.name}
                        </h3>
                        <Badge
                          className={
                            isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-slate-100 text-slate-800"
                          }
                        >
                          {isActive ? "Active" : pkg.status}
                        </Badge>
                      </div>

                      {pkg.summary && (
                        <p className="text-sm text-eagle-green/70 line-clamp-2">
                          {pkg.summary}
                        </p>
                      )}

                      <div className="text-sm text-eagle-green/70">
                        <span>{pkg.items?.length || 0} item(s)</span>
                        {pkg.vendorName ? (
                          <span> • by {pkg.vendorName}</span>
                        ) : null}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <p className="text-lg font-bold text-eagle-green">
                          {formatPrice(
                            estimatedPrice.amount,
                            estimatedPrice.currency
                          )}
                        </p>
                        <Button
                          asChild
                          className="bg-eagle-green hover:bg-viridian-green text-white"
                        >
                          <Link to={`/packages/${pkg.id}`}>View</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <PageNavigator
              currentPage={page}
              totalPages={totalFilteredPages}
              onPageChange={setPage}
              isLoading={isFetching}
              totalItems={filteredPackages.length}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          </>
        )}
      </div>
    </div>
  );
}
