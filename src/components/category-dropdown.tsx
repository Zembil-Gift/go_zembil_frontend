import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import CategoriesList from "./CategoriesList";

interface CategoryDropdownProps {
  isMobile?: boolean;
}

export default function CategoryDropdown({ isMobile = false }: CategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleNavigate = () => {
    setIsOpen(false);
  };

  // Calculate dropdown position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current && !isMobile) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left
      });
    }
  }, [isOpen, isMobile]);

  // Close dropdown when clicking outside (for desktop)
  useEffect(() => {
    if (!isMobile && isOpen) {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;
        if (buttonRef.current && !buttonRef.current.contains(target)) {
          // Check if click is on the dropdown content
          const dropdownElement = document.getElementById('categories-dropdown');
          if (!dropdownElement || !dropdownElement.contains(target)) {
            setIsOpen(false);
          }
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, isMobile]);

  if (isMobile) {
    return <CategoriesList isMobile={true} onNavigate={handleNavigate} />;
  }

  // Desktop dropdown with portal
  return (
    <div 
      className="relative z-50"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <Button
        ref={buttonRef}
        variant="ghost"
        className="flex items-center space-x-1 px-5 py-3 text-sm lg:text-base font-medium transition-colors rounded-lg border border-transparent text-gray-700 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-300"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="categories-dropdown"
        aria-haspopup="true"
      >
        <span>Categories</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {/* Portal dropdown to body - escapes all container bounds */}
      {isOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999]"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => {
            // Only close if clicking on the overlay, not the dropdown content
            if (e.target === e.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <motion.div
            id="categories-dropdown"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute w-96 max-h-[70vh] overflow-y-auto overflow-x-hidden bg-white rounded-xl shadow-2xl border border-gray-200"
            style={{ 
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              zIndex: 10000,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 20px 25px -5px rgba(0, 0, 0, 0.15)',
              pointerEvents: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4" style={{ pointerEvents: 'auto' }}>
              <CategoriesList 
                isMobile={false} 
                onNavigate={handleNavigate}
                className="space-y-2"
              />
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
}