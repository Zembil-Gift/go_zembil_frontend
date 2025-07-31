import { Button } from "@/components/ui/button";
import { ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductPaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage?: boolean;
  onLoadMore?: () => void;
  onBackToTop?: () => void;
  isLoading?: boolean;
  className?: string;
}

export default function ProductPagination({
  currentPage,
  totalItems,
  itemsPerPage,
  hasNextPage = true,
  onLoadMore,
  onBackToTop,
  isLoading = false,
  className
}: ProductPaginationProps) {
  const currentItemsShown = Math.min(currentPage * itemsPerPage, totalItems);
  
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    onBackToTop?.();
  };

  return (
    <div className={cn("py-12", className)}>
      {/* Statistics */}
      <div className="flex items-center justify-between text-sm text-gray-600 mb-8">
        <span>
          Showing {currentItemsShown} of {totalItems > 0 ? totalItems : '...'} products
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={scrollToTop}
          className="text-gray-600 hover:text-ethiopian-gold transition-colors"
        >
          Back to Top
          <ChevronUp className="ml-1 h-4 w-4" />
        </Button>
      </div>

      {/* View More Section */}
      {hasNextPage && onLoadMore && (
        <div className="flex items-center justify-center">
          {/* Decorative lines */}
          <div className="border-t border-gray-200 w-1/4 mx-2"></div>
          
          {/* View More Button */}
          <Button
            onClick={onLoadMore}
            disabled={isLoading}
            className={cn(
              "px-8 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200",
              "rounded-full font-medium transition-all duration-300 hover:shadow-md",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isLoading && "animate-pulse"
            )}
          >
            {isLoading ? 'Loading...' : 'View More'}
          </Button>
          
          {/* Decorative lines */}
          <div className="border-t border-gray-200 w-1/4 mx-2"></div>
        </div>
      )}
      
      {/* No more items message */}
      {!hasNextPage && totalItems > itemsPerPage && (
        <div className="text-center">
          <div className="flex items-center justify-center">
            {/* Decorative lines */}
            <div className="border-t border-gray-200 w-1/4 mx-2"></div>
            
            {/* End message */}
            <span className="px-6 py-2 text-gray-500 text-sm">
              You've seen all products
            </span>
            
            {/* Decorative lines */}
            <div className="border-t border-gray-200 w-1/4 mx-2"></div>
          </div>
        </div>
      )}
    </div>
  );
}