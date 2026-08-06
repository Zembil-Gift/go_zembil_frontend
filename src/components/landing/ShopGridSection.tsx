import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useActiveCurrency } from "@/hooks/useActiveCurrency";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  ProductGridStagger,
  ProductGridItem,
} from "@/components/animations/StaggerAnimations";
import GiftItemCard from "@/components/gift-card";
import { productService, PagedProductResponse } from "@/services/productService";
import { categoryService } from "@/services/categoryService";
import { Package } from "lucide-react";
import SectionHeader from "@/components/landing/SectionHeader";

const PAGE_SIZE = 12;

function ProductCardSkeletons({ count }: { count: number }) {
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <Card
          key={i}
          className="overflow-hidden border-0 shadow-md bg-white rounded-2xl"
        >
          <CardContent className="p-0">
            <Skeleton className="aspect-square w-full bg-june-bud/10" />
            <div className="p-3">
              <Skeleton className="h-4 w-3/4 mb-2 bg-june-bud/20" />
              <Skeleton className="h-3 w-1/2 mb-2 bg-june-bud/20" />
              <Skeleton className="h-5 w-1/3 bg-june-bud/20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

export default function ShopGridSection() {
  const { t } = useTranslation();
  const { isInitialized } = useAuth();
  const activeCurrency = useActiveCurrency();
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryService.getCategories(),
    staleTime: 5 * 60 * 1000,
  });

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<PagedProductResponse>({
    // ponytail: same key shape as /shop, so a visitor who lands on the shop
    // page after browsing here reuses the cached first page
    queryKey: [
      "products",
      "filtered",
      {
        size: PAGE_SIZE,
        search: "",
        categoryId,
        subCategoryId: undefined,
        sortBy: "newest",
        currency: activeCurrency,
      },
    ],
    queryFn: ({ pageParam }) =>
      productService.getFilteredProducts({
        page: pageParam as number,
        size: PAGE_SIZE,
        categoryId,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.last ? undefined : lastPage.number + 1,
    enabled: isInitialized,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });

  const products = data?.pages.flatMap((page) => page.content) || [];

  const chipClass = (active: boolean) =>
    `shrink-0 rounded-full px-5 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-viridian-green focus-visible:ring-offset-2 focus-visible:ring-offset-light-cream ${
      active
        ? "bg-viridian-green text-white"
        : "bg-white text-eagle-green/70 border border-eagle-green/15 hover:border-viridian-green/50 hover:text-eagle-green"
    }`;

  return (
    <section id="shop" className="py-10 bg-light-cream">
      <div className="page-shell">
        <SectionHeader
          title={t("homepage.shopAll.title")}
          subtitle={t("homepage.shopAll.subtitle")}
          href="/shop"
        />

        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
            <button
              type="button"
              onClick={() => setCategoryId(undefined)}
              className={chipClass(categoryId === undefined)}
            >
              {t("homepage.shopAll.all")}
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setCategoryId(category.id)}
                className={chipClass(categoryId === category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}

        {isError ? (
          <p className="py-16 text-center text-eagle-green/70">
            {t("homepage.shopAll.error")}
          </p>
        ) : isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            <ProductCardSkeletons count={12} />
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-20 h-20 mx-auto mb-5 bg-june-bud/15 rounded-3xl flex items-center justify-center">
              <Package className="h-9 w-9 text-eagle-green/40" />
            </div>
            <p className="text-eagle-green/70 mb-6">
              {t("homepage.shopAll.empty")}
            </p>
            <Button
              variant="outline"
              onClick={() => setCategoryId(undefined)}
              className="rounded-full border-eagle-green/20 text-eagle-green"
            >
              {t("homepage.shopAll.all")}
            </Button>
          </div>
        ) : (
          <>
            <ProductGridStagger className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {products.map((product) => (
                <ProductGridItem key={product.id}>
                  <GiftItemCard product={product} />
                </ProductGridItem>
              ))}
            </ProductGridStagger>

            <div className="mt-8 text-center">
              {hasNextPage ? (
                <Button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="bg-viridian-green hover:bg-viridian-green/90 text-white font-medium px-8 py-3 text-lg rounded-full"
                >
                  {isFetchingNextPage
                    ? t("homepage.shopAll.loading")
                    : t("homepage.shopAll.loadMore")}
                </Button>
              ) : (
                <Button
                  asChild
                  variant="outline"
                  className="border-eagle-green/20 text-eagle-green font-medium px-8 py-3 text-lg rounded-full"
                >
                  <Link to="/shop">{t("homepage.shopAll.browseShop")}</Link>
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
