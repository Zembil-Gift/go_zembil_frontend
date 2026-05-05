import { Card, CardContent } from "@/components/ui/card";
import {
  Palette,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Gift,
  Package,
  Users,
  Zap,
  ChevronDown,
  Info,
} from "lucide-react";
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

function CustomOrdersContent() {
  const { isInitialized } = useAuth();
  const activeCurrency = useActiveCurrency();

  // State for "Why Choose" section visibility with localStorage persistence
  const [isFeaturesExpanded, setIsFeaturesExpanded] = useState(() => {
    const saved = localStorage.getItem("custom-orders-features-expanded");
    return saved === null ? false : saved === "true"; // Default to collapsed
  });

  // State for "How It Works" guide visibility with localStorage persistence
  const [isGuideExpanded, setIsGuideExpanded] = useState(() => {
    const saved = localStorage.getItem("custom-orders-guide-expanded");
    return saved === null ? false : saved === "true"; // Default to expanded on first visit
  });

  useEffect(() => {
    localStorage.setItem(
      "custom-orders-features-expanded",
      isFeaturesExpanded.toString()
    );
  }, [isFeaturesExpanded]);

  useEffect(() => {
    localStorage.setItem(
      "custom-orders-guide-expanded",
      isGuideExpanded.toString()
    );
  }, [isGuideExpanded]);

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <FadeIn delay={0.1}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-2xl lg:text-3xl font--bold text-white">
                    Custom Orders
                  </h1>
                </div>
                <p className="text-sm lg:text-base font--light text-white/80 max-w-2xl">
                  Commission unique, personalized pieces from talented Ethiopian
                  artists
                </p>
              </div>
              <Link to="/custom-orders/categories" className="hidden md:block">
                <Button
                  size="lg"
                  className="bg-june-bud hover:bg-june-bud/90 text-eagle-green font--bold px-6 py-3 h-auto rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <span>Browse Categories</span>
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Search Bar Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-30">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-eagle-green/20 to-viridian-green/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
            <div className="relative bg-white rounded-2xl shadow-lg shadow-eagle-green/5 border border-eagle-green/10 overflow-hidden">
              <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-eagle-green/40 h-5 w-5" />
              <Input
                type="text"
                placeholder="Search custom order templates, artists, or categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-12 h-14 bg-transparent border-0 focus:ring-0 focus-visible:ring-0 font-light text-eagle-green placeholder:text-eagle-green/40 w-full"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-light-cream rounded-xl transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-5 w-5 text-eagle-green/40" />
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
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font--bold text-eagle-green">
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
                Clear search
                <X className="h-4 w-4" />
              </button>
            </div>

            {isSearching ? (
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl h-[400px] animate-pulse shadow-sm border border-eagle-green/5"
                  />
                ))}
              </div>
            ) : searchResults?.content && searchResults.content.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {searchResults.content.map((template) => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-eagle-green/10">
                <div className="bg-light-cream w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <SearchIcon className="h-10 w-10 text-eagle-green/20" />
                </div>
                <h3 className="text-xl font--bold text-eagle-green mb-2">
                  No templates found
                </h3>
                <p className="text-eagle-green/60">
                  Try adjusting your search terms or browse our categories
                  below.
                </p>
              </div>
            )}

            <div className="mt-12 border-t border-eagle-green/10 pt-12">
              <h3 className="text-xl font-bold text-eagle-green mb-6 text-center">
                Otherwise, browse by category
              </h3>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Features Section - Collapsible */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* <FadeIn delay={0.2}> */}
        {/* <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
            {/* Toggle Header */}
        {/* <button
              onClick={() => setIsFeaturesExpanded(!isFeaturesExpanded)}
              className="w-full p-6 lg:p-8 flex items-center justify-between hover:bg-light-cream/30 transition-colors duration-200 group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-june-bud/20 to-viridian-green/10 rounded-xl group-hover:from-june-bud/30 group-hover:to-viridian-green/20 transition-colors">
                  <Sparkles className="h-6 w-6 text-eagle-green" />
                </div>
                <div className="text-left">
                  <h2 className="text-xl lg:text-2xl font--bold text-eagle-green mb-1">
                    Why Choose Our Custom Order System?
                  </h2>
                  <p className="text-sm font--light text-eagle-green/70">
                    {isFeaturesExpanded ? 'Click to hide features' : 'Click to see key features and benefits'}
                  </p>
                </div>
              </div>
              <motion.div
                animate={{ rotate: isFeaturesExpanded ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronDown className="h-6 w-6 text-eagle-green" />
              </motion.div>
            </button>  */}

        {/* Collapsible Content */}
        {/* <AnimatePresence>
              {isFeaturesExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="px-8 pb-8 lg:px-12 lg:pb-12 border-t border-eagle-green/10">
                    <div className="pt-8 grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {[
                        {
                          icon: Users,
                          title: "Vendor Templates",
                          description: "Browse professionally created templates from verified vendors with customizable options.",
                          color: "from-eagle-green/20 to-viridian-green/10"
                        },
                        {
                          icon: Package,
                          title: "Dynamic Customization",
                          description: "Fill out custom fields, upload images, and specify exactly what you want.",
                          color: "from-june-bud/20 to-yellow/10"
                        },
                        {
                          icon: Zap,
                          title: "Real-time Chat",
                          description: "Communicate directly with vendors to refine your order and track progress.",
                          color: "from-viridian-green/20 to-eagle-green/10"
                        }
                      ].map((feature, index) => (
                        <motion.div
                          key={feature.title}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 + index * 0.1 }}
                          whileHover={{ y: -4 }}
                        >
                          <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white rounded-xl">
                            <CardContent className="p-6 text-center">
                              <div className={`w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center`}>
                                <feature.icon className="h-8 w-8 text-eagle-green" />
                              </div>
                              <h3 className="text-xl font--bold text-eagle-green mb-3">
                                {feature.title}
                              </h3>
                              <p className="font--light text-eagle-green/70 leading-relaxed">
                                {feature.description}
                              </p>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence> */}
        {/* </div>
        </FadeIn> */}

        {/* How It Works Section - Collapsible */}
        {/* <FadeIn delay={0.5}>
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden"> */}
        {/* Toggle Header */}
        {/* <button
              onClick={() => setIsGuideExpanded(!isGuideExpanded)}
              className="w-full p-6 lg:p-8 flex items-center justify-between hover:bg-light-cream/30 transition-colors duration-200 group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-eagle-green/20 to-viridian-green/10 rounded-xl group-hover:from-eagle-green/30 group-hover:to-viridian-green/20 transition-colors">
                  <Info className="h-6 w-6 text-eagle-green" />
                </div>
                <div className="text-left">
                  <h2 className="text-xl lg:text-2xl font--bold text-eagle-green mb-1">
                    How It Works
                  </h2>
                  <p className="text-sm font--light text-eagle-green/70">
                    {isGuideExpanded ? 'Click to hide guide' : 'Click to see how to place a custom order'}
                  </p>
                </div>
              </div>
              <motion.div
                animate={{ rotate: isGuideExpanded ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronDown className="h-6 w-6 text-eagle-green" />
              </motion.div>
            </button> */}

        {/* Collapsible Content */}
        {/* <AnimatePresence>
              {isGuideExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="px-8 pb-8 lg:px-12 lg:pb-12 border-t border-eagle-green/10">
                    <div className="pt-8 grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-8">
                      {[
                        { 
                          step: 1, 
                          title: "Browse Categories", 
                          description: "Explore different categories and find vendors offering custom templates",
                          icon: Package
                        },
                        { 
                          step: 2, 
                          title: "Customize Order", 
                          description: "Fill out the vendor's custom fields and upload any reference materials",
                          icon: Palette
                        },
                        { 
                          step: 3, 
                          title: "Pay", 
                          description: "Chat with the vendor to finalize details and pricing, then pay securely",
                          icon: CheckCircle */}
        {/* },
                        { 
                          step: 4, 
                          title: "Receive Creation", 
                          description: "Track progress and receive your unique handmade item with delivery",
                          icon: Gift
                        }
                      ].map((item, index) => (
                        <motion.div
                          key={item.step}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 + index * 0.1 }}
                          className="text-center"
                        >
                          <div className="relative mb-6">
                            <div className="w-16 h-16 bg-gradient-to-br from-eagle-green to-viridian-green rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                              <item.icon className="h-8 w-8 text-white" />
                            </div>
                            <div className="absolute -top-2 -right-2 w-8 h-8 bg-june-bud rounded-full flex items-center justify-center text-eagle-green font--bold text-sm shadow-md">
                              {item.step}
                            </div>
                          </div>
                          <h3 className="text-lg font--bold text-eagle-green mb-3">
                            {item.title}
                          </h3>
                          <p className="font--light text-eagle-green/70 text-sm leading-relaxed">
                            {item.description}
                          </p>
                        </motion.div> */}
        {/* ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </FadeIn> */}

        {/* Approved Templates Preview */}
        <FadeIn delay={0.7}>
          <div className="mt-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font--bold text-eagle-green mb-4">
                Browse Templates
              </h2>
              <p className="text-lg font--light text-eagle-green/70">
                Discover approved custom order templates from our talented
                vendors
              </p>
            </div>

            {isApprovedTemplatesLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl h-[400px] animate-pulse shadow-sm border border-eagle-green/5"
                  />
                ))}
              </div>
            ) : approvedTemplates.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                {approvedTemplates.map((template) => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-eagle-green/30 mx-auto mb-4" />
                <p className="text-lg font--light text-eagle-green/70">
                  No approved templates available yet. Check back soon!
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
