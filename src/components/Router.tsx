import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import ScrollToTop from "./ScrollToTop";
import Layout from "./layout/layout";

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
import Occasions from "@/pages/occasions";
import OccasionCategory from "@/pages/occasion-category";
import Collections from "@/pages/collections";
import Events from "@/pages/events";
import EventDetail from "@/pages/event-detail";
import EventCheckout from "@/pages/event-checkout";
import ServiceDetail from "@/pages/service-detail";
import MyEventTickets from "@/pages/my-event-tickets";
import StripePayment from "@/pages/stripe-payment";
import ChapaPayment from "@/pages/chapa-payment";
import PaymentSuccess from "@/pages/payment-success";
import Checkout from "@/pages/Checkout";
import OrderReview from "@/pages/OrderReview";
import NotFound from "@/pages/not-found";
import VendorSignup from "@/pages/VendorSignup";

import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminVendors from "@/pages/admin/AdminVendors";
import AdminEvents from "@/pages/admin/AdminEvents";
import AdminCategories from "@/pages/admin/AdminCategories";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminTax from "@/pages/admin/AdminTax";
import AdminCurrency from "@/pages/admin/AdminCurrency";
import AdminDelivery from "@/pages/admin/AdminDelivery";

import VendorDashboard from "@/pages/vendor/VendorDashboard";
import CreateProduct from "@/pages/vendor/CreateProduct";
import CreateEvent from "@/pages/vendor/CreateEvent";
import ChapaOnboarding from "@/pages/vendor/ChapaOnboarding";
import StripeOnboardingReturn from "@/pages/vendor/StripeOnboardingReturn";
import StripeOnboardingRefresh from "@/pages/vendor/StripeOnboardingRefresh";

import {
  DeliveryLayout,
  DeliveryDashboard,
  DeliveryAssignments,
  DeliveryAssignmentDetail,
  DeliveryHistory,
  DeliveryProfile,
} from "@/pages/delivery";

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
    const currentPath = location.pathname + location.search;
    localStorage.setItem('returnTo', currentPath);
    return <Navigate to="/signin" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const userRole = user?.role?.toUpperCase();
  const isAdmin = userRole === 'ADMIN';

  React.useEffect(() => {
    if (!isLoading && isAuthenticated && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You need administrator privileges to access this page.",
        variant: "destructive",
      });
      navigate('/', { replace: true });
    }
  }, [isLoading, isAuthenticated, isAdmin, toast, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-eagle-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const currentPath = location.pathname + location.search;
    localStorage.setItem('returnTo', currentPath);
    return <Navigate to="/signin" replace />;
  }

  if (!isAdmin) {
  }

  return <>{children}</>;
}

function VendorRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const userRole = user?.role?.toUpperCase();
  const isVendor = userRole === 'VENDOR';

  React.useEffect(() => {
    if (!isLoading && isAuthenticated && !isVendor) {
      toast({
        title: "Access Denied",
        description: "You need vendor privileges to access this page.",
        variant: "destructive",
      });
      navigate('/', { replace: true });
    }
  }, [isLoading, isAuthenticated, isVendor, toast, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-viridian-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying vendor access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const currentPath = location.pathname + location.search;
    localStorage.setItem('returnTo', currentPath);
    return <Navigate to="/signin" replace />;
  }

  if (!isVendor) {
    return null;
  }

  return <>{children}</>;
}

function DeliveryRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const userRole = user?.role?.toUpperCase();
  const isDeliveryPerson = userRole === 'DELIVERY_PERSON';

  React.useEffect(() => {
    if (!isLoading && isAuthenticated && !isDeliveryPerson) {
      toast({
        title: "Access Denied",
        description: "You need delivery person privileges to access this page.",
        variant: "destructive",
      });
      navigate('/', { replace: true });
    }
  }, [isLoading, isAuthenticated, isDeliveryPerson, toast, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-ethiopian-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying delivery access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const currentPath = location.pathname + location.search;
    localStorage.setItem('returnTo', currentPath);
    return <Navigate to="/signin" replace />;
  }

  if (!isDeliveryPerson) {
    return null;
  }

  return <>{children}</>;
}

function HomeRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading || (isAuthenticated && !user)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-ethiopian-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user?.role?.toUpperCase() === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }

  if (isAuthenticated && user?.role?.toUpperCase() === 'DELIVERY_PERSON') {
    return <Navigate to="/delivery" replace />;
  }

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
          <Route path="vendor-signup" element={<VendorSignup />} />
          
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
          <Route path="events/:eventId/checkout" element={<ProtectedRoute><EventCheckout /></ProtectedRoute>} />
          <Route path="services/:id" element={<ServiceDetail />} />
          
          {/* Product Detail */}
          <Route path="product/:id" element={<ProductDetail />} />
          
          <Route path="cart" element={<Cart />} />
          
          <Route path="checkout" element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          } />
          
          <Route path="order-review" element={
            <ProtectedRoute>
              <OrderReview />
            </ProtectedRoute>
          } />
          
          {/* Protected Routes */}
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
          
          <Route path="payment/stripe" element={
            <ProtectedRoute>
              <StripePayment />
            </ProtectedRoute>
          } />
          
          <Route path="payment/chapa" element={
            <ProtectedRoute>
              <ChapaPayment />
            </ProtectedRoute>
          } />

          <Route path="payment/chapa/callback" element={
            <ProtectedRoute>
              <PaymentSuccess />
            </ProtectedRoute>
          } />
          
          <Route path="payment-success" element={
            <ProtectedRoute>
              <PaymentSuccess />
            </ProtectedRoute>
          } />
          
          <Route path="my-tickets" element={
            <ProtectedRoute>
              <MyEventTickets />
            </ProtectedRoute>
          } />
          
          {/* Vendor Routes */}
          <Route path="vendor" element={<VendorRoute><VendorDashboard /></VendorRoute>} />
          <Route path="vendor/products/new" element={<VendorRoute><CreateProduct /></VendorRoute>} />
          <Route path="vendor/events/new" element={<VendorRoute><CreateEvent /></VendorRoute>} />

          <Route path="vendor/payments/chapa" element={<VendorRoute><ChapaOnboarding /></VendorRoute>} />
          <Route path="vendor/onboarding/return" element={<VendorRoute><StripeOnboardingReturn /></VendorRoute>} />
          <Route path="vendor/onboarding/refresh" element={<VendorRoute><StripeOnboardingRefresh /></VendorRoute>} />
          
          {/* Admin Routes */}
          <Route path="admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
          <Route path="admin/vendors" element={<AdminRoute><AdminVendors /></AdminRoute>} />
          <Route path="admin/products" element={<AdminRoute><AdminProducts /></AdminRoute>} />
          <Route path="admin/events" element={<AdminRoute><AdminEvents /></AdminRoute>} />
          <Route path="admin/categories" element={<AdminRoute><AdminCategories /></AdminRoute>} />
          <Route path="admin/tax" element={<AdminRoute><AdminTax /></AdminRoute>} />
          <Route path="admin/currency" element={<AdminRoute><AdminCurrency /></AdminRoute>} />
          <Route path="admin/delivery" element={<AdminRoute><AdminDelivery /></AdminRoute>} />
          
          {/* Catch all route */}
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Delivery Person Routes - Outside main Layout to avoid navbar */}
        <Route path="/delivery" element={<DeliveryRoute><DeliveryLayout /></DeliveryRoute>}>
          <Route index element={<DeliveryDashboard />} />
          <Route path="assignments" element={<DeliveryAssignments />} />
          <Route path="assignments/:assignmentId" element={<DeliveryAssignmentDetail />} />
          <Route path="history" element={<DeliveryHistory />} />
          <Route path="profile" element={<DeliveryProfile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}