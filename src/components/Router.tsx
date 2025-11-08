import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from "@/hooks/useAuth";
import ScrollToTop from "./ScrollToTop";
import Layout from "./layout/layout";

// Import pages from organized folder structure
// Public pages
import Landing from "@/pages/public/landing";
import About from "@/pages/public/about";
import Contact from "@/pages/public/contact";
import NotFound from "@/pages/public/not-found";

// Auth pages
import SignIn from "@/pages/auth/signin";
import SignUp from "@/pages/auth/signup";

// Shop pages
import Gifts from "@/pages/shop/gifts";
import Shop from "@/pages/shop/shop";
import ProductDetail from "@/pages/shop/product-detail";
import Collections from "@/pages/shop/collections";
import Search from "@/pages/shop/Search";

// Events pages
import Events from "@/pages/events/events";
import EventDetail from "@/pages/events/event-detail";
import ServiceDetail from "@/pages/events/service-detail";
import EnhancedEvents from "@/pages/events/EnhancedEvents";
import GiftExperiences from "@/pages/events/GiftExperiences";

// Occasions pages
import Occasions from "@/pages/occasions/occasions";
import OccasionCategory from "@/pages/occasions/occasion-category";

// Orders pages
import Cart from "@/pages/orders/cart";
import Wishlist from "@/pages/orders/Wishlist";
import CustomOrders from "@/pages/orders/custom-orders";
import CustomOrderDetail from "@/pages/orders/custom-order-detail";

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
          <Route path="shop/category/:subcategorySlug" element={<Shop />} />
          <Route path="search" element={<Search />} />
          <Route path="gift-experiences" element={<Navigate to="/events" replace />} />
          <Route path="occasions" element={<Occasions />} />
          <Route path="occasions/:categorySlug" element={<OccasionCategory />} />
          <Route path="collections" element={<Collections />} />
          <Route path="events" element={<Events />} />
          <Route path="events/:slug" element={<EventDetail />} />
          <Route path="services/:id" element={<ServiceDetail />} />
          
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
          
          <Route path="custom-orders/:id" element={
            <ProtectedRoute>
              <CustomOrderDetail />
            </ProtectedRoute>
          } />
          
          {/* Catch all route */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}