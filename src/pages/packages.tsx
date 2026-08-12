import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Gift,
  Package as PackageIcon,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageNavigator } from "@/components/PageNavigator";
import { getIconByName } from "@/components/admin/IconPicker";
import {
  packageService,
  ProductPackageResponse,
  PageResponse,
} from "@/services/packageService";
import { categoryService } from "@/services/categoryService";
import { formatPrice, getCurrencyDecimals } from "@/lib/currency";
import { useSearchAnalytics } from "@/hooks/useSearchAnalytics";
import { useTranslation } from "react-i18next";

const ITEMS_PER_PAGE = 20;

interface PackageBrowseResult extends PageResponse<ProductPackageResponse> {
  isFallback: boolean;
}

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

const toOptionalNumber = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

export default function PackagesPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(location.search);
  const categoryIdParam = toOptionalNumber(urlParams.get("categoryId"));
  const subCategoryIdParam = toOptionalNumber(urlParams.get("subCategoryId"));
  const pageParam = Math.max(0, toOptionalNumber(urlParams.get("page")) ?? 0);
  const searchParam = urlParams.get("search") || "";

  const [search, setSearch] = useState(searchParam);
  const [debouncedSearch, setDebouncedSearch] = useState(searchParam);
  const [page, setPage] = useState(pageParam);
  const [selectedCategoryId, setSelectedCategoryId] = useState<
    number | undefined
  >(categoryIdParam);
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<
    number | undefined
  >(subCategoryIdParam);
  const [showAllSubCategories, setShowAllSubCategories] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategoryId) params.set("categoryId", String(selectedCategoryId));
    if (selectedSubCategoryId)
      params.set("subCategoryId", String(selectedSubCategoryId));
    if (page > 0) params.set("page", String(page));
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

    const newSearch = params.toString();
    const currentSearch = location.search.replace("?", "");
    if (newSearch !== currentSearch) {
      navigate(`/packages${newSearch ? `?${newSearch}` : ""}`, {
        replace: true,
      });
    }
  }, [
    selectedCategoryId,
    selectedSubCategoryId,
    page,
    debouncedSearch,
    navigate,
    location.search,
  ]);

  useEffect(() => {
    setShowAllSubCategories(false);
  }, [selectedCategoryId]);

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryService.getCategories(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: subCategories = [], isLoading: subCategoriesLoading } =
    useQuery({
      queryKey: ["subCategories", selectedCategoryId],
      queryFn: () =>
        selectedCategoryId
          ? categoryService.getSubCategories(selectedCategoryId)
          : Promise.resolve([]),
      enabled: !!selectedCategoryId,
      staleTime: 5 * 60 * 1000,
    });

  const currentCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId),
    [categories, selectedCategoryId]
  );

  const { data, isLoading, isFetching } = useQuery<PackageBrowseResult>({
    queryKey: [
      "packages",
      "browse",
      {
        page,
        size: ITEMS_PER_PAGE,
        categoryId: selectedCategoryId,
        subCategoryId: selectedSubCategoryId,
      },
    ],
    queryFn: async () => {
      const filtered = await packageService.browsePackages({
        page,
        size: ITEMS_PER_PAGE,
        categoryId: selectedCategoryId,
        subCategoryId: selectedSubCategoryId,
      });

      const hasFilters = Boolean(selectedCategoryId || selectedSubCategoryId);
      if (hasFilters && filtered.content.length === 0) {
        const allPackages = await packageService.browsePackages({
          page,
          size: ITEMS_PER_PAGE,
        });
        return { ...allPackages, isFallback: true };
      }

      return { ...filtered, isFallback: false };
    },
  });

  const packages = data?.content || [];
  const hasFallbackResults = data?.isFallback ?? false;

  const visiblePackages = useMemo(
    () => packages.filter((pkg) => isPackageSelectable(pkg)),
    [packages]
  );

  const filteredPackages = useMemo(() => {
    const normalized = debouncedSearch.trim().toLowerCase();
    if (!normalized) return visiblePackages;

    return visiblePackages.filter((pkg) => {
      return (
        pkg.name.toLowerCase().includes(normalized) ||
        pkg.summary?.toLowerCase().includes(normalized) ||
        pkg.description?.toLowerCase().includes(normalized) ||
        pkg.vendorName?.toLowerCase().includes(normalized)
      );
    });
  }, [visiblePackages, debouncedSearch]);

  const handleCategorySelect = (categoryId: number) => {
    setPage(0);
    if (selectedCategoryId === categoryId) {
      setSelectedCategoryId(undefined);
      setSelectedSubCategoryId(undefined);
      return;
    }
    setSelectedCategoryId(categoryId);
    setSelectedSubCategoryId(undefined);
  };

  const handleSubCategorySelect = (subCategoryId: number) => {
    setPage(0);
    if (selectedSubCategoryId === subCategoryId) {
      setSelectedSubCategoryId(undefined);
      return;
    }
    setSelectedSubCategoryId(subCategoryId);
  };

  const handleClearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setPage(0);
    setSelectedCategoryId(undefined);
    setSelectedSubCategoryId(undefined);
  };

  const hasFilters = Boolean(
    selectedCategoryId || selectedSubCategoryId || debouncedSearch.trim()
  );

  useSearchAnalytics(
    {
      searchTerm: debouncedSearch,
      pageName: "Packages",
      pageType: "PACKAGE_LIST",
      searchSource: "PAGE_SEARCH_BAR",
      resultCount: filteredPackages.length,
      context: {
        filters: {
          categoryId: selectedCategoryId,
          subCategoryId: selectedSubCategoryId,
        },
        routeParams: {
          categoryId: selectedCategoryId,
          subCategoryId: selectedSubCategoryId,
        },
      },
    },
    {
      enabled: !isFetching,
    }
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-light-cream to-white">
      <section className="bg-eagle-green">
        <div className="page-shell py-5">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-white" />
            <h1 className="text-xl lg:text-2xl font-bold text-white">
              {t("Package Bundles")}
            </h1>
          </div>
          <p className="mt-1 text-xs lg:text-sm font-light text-white/80">
            {t("Ready-made gift combinations you can customize and order in one step.")}
          </p>
        </div>
      </section>

      <div className="page-shell py-6">
        <div className="mb-5">
          <h2 className="mb-2.5 font-bold text-base text-eagle-green">
            {t("Browse by Category")}
          </h2>
          <div className="flex overflow-x-auto scrollbar-hide gap-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
            {categories.map((category) => {
              const Icon = getIconByName(category.iconName);
              const isActive = selectedCategoryId === category.id;

              return (
                <Button
                  key={category.id}
                  variant={isActive ? "default" : "outline"}
                  onClick={() => handleCategorySelect(category.id)}
                  className={`
                    flex items-center gap-1.5 px-3.5 h-9 rounded-full text-sm transition-colors
                    ${
                      isActive
                        ? "bg-eagle-green text-white border-0"
                        : "bg-white border border-eagle-green/20 text-eagle-green hover:border-viridian-green hover:bg-viridian-green/5 hover:text-viridian-green"
                    }
                  `}
                  aria-pressed={isActive}
                >
                  <Icon
                    className={`h-4 w-4 ${isActive ? "text-june-bud" : ""}`}
                  />
                  <span className="font-semibold">{t(category.name)}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {currentCategory && subCategories.length > 0 && (
          <div className="mb-5 p-4 bg-white rounded-2xl border border-june-bud/20">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-eagle-green flex items-center gap-2">
                {(() => {
                  const CategoryIcon = getIconByName(currentCategory.iconName);
                  return <CategoryIcon className="h-4 w-4 text-viridian-green" />;
                })()}
                <span>{currentCategory.name} {t("Categories")}</span>
              </h2>
              {selectedSubCategoryId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSubCategoryId(undefined)}
                  className="h-8 text-eagle-green/70 hover:text-viridian-green hover:bg-viridian-green/10 font-medium rounded-full px-3"
                >
                  <X className="h-4 w-4 mr-1" />
                  {t("Clear")}
                </Button>
              )}
            </div>

            {subCategoriesLoading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-[70px] rounded-xl bg-june-bud/10" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  {(showAllSubCategories
                    ? subCategories
                    : subCategories.slice(0, 7)
                  ).map((subcategory) => {
                    const Icon = getIconByName(subcategory.iconName);
                    const isSelected = selectedSubCategoryId === subcategory.id;

                    return (
                      <Button
                        key={subcategory.id}
                        variant="ghost"
                        onClick={() => handleSubCategorySelect(subcategory.id)}
                        className={`
                          flex flex-col items-center gap-1 p-2 h-[70px] w-full rounded-xl transition-colors border
                          ${
                            isSelected
                              ? "bg-viridian-green/10 border-viridian-green text-eagle-green"
                              : "bg-white border-transparent text-eagle-green/70 hover:border-june-bud/30 hover:bg-june-bud/5"
                          }
                        `}
                        aria-pressed={isSelected}
                      >
                        <Icon
                          className={`h-5 w-5 shrink-0 ${
                            isSelected ? "text-viridian-green" : "text-eagle-green/60"
                          }`}
                        />
                        <span
                          className={`text-[11px] font-semibold text-center leading-tight line-clamp-2 ${
                            isSelected ? "text-eagle-green" : "text-eagle-green/70"
                          }`}
                        >
                          {t(subcategory.name)}
                        </span>
                      </Button>
                    );
                  })}

                  {!showAllSubCategories && subCategories.length > 7 && (
                    <Button
                      variant="ghost"
                      onClick={() => setShowAllSubCategories(true)}
                      className="flex flex-col items-center justify-center gap-1 p-2 h-[70px] w-full rounded-xl transition-colors border border-dashed border-viridian-green/30 bg-viridian-green/5 text-viridian-green hover:bg-viridian-green/10 hover:border-viridian-green"
                    >
                      <ChevronDown className="h-5 w-5" />
                      <span className="text-[11px] font-semibold text-center leading-tight">
                        {t("Show")} {subCategories.length - 7} {t("More")}
                      </span>
                    </Button>
                  )}
                </div>

                {showAllSubCategories && (
                  <div className="flex justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllSubCategories(false)}
                      className="h-8 text-eagle-green/60 hover:text-viridian-green hover:bg-viridian-green/5 font-medium rounded-full px-4 flex items-center gap-1.5"
                    >
                      <ChevronUp className="h-4 w-4" />
                      {t("Show Less")}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 mb-5">
          <div className="flex-1 relative">
            <div className="relative bg-white rounded-xl shadow-sm border border-eagle-green/10 overflow-hidden">
              <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-eagle-green/40 h-4 w-4" />
              <Input
                placeholder={t("Search packages...")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 h-11 bg-transparent border-0 focus:ring-0 focus-visible:ring-0 text-sm text-eagle-green placeholder:text-eagle-green/40 w-full"
              />
            </div>
          </div>
          {hasFilters && (
            <Button
              variant="outline"
              onClick={handleClearFilters}
              className="h-11 rounded-xl border-eagle-green/20 text-eagle-green hover:bg-eagle-green hover:text-white"
            >
              {t("Clear")}
            </Button>
          )}
        </div>

        {hasFallbackResults && (
          <div className="mb-4 rounded-xl border border-june-bud/30 bg-june-bud/10 px-4 py-2.5 text-sm text-eagle-green">
            {t("No packages found for this category. Showing all packages instead.")}
          </div>
        )}

        {(isLoading || categoriesLoading) && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
            {Array.from({ length: 12 }).map((_, idx) => (
              <Card key={idx} className="overflow-hidden">
                <Skeleton className="aspect-square w-full" />
                <CardContent className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && filteredPackages.length === 0 && (
          <div className="py-14 text-center">
            <PackageIcon className="h-12 w-12 text-eagle-green/30 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-eagle-green mb-1">
              {t("No packages found")}
            </h2>
            <p className="text-sm text-eagle-green/70">
              {t("Try adjusting your filters or check back soon for new bundles.")}
            </p>
          </div>
        )}

        {!isLoading && filteredPackages.length > 0 && (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
              {filteredPackages.map((pkg) => {
                const cover = getPackageCover(pkg);
                const estimatedPrice = getEstimatedPackagePrice(pkg);

                return (
                  <Link
                    key={pkg.id}
                    to={`/packages/${pkg.id}`}
                    className="group block bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300"
                  >
                    <div className="aspect-square bg-gray-100 overflow-hidden">
                      {cover ? (
                        <img
                          src={cover}
                          alt={pkg.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <PackageIcon className="h-8 w-8" />
                        </div>
                      )}
                    </div>

                    <div className="p-3">
                      <h3 className="font-bold text-sm text-eagle-green line-clamp-2 group-hover:text-viridian-green transition-colors">
                        {pkg.name}
                      </h3>
                      <p className="mt-0.5 text-[11px] text-eagle-green/60 line-clamp-1">
                        {pkg.items?.length || 0} {t("item(s)")}
                        {pkg.vendorName ? ` ${t("• by")} ${pkg.vendorName}` : ""}
                      </p>
                      <p className="mt-1.5 text-sm font-bold text-eagle-green whitespace-nowrap">
                        {formatPrice(
                          estimatedPrice.amount,
                          estimatedPrice.currency
                        )}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>

            {!debouncedSearch.trim() && (
              <PageNavigator
                currentPage={page}
                totalPages={Math.max(1, data?.totalPages || 1)}
                onPageChange={setPage}
                isLoading={isFetching}
                totalItems={data?.totalElements || 0}
                itemsPerPage={ITEMS_PER_PAGE}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
