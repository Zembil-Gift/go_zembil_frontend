import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { useActiveCurrency } from "@/hooks/useActiveCurrency";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import FadeIn from "@/components/animations/FadeIn";
import SlideIn from "@/components/animations/SlideIn";
import {
  ProductGridStagger,
  ProductGridItem,
} from "@/components/animations/StaggerAnimations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  ChevronRight,
  Package,
  Sparkles,
  Gift,
  X,
  Filter,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import GiftItemCard from "@/components/gift-card";
import {
  productService,
  Product,
  PagedProductResponse,
} from "@/services/productService";
import { categoryService } from "@/services/categoryService";
import { getAllProductImages } from "@/utils/imageUtils";
import { getIconByName } from "@/components/admin/IconPicker";
import GeramiSignatureSets from "@/components/ZembilSignatureSets.tsx";
import { useSearchAnalytics } from "@/hooks/useSearchAnalytics";
import { useTranslation } from "react-i18next";
import type { MetaFunction } from "react-router";
import { seoMeta } from "@/lib/seo-meta";
import { STATIC_ROUTES, slugToLabel } from "@/lib/seo";

// Three routes render this page: /shop, /shop/:categorySlug and
// /shop/category/:subcategorySlug. Each needs its own title, and the canonical
// must drop ?search=/?sort= so filtered views collapse onto the clean category
// URL instead of competing with it (seoMeta defaults the canonical to the
// pathname, which is exactly that).
export const meta: MetaFunction = ({ params, location }) => {
  const slug = params.subcategorySlug || params.categorySlug;
  const label = slug ? slugToLabel(slug) : null;
  return seoMeta(
    label
      ? {
          title: `${label} — Ethiopian Gifts Delivered`,
          description: `Shop ${label.toLowerCase()} from verified Ethiopian vendors on goGerami. Ordered from anywhere, delivered anywhere in Ethiopia.`,
        }
      : {
          title: STATIC_ROUTES["/shop"].title,
          description: STATIC_ROUTES["/shop"].description,
          canonicalPath: "/shop",
        },
    location.pathname,
  );
};

export default function Shop() {
  return <ShopContent />;
}

