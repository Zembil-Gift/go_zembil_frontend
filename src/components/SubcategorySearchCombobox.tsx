import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { categoryService, SubCategoryResponse } from "@/services/categoryService";

interface SubcategorySearchComboboxProps {
  /** The currently selected subcategory id (as string or number) */
  value?: string | number;
  /** Called with the new string id when a subcategory is selected */
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Required field - shows error styling */
  required?: boolean;
  className?: string;
}

export function SubcategorySearchCombobox({
  value,
  onValueChange,
  placeholder = "Select a sub-category",
  disabled = false,
  className,
}: SubcategorySearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Focus input when popover opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearchInput("");
    }
  }, [open]);

  // Fetch subcategories from backend
  const { data: subcategories = [], isLoading } = useQuery<SubCategoryResponse[]>({
    queryKey: ["subcategories-search", debouncedSearch],
    queryFn: () => categoryService.searchSubCategories(debouncedSearch || undefined),
    staleTime: 30_000,
  });

  // Fetch the selected subcategory's name (for display when closed)
  const selectedId = value != null && value !== "" && value !== 0 ? String(value) : undefined;
  const { data: selectedSubcategory } = useQuery<SubCategoryResponse[]>({
    queryKey: ["subcategories-search", ""],
    queryFn: () => categoryService.searchSubCategories(undefined),
    staleTime: 60_000,
    select: (data) => data,
  });
  const selectedItem = selectedId
    ? (selectedSubcategory ?? subcategories).find((s) => String(s.id) === selectedId)
    : undefined;

  const displayLabel = selectedItem
    ? selectedItem.categoryName
      ? `${selectedItem.name} (${selectedItem.categoryName})`
      : selectedItem.name
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !selectedId && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        {/* Search input */}
        <div className="flex items-center border-b px-3 py-2 gap-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search subcategories..."
            className="h-8 border-0 p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {isLoading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
        </div>

        {/* Results list */}
        <div className="max-h-60 overflow-y-auto p-1">
          {/* Clear option */}
          {selectedId && (
            <button
              type="button"
              onClick={() => {
                onValueChange("");
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 rounded-sm px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
            >
              Clear selection
            </button>
          )}

          {isLoading && subcategories.length === 0 ? (
            <div className="flex items-center justify-center py-6 gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : subcategories.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No subcategories found
            </div>
          ) : (
            subcategories.map((sub) => (
              <button
                type="button"
                key={sub.id}
                onClick={() => {
                  onValueChange(String(sub.id));
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer text-left",
                  String(sub.id) === selectedId && "bg-accent"
                )}
              >
                <Check
                  className={cn(
                    "h-4 w-4 shrink-0",
                    String(sub.id) === selectedId ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="flex-1 truncate">{sub.name}</span>
                {sub.categoryName && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {sub.categoryName}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
