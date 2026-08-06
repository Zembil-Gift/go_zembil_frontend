import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { categoryService } from "@/services/categoryService";
import SectionHeader from "@/components/landing/SectionHeader";

const SHOWN = 6;
const TILES = 4;

function Mosaic({ images, name }: { images: string[]; name: string }) {
  // One product gets the whole square; two or more share a 2x2 grid.
  if (images.length === 1) {
    return (
      <img
        src={images[0]}
        alt={name}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
    );
  }

  return (
    <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-px bg-charcoal/5">
      {Array.from({ length: TILES }).map((_, i) =>
        images[i] ? (
          <img
            key={i}
            src={images[i]}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div key={i} className="bg-light-cream" />
        )
      )}
    </div>
  );
}

export default function TopCategoriesSection() {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);

  // One request: the server ranks by sellable product count and ships the
  // thumbnails with it (GET /api/categories/with-products, cached server-side).
  const { data: topCategories, isLoading } = useQuery({
    queryKey: ["categories", "with-products"],
    queryFn: () => categoryService.getCategoriesWithProducts(),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  if (!isLoading && !topCategories?.length) return null;

  const visible = showAll
    ? topCategories ?? []
    : (topCategories ?? []).slice(0, SHOWN);
  const hasMore = (topCategories?.length ?? 0) > SHOWN;

  return (
    <section className="bg-white py-10">
      <div className="page-shell">
        <SectionHeader
          title={t("Shop by Category")}
          onSeeAll={hasMore ? () => setShowAll((prev) => !prev) : undefined}
          seeAllLabel={showAll ? t("Show less") : t("common.seeAll")}
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
          {isLoading
            ? Array.from({ length: SHOWN }).map((_, i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-2xl border border-eagle-green/[0.07]"
                >
                  <div className="aspect-square animate-pulse bg-eagle-green/[0.06]" />
                  <div className="p-3">
                    <div className="h-3.5 w-4/5 animate-pulse rounded bg-eagle-green/10" />
                  </div>
                </div>
              ))
            : visible.map((category) => (
                <Link
                  key={category.id}
                  to={`/shop?categoryId=${category.id}`}
                  className="group block overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-ethiopian-gold/40 hover:shadow-lg"
                >
                  <div className="aspect-square overflow-hidden bg-light-cream">
                    <Mosaic
                      images={category.imageUrls.slice(0, TILES)}
                      name={category.name}
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="line-clamp-1 text-sm font-bold text-charcoal transition-colors group-hover:text-ethiopian-gold">
                      {category.name}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-gray-500">
                      {t("{{count}} items", { count: category.productCount })}
                    </p>
                  </div>
                </Link>
              ))}
        </div>
      </div>
    </section>
  );
}