function ProductCardSkeletons({ count }: { count: number }) {
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <Card
          key={i}
          className="group overflow-hidden border-0 shadow-md bg-white rounded-2xl"
        >
          <CardContent className="p-0">
            <Skeleton className="h-56 w-full bg-june-bud/10" />
            <div className="p-4">
              <Skeleton className="h-5 w-3/4 mb-2 bg-june-bud/20" />
              <Skeleton className="h-4 w-1/2 mb-3 bg-june-bud/20" />
              <Skeleton className="h-6 w-1/3 bg-june-bud/20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

function ShopContent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  // /shop/:categorySlug and /shop/category/:subcategorySlug carry the category
  // filter in the path. The pills below link to those URLs, so a category is
  // selectable before hydration and with scripts off; ?categoryId= is the older
  // form other pages link to and still resolves.
  const { categorySlug, subcategorySlug } = useParams<{
    categorySlug?: string;
    subcategorySlug?: string;
  }>();
  const activeCurrency = useActiveCurrency();

  // Parse URL parameters
  const urlParams = new URLSearchParams(location.search);
  const categoryIdParam = urlParams.get("categoryId");
  const subCategoryIdParam = urlParams.get("subCategoryId");
  const searchParam = urlParams.get("search") || "";

  const [viewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("newest");
  const [searchTerm, setSearchTerm] = useState(searchParam);
  const [debouncedSearch, setDebouncedSearch] = useState(searchParam);
  const [itemsPerPage] = useState(12);
  const selectedCategoryId = categoryIdParam ? parseInt(categoryIdParam) : undefined;
  const selectedSubCategoryId = subCategoryIdParam
    ? parseInt(subCategoryIdParam)
    : undefined;
  const [showAllSubCategories, setShowAllSubCategories] = useState(false);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);

  // Fetch categories from backend
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryService.getCategories(),
    staleTime: 5 * 60 * 1000,
  });

  // Turn the path slugs into the ids the filters and the query key are built
  // from. The slug wins over ?categoryId=.
  const slugCategory = useMemo(
    () => (categorySlug ? categories.find((c) => c.slug === categorySlug) : undefined),
    [categorySlug, categories]
  );

  // Only /shop/category/:subcategorySlug needs the whole tree, to find which
  // category the subcategory slug belongs to.
  const { data: categoriesWithSubcategories = [] } = useQuery({
    queryKey: ["categories", "with-subcategories"],
    queryFn: () => categoryService.getCategoriesWithSubcategories(),
    enabled: !!subcategorySlug,
    staleTime: 5 * 60 * 1000,
  });

  const slugSubCategory = useMemo(() => {
    if (!subcategorySlug) return undefined;
    for (const category of categoriesWithSubcategories) {
      const sub = category.subcategories?.find((item) => item.slug === subcategorySlug);
      if (sub) return sub;
    }
    return undefined;
  }, [subcategorySlug, categoriesWithSubcategories]);

  const activeCategoryId = slugSubCategory?.categoryId ?? slugCategory?.id ?? selectedCategoryId;
  const activeSubCategoryId = slugSubCategory?.id ?? selectedSubCategoryId;

  // Reset showAllSubCategories when category changes
  useEffect(() => {
    setShowAllSubCategories(false);
  }, [activeCategoryId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch subcategories when a category is selected
  const { data: subCategories = [], isLoading: subCategoriesLoading } =
    useQuery({
      queryKey: ["subCategories", activeCategoryId],
      queryFn: () =>
        activeCategoryId
          ? categoryService.getSubCategories(activeCategoryId)
          : Promise.resolve([]),
      enabled: !!activeCategoryId,
      staleTime: 5 * 60 * 1000,
    });

  // Get current category and subcategory objects
  const currentCategory = useMemo(
    () => categories.find((c) => c.id === activeCategoryId),
    [categories, activeCategoryId]
  );

  const currentSubCategory = useMemo(
    () => subCategories.find((s) => s.id === activeSubCategoryId),
    [subCategories, activeSubCategoryId]
  );

  // Fetch products with filters. Public catalogue data, so it does not wait on
  // the /auth/refresh handshake (see landing.tsx); the SSR loader in
  // routes/shop.tsx seeds this same key and is what paints the first page.
  const {
    data: productsData,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery<PagedProductResponse>({
    queryKey: [
      "products",
      "filtered",
      {
        size: itemsPerPage,
        search: debouncedSearch,
        categoryId: activeCategoryId,
        subCategoryId: activeSubCategoryId,
        sortBy,
        currency: activeCurrency,
      },
    ],
    queryFn: ({ pageParam }) =>
      productService.getFilteredProducts({
        page: pageParam as number,
        size: itemsPerPage,
        search: debouncedSearch || undefined,
        categoryId: activeCategoryId,
        subCategoryId: activeSubCategoryId,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.last ? undefined : lastPage.number + 1,
    // ponytail: keeps the page mounted while a new search fetches, so the
    // input never unmounts (that was the "full page refresh" while typing)
    placeholderData: keepPreviousData,
  });

  const products = useMemo(
    () => productsData?.pages.flatMap((page) => page.content) || [],
    [productsData]
  );
  const totalProducts = productsData?.pages[0]?.totalElements || 0;

  // Keep the search term in the query string. The category filters live in the
  // path, so this must navigate to the current pathname -- rewriting it to
  // /shop would drop a /shop/:categorySlug the user is standing on.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (debouncedSearch) params.set("search", debouncedSearch);
    else params.delete("search");

    const newSearch = params.toString();
    const currentSearch = location.search.replace("?", "");

    if (newSearch !== currentSearch) {
      navigate(`${location.pathname}${newSearch ? `?${newSearch}` : ""}`, {
        replace: true,
      });
    }
  }, [debouncedSearch, location.pathname, location.search, navigate]);

  // Clear all filters: the category filters are path segments, so this is a
  // navigation; the search box is local state.
  const clearSearch = () => {
    setSearchTerm("");
    setDebouncedSearch("");
  };

  const handleClearFilters = () => {
    clearSearch();
    navigate("/shop");
  };

  const displayProducts = products.map((product: Product) => ({
    ...product,
    images: getAllProductImages(product.images),
    price: product.price || product.productSku?.[0]?.price || 0,
  }));

  // Fetching a new filter/search result (not appending the next page)
  const isSearching = isFetching && !isFetchingNextPage;
  const hasFilters =
    activeCategoryId || activeSubCategoryId || debouncedSearch;

  useEffect(() => {
    if (!hasNextPage) return;

    const triggerElement = loadMoreTriggerRef.current;
    if (!triggerElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "300px 0px" }
    );

    observer.observe(triggerElement);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useSearchAnalytics(
    {
      searchTerm: debouncedSearch,
      pageName: "Shop",
      pageType: "PRODUCT_LIST",
      searchSource: "PAGE_SEARCH_BAR",
      resultCount: totalProducts,
      context: {
        filters: {
          categoryId: activeCategoryId,
          subCategoryId: activeSubCategoryId,
        },
        sort: sortBy,
        routeParams: {
          categoryId: categoryIdParam,
          subCategoryId: subCategoryIdParam,
        },
      },
    },
    {
      enabled: !isFetching,
    }
  );

  // Cold start only — never on search, or the search input would unmount
  if (categoriesLoading && products.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-light-cream to-white">
        {/* Hero skeleton */}
        <div className="relative bg-eagle-green">
          <div className="page-shell py-5">
            <Skeleton className="h-7 w-72 mb-2 bg-white/20" />
            <Skeleton className="h-4 w-80 bg-white/20" />
          </div>
        </div>

        <div className="page-shell py-6">
          {/* Category pills skeleton */}
          <div className="flex flex-wrap gap-2 mb-5">
            {[...Array(6)].map((_, i) => (
              <Skeleton
                key={i}
                className="h-9 w-28 rounded-full bg-june-bud/20"
              />
            ))}
          </div>

          {/* Search skeleton */}
          <div className="flex gap-2 mb-5">
            <Skeleton className="flex-1 h-11 rounded-xl bg-june-bud/20" />
            <Skeleton className="w-11 h-11 rounded-xl bg-june-bud/20" />
          </div>

          {/* Products grid skeleton */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
            <ProductCardSkeletons count={12} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-light-cream to-white">
      {/* Simplified Hero Section */}
      <section className="bg-eagle-green">
        <div className="page-shell py-5">
          <FadeIn delay={0.1}>
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-white" />
              <h1 className="text-xl lg:text-2xl font-bold text-white">
                {t("Shop Gifts")}
              </h1>
            </div>
            <p className="mt-1 text-xs lg:text-sm font-light text-white/80">
              {t("Handcrafted gifts from talented Ethiopian artisans")}
            </p>
          </FadeIn>
        </div>
      </section>

      <div className="page-shell py-6 relative z-10">
        {/* Category Pills */}
        <FadeIn delay={0.2}>
          <div className="mb-5">
            <h2 className="mb-2.5 font-bold text-base text-eagle-green">
              {t("Browse by Category")}
            </h2>
            <div className="flex overflow-x-auto scrollbar-hide gap-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
              {categories.map((category, index) => {
                const Icon = getIconByName(category.iconName);
                const isActive = activeCategoryId === category.id;

                return (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    {/* A link, not a button: the category URL works before
                        hydration and with scripts off. Clicking the active pill
                        clears the filter. */}
                    <Button
                      asChild
                      variant={isActive ? "default" : "outline"}
                      className={`
                        flex items-center gap-1.5 px-3.5 h-9 rounded-full text-sm transition-colors
                        ${
                          isActive
                            ? "bg-eagle-green text-white border-0"
                            : "bg-white border border-eagle-green/20 text-eagle-green hover:border-viridian-green hover:bg-viridian-green/5 hover:text-viridian-green"
                        }
                      `}
                    >
                      <Link
                        to={isActive ? "/shop" : `/shop/${category.slug}`}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <Icon
                          className={`h-4 w-4 ${isActive ? "text-june-bud" : ""}`}
                        />
                        <span className="font-semibold">{t(category.name)}</span>
                      </Link>
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </FadeIn>

        {/* Subcategory Panel */}
        {currentCategory && subCategories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="mb-5 p-4 bg-white rounded-2xl border border-june-bud/20"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-eagle-green flex items-center gap-2">
                {(() => {
                  const CategoryIcon = getIconByName(currentCategory.iconName);
                  return (
                    <CategoryIcon className="h-4 w-4 text-viridian-green" />
                  );
                })()}
                <span>{currentCategory.name} {t("Categories")}</span>
              </h2>
              {activeSubCategoryId && currentCategory && (
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="h-8 text-eagle-green/70 hover:text-viridian-green hover:bg-viridian-green/10 font-medium rounded-full px-3"
                >
                  <Link to={`/shop/${currentCategory.slug}`}>
                    <X className="h-4 w-4 mr-1" />
                    {t("Clear")}
                  </Link>
                </Button>
              )}
            </div>

            {subCategoriesLoading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {[...Array(8)].map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-[70px] rounded-xl bg-june-bud/10"
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  {(showAllSubCategories
                    ? subCategories
                    : subCategories.slice(0, 7)
                  ).map((subcategory, index) => {
                    const Icon = getIconByName(subcategory.iconName);
                    const isSelected = activeSubCategoryId === subcategory.id;

                    return (
                      <motion.div
                        key={subcategory.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        {/* Same deal as the category pills: a real link to the
                            subcategory URL, so it filters without scripts. */}
                        <Button
                          asChild
                          variant="ghost"
                          className={`
                            flex flex-col items-center gap-1 p-2 h-[70px] w-full rounded-xl transition-colors border
                            ${
                              isSelected
                                ? "bg-viridian-green/10 border-viridian-green text-eagle-green"
                                : "bg-white border-transparent text-eagle-green/70 hover:border-june-bud/30 hover:bg-june-bud/5"
                            }
                          `}
                        >
                          <Link
                            to={
                              isSelected
                                ? currentCategory
                                  ? `/shop/${currentCategory.slug}`
                                  : "/shop"
                                : `/shop/category/${subcategory.slug}`
                            }
                            aria-current={isSelected ? "page" : undefined}
                          >
                            <Icon
                              className={`h-5 w-5 shrink-0 ${
                                isSelected
                                  ? "text-viridian-green"
                                  : "text-eagle-green/60"
                              }`}
                            />
                            <span
                              className={`text-[11px] font-semibold text-center leading-tight line-clamp-2 ${
                                isSelected
                                  ? "text-eagle-green"
                                  : "text-eagle-green/70"
                              }`}
                            >
                              {t(subcategory.name)}
                            </span>
                          </Link>
                        </Button>
                      </motion.div>
                    );
                  })}

                  {!showAllSubCategories && subCategories.length > 7 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
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
                    </motion.div>
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
          </motion.div>
        )}

        {/* Search and Filters */}
        <SlideIn direction="up" delay={0.3}>
          <div className="flex items-center gap-2 mb-5">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <div className="relative bg-white rounded-xl shadow-sm border border-eagle-green/10 overflow-hidden">
                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-eagle-green/40 h-4 w-4" />
                <Input
                  placeholder={t("Search for gifts, occasions, artisans...")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 h-11 bg-transparent border-0 focus:ring-0 focus-visible:ring-0 text-sm text-eagle-green placeholder:text-eagle-green/40 w-full"
                />
              </div>
            </div>

            {/* Sort Dropdown - Icon Only */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-11 w-11 rounded-xl bg-white border-eagle-green/10 shadow-sm hover:border-viridian-green hover:bg-viridian-green/5 transition-colors p-0 shrink-0"
                >
                  <Filter className="h-4 w-4 text-viridian-green" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-white border border-eagle-green/10 shadow-xl rounded-xl p-1"
              >
                <div className="px-2 py-1.5 text-xs font-bold text-eagle-green/40 uppercase tracking-wider">
                  {t("Sort by")}
                </div>
                <DropdownMenuItem
                  onClick={() => setSortBy("newest")}
                  className={`rounded-lg cursor-pointer ${
                    sortBy === "newest"
                      ? "bg-june-bud/20 text-eagle-green font-medium"
                      : "text-eagle-green/70 hover:bg-june-bud/10"
                  }`}
                >
                  {t("Newest First")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSortBy("popular")}
                  className={`rounded-lg cursor-pointer ${
                    sortBy === "popular"
                      ? "bg-june-bud/20 text-eagle-green font-medium"
                      : "text-eagle-green/70 hover:bg-june-bud/10"
                  }`}
                >
                  {t("Most Popular")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSortBy("price-low")}
                  className={`rounded-lg cursor-pointer ${
                    sortBy === "price-low"
                      ? "bg-june-bud/20 text-eagle-green font-medium"
                      : "text-eagle-green/70 hover:bg-june-bud/10"
                  }`}
                >
                  {t("Price: Low to High")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSortBy("price-high")}
                  className={`rounded-lg cursor-pointer ${
                    sortBy === "price-high"
                      ? "bg-june-bud/20 text-eagle-green font-medium"
                      : "text-eagle-green/70 hover:bg-june-bud/10"
                  }`}
                >
                  {t("Price: High to Low")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSortBy("rating")}
                  className={`rounded-lg cursor-pointer ${
                    sortBy === "rating"
                      ? "bg-june-bud/20 text-eagle-green font-medium"
                      : "text-eagle-green/70 hover:bg-june-bud/10"
                  }`}
                >
                  {t("Highest Rated")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SlideIn>

        {/* Active Filters & Breadcrumb */}
        {hasFilters && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center gap-2 mb-5 px-3 py-2 bg-june-bud/10 rounded-xl border border-june-bud/20"
          >
            <span className="text-sm font-bold text-eagle-green flex items-center gap-2">
              <Filter className="h-4 w-4" />
              {t("Active filters:")}
            </span>

            {/* Breadcrumb trail */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="px-3 h-8 text-xs font-medium text-eagle-green/70 hover:text-viridian-green hover:bg-transparent"
              >
                <Link to="/shop" onClick={clearSearch}>
                  {t("All Products")}
                </Link>
              </Button>

              {currentCategory && (
                <>
                  <ChevronRight className="h-3 w-3 text-eagle-green/30" />
                  <Badge className="flex items-center gap-1.5 bg-gradient-to-r from-eagle-green to-viridian-green text-white border-0 px-3 py-1 rounded-full font-medium">
                    {currentCategory.name}
                    <Link
                      to="/shop"
                      onClick={clearSearch}
                      className="ml-1 hover:bg-white/20 rounded-full p-0.5 transition-colors"
                      aria-label={t("Clear")}
                    >
                      <X className="h-3 w-3" />
                    </Link>
                  </Badge>
                </>
              )}

              {currentSubCategory && (
                <>
                  <ChevronRight className="h-3 w-3 text-eagle-green/30" />
                  <Badge className="flex items-center gap-1.5 bg-viridian-green/20 text-viridian-green border border-viridian-green/30 px-3 py-1 rounded-full font-medium">
                    {currentSubCategory.name}
                    <Link
                      to={currentCategory ? `/shop/${currentCategory.slug}` : "/shop"}
                      onClick={clearSearch}
                      className="ml-1 hover:bg-viridian-green/20 rounded-full p-0.5 transition-colors"
                      aria-label={t("Clear")}
                    >
                      <X className="h-3 w-3" />
                    </Link>
                  </Badge>
                </>
              )}

              {debouncedSearch && (
                <>
                  <ChevronRight className="h-3 w-3 text-eagle-green/30" />
                  <Badge className="flex items-center gap-1.5 bg-june-bud/20 text-eagle-green border border-june-bud/30 px-3 py-1 rounded-full font-medium">
                    "{debouncedSearch}"
                    <button
                      onClick={clearSearch}
                      className="ml-1 hover:bg-june-bud/30 rounded-full p-0.5 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                </>
              )}
            </div>

            <Button
              asChild
              variant="ghost"
              size="sm"
              className="ml-auto text-eagle-green/70 hover:text-viridian-green hover:bg-viridian-green/10 font-medium rounded-full px-4"
            >
              <Link to="/shop" onClick={clearSearch}>
                {t("Clear all")}
              </Link>
            </Button>
          </motion.div>
        )}

        {/* Products Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-light text-eagle-green/70">
              {isFetching ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-viridian-green/30 border-t-viridian-green rounded-full animate-spin"></span>
                  {t("Loading...")}
                </span>
              ) : (
                <>
                  {t("Showing")}{" "}
                  <span className="font-bold text-eagle-green">
                    {displayProducts.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-bold text-eagle-green">
                    {totalProducts}
                  </span>{" "}
                  {t("products")}
                </>
              )}
            </p>
          </div>

          {isSearching ? (
            <div className="grid gap-3 sm:gap-4 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              <ProductCardSkeletons count={itemsPerPage} />
            </div>
          ) : displayProducts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-14 px-6"
            >
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 mx-auto mb-4 bg-june-bud/20 rounded-2xl flex items-center justify-center">
                  <Package className="h-8 w-8 text-eagle-green/40" />
                </div>
                <h3 className="text-lg font-bold text-eagle-green mb-2">
                  {t("No products found")}
                </h3>
                <p className="text-sm font-light text-eagle-green/60 mb-5 leading-relaxed">
                  {hasFilters
                    ? "We couldn't find any gifts matching your criteria. Try adjusting your search or filters."
                    : "No products are available at the moment. Please check back soon for new arrivals!"}
                </p>
                {hasFilters && (
                  <Button
                    onClick={handleClearFilters}
                    className="bg-gradient-to-r from-eagle-green to-viridian-green hover:from-viridian-green hover:to-eagle-green text-white font-bold px-8 py-3 rounded-full shadow-lg shadow-eagle-green/25 transition-all duration-300 hover:scale-105"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {t("Show all products")}
                  </Button>
                )}
              </div>
            </motion.div>
          ) : (
            <>
              <ProductGridStagger
                className={`grid gap-3 sm:gap-4 ${
                  viewMode === "grid"
                    ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
                    : "grid-cols-1"
                }`}
              >
                {displayProducts.map((product) => (
                  <ProductGridItem key={product.id}>
                    <GiftItemCard product={product} />
                  </ProductGridItem>
                ))}
              </ProductGridStagger>

              {/* Pagination */}
              <div className="mt-8">
                <div ref={loadMoreTriggerRef} className="h-4" />
                {isFetchingNextPage && (
                  <div className="flex items-center justify-center py-6">
                    <span className="inline-block w-4 h-4 border-2 border-viridian-green/30 border-t-viridian-green rounded-full animate-spin mr-2"></span>
                    <span className="text-sm text-eagle-green/70">
                      {t("Loading more products...")}
                    </span>
                  </div>
                )}
                {!hasNextPage && displayProducts.length > 0 && (
                  <div className="text-center py-6 text-sm text-eagle-green/60">
                    {t("You've seen all available products.")}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Signature Sets */}
        <SlideIn direction="up" delay={0.4}>
          <GeramiSignatureSets />
        </SlideIn>
      </div>
    </div>
  );
}
