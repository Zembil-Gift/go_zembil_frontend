import { ArrowRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import FadeIn from "@/components/animations/FadeIn";
import { useQuery } from "@tanstack/react-query";
import { customOrderTemplateService } from "@/services/customOrderTemplateService";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import { TemplateCard } from "./customer/CustomOrderTemplates";
import { useAuth } from "@/hooks/useAuth";
import { useActiveCurrency } from "@/hooks/useActiveCurrency";
import { useSearchAnalytics } from "@/hooks/useSearchAnalytics";
import { useTranslation } from "react-i18next";

function CustomOrdersContent() {
  const { t } = useTranslation();
  const { isInitialized } = useAuth();
  const activeCurrency = useActiveCurrency();

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Handle debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: [
      "custom-order-templates-search",
      debouncedSearchTerm,
      activeCurrency,
    ],
    queryFn: () =>
      customOrderTemplateService.searchTemplates(
        debouncedSearchTerm,
        undefined,
        0,
        20
      ),
    enabled: debouncedSearchTerm.length > 0 && isInitialized,
  });

  // Fetch approved templates for default browse section
  const { data: approvedTemplatesData, isLoading: isApprovedTemplatesLoading } =
    useQuery({
      queryKey: ["custom-order-templates-approved", activeCurrency],
      queryFn: () => customOrderTemplateService.getApproved(0, 20),
      enabled: isInitialized,
    });

  const approvedTemplates = approvedTemplatesData?.content || [];

  useSearchAnalytics(
    {
      searchTerm: debouncedSearchTerm,
      pageName: "CustomOrders",
      pageType: "CUSTOM_ORDER_LIST",
      searchSource: "PAGE_SEARCH_BAR",
      resultCount: searchResults?.content?.length || 0,
    },
    {
      enabled: !isSearching,
    }
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-light-cream to-white">
      {/* Simplified Hero Section */}
      <section className="bg-eagle-green">
        <div className="page-shell py-5">
          <FadeIn delay={0.1}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-white">
                  {t("Custom Orders")}
                </h1>
                <p className="mt-1 text-xs lg:text-sm font-light text-white/80">
                  {t("Commission unique, personalized pieces from talented Ethiopian artists")}
                </p>
              </div>
              <Link to="/custom-orders/categories" className="hidden md:block">
                <Button className="h-10 bg-june-bud hover:bg-june-bud/90 text-eagle-green font-bold px-4 rounded-xl transition-colors">
                  <span>{t("Browse Categories")}</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Search Bar Section */}
      <div className="page-shell pt-5 pb-3 relative z-30">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <div className="relative bg-white rounded-xl shadow-sm border border-eagle-green/10 overflow-hidden">
              <SearchIcon className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-eagle-green/40 h-4 w-4" />
              <Input
                type="text"
                placeholder={t("Search custom order templates, artists, or categories...")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-11 h-11 bg-transparent border-0 focus:ring-0 focus-visible:ring-0 text-sm text-eagle-green placeholder:text-eagle-green/40 w-full"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 hover:bg-light-cream rounded-lg transition-colors"
                  aria-label={t("Clear search")}
                >
                  <X className="h-4 w-4 text-eagle-green/40" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search Results */}
      <AnimatePresence>
        {debouncedSearchTerm && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="page-shell py-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-eagle-green">
                {isSearching
                  ? "Searching..."
                  : `Found ${
                      searchResults?.content?.length || 0
                    } templates for "${debouncedSearchTerm}"`}
              </h2>
              <button
                onClick={() => setSearchTerm("")}
                className="text-eagle-green/60 hover:text-eagle-green text-sm flex items-center gap-1"
              >
                {t("Clear search")}
                <X className="h-4 w-4" />
              </button>
            </div>

            {isSearching ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl aspect-[3/4] animate-pulse shadow-sm border border-eagle-green/5"
                  />
                ))}
              </div>
            ) : searchResults?.content && searchResults.content.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
                {searchResults.content.map((template) => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-eagle-green/10">
                <SearchIcon className="h-10 w-10 text-eagle-green/20 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-eagle-green mb-1">
                  {t("No templates found")}
                </h3>
                <p className="text-sm text-eagle-green/60">
                  {t("Try adjusting your search terms or browse our categories below.")}
                </p>
              </div>
            )}

            <div className="mt-6 border-t border-eagle-green/10 pt-6">
              <h3 className="text-base font-bold text-eagle-green text-center">
                {t("Otherwise, browse by category")}
              </h3>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <section className="page-shell pb-8 relative z-10">
        {/* Approved Templates Preview */}
        <FadeIn delay={0.7}>
          <div>
            <div className="mb-4">
              <h2 className="text-xl lg:text-2xl font-bold text-eagle-green">
                {t("Browse Templates")}
              </h2>
              <p className="mt-0.5 text-sm font-light text-eagle-green/70">
                {t("Discover approved custom order templates from our talented vendors")}
              </p>
            </div>

            {isApprovedTemplatesLoading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4 mb-5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl aspect-[3/4] animate-pulse shadow-sm border border-eagle-green/5"
                  />
                ))}
              </div>
            ) : approvedTemplates.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4 mb-5">
                {approvedTemplates.map((template) => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-eagle-green/30 mx-auto mb-3" />
                <p className="text-sm font-light text-eagle-green/70">
                  {t("No approved templates available yet. Check back soon!")}
                </p>
              </div>
            )}
          </div>
        </FadeIn>
      </section>
    </div>
  );
}

export default function CustomOrders() {
  return <CustomOrdersContent />;
}
