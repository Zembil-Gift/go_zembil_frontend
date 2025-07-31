import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Search, Heart, ShoppingCart, User, Globe, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import CategoryDropdown from "@/components/category-dropdown";
import { MockApiService } from "@/services/mockApiService";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "react-i18next";
// Using refined goZembil logo with transparent background
const logoImagePath = "/attached_assets/image_1753381085382.png";

export default function StreamlinedHeader() {
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage, availableLanguages } = useLanguage();
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const pathname = location.pathname;

  // Get cart and wishlist counts using mock data
  const { data: cartItems = [] } = useQuery({
    queryKey: ['/api/cart'],
    queryFn: () => MockApiService.getCart(),
    enabled: !!isAuthenticated,
  });
  
  const { data: wishlistItems = [] } = useQuery({
    queryKey: ['/api/wishlist'],
    queryFn: () => MockApiService.getWishlist(),
    enabled: !!isAuthenticated,
  });

  const cartCount = Array.isArray(cartItems) ? cartItems.length : 0;
  const wishlistCount = Array.isArray(wishlistItems) ? wishlistItems.length : 0;

  const handleSearchClick = () => {
    window.location.href = "/search";
  };

  const handleSignOut = () => {
    localStorage.removeItem('returnTo');
    // Use mock logout instead of real API
    MockApiService.logout();
    window.location.href = '/';
  };

  // Core navigation items - all primary business features
  const navigation = [
    { name: t('navigation.home'), href: "/" },
    { name: t('navigation.shop'), href: "/shop" },
    { name: t('navigation.custom'), href: "/custom-orders" },
    { name: t('navigation.events'), href: "/gift-experiences" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container flex h-16 lg:h-20 items-center px-4 lg:px-6 max-w-full">
        {/* Logo */}
        <div className="flex-shrink-0 mr-4 lg:mr-8">
          <Link to="/" className="flex items-center space-x-2">
            <img 
              src={logoImagePath}
              alt="goZembil Logo"
              className="h-8 w-8 lg:h-12 lg:w-12 object-contain"
            />
            <div className="hidden sm:flex flex-col">
              <div className="flex items-center">
                <span className="text-lg lg:text-2xl font-bold text-deep-forest">go</span>
                <span className="text-lg lg:text-2xl font-bold text-deep-forest">Zembil</span>
              </div>
              <span className="text-xs lg:text-sm text-warm-gold font-medium -mt-1">
                Gifting with Heart
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="hidden lg:flex items-center space-x-1 mr-4">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`px-2 py-2 text-sm font-medium transition-colors rounded-lg ${
                pathname === item.href
                  ? "text-ethiopian-gold bg-ethiopian-gold/20"
                  : "text-charcoal hover:text-ethiopian-gold hover:bg-ethiopian-gold/10"
              }`}
            >
              {item.name}
            </Link>
          ))}
          
          {/* Categories Dropdown */}
          <CategoryDropdown />
        </nav>

        {/* Right Side Actions */}
        <div className="flex items-center space-x-1 ml-auto flex-shrink-0">
          {/* Search */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSearchClick}
                  className="text-charcoal hover:text-ethiopian-gold p-2"
                >
                  <Search className="h-5 w-5" />
                  <span className="sr-only">Search</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Search products</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Wishlist */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="relative text-charcoal hover:text-ethiopian-gold p-2"
                >
                  <Link to="/wishlist">
                    <Heart className="h-5 w-5" />
                    {wishlistCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                      >
                        {wishlistCount}
                      </Badge>
                    )}
                    <span className="sr-only">Wishlist</span>
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Wishlist</TooltipContent>
            </Tooltip>
          </TooltipProvider>


          {/* Cart */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="relative text-charcoal hover:text-ethiopian-gold p-2"
                >
                  <Link to="/cart">
                    <ShoppingCart className="h-5 w-5" />
                    {cartCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                      >
                        {cartCount}
                      </Badge>
                    )}
                    <span className="sr-only">Cart</span>
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Shopping Cart</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Language Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-charcoal hover:text-ethiopian-gold p-2"
              >
                <Globe className="h-5 w-5" />
                <span className="sr-only">Language</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {availableLanguages.map((language) => (
                <DropdownMenuItem
                  key={language.code}
                  onClick={() => changeLanguage(language.code)}
                  className={`cursor-pointer ${
                    currentLanguage === language.code ? 'bg-accent' : ''
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{language.nativeName}</span>
                    {language.code !== language.nativeName && (
                      <span className="text-sm text-muted-foreground">({language.name})</span>
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile / Sign In */}
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-charcoal hover:text-ethiopian-gold p-2"
                >
                  <User className="h-5 w-5" />
                  <span className="sr-only">Profile</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/register-celebrity" className="flex items-center">
                    <span className="mr-2">🌟</span>
                    <span>Join as Celebrity</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/register-vendor" className="flex items-center">
                    <span className="mr-2">🏪</span>
                    <span>Join as Vendor</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-1">
              {/* Partner Registration Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-charcoal hover:text-ethiopian-gold text-xs lg:text-sm"
                  >
                    Partner
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/register-celebrity" className="flex items-center">
                      <span className="mr-2">🌟</span>
                      <span>Join as Celebrity</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/register-vendor" className="flex items-center">
                      <span className="mr-2">🏪</span>
                      <span>Join as Vendor</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-charcoal hover:text-ethiopian-gold"
              >
                <Link to="/signin">Sign In</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden border-t border-gray-200 px-4 py-2">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`text-sm font-medium transition-colors ${
                pathname === item.href
                  ? "text-ethiopian-gold"
                  : "text-charcoal hover:text-ethiopian-gold"
              }`}
            >
              {item.name}
            </Link>
          ))}
          <div className="flex lg:hidden">
            <CategoryDropdown />
          </div>
          {!isAuthenticated && (
            <div className="flex items-center gap-2 mt-2 lg:hidden">
              <Link
                to="/register-celebrity"
                className="text-xs font-medium text-charcoal hover:text-ethiopian-gold flex items-center gap-1"
              >
                <span>🌟</span>
                <span>Celebrity</span>
              </Link>
              <span className="text-gray-300">|</span>
              <Link
                to="/register-vendor"
                className="text-xs font-medium text-charcoal hover:text-ethiopian-gold flex items-center gap-1"
              >
                <span>🏪</span>
                <span>Vendor</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}