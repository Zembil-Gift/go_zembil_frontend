import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Search, Heart, ShoppingCart, User, Globe, LogOut, Menu, X } from "lucide-react";
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
const logoImagePath = "/attached_assets/go_zembil_loogo-02.png";

export default function StreamlinedHeader() {
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage, availableLanguages } = useLanguage();
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const pathname = location.pathname;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

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

  const handleSignOut = async () => {
    localStorage.removeItem('returnTo');
    try {
      await MockApiService.logout();
    } finally {
      window.location.href = '/signin';
    }
  };

  // Core navigation items - all primary business features
  const navigation = [
    { name: t('navigation.home'), href: "/" },
    { name: t('navigation.shop'), href: "/shop" },
    { name: t('navigation.custom'), href: "/custom-orders" },
    { name: t('navigation.events'), href: "/events" },
  ];

  return (
    <>
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
                  <span className="text-lg lg:text-2xl font-bold text-eagle-green">go</span>
                  <span className="text-lg lg:text-2xl font-bold text-eagle-green">Zembil</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1 mr-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`px-2 py-2 text-sm font-medium transition-colors rounded-lg ${
                  pathname === item.href
                    ? "text-viridian-green bg-viridian-green/20"
                    : "text-eagle-green hover:text-viridian-green hover:bg-viridian-green/10"
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
            {/* Desktop Actions - Hidden on mobile */}
            <div className="hidden lg:flex items-center space-x-1">
              {/* Search */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSearchClick}
                      className="text-eagle-green hover:text-viridian-green p-2"
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
                      className="relative text-eagle-green hover:text-viridian-green p-2"
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
                      className="relative text-eagle-green hover:text-viridian-green p-2"
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
                    className="text-eagle-green hover:text-viridian-green p-2"
                  >
                    <Globe className="h-5 w-5" />
                    <span className="sr-only">Language</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-white">
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
                      className="text-eagle-green hover:text-viridian-green p-2"
                    >
                      <User className="h-5 w-5" />
                      <span className="sr-only">Profile</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 bg-white">
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
                        className="text-eagle-green hover:text-viridian-green text-xs lg:text-sm"
                      >
                        Partner
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-white">
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
                    className="text-eagle-green hover:text-viridian-green"
                  >
                    <Link to="/signin">Sign In</Link>
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile Actions */}
            <div className="flex lg:hidden items-center space-x-2">
              {/* Mobile Cart */}
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="relative text-eagle-green hover:text-viridian-green p-2"
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
                </Link>
              </Button>

              {/* Hamburger Menu */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-eagle-green hover:text-viridian-green p-2"
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Mobile Menu */}
          <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 p-4 space-y-2">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`block px-4 py-3 text-base font-medium rounded-lg transition-colors ${
                      pathname === item.href
                        ? "text-viridian-green bg-viridian-green/20"
                        : "text-eagle-green hover:text-viridian-green hover:bg-gray-50"
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
                
                {/* Categories */}
                <div className="px-4 py-3">
                  <CategoryDropdown isMobile={true} />
                </div>
              </nav>

              {/* Actions */}
              <div className="p-4 border-t space-y-3">
                {/* Search */}
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleSearchClick}
                >
                  <Search className="mr-2 h-4 w-4" />
                  Search Products
                </Button>

                {/* Wishlist */}
                <Button
                  variant="outline"
                  asChild
                  className="w-full justify-start relative"
                >
                  <Link to="/wishlist">
                    <Heart className="mr-2 h-4 w-4" />
                    Wishlist
                    {wishlistCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="ml-auto h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                      >
                        {wishlistCount}
                      </Badge>
                    )}
                  </Link>
                </Button>

                {/* Language Switcher */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Globe className="mr-2 h-4 w-4" />
                      Language
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-white">
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

                {/* User Actions */}
                {isAuthenticated ? (
                  <div className="space-y-2">
                    <Button variant="outline" asChild className="w-full justify-start">
                      <Link to="/profile">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </Button>
                    <Button variant="outline" asChild className="w-full justify-start">
                      <Link to="/register-celebrity">
                        <span className="mr-2">🌟</span>
                        Join as Celebrity
                      </Link>
                    </Button>
                    <Button variant="outline" asChild className="w-full justify-start">
                      <Link to="/register-vendor">
                        <span className="mr-2">🏪</span>
                        Join as Vendor
                      </Link>
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={handleSignOut}
                      className="w-full justify-start"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button variant="outline" asChild className="w-full justify-start">
                      <Link to="/register-celebrity">
                        <span className="mr-2">🌟</span>
                        Join as Celebrity
                      </Link>
                    </Button>
                    <Button variant="outline" asChild className="w-full justify-start">
                      <Link to="/register-vendor">
                        <span className="mr-2">🏪</span>
                        Join as Vendor
                      </Link>
                    </Button>
                    <Button asChild className="w-full">
                      <Link to="/signin">Sign In</Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}