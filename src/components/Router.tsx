import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from "@/hooks/useAuth";
import ScrollToTop from "./ScrollToTop";
import Layout from "./layout/layout";

// Import only essential pages that were working
import Landing from "@/pages/landing";
import About from "@/pages/about";
import Contact from "@/pages/contact";
import SignIn from "@/pages/signin";
import SignUp from "@/pages/signup";
import Gifts from "@/pages/gifts";
import Shop from "@/pages/shop";
import Cart from "@/pages/cart";
import Wishlist from "@/pages/Wishlist";
import ProductDetail from "@/pages/product-detail";
import CustomOrders from "@/pages/custom-orders";
import Search from "@/pages/Search";
import GiftExperiences from "@/pages/GiftExperiences";
import Occasions from "@/pages/occasions";
import OccasionCategory from "@/pages/occasion-category";
import Collections from "@/pages/collections";
import Events from "@/pages/events";
import EnhancedEvents from "@/pages/EnhancedEvents";
import NotFound from "@/pages/not-found";

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-ethiopian-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Store current path for redirect after login
    const currentPath = location.pathname + location.search;
    localStorage.setItem('returnTo', currentPath);
    return <Navigate to="/signin" replace />;
  }

  return <>{children}</>;
}

// Home Route Component - shows landing for unauthenticated users, gifts for authenticated
function HomeRoute() {
  // Always render Landing page for now until auth is fully stable
  return <Landing />;
}

export default function Router() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Public Routes */}
          <Route index element={<HomeRoute />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          
          {/* Auth Routes */}
          <Route path="signin" element={<SignIn />} />
          <Route path="signup" element={<SignUp />} />
          
          {/* Main Pages */}
          <Route path="gifts" element={<Gifts />} />
          <Route path="gifts/:categorySlug" element={<Gifts />} />
          <Route path="shop" element={<Shop />} />
          <Route path="shop/:categorySlug" element={<Shop />} />
          <Route path="search" element={<Search />} />
          <Route path="gift-experiences" element={<GiftExperiences />} />
          <Route path="occasions" element={<Occasions />} />
          <Route path="occasions/:categorySlug" element={<OccasionCategory />} />
          <Route path="collections" element={<Collections />} />
          <Route path="events" element={<EnhancedEvents />} />
          
          {/* Product Detail */}
          <Route path="product/:id" element={<ProductDetail />} />
          
          {/* Protected Routes */}
          <Route path="cart" element={
            <ProtectedRoute>
              <Cart />
            </ProtectedRoute>
          } />
          
          <Route path="wishlist" element={
            <ProtectedRoute>
              <Wishlist />
            </ProtectedRoute>
          } />
          
          <Route path="custom-orders" element={
            <ProtectedRoute>
              <CustomOrders />
            </ProtectedRoute>
          } />
          
          {/* Catch all route */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}