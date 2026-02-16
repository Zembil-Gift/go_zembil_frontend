import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import ScrollToTop from "./ScrollToTop";
import Layout from "./layout/layout";

import Landing from "@/pages/landing";
import About from "@/pages/about";
import Contact from "@/pages/contact";
import SignIn from "@/pages/signin";
import SignUp from "@/pages/signup";
import VerifyEmail from "@/pages/verify-email";
import Gifts from "@/pages/gifts";
import Shop from "@/pages/shop";
import Cart from "@/pages/cart";
import Wishlist from "@/pages/Wishlist";
import ProductDetail from "@/pages/product-detail";
import VendorDetail from "@/pages/vendor-detail";
import CustomOrders from "@/pages/custom-orders";
// import Search from "@/pages/Search";
import Occasions from "@/pages/occasions";
import OccasionCategory from "@/pages/occasion-category";
import Collections from "@/pages/collections";
import Events from "@/pages/events";
import EventDetail from "@/pages/event-detail";
import EventCheckout from "@/pages/event-checkout";
import Services from "@/pages/services";
import ServiceDetail from "@/pages/service-detail";
import ServiceCheckout from "@/pages/service-checkout";
import ServiceConfirmation from "@/pages/service-confirmation";
import MyServiceOrders from "@/pages/my-service-orders";
import MyEventTickets from "@/pages/my-event-tickets";
import MyOrders from "@/pages/MyOrders";
import TrackOrder from "@/pages/TrackOrder";
import StripePayment from "@/pages/stripe-payment";
import ChapaPayment from "@/pages/chapa-payment";
import TelebirrPayment from "@/pages/telebirr-payment";
import TelebirrReturn from "@/pages/telebirr-return";
import PaymentSuccess from "@/pages/payment-success";
import Checkout from "@/pages/Checkout";
import OrderReview from "@/pages/OrderReview";
import NotFound from "@/pages/not-found";
import VendorSignup from "@/pages/VendorSignup";
import Profile from "@/pages/Profile";

import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminVendors from "@/pages/admin/AdminVendors";
import AdminEvents from "@/pages/admin/AdminEvents";
import AdminCategories from "@/pages/admin/AdminCategories";
import AdminSubcategories from "@/pages/admin/AdminSubcategories";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminServices from "@/pages/admin/AdminServices";
import AdminTax from "@/pages/admin/AdminTax";
import AdminCurrency from "@/pages/admin/AdminCurrency";
import AdminDelivery from "@/pages/admin/AdminDelivery";
// import AdminDeliveryPersonnel from "@/pages/admin/AdminDeliveryPersonnel";
// import AdminOrderAssignments from "@/pages/admin/AdminOrderAssignments";
// import AdminDeliveryConfirmations from "@/pages/admin/AdminDeliveryConfirmations";
import AdminFeaturedAds from "@/pages/admin/AdminFeaturedAds";
import AdminCustomTemplates from "@/pages/admin/AdminCustomTemplates";
import AdminCustomOrders from "@/pages/admin/AdminCustomOrders";
import AdminPaymentMethods from "@/pages/admin/AdminPaymentMethods";
import AdminCampaigns from "@/pages/admin/AdminCampaigns";
import AdminRoles from "@/pages/admin/AdminRoles";
import AdminPermissions from "@/pages/admin/AdminPermissions";

