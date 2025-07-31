import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronDown, Plus, Minus, Calendar, Cross, Heart, Palette } from "lucide-react";
import { MockApiService } from "@/services/mockApiService";

interface CategoryDropdownProps {
  isMobile?: boolean;
}

export default function CategoryDropdown({ isMobile = false }: CategoryDropdownProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedMobileCategory, setExpandedMobileCategory] = useState<number | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Fetch categories from mock data
  const { data: categories = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/categories'],
    queryFn: () => MockApiService.getCategories(),
  });

  // Filter main categories (those without parentId)
  const mainCategories = categories.filter((cat: any) => !cat.parentId).slice(0, 4);

  // Category icons mapping
  const categoryIcons: Record<string, any> = {
    occasion: Calendar,
    cultural: Cross,
    emotion: Heart,
    custom: Palette,
  };

  const toggleCategory = (categoryId: number) => {
    // Mobile: only allow one category to be expanded at a time
    setExpandedMobileCategory(expandedMobileCategory === categoryId ? null : categoryId);
  };

  const handleCategoryClick = (slug: string) => {
    navigate(`/shop/${slug}`);
    setIsOpen(false);
  };

  // Calculate dropdown position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left
      });
    }
  }, [isOpen]);

  if (isLoading) {
    return (
      <div className="relative">
        <Button
          variant="ghost"
          className="flex items-center space-x-1 text-charcoal hover:text-ethiopian-gold"
          disabled
        >
          <span>Categories</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="space-y-1 max-h-[40vh] overflow-y-auto overflow-x-hidden" role="navigation" aria-label="Product categories">
        {mainCategories.map((mainCategory) => {
          const Icon = categoryIcons[mainCategory.type] || Calendar;
          const subcategories: any[] = [];
          const isExpanded = expandedMobileCategory === mainCategory.id;

          return (
            <div key={mainCategory.id} className="border-b border-gray-50 last:border-b-0">
              <div className="flex items-start gap-2 px-4 py-4 pr-2"
                   role="button" 
                   tabIndex={0}
                   aria-expanded={isExpanded}
                   aria-controls={`category-${mainCategory.id}-subcategories`}>
                <Button
                  variant="ghost"
                  onClick={() => handleCategoryClick(mainCategory.slug)}
                  className="flex-1 justify-start text-left hover:bg-ethiopian-gold/10 hover:text-ethiopian-gold transition-all duration-200 p-0 group min-w-0"
                >
                  <Icon className="h-5 w-5 mr-3 text-ethiopian-gold group-hover:scale-110 transition-transform duration-200 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 group-hover:text-ethiopian-gold text-base leading-tight transition-colors duration-200 truncate pr-2">{mainCategory.name}</div>
                    <div className="text-xs text-gray-500 leading-tight mt-1 line-clamp-2 break-words pr-2">{mainCategory.description}</div>
                  </div>
                </Button>
                {subcategories.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleCategory(mainCategory.id)}
                    className="p-2 hover:bg-ethiopian-gold/20 rounded-lg transition-all duration-300 group flex-shrink-0 border border-gray-300 hover:border-ethiopian-gold shadow-sm hover:shadow-md z-10 min-w-[32px] min-h-[32px]"
                    aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${mainCategory.name} subcategories`}
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? (
                      <Minus className="h-4 w-4 text-gray-700 group-hover:text-ethiopian-gold transition-all duration-200 group-hover:scale-110" />
                    ) : (
                      <Plus className="h-4 w-4 text-gray-700 group-hover:text-ethiopian-gold transition-all duration-200 group-hover:scale-110" />
                    )}
                  </Button>
                )}
              </div>

              <AnimatePresence>
                {isExpanded && subcategories.length > 0 && (
                  <motion.div
                    id={`category-${mainCategory.id}-subcategories`}
                    initial={{ height: 0, opacity: 0, y: -10 }}
                    animate={{ height: "auto", opacity: 1, y: 0 }}
                    exit={{ height: 0, opacity: 0, y: -10 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden border-l-2 border-ethiopian-gold/30 ml-8 pl-4 bg-ethiopian-gold/5 rounded-r-lg"
                    role="region"
                    aria-label={`${mainCategory.name} subcategories`}
                  >
                    <div className="pb-4 space-y-1">
                      {subcategories.map((subcategory: any) => (
                        <Button
                          key={subcategory.id}
                          variant="ghost"
                          onClick={() => handleCategoryClick(subcategory.slug)}
                          className="w-full justify-start text-left py-3 px-3 hover:bg-ethiopian-gold/5 hover:text-ethiopian-gold transition-all duration-200 rounded-lg group"
                          aria-label={`Browse ${subcategory.name} products`}
                        >
                          <div className="flex items-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 group-hover:bg-ethiopian-gold mr-3 transition-colors duration-200" />
                            <div className="flex-1 min-w-0 max-w-full">
                              <div className="font-medium text-sm text-gray-600 group-hover:text-ethiopian-gold transition-colors duration-200 truncate">{subcategory.name}</div>
                              <div className="text-xs text-gray-500 truncate">{subcategory.description}</div>
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    );
  }

  // Desktop dropdown
  return (
    <div 
      className="relative z-50"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <Button
        ref={buttonRef}
        variant="ghost"
        className="flex items-center space-x-1 px-5 py-3 text-sm lg:text-base font-medium transition-colors rounded-lg border border-transparent text-charcoal hover:text-ethiopian-gold hover:bg-ethiopian-gold/10 hover:border-ethiopian-gold/30"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>Categories</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {/* Portal dropdown to body - escapes all container bounds */}
      {isOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999]"
          onClick={() => setIsOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute w-80 max-h-[70vh] overflow-y-auto overflow-x-hidden bg-white rounded-xl shadow-2xl border border-gray-200"
            style={{ 
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              zIndex: 10000,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 20px 25px -5px rgba(0, 0, 0, 0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4">
              <div className="space-y-2">
                {mainCategories.map((mainCategory) => {
                  const Icon = categoryIcons[mainCategory.type] || Calendar;

                  return (
                    <Button
                      key={mainCategory.id}
                      variant="ghost"
                      onClick={() => handleCategoryClick(mainCategory.slug)}
                      className="w-full justify-start text-left hover:bg-ethiopian-gold/10 hover:text-ethiopian-gold transition-all duration-200 p-4 h-auto rounded-lg group"
                    >
                      <Icon className="h-5 w-5 mr-3 text-ethiopian-gold group-hover:scale-110 transition-transform duration-200 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-charcoal group-hover:text-ethiopian-gold text-base leading-tight">{mainCategory.name}</div>
                        <div className="text-sm text-gray-500 leading-tight mt-1">{mainCategory.description || 'Gift category'}</div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
}