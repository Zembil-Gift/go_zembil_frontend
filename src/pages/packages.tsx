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
import { Badge } from "@/components/ui/badge";
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
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="font-bold text-xl text-eagle-green">
              Browse by Category
            </span>
          </div>
          <div className="flex overflow-x-auto scrollbar-hide gap-3 py-2 -mx-4 px-4 sm:mx-0 sm:px-2 sm:flex-wrap">
            {categories.map((category) => {
              const Icon = getIconByName(category.iconName);
              const isActive = selectedCategoryId === category.id;

              return (
                <Button
                  key={category.id}
                  variant={isActive ? "default" : "outline"}
                  onClick={() => handleCategorySelect(category.id)}
                  className={`
                    flex items-center gap-2 px-5 py-3 h-12 rounded-full transition-all duration-300
                    ${
                      isActive
                        ? "bg-gradient-to-r from-eagle-green to-viridian-green text-white border-0 shadow-lg shadow-eagle-green/25 scale-105"
                        : "bg-white border-2 border-eagle-green/20 text-eagle-green hover:border-viridian-green hover:bg-viridian-green/5 hover:text-viridian-green hover:scale-105"
                    }
                  `}
                  aria-pressed={isActive}
                >
                  <Icon
                    className={`h-5 w-5 transition-transform duration-300 ${
                      isActive ? "text-june-bud" : ""
                    }`}
                  />
                  <span className="font-bold">{category.name}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {currentCategory && subCategories.length > 0 && (
          <div className="mb-8 p-6 bg-white/80 backdrop-blur-xl rounded-3xl border border-june-bud/20 shadow-xl shadow-eagle-green/5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-eagle-green flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-june-bud/20 to-viridian-green/10 rounded-xl">
                  {(() => {
                    const CategoryIcon = getIconByName(currentCategory.iconName);
                    return <CategoryIcon className="h-5 w-5 text-viridian-green" />;
                  })()}
                </div>
                <span>{currentCategory.name} Categories</span>
              </h2>
              {selectedSubCategoryId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSubCategoryId(undefined)}
                  className="text-eagle-green/70 hover:text-viridian-green hover:bg-viridian-green/10 font-medium rounded-full px-4"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            {subCategoriesLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-2xl bg-june-bud/10" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 py-2 px-2">
                  {(showAllSubCategories
                    ? subCategories
                    : subCategories.slice(0, 5)
                  ).map((subcategory) => {
                    const Icon = getIconByName(subcategory.iconName);
                    const isSelected = selectedSubCategoryId === subcategory.id;

                    return (
                      <Button
                        key={subcategory.id}
                        variant="ghost"
                        onClick={() => handleSubCategorySelect(subcategory.id)}
                        className={`
                          flex flex-col items-center gap-2 p-4 h-24 w-full rounded-2xl transition-all duration-300 border-2
                          ${
                            isSelected
                              ? "bg-gradient-to-br from-viridian-green/10 to-june-bud/10 border-viridian-green text-eagle-green shadow-lg scale-105"
                              : "bg-white/50 border-transparent text-eagle-green/70 hover:border-june-bud/30 hover:bg-june-bud/5 hover:scale-102"
                          }
                        `}
                        aria-pressed={isSelected}
                      >
                        <div
                          className={`p-2 rounded-xl transition-all duration-300 ${
                            isSelected ? "bg-viridian-green/20" : "bg-eagle-green/5"
                          }`}
                        >
                          <Icon
                            className={`h-6 w-6 ${
                              isSelected ? "text-viridian-green" : "text-eagle-green/60"
                            }`}
                          />
                        </div>
                        <span
                          className={`text-xs font-bold text-center leading-tight ${
                            isSelected ? "text-eagle-green" : "text-eagle-green/70"
                          }`}
                        >
                          {subcategory.name}
                        </span>
                      </Button>
                    );
                  })}

                  {!showAllSubCategories && subCategories.length > 5 && (
                    <Button
                      variant="ghost"
                      onClick={() => setShowAllSubCategories(true)}
                      className="flex flex-col items-center justify-center gap-2 p-4 h-24 w-full rounded-2xl transition-all duration-300 border-2 border-dashed border-viridian-green/30 bg-viridian-green/5 text-viridian-green hover:bg-viridian-green/10 hover:border-viridian-green"
                    >
                      <div className="p-2 rounded-xl bg-viridian-green/20">
                        <ChevronDown className="h-6 w-6" />
                      </div>
                      <span className="text-xs font-bold text-center leading-tight">
                        Show {subCategories.length - 5} More
                      </span>
                    </Button>
                  )}
                </div>

                {showAllSubCategories && (
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllSubCategories(false)}
                      className="text-eagle-green/60 hover:text-viridian-green hover:bg-viridian-green/5 font-medium rounded-full px-6 flex items-center gap-2"
                    >
                      <ChevronUp className="h-4 w-4" />
                      Show Less
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

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
          {hasFilters && (
            <Button
              variant="outline"
              onClick={handleClearFilters}
              className="h-14 rounded-2xl border-eagle-green/20 text-eagle-green hover:bg-eagle-green hover:text-white"
            >
              Clear
            </Button>
          )}
        </div>

        {hasFallbackResults && (
          <Card className="mb-6 border-june-bud/30 bg-june-bud/10">
            <CardContent className="py-4 text-sm text-eagle-green">
              No packages found for this category. Showing all packages
              instead.
            </CardContent>
          </Card>
        )}

        {(isLoading || categoriesLoading) && (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                Try adjusting your filters or check back soon for new bundles.
              </p>
            </CardContent>
          </Card>
        )}

        {!isLoading && filteredPackages.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPackages.map((pkg) => {
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
                        {pkg.vendorName ? <span> • by {pkg.vendorName}</span> : null}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <p className="text-sm sm:text-base lg:text-lg font-bold text-eagle-green break-all leading-tight">
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
