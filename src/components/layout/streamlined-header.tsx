import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Heart,
  ShoppingCart,
  User,
  Globe,
  LogOut,
  Menu,
  X,
  Package,
  Ticket,
  Shield,
  Store,
  ChevronDown,
  Calendar,
  Smartphone,
} from "lucide-react";
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
import HeaderSearch from "@/components/search/HeaderSearch";
import { cartService } from "@/services/cartService";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "react-i18next";
import GoGeramiLogo from "@/components/GoGeramiLogo";
import WalletMenu from "@/components/layout/WalletMenu";
import { SHOW_APP_DOWNLOAD } from "@/lib/featureFlags";

export default function StreamlinedHeader() {
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage, availableLanguages } = useLanguage();
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const pathname = location.pathname;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileCategoriesOpen, setIsMobileCategoriesOpen] = useState(false);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setIsMobileCategoriesOpen(false);
  };

  // Close mobile menu when route changes
  useEffect(() => {
    closeMobileMenu();
  }, [pathname]);

  // Get cart and wishlist counts using real API
  const { data: cartData } = useQuery({
    queryKey: ["cart", "items"],
    queryFn: () => cartService.getCart(),
    enabled: isAuthenticated,
  });

  // Use the wishlist hook for count
  const { getWishlistCount } = useWishlist();
  const { isIncomplete } = useIncompleteProfile();

  const cartItems = cartData?.items || [];
  const cartCount = Array.isArray(cartItems)
    ? cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0)
    : 0;
  const wishlistCount = getWishlistCount();

  /* const handleSearchClick = () => {
    window.location.href = "/search";
  }; */

  const handleSignOut = async () => {
    await logout();
  };

  // Core navigation items - all primary business features
  const navigation = [
    { name: t("navigation.home"), href: "/" },
    { name: t("navigation.shop"), href: "/shop" },
    { name: t("Packages"), href: "/packages" },
    { name: t("navigation.services"), href: "/services" },
    { name: t("navigation.events"), href: "/events" },
    { name: t("navigation.custom"), href: "/custom-orders" },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        {/* Primary row: identity, search, account. Search wraps to its own
            full-width line below md, where it cannot share a row legibly. */}
        <div className="page-shell flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5 md:flex-nowrap md:gap-x-5 lg:h-16 lg:py-0">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center space-x-0">
              <GoGeramiLogo
                size="md"
                variant="icon"
                className="h-8 w-8 lg:h-12 lg:w-12"
              />
              <div className="hidden sm:flex flex-col">
                <div className="flex items-center">
                  <span className="text-lg lg:text-xl font-bold text-eagle-green">
                    Go
                  </span>
                  <span className="text-lg lg:text-xl font-bold text-eagle-green">
                    Gerami
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {/* Site-wide search */}
          <HeaderSearch className="order-last w-full md:order-none md:w-auto md:flex-1 md:max-w-lg lg:max-w-2xl" />

          {/* Right Side Actions */}
          <div className="flex items-center space-x-1 ml-auto flex-shrink-0">
            {/* Desktop Actions - Hidden on mobile */}
            <div className="hidden lg:flex items-center space-x-1">
              {/* Get the App — sits before the icons so it reads as an offer,
                  not another utility. Plain <a>: the target is a hash on "/". */}
              {SHOW_APP_DOWNLOAD && (
                <a
                  href="/#get-the-app"
                  className="mr-2 flex items-center gap-1.5 rounded-full bg-eagle-green px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-viridian-green"
                >
                  <Smartphone className="h-4 w-4" />
                  {t("Get the App")}
                </a>
              )}

              {/* Search */}
              {/* <TooltipProvider>
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
              </TooltipProvider> */}

              {/* Reward wallet */}
              {isAuthenticated && <WalletMenu />}

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
                        <span className="sr-only">{t("Wishlist")}</span>
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("Wishlist")}</TooltipContent>
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
                        <span className="sr-only">{t("Cart")}</span>
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("Shopping Cart")}</TooltipContent>
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
                    <span className="sr-only">{t("Language")}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-white">
                  {availableLanguages.map((language) => (
                    <DropdownMenuItem
                      key={language.code}
                      onClick={() => changeLanguage(language.code)}
                      className={`cursor-pointer ${
                        currentLanguage === language.code ? "bg-accent" : ""
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          {language.nativeName}
                        </span>
                        {language.name !== language.nativeName && (
                          <span className="text-sm text-muted-foreground">
                            ({language.name})
                          </span>
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
                      <span className="sr-only">{t("Profile")}</span>
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
                              <p className="font-medium text-amber-900 text-xs">
                                {t("Complete your profile")}
                              </p>
                              <p className="text-amber-700 text-xs mt-0.5">
                                {t("Add missing details")}
                              </p>
                              <Link
                                to="/profile?tab=personal"
                                className="text-amber-800 hover:text-amber-900 text-xs font-medium underline mt-1 inline-block"
                              >
                                {t("Complete now")} →
                              </Link>
                            </div>
                          </div>
                        </div>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {user?.role?.toUpperCase() === "ADMIN" && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link
                            to="/admin"
                            className="flex items-center text-eagle-green font-medium"
                          >
                            <Shield className="mr-2 h-4 w-4" />
                            <span>{t("Admin Dashboard")}</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {user?.role?.toUpperCase() === "VENDOR" && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link
                            to="/vendor"
                            className="flex items-center text-emerald-600 font-medium"
                          >
                            <Store className="mr-2 h-4 w-4" />
                            <span>{t("Vendor Dashboard")}</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        <span>{t("My Profile")}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/my-orders" className="flex items-center">
                        <Package className="mr-2 h-4 w-4" />
                        <span>{t("My Orders")}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        to="/my-service-orders"
                        className="flex items-center"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>{t("My Services")}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/my-tickets" className="flex items-center">
                        <Ticket className="mr-2 h-4 w-4" />
                        <span>{t("My Tickets")}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        to="/my-custom-orders"
                        className="flex items-center"
                      >
                        <Package className="mr-2 h-4 w-4" />
                        <span>{t("My Custom Orders")}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {/* <DropdownMenuItem asChild>
                      <Link to="/register-celebrity" className="flex items-center">
                        <span className="mr-2">🌟</span>
                        <span>Join as Celebrity</span>
                      </Link>
                    </DropdownMenuItem> */}
                    {user?.role?.toUpperCase() !== "VENDOR" &&
                      user?.role?.toUpperCase() !== "ADMIN" && (
                        <DropdownMenuItem asChild>
                          <Link
                            to="/vendor-signup"
                            className="flex items-center"
                          >
                            <Store className="mr-2 h-4 w-4" />
                            <span>{t("Join as Vendor")}</span>
                          </Link>
                        </DropdownMenuItem>
                      )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>{t("Sign Out")}</span>
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
                        {t("Partner")}
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
                          <span>{t("Join as Vendor")}</span>
                        </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem asChild>
                          <Link to="/partner-signup" className="flex items-center">
                            <Store className="mr-2 h-4 w-4" />
                            <span>{t("Join as Partner")}</span>
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
                    <Link to="/signin">{t("Sign In")}</Link>
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
                onClick={() => {
                  if (isMobileMenuOpen) {
                    closeMobileMenu();
                  } else {
                    setIsMobileMenuOpen(true);
                  }
                }}
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

        {/* Secondary row: catalogue navigation, so the primary row stays
            reserved for search. Mobile keeps these in the hamburger menu. */}
        <nav className="hidden lg:block border-t border-eagle-green/[0.07]">
          {/* No negative margin: the link pill's left edge sits on the page
              gutter, flush with the campaign banner and the product cards. */}
          <div className="page-shell flex h-10 items-center gap-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? "text-viridian-green bg-viridian-green/15"
                    : "text-eagle-green hover:text-viridian-green hover:bg-viridian-green/10"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeMobileMenu}
          />

          {/* Mobile Menu */}
          <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out flex flex-col overflow-hidden">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">
                  {t("Menu")}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeMobileMenu}
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

                {/* Categories - Collapsed by default on mobile */}
                {/*
                <div className="px-2 py-2 border-t border-gray-100 mt-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsMobileCategoriesOpen((prev) => !prev)}
                    className="w-full flex items-center justify-between px-3 py-2 text-base font-medium text-eagle-green rounded-lg hover:bg-gray-50 transition-colors"
                    aria-expanded={isMobileCategoriesOpen}
                    aria-controls="mobile-categories-panel"
                  >
                    <span>Categories</span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        isMobileCategoriesOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isMobileCategoriesOpen && (
                    <div id="mobile-categories-panel" className="mt-2 pl-1">
                      <CategoryDropdown isMobile={true} />
                    </div>
                  )}
                </div>
                */}
              </nav>

              {/* Actions */}
              <div className="p-3 border-t space-y-2 bg-white flex-shrink-0 max-h-[45vh] overflow-y-auto">
                {/* Get the App */}
                {SHOW_APP_DOWNLOAD && (
                  <a
                    href="/#get-the-app"
                    onClick={closeMobileMenu}
                    className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-eagle-green text-sm font-semibold text-white"
                  >
                    <Smartphone className="h-4 w-4" />
                    {t("Get the App")}
                  </a>
                )}

                {/* Search */}
                {/* <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start h-9"
                  onClick={handleSearchClick}
                >
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </Button> */}

                {/* Reward wallet */}
                {isAuthenticated && (
                  <div className="w-full">
                    <WalletMenu variant="mobile" />
                  </div>
                )}

                {/* Wishlist */}
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="w-full justify-start relative h-9"
                >
                  <Link to="/wishlist">
                    <Heart className="mr-2 h-4 w-4" />
                    {t("Wishlist")}
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start h-9"
                    >
                      <Globe className="mr-2 h-4 w-4" />
                      {availableLanguages.find(
                        (language) => language.code === currentLanguage,
                      )?.nativeName ?? currentLanguage}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-white">
                    {availableLanguages.map((language) => (
                      <DropdownMenuItem
                        key={language.code}
                        onClick={() => changeLanguage(language.code)}
                        className={`cursor-pointer ${
                          currentLanguage === language.code ? "bg-accent" : ""
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">
                            {language.nativeName}
                          </span>
                          {language.name !== language.nativeName && (
                            <span className="text-sm text-muted-foreground">
                              ({language.name})
                            </span>
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
                    {user?.role?.toUpperCase() === "ADMIN" && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="w-full justify-start h-9 bg-eagle-green/10 border-eagle-green text-eagle-green hover:bg-eagle-green hover:text-white"
                      >
                        <Link to="/admin">
                          <Shield className="mr-2 h-4 w-4" />
                          {t("Admin Dashboard")}
                        </Link>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="w-full justify-start h-9"
                    >
                      <Link to="/profile">
                        <User className="mr-2 h-4 w-4" />
                        {t("Profile")}
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="w-full justify-start h-9"
                    >
                      <Link to="/my-orders">
                        <Package className="mr-2 h-4 w-4" />
                        {t("Orders")}
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="w-full justify-start h-9"
                    >
                      <Link to="/my-service-orders">
                        <Calendar className="mr-2 h-4 w-4" />
                        {t("Services")}
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="w-full justify-start h-9"
                    >
                      <Link to="/my-tickets">
                        <Ticket className="mr-2 h-4 w-4" />
                        {t("Tickets")}
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="w-full justify-start h-9"
                    >
                      <Link to="/my-custom-orders">
                        <Package className="mr-2 h-4 w-4" />
                        {t("Custom Orders")}
                      </Link>
                    </Button>
                    {/* <Button variant="outline" size="sm" asChild className="w-full justify-start h-9">
                      <Link to="/register-celebrity">
                        <span className="mr-2">🌟</span>
                        Celebrity
                      </Link>
                    </Button> */}
                    {/* Only show Join as Vendor if user is not a vendor */}
                    {user?.role?.toUpperCase() !== "VENDOR" &&
                      user?.role?.toUpperCase() !== "ADMIN" && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="w-full justify-start h-9"
                        >
                          <Link to="/vendor-signup">
                            <Store className="mr-2 h-4 w-4" />
                            {t("Join as a Vendor")}
                          </Link>
                        </Button>
                      )}
                    {/* Show Vendor Dashboard for vendors */}
                    {user?.role?.toUpperCase() === "VENDOR" && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="w-full justify-start h-9 bg-emerald-50 border-emerald-500 text-emerald-700 hover:bg-emerald-100"
                      >
                        <Link to="/vendor">
                          <Store className="mr-2 h-4 w-4" />
                          {t("Vendor")}
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
                      {t("Sign Out")}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* <Button variant="outline" size="sm" asChild className="w-full justify-start h-9">
                      <Link to="/register-celebrity">
                        <span className="mr-2">🌟</span>
                        Celebrity
                      </Link>
                    </Button> */}
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="w-full justify-start h-9"
                    >
                      <Link to="/vendor-signup">
                        <Store className="mr-2 h-4 w-4" />
                        {t("Join as a Vendor")}
                      </Link>
                    </Button>
                    <Button size="sm" asChild className="w-full h-9">
                      <Link to="/signin">{t("Sign In")}</Link>
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