import VendorDashboardLayout from "@/pages/vendor/VendorDashboardLayout";
import VendorOverview from "@/pages/vendor/VendorOverview";
import VendorProductsPage from "@/pages/vendor/VendorProductsPage";
import VendorEventsPage from "@/pages/vendor/VendorEventsPage";
import VendorServicesPage from "@/pages/vendor/VendorServicesPage";
import VendorPaymentsPage from "@/pages/vendor/VendorPaymentsPage";
import VendorCheckInPage from "@/pages/vendor/VendorCheckInPage";
import VendorSettingsPage from "@/pages/vendor/VendorSettingsPage";
import VendorRequests from "@/pages/vendor/VendorRequests";
import VendorServiceOrders from "@/pages/vendor/VendorServiceOrders";
import VendorServiceCalendar from "@/pages/vendor/VendorServiceCalendar";
import VendorProductOrders from "@/pages/vendor/VendorProductOrders";
import CreateProduct from "@/pages/vendor/CreateProduct";
import CreateEvent from "@/pages/vendor/CreateEvent";
import CreateService from "@/pages/vendor/CreateService";
import EditProduct from "@/pages/vendor/EditProduct";
import EditEvent from "@/pages/vendor/EditEvent";
import EditService from "@/pages/vendor/EditService";
import ProductPriceUpdate from "@/pages/vendor/ProductPriceUpdate";
import EventPriceUpdate from "@/pages/vendor/EventPriceUpdate";
import ChapaOnboarding from "@/pages/vendor/ChapaOnboarding";
import StripeOnboardingReturn from "@/pages/vendor/StripeOnboardingReturn";
import StripeOnboardingRefresh from "@/pages/vendor/StripeOnboardingRefresh";
import VendorCustomTemplates from "@/pages/vendor/VendorCustomTemplates";
import VendorCustomTemplateDetail from "@/pages/vendor/VendorCustomTemplateDetail";
import CreateCustomTemplate from "@/pages/vendor/CreateCustomTemplate";
import VendorCustomOrders from "@/pages/vendor/VendorCustomOrders";
import VendorCustomOrderDetail from "@/pages/vendor/VendorCustomOrderDetail";
import VendorProductDetail from "@/pages/vendor/VendorProductDetail";
import VendorEventDetail from "@/pages/vendor/VendorEventDetail";
import VendorServiceDetail from "@/pages/vendor/VendorServiceDetail";
import VendorDiscountsPage from "@/pages/vendor/VendorDiscountsPage";
import CreateDiscount from "@/pages/vendor/CreateDiscount";
import VendorDiscountDetail from "@/pages/vendor/VendorDiscountDetail";
import EditDiscount from "@/pages/vendor/EditDiscount";
import VendorDiscountUsages from "@/pages/vendor/VendorDiscountUsages";
import MyCustomOrders from "@/pages/customer/MyCustomOrders";
import CustomerCustomOrderDetail from "@/pages/customer/CustomerCustomOrderDetail";
import CustomOrderCategories from "@/pages/customer/CustomOrderCategories";
import CustomOrderTemplates from "@/pages/customer/CustomOrderTemplates";
import CreateCustomOrder from "@/pages/customer/CreateCustomOrder";

