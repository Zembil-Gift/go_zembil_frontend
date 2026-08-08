import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Command as CommandPrimitive } from "cmdk";
import {
  ArrowRight,
  CalendarDays,
  Loader2,
  PenTool,
  Search,
  Store,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/currency";
import { getEventImageUrl, getProductImageUrl } from "@/utils/imageUtils";
import { useActiveCurrency } from "@/hooks/useActiveCurrency";
import { useSearchAnalytics } from "@/hooks/useSearchAnalytics";
import {
  extractPriceAmount,
  Product,
  productService,
} from "@/services/productService";
import { serviceService, ServiceResponse } from "@/services/serviceService";
import { eventOrderService, EventResponse } from "@/services/eventOrderService";
import { customOrderTemplateService } from "@/services/customOrderTemplateService";
import type { CustomOrderTemplate } from "@/types/customOrders";

const MIN_CHARS = 2;
const DEBOUNCE_MS = 250;
const PER_SOURCE = 4;

interface Hit {
  key: string;
  href: string;
  title: string;
  meta?: string;
  image?: string;
  /** Shown when the record has no image of its own. */
  fallbackIcon: typeof Store;
}

interface HitGroup {
  id: string;
  label: string;
  hits: Hit[];
}

interface HeaderSearchProps {
  className?: string;
}

/**
 * Site-wide search living in the navbar. It replaces the hero search bar so the
 * landing page can open straight onto products — search is always one keystroke
 * away instead of costing a full viewport of scroll.
 */
export default function HeaderSearch({ className }: HeaderSearchProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const activeCurrency = useActiveCurrency();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [term]);

  // Close when the pointer lands anywhere outside the search.
  useEffect(() => {
    if (!focused) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setFocused(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [focused]);

  const query = debounced.length >= MIN_CHARS ? debounced : "";

  const { data, isFetching, isError } = useQuery({
    queryKey: ["header-search", query, activeCurrency],
    queryFn: async () => {
      const [products, services, events, templates] = await Promise.all([
        productService.getFilteredProducts({
          page: 0,
          size: PER_SOURCE,
          search: query,
        }),
        serviceService.getServices({ page: 0, size: PER_SOURCE, query }),
        eventOrderService.searchEvents(query, undefined, undefined, 0, PER_SOURCE),
        customOrderTemplateService.searchTemplates(
          query,
          undefined,
          0,
          PER_SOURCE
        ),
      ]);

      return {
        products: products.content || [],
        services: services.content || [],
        events: events.content || [],
        templates: templates.content || [],
      };
    },
    enabled: query.length >= MIN_CHARS,
    staleTime: 60 * 1000,
    // Keeps the previous matches on screen while the next keystroke resolves,
    // so the panel never blinks back to a spinner mid-typing.
    placeholderData: keepPreviousData,
  });

  const groups = useMemo<HitGroup[]>(() => {
    if (!data) return [];

    const productHits: Hit[] = data.products.map((product: Product) => {
      const amount =
        extractPriceAmount(product.price) ??
        extractPriceAmount(product.productSku?.[0]?.price);
      const currency =
        product.price?.currencyCode ??
        product.productSku?.[0]?.price?.currencyCode ??
        "ETB";

      return {
        key: `product-${product.id}`,
        href: `/product/${product.id}`,
        title: product.name,
        meta: amount ? formatPrice(amount, currency) : product.occasion,
        image: getProductImageUrl(product.images, "/placeholder-product.jpg"),
        fallbackIcon: Store,
      };
    });

    const serviceHits: Hit[] = data.services.map((service: ServiceResponse) => ({
      key: `service-${service.id}`,
      href: `/services/${service.id}`,
      title: service.title || service.name || `#${service.id}`,
      meta: service.categoryName || service.city || service.location,
      image: service.primaryImageUrl,
      fallbackIcon: Store,
    }));

    const eventHits: Hit[] = data.events.map((event: EventResponse) => ({
      key: `event-${event.id}`,
      href: `/events/${event.id}`,
      title: event.title,
      meta: event.location,
      image: getEventImageUrl(event.images, event.bannerImageUrl || ""),
      fallbackIcon: CalendarDays,
    }));

    const templateHits: Hit[] = data.templates.map(
      (template: CustomOrderTemplate) => ({
        key: `template-${template.id}`,
        href: `/custom-orders/template/${template.id}`,
        title: template.name,
        meta: template.categoryName || template.vendorName,
        image: template.images?.[0]?.fullUrl || template.images?.[0]?.url,
        fallbackIcon: PenTool,
      })
    );

    return [
      { id: "products", label: t("Shop"), hits: productHits },
      { id: "services", label: t("Services"), hits: serviceHits },
      { id: "events", label: t("Events"), hits: eventHits },
      { id: "templates", label: t("Custom Orders"), hits: templateHits },
    ].filter((group) => group.hits.length > 0);
  }, [data, t]);

  const total = groups.reduce((sum, group) => sum + group.hits.length, 0);

  useSearchAnalytics(
    {
      searchTerm: query,
      pageName: "Header",
      pageType: "LANDING_SEARCH",
      searchSource: "HEADER_SEARCH_BAR",
      resultCount: total,
    },
    { enabled: !isFetching && query.length >= MIN_CHARS }
  );

  const open = focused && term.trim().length > 0;
  const showSkeleton = isFetching && !data;

  const close = () => {
    setFocused(false);
    inputRef.current?.blur();
  };

  const go = (href: string) => {
    close();
    navigate(href);
  };

  const seeAll = () => {
    if (!term.trim()) return;
    go(`/shop?search=${encodeURIComponent(term.trim())}`);
  };

  const clear = () => {
    setTerm("");
    setDebounced("");
    inputRef.current?.focus();
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <CommandPrimitive
        shouldFilter={false}
        loop
        className="overflow-visible bg-transparent"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            close();
          }
        }}
      >
        <div
          className={cn(
            "flex h-10 items-center gap-2.5 rounded-full border px-4 transition-all duration-200 lg:h-11",
            open
              ? "border-viridian-green/40 bg-white shadow-lg shadow-eagle-green/5 ring-2 ring-viridian-green/15"
              : "border-eagle-green/15 bg-eagle-green/[0.03] hover:border-eagle-green/30 hover:bg-white"
          )}
        >
          <Search
            className="h-4 w-4 shrink-0 text-eagle-green/50"
            strokeWidth={2}
            aria-hidden="true"
          />
          <CommandPrimitive.Input
            ref={inputRef}
            value={term}
            onValueChange={setTerm}
            onFocus={() => setFocused(true)}
            placeholder={t("homepage.hero.searchPlaceholder")}
            aria-label={t("navigation.search")}
            className="h-full flex-1 bg-transparent text-sm text-eagle-green outline-none placeholder:text-eagle-green/40"
          />
          {isFetching && (
            <Loader2
              className="h-4 w-4 shrink-0 animate-spin text-viridian-green"
              aria-hidden="true"
            />
          )}
          {term && !isFetching && (
            <button
              type="button"
              onClick={clear}
              aria-label={t("Clear")}
              className="shrink-0 rounded-full p-0.5 text-eagle-green/40 transition-colors hover:bg-eagle-green/5 hover:text-eagle-green"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {open && (
          <CommandPrimitive.List className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[min(70vh,32rem)] overflow-y-auto overscroll-contain rounded-2xl border border-eagle-green/10 bg-white p-1.5 shadow-2xl shadow-eagle-green/10">
            {/* First item, so Enter always falls through to the full results page. */}
            <CommandPrimitive.Item
              value="see-all"
              onSelect={seeAll}
              className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-eagle-green data-[selected=true]:bg-viridian-green/10"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-june-bud/25">
                <Search className="h-3.5 w-3.5 text-eagle-green" />
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">
                “{term.trim()}”
              </span>
              <span className="hidden shrink-0 text-xs text-eagle-green/50 sm:inline">
                {t("View all results")}
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-eagle-green/40" />
            </CommandPrimitive.Item>

            {showSkeleton &&
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-eagle-green/5" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="h-3 w-2/3 animate-pulse rounded bg-eagle-green/5" />
                    <div className="h-2.5 w-1/4 animate-pulse rounded bg-eagle-green/5" />
                  </div>
                </div>
              ))}

            {!showSkeleton && isError && (
              <p className="px-3 py-6 text-center text-sm text-red-600">
                {t("Something went wrong while searching. Please try again.")}
              </p>
            )}

            {!showSkeleton &&
              !isError &&
              query.length >= MIN_CHARS &&
              total === 0 && (
                <p className="px-3 py-6 text-center text-sm text-eagle-green/60">
                  {t("No matches found. Try another keyword.")}
                </p>
              )}

            {!showSkeleton &&
              groups.map((group) => (
                <CommandPrimitive.Group
                  key={group.id}
                  heading={group.label}
                  className="pt-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-eagle-green/40"
                >
                  {group.hits.map((hit) => (
                    <CommandPrimitive.Item
                      key={hit.key}
                      value={hit.key}
                      onSelect={() => go(hit.href)}
                      className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 data-[selected=true]:bg-viridian-green/10"
                    >
                      {hit.image ? (
                        <img
                          src={hit.image}
                          alt=""
                          loading="lazy"
                          className="h-10 w-10 shrink-0 rounded-lg border border-eagle-green/5 object-cover"
                        />
                      ) : (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-june-bud/20">
                          <hit.fallbackIcon className="h-4 w-4 text-eagle-green" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-eagle-green">
                          {hit.title}
                        </span>
                        {hit.meta && (
                          <span className="block truncate text-xs text-eagle-green/55">
                            {hit.meta}
                          </span>
                        )}
                      </span>
                    </CommandPrimitive.Item>
                  ))}
                </CommandPrimitive.Group>
              ))}
          </CommandPrimitive.List>
        )}
      </CommandPrimitive>
    </div>
  );
}
