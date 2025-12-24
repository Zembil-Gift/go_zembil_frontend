import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PageNavigatorProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  totalItems?: number;
  itemsPerPage?: number;
}


export function PageNavigator({
  currentPage,
  totalPages,
  onPageChange,
  isLoading = false,
  totalItems,
  itemsPerPage,
}: PageNavigatorProps) {
  if (totalPages <= 1) return null;

  const maxVisiblePages = 5;

  // Calculate visible page numbers with smart ellipsis
  const getVisiblePages = (): (number | 'ellipsis-start' | 'ellipsis-end')[] => {
    const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = [];
    
    if (totalPages <= maxVisiblePages + 2) {
      // Show all pages if total is small enough
      for (let i = 0; i < totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(0);
      
      // Calculate start and end of middle section
      let start = Math.max(1, currentPage - 1);
      let end = Math.min(totalPages - 2, currentPage + 1);
      
      // Adjust if at the beginning
      if (currentPage < 3) {
        end = Math.min(3, totalPages - 2);
      }
      
      // Adjust if at the end
      if (currentPage > totalPages - 4) {
        start = Math.max(1, totalPages - 4);
      }
      
      // Add ellipsis after first page if needed
      if (start > 1) {
        pages.push('ellipsis-start');
      }
      
      // Add middle pages
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      // Add ellipsis before last page if needed
      if (end < totalPages - 2) {
        pages.push('ellipsis-end');
      }
      
      // Always show last page
      pages.push(totalPages - 1);
    }
    
    return pages;
  };

  const visiblePages = getVisiblePages();

  // Calculate showing range
  const startItem = totalItems ? currentPage * (itemsPerPage || 12) + 1 : null;
  const endItem = totalItems 
    ? Math.min((currentPage + 1) * (itemsPerPage || 12), totalItems) 
    : null;

  return (
    <div className="flex flex-col items-center gap-4 mt-8">
      {/* Items info */}
      {totalItems && (
        <p className="text-sm font-light text-eagle-green/70">
          Showing {startItem}-{endItem} of {totalItems} items
        </p>
      )}

      <div className="flex flex-wrap justify-center items-center gap-1 sm:gap-2">
        {/* First Page Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(0)}
          disabled={currentPage === 0 || isLoading}
          className="hidden sm:flex h-9 w-9 p-0 border-eagle-green text-eagle-green hover:bg-eagle-green hover:text-white disabled:opacity-50"
          title="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* Previous Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0 || isLoading}
          className="h-9 px-2 sm:px-3 border-eagle-green text-eagle-green hover:bg-eagle-green hover:text-white disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">Previous</span>
        </Button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {visiblePages.map((page) => {
            if (page === 'ellipsis-start' || page === 'ellipsis-end') {
              return (
                <span
                  key={page}
                  className="px-2 text-eagle-green/60 font-light select-none"
                >
                  ...
                </span>
              );
            }
            
            const isActive = page === currentPage;
            return (
              <Button
                key={page}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(page)}
                disabled={isLoading}
                className={`h-9 w-9 p-0 font-bold transition-all ${
                  isActive
                    ? "bg-eagle-green text-white hover:bg-viridian-green border-eagle-green shadow-md"
                    : "border-eagle-green/30 text-eagle-green hover:bg-eagle-green hover:text-white hover:border-eagle-green"
                }`}
              >
                {page + 1}
              </Button>
            );
          })}
        </div>

        {/* Next Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages - 1 || isLoading}
          className="h-9 px-2 sm:px-3 border-eagle-green text-eagle-green hover:bg-eagle-green hover:text-white disabled:opacity-50"
        >
          <span className="hidden sm:inline mr-1">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Last Page Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages - 1)}
          disabled={currentPage >= totalPages - 1 || isLoading}
          className="hidden sm:flex h-9 w-9 p-0 border-eagle-green text-eagle-green hover:bg-eagle-green hover:text-white disabled:opacity-50"
          title="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Page indicator for mobile */}
      <p className="sm:hidden text-sm font-bold text-eagle-green">
        Page {currentPage + 1} of {totalPages}
      </p>
    </div>
  );
}

export default PageNavigator;