import {
  DeliveryLayout,
  DeliveryDashboard,
  DeliveryAssignments,
  DeliveryAssignmentDetail,
  DeliveryHistory,
  DeliveryProfile,
  AvailableOrders,
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
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

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
  // Allow all users to browse home page - no forced redirects
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
          <Route path="verify-email" element={<VerifyEmail />} />
          <Route path="vendor-signup" element={<VendorSignup />} />
          
          {/* Main Pages */}
          <Route path="gifts" element={<Gifts />} />
          <Route path="gifts/:categorySlug" element={<Gifts />} />
          <Route path="shop" element={<Shop />} />
          <Route path="shop/:categorySlug" element={<Shop />} />
          <Route path="shop/category/:subcategorySlug" element={<Shop />} />
          {/* <Route path="search" element={<Search />} /> */}
          <Route path="gift-experiences" element={<Navigate to="/events" replace />} />
          <Route path="occasions" element={<Occasions />} />
          <Route path="occasions/:categorySlug" element={<OccasionCategory />} />
          <Route path="collections" element={<Collections />} />
          <Route path="events" element={<Events />} />
          <Route path="events/:slug" element={<EventDetail />} />
          <Route path="events/:eventId/checkout" element={<ProtectedRoute><EventCheckout /></ProtectedRoute>} />
          <Route path="services" element={<Services />} />
          <Route path="services/:id" element={<ServiceDetail />} />
          <Route path="service-checkout/:serviceId" element={<ProtectedRoute><ServiceCheckout /></ProtectedRoute>} />
          <Route path="service-confirmation/:orderId" element={<ProtectedRoute><ServiceConfirmation /></ProtectedRoute>} />
          <Route path="service-confirmation" element={<ProtectedRoute><ServiceConfirmation /></ProtectedRoute>} />
          
          {/* Product Detail */}
          <Route path="product/:id" element={<ProductDetail />} />
          
          {/* Vendor Detail */}
          <Route path="vendor/:id" element={<VendorDetail />} />
          
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
          
          <Route path="custom-orders/categories" element={
            <ProtectedRoute>
              <CustomOrderCategories />
            </ProtectedRoute>
          } />
          
          <Route path="custom-orders/category/:categoryId" element={
            <ProtectedRoute>
              <CustomOrderTemplates />
            </ProtectedRoute>
          } />
          
          <Route path="custom-orders/template/:templateId" element={
            <ProtectedRoute>
              <CreateCustomOrder />
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
          
          <Route path="payment/telebirr" element={
            <ProtectedRoute>
              <TelebirrPayment />
            </ProtectedRoute>
          } />
          
          <Route path="payment/telebirr/return" element={
            <ProtectedRoute>
              <TelebirrReturn />
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
          
          <Route path="my-orders" element={
            <ProtectedRoute>
              <MyOrders />
            </ProtectedRoute>
          } />
          
          <Route path="track/:orderId" element={
            <ProtectedRoute>
              <TrackOrder />
            </ProtectedRoute>
          } />
          
          <Route path="my-service-orders" element={
            <ProtectedRoute>
              <MyServiceOrders />
            </ProtectedRoute>
          } />
          
          <Route path="my-custom-orders" element={
            <ProtectedRoute>
              <MyCustomOrders />
            </ProtectedRoute>
          } />
          
          <Route path="my-custom-orders/:orderId" element={
            <ProtectedRoute>
              <CustomerCustomOrderDetail />
            </ProtectedRoute>
          } />
          
          <Route path="profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          
          {/* Catch all route */}
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Vendor Routes - Outside main Layout to avoid navbar */}
        <Route path="/vendor" element={<VendorRoute><VendorDashboardLayout /></VendorRoute>}>
          <Route index element={<VendorOverview />} />
          <Route path="products" element={<VendorProductsPage />} />
          <Route path="products/new" element={<CreateProduct />} />
          <Route path="products/:id" element={<VendorProductDetail />} />
          <Route path="products/:id/edit" element={<EditProduct />} />
          <Route path="products/:id/price" element={<ProductPriceUpdate />} />
          <Route path="events" element={<VendorEventsPage />} />
          <Route path="events/new" element={<CreateEvent />} />
          <Route path="events/:id" element={<VendorEventDetail />} />
          <Route path="events/:id/edit" element={<EditEvent />} />
          <Route path="events/:id/price" element={<EventPriceUpdate />} />
          <Route path="services" element={<VendorServicesPage />} />
          <Route path="services/new" element={<CreateService />} />
          <Route path="services/:id" element={<VendorServiceDetail />} />
          <Route path="services/:id/edit" element={<EditService />} />
          <Route path="service-orders" element={<VendorServiceOrders />} />
          <Route path="service-calendar" element={<VendorServiceCalendar />} />
          <Route path="product-orders" element={<VendorProductOrders />} />
          <Route path="discounts" element={<VendorDiscountsPage />} />
          <Route path="discounts/new" element={<CreateDiscount />} />
          <Route path="discounts/:id" element={<VendorDiscountDetail />} />
          <Route path="discounts/:id/edit" element={<EditDiscount />} />
          <Route path="discounts/:id/usages" element={<VendorDiscountUsages />} />
          <Route path="custom-templates" element={<VendorCustomTemplates />} />
          <Route path="custom-templates/new" element={<CreateCustomTemplate />} />
          <Route path="custom-templates/:id" element={<VendorCustomTemplateDetail />} />
          <Route path="custom-orders" element={<VendorCustomOrders />} />
          <Route path="custom-orders/:orderId" element={<VendorCustomOrderDetail />} />
          <Route path="check-in" element={<VendorCheckInPage />} />
          <Route path="payments" element={<VendorPaymentsPage />} />
          <Route path="payments/chapa" element={<ChapaOnboarding />} />
          <Route path="onboarding/return" element={<StripeOnboardingReturn />} />
          <Route path="onboarding/refresh" element={<StripeOnboardingRefresh />} />
          <Route path="requests" element={<VendorRequests />} />
          <Route path="settings" element={<VendorSettingsPage />} />
        </Route>

        {/* Admin Routes - Outside main Layout to avoid navbar/footer */}
        <Route path="/admin" element={<AdminRoute><div className="min-h-screen"><Outlet /></div></AdminRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="vendors" element={<AdminVendors />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="services" element={<AdminServices />} />
          <Route path="events" element={<AdminEvents />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="subcategories" element={<AdminSubcategories />} />
          <Route path="tax" element={<AdminTax />} />
          <Route path="currency" element={<AdminCurrency />} />
          <Route path="delivery" element={<AdminDelivery />} />
          {/* <Route path="delivery-personnel" element={<AdminDeliveryPersonnel />} />
          <Route path="order-assignments" element={<AdminOrderAssignments />} />
          <Route path="delivery-confirmations" element={<AdminDeliveryConfirmations />} /> */}
          <Route path="campaigns" element={<AdminCampaigns />} />
          <Route path="featured-ads" element={<AdminFeaturedAds />} />
          <Route path="custom-templates" element={<AdminCustomTemplates />} />
          <Route path="custom-orders" element={<AdminCustomOrders />} />
          <Route path="payment-methods" element={<AdminPaymentMethods />} />
          <Route path="roles" element={<AdminRoles />} />
          <Route path="permissions" element={<AdminPermissions />} />
        </Route>

        {/* Delivery Person Routes - Outside main Layout to avoid navbar */}
        <Route path="/delivery" element={<DeliveryRoute><DeliveryLayout /></DeliveryRoute>}>
          <Route index element={<DeliveryDashboard />} />
          <Route path="available-orders" element={<AvailableOrders />} />
          <Route path="assignments" element={<DeliveryAssignments />} />
          <Route path="assignments/:assignmentId" element={<DeliveryAssignmentDetail />} />
          <Route path="history" element={<DeliveryHistory />} />
          <Route path="profile" element={<DeliveryProfile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}