import React, { useState, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";
import { Plus, Minus } from "lucide-react";
import { CATEGORIES, MainCategory, SubCategory, buildUrlParams } from "../shared/categories";

interface CategoriesListProps {
  isMobile?: boolean;
  onNavigate?: () => void; // Called when navigation occurs
  className?: string;
}

const CategoriesList = forwardRef<HTMLDivElement, CategoriesListProps>(
  ({ isMobile = false, onNavigate, className }, ref) => {
    const navigate = useNavigate();
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

    const toggleCategory = (categoryId: string, event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      // Only allow one category to be expanded at a time
      setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
    };

    const handleCategoryClick = (category: MainCategory, event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const urlParams = buildUrlParams({ category: category.slug });
      navigate(`/shop?${urlParams}`);
      onNavigate?.();
    };

    const handleSubcategoryClick = (category: MainCategory, subcategory: SubCategory, event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const urlParams = buildUrlParams({ 
        category: category.slug, 
        sub: subcategory.slug 
      });
      navigate(`/shop?${urlParams}`);
      onNavigate?.();
    };

    const handleKeyDown = (event: React.KeyboardEvent, action: () => void) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        action();
      }
    };

    return (
      <div 
        ref={ref}
        className={`space-y-1 ${isMobile ? 'max-h-[50vh] overflow-y-auto overflow-x-hidden' : ''} ${className || ''}`} 
        role="navigation" 
        aria-label="Product categories"
      >
        {CATEGORIES.map((category) => {
          const Icon = category.icon;
          const isExpanded = expandedCategory === category.id;
          const hasSubcategories = category.subcategories.length > 0;

          return (
            <div key={category.id} className={`${isMobile ? 'border-b border-gray-50 last:border-b-0' : 'border-b border-gray-100 last:border-b-0 pb-2 last:pb-0'}`}>
              <div className={`flex items-center ${isMobile ? 'gap-2 px-4 py-4' : 'justify-between'}`}
                   role="button" 
                   tabIndex={0}
                   aria-expanded={isExpanded}
                   aria-controls={hasSubcategories ? `category-${category.id}-subcategories` : undefined}
                   onKeyDown={(e) => handleKeyDown(e, () => handleCategoryClick(category, e as any))}>
                <Button
                  variant="ghost"
                  onClick={(e) => handleCategoryClick(category, e)}
                  className={`${isMobile ? 'flex-1' : 'flex-1 mr-2'} justify-start text-left hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 p-3 h-auto rounded-lg group`}
                >
                  <Icon className="h-5 w-5 mr-3 text-blue-600 group-hover:scale-110 transition-transform duration-200 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 group-hover:text-blue-700 text-base leading-tight transition-colors duration-200 truncate pr-2">
                      {category.name}
                    </div>
                    <div className={`text-gray-500 leading-tight mt-1 line-clamp-2 break-words pr-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                      {category.description}
                    </div>
                  </div>
                </Button>
                
                {hasSubcategories && (
                  <button
                    type="button"
                    onClick={(e) => toggleCategory(category.id, e)}
                    onKeyDown={(e) => handleKeyDown(e, () => toggleCategory(category.id, e as any))}
                    className="p-2 hover:bg-blue-100 rounded-lg transition-all duration-200 group flex-shrink-0 border border-gray-300 hover:border-blue-400 shadow-sm hover:shadow-md min-w-[32px] min-h-[32px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${category.name} subcategories`}
                    aria-expanded={isExpanded}
                    aria-controls={`category-${category.id}-subcategories`}
                  >
                    {isExpanded ? (
                      <Minus className="h-4 w-4 text-gray-700 group-hover:text-blue-600 transition-all duration-200" />
                    ) : (
                      <Plus className="h-4 w-4 text-gray-700 group-hover:text-blue-600 transition-all duration-200" />
                    )}
                  </button>
                )}
              </div>

              <AnimatePresence>
                {isExpanded && hasSubcategories && (
                  <motion.div
                    id={`category-${category.id}-subcategories`}
                    initial={{ height: 0, opacity: 0, y: -10 }}
                    animate={{ height: "auto", opacity: 1, y: 0 }}
                    exit={{ height: 0, opacity: 0, y: -10 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className={`overflow-hidden ${isMobile ? 'border-l-2 border-blue-300 ml-8 pl-4 bg-blue-50 rounded-r-lg' : 'mt-2 ml-8 pl-4 border-l-2 border-blue-300 bg-blue-50 rounded-r-lg'}`}
                    role="region"
                    aria-label={`${category.name} subcategories`}
                    aria-live="polite"
                  >
                    <div className={`space-y-1 ${isMobile ? 'pb-4' : 'py-2'}`}>
                      {category.subcategories.map((subcategory) => (
                        <Button
                          key={subcategory.id}
                          variant="ghost"
                          onClick={(e) => handleSubcategoryClick(category, subcategory, e)}
                          onKeyDown={(e) => handleKeyDown(e, () => handleSubcategoryClick(category, subcategory, e as any))}
                          className={`w-full justify-start text-left hover:bg-blue-100 hover:text-blue-700 transition-all duration-200 rounded-lg group ${isMobile ? 'py-3 px-3' : 'py-2 px-3'}`}
                          aria-label={`Browse ${subcategory.name} products`}
                        >
                          <div className="flex items-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 group-hover:bg-blue-500 mr-3 transition-colors duration-200" />
                            <div className="flex-1 min-w-0 max-w-full">
                              <div className={`font-medium text-gray-600 group-hover:text-blue-700 transition-colors duration-200 truncate ${isMobile ? 'text-sm' : 'text-sm'}`}>
                                {subcategory.name}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {subcategory.description}
                              </div>
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
);

CategoriesList.displayName = "CategoriesList";

export default CategoriesList;
