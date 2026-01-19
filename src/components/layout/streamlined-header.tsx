import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Search, Heart, ShoppingCart, User, Globe, LogOut, Menu, X, Package, Ticket, Shield, Store } from "lucide-react";
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
import { useIncompleteProfile } from "@/hooks/useIncompleteProfile";
import { useWishlist } from "@/hooks/useWishlist";
import { useQuery } from "@tanstack/react-query";
import CategoryDropdown from "@/components/category-dropdown";
import { cartService } from "@/services/cartService";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "react-i18next";
import GoGeramiLogo from "@/components/GoGeramiLogo";

export default function StreamlinedHeader() {
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage, availableLanguages } = useLanguage();
  const { user, isAuthenticated} = useAuth();
  const location = useLocation();
  const pathname = location.pathname;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Get cart and wishlist counts using real API
  const { data: cartData } = useQuery({
    queryKey: ['cart', 'items'],
    queryFn: () => cartService.getCart(),
    enabled: !!isAuthenticated,
  });
  
  // Use the wishlist hook for count
  const { getWishlistCount } = useWishlist();
  const { isIncomplete } = useIncompleteProfile();

  const cartItems = cartData?.items || [];
  const cartCount = Array.isArray(cartItems) ? cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0) : 0;
  const wishlistCount = getWishlistCount();

  const handleSearchClick = () => {
    window.location.href = "/search";
  };

  const handleSignOut = async () => {
    localStorage.removeItem('returnTo');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/signin';
  };

  // Core navigation items - all primary business features
  const navigation = [
    { name: t('navigation.home'), href: "/" },
    { name: t('navigation.shop'), href: "/shop" },
    { name: t('navigation.services'), href: "/services" },
    { name: t('navigation.events'), href: "/events" },
    { name: t('navigation.custom'), href: "/custom-orders" },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-white/95 justify-center backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-16 lg:h-20 items-center px-4 lg:px-6 max-w-full">
          {/* Logo */}
          <div className="flex-shrink-0 mr-4 lg:mr-8">
            <Link to="/" className="flex items-center space-x-0">
              <GoGeramiLogo 
                size="md"
                variant="icon"
                className="h-8 w-8 lg:h-14 lg:w-14"
              />
              <div className="hidden sm:flex flex-col">
                <div className="flex items-center">
                  <span className="text-lg lg:text-2xl font-bold text-eagle-green">Go</span>
                  <span className="text-lg lg:text-2xl font-bold text-eagle-green">Gerami</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center justify-center w-full space-x-1">
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
                      className="text-eagle-green hover:text-viridian-green p-2 relative"
                    >
                      <User className="h-5 w-5" />
                      {isIncomplete && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                      )}
                      <span className="sr-only">Profile</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 bg-white">
                    {/* Profile Incomplete Notice */}
                    {isIncomplete && (
                      <>
                        <div className="px-2 py-2 text-sm">
                          <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                            <span className="text-amber-600 mt-0.5">⚠️</span>
                            <div>
                              <p className="font-medium text-amber-900 text-xs">Complete your profile</p>
                              <p className="text-amber-700 text-xs mt-0.5">Add missing details</p>
                              <Link to="/profile?tab=personal" className="text-amber-800 hover:text-amber-900 text-xs font-medium underline mt-1 inline-block">
                                Complete now →
                              </Link>
                            </div>
                          </div>
                        </div>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {user?.role?.toUpperCase() === 'ADMIN' && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link to="/admin" className="flex items-center text-eagle-green font-medium">
                            <Shield className="mr-2 h-4 w-4" />
                            <span>Admin Dashboard</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {user?.role?.toUpperCase() === 'VENDOR' && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link to="/vendor" className="flex items-center text-emerald-600 font-medium">
                            <Store className="mr-2 h-4 w-4" />
                            <span>Vendor Dashboard</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        <span>My Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/my-orders" className="flex items-center">
                        <Package className="mr-2 h-4 w-4" />
                        <span>My Orders</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/my-tickets" className="flex items-center">
                        <Ticket className="mr-2 h-4 w-4" />
                        <span>My Tickets</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/my-custom-orders" className="flex items-center">
                        <Package className="mr-2 h-4 w-4" />
                        <span>My Custom Orders</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {/* <DropdownMenuItem asChild>
                      <Link to="/register-celebrity" className="flex items-center">
                        <span className="mr-2">🌟</span>
                        <span>Join as Celebrity</span>
                      </Link>
                    </DropdownMenuItem> */}
                    {user?.role?.toUpperCase() !== 'VENDOR' && user?.role?.toUpperCase() !== 'ADMIN' && (
                      <DropdownMenuItem asChild>
                        <Link to="/vendor-signup" className="flex items-center">
                          <Store className="mr-2 h-4 w-4" />
                          <span>Join as Vendor</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
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
                      {/* <DropdownMenuItem asChild>
                        <Link to="/register-celebrity" className="flex items-center">
                          <span className="mr-2">🌟</span>
                          <span>Join as Celebrity</span>
                        </Link>
                      </DropdownMenuItem> */}
                      <DropdownMenuItem asChild>
                        <Link to="/vendor-signup" className="flex items-center">
                          <Store className="mr-2 h-4 w-4" />
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
          <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out flex flex-col overflow-hidden">
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
              <nav className="flex-1 p-4 space-y-2 overflow-y-auto min-h-0">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`block px-3 py-2 text-base font-medium rounded-lg transition-colors ${
                      pathname === item.href
                        ? "text-viridian-green bg-viridian-green/20"
                        : "text-eagle-green hover:text-viridian-green hover:bg-gray-50"
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
                
                {/* Categories */}
                <div className="px-2 py-2">
                  <CategoryDropdown isMobile={true} />
                </div>
              </nav>

              {/* Actions */}
              <div className="p-3 border-t space-y-2 bg-white flex-shrink-0 max-h-[45vh] overflow-y-auto">
                {/* Search */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start h-9"
                  onClick={handleSearchClick}
                >
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </Button>

                {/* Wishlist */}
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="w-full justify-start relative h-9"
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
                    <Button variant="outline" size="sm" className="w-full justify-start h-9">
                      <Globe className="mr-2 h-4 w-4" />
                      {currentLanguage === 'en-US' ? 'EN' : currentLanguage === 'am' ? 'አማ' : currentLanguage}
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
                    {/* Admin Dashboard Link - Only for admin users */}
                    {user?.role?.toUpperCase() === 'ADMIN' && (
                      <Button variant="outline" size="sm" asChild className="w-full justify-start h-9 bg-eagle-green/10 border-eagle-green text-eagle-green hover:bg-eagle-green hover:text-white">
                        <Link to="/admin">
                          <Shield className="mr-2 h-4 w-4" />
                          Admin Dashboard
                        </Link>
                      </Button>
                    )}
                    <Button variant="outline" size="sm" asChild className="w-full justify-start h-9">
                      <Link to="/profile">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild className="w-full justify-start h-9">
                      <Link to="/my-orders">
                        <Package className="mr-2 h-4 w-4" />
                        Orders
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild className="w-full justify-start h-9">
                      <Link to="/my-tickets">
                        <Ticket className="mr-2 h-4 w-4" />
                        Tickets
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild className="w-full justify-start h-9">
                      <Link to="/my-custom-orders">
                        <Package className="mr-2 h-4 w-4" />
                        Custom Orders
                      </Link>
                    </Button>
                    {/* <Button variant="outline" size="sm" asChild className="w-full justify-start h-9">
                      <Link to="/register-celebrity">
                        <span className="mr-2">🌟</span>
                        Celebrity
                      </Link>
                    </Button> */}
                    {/* Only show Join as Vendor if user is not a vendor */}
                    {user?.role?.toUpperCase() !== 'VENDOR' && user?.role?.toUpperCase() !== 'ADMIN' && (
                      <Button variant="outline" size="sm" asChild className="w-full justify-start h-9">
                        <Link to="/vendor-signup">
                          <Store className="mr-2 h-4 w-4" />
                          Join Vendor
                        </Link>
                      </Button>
                    )}
                    {/* Show Vendor Dashboard for vendors */}
                    {user?.role?.toUpperCase() === 'VENDOR' && (
                      <Button variant="outline" size="sm" asChild className="w-full justify-start h-9 bg-emerald-50 border-emerald-500 text-emerald-700 hover:bg-emerald-100">
                        <Link to="/vendor">
                          <Store className="mr-2 h-4 w-4" />
                          Vendor
                        </Link>
                      </Button>
                    )}
                    <Button 
                      variant="destructive"
                      size="sm"
                      onClick={handleSignOut}
                      className="w-full justify-start h-9"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" asChild className="w-full justify-start h-9">
                      <Link to="/register-celebrity">
                        <span className="mr-2">🌟</span>
                        Celebrity
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild className="w-full justify-start h-9">
                      <Link to="/vendor-signup">
                        <Store className="mr-2 h-4 w-4" />
                        Join Vendor
                      </Link>
                    </Button>
                    <Button size="sm" asChild className="w-full h-9">
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