import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
  Outlet,
} from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import ScrollToTop from "./ScrollToTop";
import Layout from "./layout/layout";

import Landing from "@/pages/landing";
import Gifts from "@/pages/gifts";
import Shop from "@/pages/shop";
import Cart from "@/pages/cart";
import ProductDetail from "@/pages/product-detail";
// import Search from "@/pages/Search";
const About = React.lazy(() => import("@/pages/about"));
const Contact = React.lazy(() => import("@/pages/contact"));
const SignIn = React.lazy(() => import("@/pages/signin"));
const SignUp = React.lazy(() => import("@/pages/signup"));
const VerifyEmail = React.lazy(() => import("@/pages/verify-email"));
const VendorDetail = React.lazy(() => import("@/pages/vendor-detail"));
const Occasions = React.lazy(() => import("@/pages/occasions"));
const OccasionCategory = React.lazy(() => import("@/pages/occasion-category"));
const Collections = React.lazy(() => import("@/pages/collections"));
const Events = React.lazy(() => import("@/pages/events"));
const EventDetail = React.lazy(() => import("@/pages/event-detail"));
const Services = React.lazy(() => import("@/pages/services"));
const ServiceDetail = React.lazy(() => import("@/pages/service-detail"));
const NotFound = React.lazy(() => import("@/pages/not-found"));
const EventCheckout = React.lazy(() => import("@/pages/event-checkout"));
const ServiceCheckout = React.lazy(() => import("@/pages/service-checkout"));
const ServiceConfirmation = React.lazy(
  () => import("@/pages/service-confirmation")
);
const MyServiceOrders = React.lazy(() => import("@/pages/my-service-orders"));
const TrackServiceOrder = React.lazy(
  () => import("@/pages/track-service-order")
);
const MyEventTickets = React.lazy(() => import("@/pages/my-event-tickets"));
const MyOrders = React.lazy(() => import("@/pages/MyOrders"));
const TrackOrder = React.lazy(() => import("@/pages/TrackOrder"));
const StripePayment = React.lazy(() => import("@/pages/stripe-payment"));
const ChapaPayment = React.lazy(() => import("@/pages/chapa-payment"));
const TelebirrPayment = React.lazy(() => import("@/pages/telebirr-payment"));
const TelebirrReturn = React.lazy(() => import("@/pages/telebirr-return"));
const PaymentSuccess = React.lazy(() => import("@/pages/payment-success"));
const ServiceOrderSuccess = React.lazy(
  () => import("@/pages/service-order-success")
);
const EventOrderSuccess = React.lazy(
  () => import("@/pages/event-order-success")
);
const Checkout = React.lazy(() => import("@/pages/Checkout"));
const OrderReview = React.lazy(() => import("@/pages/OrderReview"));
const VendorSignup = React.lazy(() => import("@/pages/VendorSignup"));
const ForgotPassword = React.lazy(() => import("@/pages/forgot-password"));
const ResetPassword = React.lazy(() => import("@/pages/reset-password"));
const Profile = React.lazy(() => import("@/pages/Profile"));

const AdminDashboard = React.lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminUsers = React.lazy(() => import("@/pages/admin/AdminUsers"));
const AdminVendors = React.lazy(() => import("@/pages/admin/AdminVendors"));
const AdminEvents = React.lazy(() => import("@/pages/admin/AdminEvents"));
const AdminCategories = React.lazy(
  () => import("@/pages/admin/AdminCategories")
);
const AdminSubcategories = React.lazy(
  () => import("@/pages/admin/AdminSubcategories")
);
const AdminProducts = React.lazy(() => import("@/pages/admin/AdminProducts"));
const AdminServices = React.lazy(() => import("@/pages/admin/AdminServices"));
const AdminTax = React.lazy(() => import("@/pages/admin/AdminTax"));
const AdminCurrency = React.lazy(() => import("@/pages/admin/AdminCurrency"));
const AdminDelivery = React.lazy(() => import("@/pages/admin/AdminDelivery"));
// import AdminDeliveryPersonnel from "@/pages/admin/AdminDeliveryPersonnel";
// import AdminOrderAssignments from "@/pages/admin/AdminOrderAssignments";
// import AdminDeliveryConfirmations from "@/pages/admin/AdminDeliveryConfirmations";
const AdminFeaturedAds = React.lazy(
  () => import("@/pages/admin/AdminFeaturedAds")
);
const AdminCustomTemplates = React.lazy(
  () => import("@/pages/admin/AdminCustomTemplates")
);
const AdminCustomOrders = React.lazy(
  () => import("@/pages/admin/AdminCustomOrders")
);
const AdminPaymentMethods = React.lazy(
  () => import("@/pages/admin/AdminPaymentMethods")
);
const AdminCampaigns = React.lazy(() => import("@/pages/admin/AdminCampaigns"));
const AdminCampaignParticipations = React.lazy(
  () => import("@/pages/admin/AdminCampaignParticipations")
);
const AdminBroadcasts = React.lazy(
  () => import("@/pages/admin/AdminBroadcasts")
);
const AdminCommission = React.lazy(
  () => import("@/pages/admin/AdminCommission")
);
const AdminRefunds = React.lazy(() => import("@/pages/admin/AdminRefunds"));
const AdminVendorPayout = React.lazy(
  () => import("@/pages/admin/AdminVendorPayout")
);
const AdminRoles = React.lazy(() => import("@/pages/admin/AdminRoles"));
const AdminPermissions = React.lazy(
  () => import("@/pages/admin/AdminPermissions")
);

const VendorDashboardLayout = React.lazy(
  () => import("@/pages/vendor/VendorDashboardLayout")
);
const VendorOverview = React.lazy(
  () => import("@/pages/vendor/VendorOverview")
);
const VendorProductsPage = React.lazy(
  () => import("@/pages/vendor/VendorProductsPage")
);
const VendorEventsPage = React.lazy(
  () => import("@/pages/vendor/VendorEventsPage")
);
const VendorServicesPage = React.lazy(
  () => import("@/pages/vendor/VendorServicesPage")
);
const VendorPaymentsPage = React.lazy(
  () => import("@/pages/vendor/VendorPaymentsPage")
);
const VendorCheckInPage = React.lazy(
  () => import("@/pages/vendor/VendorCheckInPage")
);
const VendorSettingsPage = React.lazy(
  () => import("@/pages/vendor/VendorSettingsPage")
);
const VendorResubmitPage = React.lazy(
  () => import("@/pages/vendor/VendorResubmitPage")
);
const VendorRequests = React.lazy(
  () => import("@/pages/vendor/VendorRequests")
);
const VendorServiceOrders = React.lazy(
  () => import("@/pages/vendor/VendorServiceOrders")
);
const VendorServiceCalendar = React.lazy(
  () => import("@/pages/vendor/VendorServiceCalendar")
);
const VendorProductOrders = React.lazy(
  () => import("@/pages/vendor/VendorProductOrders")
);
const VendorPackagesPage = React.lazy(
  () => import("@/pages/vendor/VendorPackagesPage")
);
const VendorPackageOrders = React.lazy(
  () => import("@/pages/vendor/VendorPackageOrders")
);
const Packages = React.lazy(() => import("@/pages/packages"));
const PackageDetail = React.lazy(() => import("@/pages/package-detail"));
const CreateProduct = React.lazy(() => import("@/pages/vendor/CreateProduct"));
const CreateEvent = React.lazy(() => import("@/pages/vendor/CreateEvent"));
const CreateService = React.lazy(() => import("@/pages/vendor/CreateService"));
const EditProduct = React.lazy(() => import("@/pages/vendor/EditProduct"));
const EditEvent = React.lazy(() => import("@/pages/vendor/EditEvent"));
const EditService = React.lazy(() => import("@/pages/vendor/EditService"));
const ProductPriceUpdate = React.lazy(
  () => import("@/pages/vendor/ProductPriceUpdate")
);
const EventPriceUpdate = React.lazy(
  () => import("@/pages/vendor/EventPriceUpdate")
);
const ChapaOnboarding = React.lazy(
  () => import("@/pages/vendor/ChapaOnboarding")
);
const StripeOnboardingReturn = React.lazy(
  () => import("@/pages/vendor/StripeOnboardingReturn")
);
const StripeOnboardingRefresh = React.lazy(
  () => import("@/pages/vendor/StripeOnboardingRefresh")
);
const VendorCustomTemplates = React.lazy(
  () => import("@/pages/vendor/VendorCustomTemplates")
);
const VendorCustomTemplateDetail = React.lazy(
  () => import("@/pages/vendor/VendorCustomTemplateDetail")
);
const CreateCustomTemplate = React.lazy(
  () => import("@/pages/vendor/CreateCustomTemplate")
);
const VendorCustomOrders = React.lazy(
  () => import("@/pages/vendor/VendorCustomOrders")
);
const VendorCustomOrderDetail = React.lazy(
  () => import("@/pages/vendor/VendorCustomOrderDetail")
);
const VendorProductDetail = React.lazy(
  () => import("@/pages/vendor/VendorProductDetail")
);
const VendorEventDetail = React.lazy(
  () => import("@/pages/vendor/VendorEventDetail")
);
const VendorServiceDetail = React.lazy(
  () => import("@/pages/vendor/VendorServiceDetail")
);
const VendorDiscountsPage = React.lazy(
  () => import("@/pages/vendor/VendorDiscountsPage")
);
const CreateDiscount = React.lazy(
  () => import("@/pages/vendor/CreateDiscount")
);
const VendorDiscountDetail = React.lazy(
  () => import("@/pages/vendor/VendorDiscountDetail")
);
const EditDiscount = React.lazy(() => import("@/pages/vendor/EditDiscount"));
const VendorDiscountUsages = React.lazy(
  () => import("@/pages/vendor/VendorDiscountUsages")
);
const VendorCampaignsPage = React.lazy(
  () => import("@/pages/vendor/VendorCampaignsPage")
);
const CampaignDetailPage = React.lazy(() => import("@/pages/campaign-detail"));
const CustomOrders = React.lazy(() => import("@/pages/custom-orders"));
const Wishlist = React.lazy(() => import("@/pages/Wishlist"));
const MyCustomOrders = React.lazy(
  () => import("@/pages/customer/MyCustomOrders")
);
const CustomerCustomOrderDetail = React.lazy(
  () => import("@/pages/customer/CustomerCustomOrderDetail")
);
const CustomOrderCategories = React.lazy(
  () => import("@/pages/customer/CustomOrderCategories")
);
const CustomOrderTemplates = React.lazy(
  () => import("@/pages/customer/CustomOrderTemplates")
);
const CreateCustomOrder = React.lazy(
  () => import("@/pages/customer/CreateCustomOrder")
);
const CustomOrderShipping = React.lazy(
  () => import("@/pages/customer/CustomOrderShipping")
);

const DeliveryLayout = React.lazy(
  () => import("@/pages/delivery/DeliveryLayout")
);
const DeliveryDashboard = React.lazy(
  () => import("@/pages/delivery/DeliveryDashboard")
);
const DeliveryAssignments = React.lazy(
  () => import("@/pages/delivery/DeliveryAssignments")
);
const DeliveryAssignmentDetail = React.lazy(
  () => import("@/pages/delivery/DeliveryAssignmentDetail")
);
const DeliveryHistory = React.lazy(
  () => import("@/pages/delivery/DeliveryHistory")
);
const DeliveryProfile = React.lazy(
  () => import("@/pages/delivery/DeliveryProfile")
);
const AvailableOrders = React.lazy(
  () => import("@/pages/delivery/AvailableOrders")
);

function RouteLoading({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-eagle-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}

function OfflineFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white border border-gray-200 rounded-xl shadow-sm p-8 text-center">
        <h1 className="text-2xl font-bold text-eagle-green mb-3">
          You are offline
        </h1>
        <p className="text-gray-600 mb-6">
          This page needs a network connection. Please reconnect and try again.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center rounded-md bg-eagle-green px-4 text-sm font-medium text-white hover:bg-viridian-green"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
          <a
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-md border border-eagle-green/30 px-4 text-sm font-medium text-eagle-green hover:bg-eagle-green/5"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}

function RoleBasedPrefetch() {
  const { isAuthenticated, isLoading, user } = useAuth();

  React.useEffect(() => {
    if (isLoading || !isAuthenticated) {
      return;
    }

    const role = user?.role?.toUpperCase();

    if (role === "ADMIN" || role === "SUPER_ADMIN") {
      void Promise.all([
        import("@/pages/admin/AdminDashboard"),
        import("@/pages/admin/AdminUsers"),
      ]);
      return;
    }

    if (role === "VENDOR") {
      void Promise.all([
        import("@/pages/vendor/VendorDashboardLayout"),
        import("@/pages/vendor/VendorOverview"),
      ]);
      return;
    }

    if (role === "DELIVERY_PERSON") {
      void Promise.all([
        import("@/pages/delivery/DeliveryLayout"),
        import("@/pages/delivery/DeliveryDashboard"),
      ]);
    }
  }, [isAuthenticated, isLoading, user?.role]);

  return null;
}

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
    localStorage.setItem("returnTo", currentPath);
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
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

  React.useEffect(() => {
    if (!isLoading && isAuthenticated && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You need administrator privileges to access this page.",
        variant: "destructive",
      });
      navigate("/", { replace: true });
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
    localStorage.setItem("returnTo", currentPath);
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
  const isVendor = userRole === "VENDOR";

  React.useEffect(() => {
    if (!isLoading && isAuthenticated && !isVendor) {
      toast({
        title: "Access Denied",
        description: "You need vendor privileges to access this page.",
        variant: "destructive",
      });
      navigate("/", { replace: true });
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
    localStorage.setItem("returnTo", currentPath);
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
  const isDeliveryPerson = userRole === "DELIVERY_PERSON";

  React.useEffect(() => {
    if (!isLoading && isAuthenticated && !isDeliveryPerson) {
      toast({
        title: "Access Denied",
        description: "You need delivery person privileges to access this page.",
        variant: "destructive",
      });
      navigate("/", { replace: true });
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
    localStorage.setItem("returnTo", currentPath);
    return <Navigate to="/signin" replace />;
  }

  if (!isDeliveryPerson) {
    return null;
  }

  return <>{children}</>;
}

function HomeRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-eagle-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const role = user?.role?.toUpperCase();
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  if (isAuthenticated && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <Landing />;
}

export default function Router() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <RoleBasedPrefetch />
      <React.Suspense fallback={<RouteLoading message="Loading page..." />}>
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
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="reset-password" element={<ResetPassword />} />

            {/* Main Pages */}
            <Route path="gifts" element={<Gifts />} />
            <Route path="gifts/:categorySlug" element={<Gifts />} />
            <Route path="shop" element={<Shop />} />
            <Route path="shop/:categorySlug" element={<Shop />} />
            <Route path="shop/category/:subcategorySlug" element={<Shop />} />
            <Route path="packages" element={<Packages />} />
            <Route path="packages/:packageId" element={<PackageDetail />} />
            {/* <Route path="search" element={<Search />} /> */}
            <Route
              path="gift-experiences"
              element={<Navigate to="/events" replace />}
            />
            <Route path="occasions" element={<Occasions />} />
            <Route
              path="occasions/:categorySlug"
              element={<OccasionCategory />}
            />
            <Route path="collections" element={<Collections />} />
            <Route path="events" element={<Events />} />
            <Route path="events/:slug" element={<EventDetail />} />
            <Route
              path="events/:eventId/checkout"
              element={
                <ProtectedRoute>
                  <EventCheckout />
                </ProtectedRoute>
              }
            />
            <Route path="services" element={<Services />} />
            <Route path="services/:id" element={<ServiceDetail />} />
            <Route
              path="service-checkout/:serviceId"
              element={
                <ProtectedRoute>
                  <ServiceCheckout />
                </ProtectedRoute>
              }
            />
            <Route
              path="service-confirmation/:orderId"
              element={
                <ProtectedRoute>
                  <ServiceConfirmation />
                </ProtectedRoute>
              }
            />
            <Route
              path="service-confirmation"
              element={
                <ProtectedRoute>
                  <ServiceConfirmation />
                </ProtectedRoute>
              }
            />

            {/* Campaign Detail / Registration */}
            <Route path="campaigns/:id" element={<CampaignDetailPage />} />

            {/* Product Detail */}
            <Route path="product/:id" element={<ProductDetail />} />

            {/* Vendor Detail */}
            <Route path="vendor/:id" element={<VendorDetail />} />

            <Route path="cart" element={<Cart />} />

            <Route
              path="checkout"
              element={
                <ProtectedRoute>
                  <Checkout />
                </ProtectedRoute>
              }
            />

            <Route
              path="order-review"
              element={
                <ProtectedRoute>
                  <OrderReview />
                </ProtectedRoute>
              }
            />

            {/* Protected Routes */}
            <Route
              path="wishlist"
              element={
                <ProtectedRoute>
                  <Wishlist />
                </ProtectedRoute>
              }
            />

            <Route path="custom-orders" element={<CustomOrders />} />

            <Route
              path="custom-orders/categories"
              element={<CustomOrderCategories />}
            />

            <Route
              path="custom-orders/category/:categoryId"
              element={<CustomOrderTemplates />}
            />

            <Route
              path="custom-orders/template/:templateId"
              element={
                <ProtectedRoute>
                  <CreateCustomOrder />
                </ProtectedRoute>
              }
            />

            <Route
              path="custom-orders/template/:templateId/shipping"
              element={
                <ProtectedRoute>
                  <CustomOrderShipping />
                </ProtectedRoute>
              }
            />

            <Route
              path="payment/stripe"
              element={
                <ProtectedRoute>
                  <StripePayment />
                </ProtectedRoute>
              }
            />

            <Route
              path="payment/chapa"
              element={
                <ProtectedRoute>
                  <ChapaPayment />
                </ProtectedRoute>
              }
            />

            <Route
              path="payment/chapa/callback"
              element={
                <ProtectedRoute>
                  <PaymentSuccess />
                </ProtectedRoute>
              }
            />

            <Route
              path="payment/telebirr"
              element={
                <ProtectedRoute>
                  <TelebirrPayment />
                </ProtectedRoute>
              }
            />

            <Route
              path="payment/telebirr/return"
              element={
                <ProtectedRoute>
                  <TelebirrReturn />
                </ProtectedRoute>
              }
            />

            <Route
              path="payment-success"
              element={
                <ProtectedRoute>
                  <PaymentSuccess />
                </ProtectedRoute>
              }
            />

            <Route
              path="service-order-success"
              element={
                <ProtectedRoute>
                  <ServiceOrderSuccess />
                </ProtectedRoute>
              }
            />

            <Route
              path="event-order-success"
              element={
                <ProtectedRoute>
                  <EventOrderSuccess />
                </ProtectedRoute>
              }
            />

            <Route
              path="my-tickets"
              element={
                <ProtectedRoute>
                  <MyEventTickets />
                </ProtectedRoute>
              }
            />

            <Route
              path="my-orders"
              element={
                <ProtectedRoute>
                  <MyOrders />
                </ProtectedRoute>
              }
            />

            <Route
              path="track/:orderId"
              element={
                <ProtectedRoute>
                  <TrackOrder />
                </ProtectedRoute>
              }
            />

            <Route
              path="my-service-orders"
              element={
                <ProtectedRoute>
                  <MyServiceOrders />
                </ProtectedRoute>
              }
            />

            <Route
              path="my-service-orders/:orderId"
              element={
                <ProtectedRoute>
                  <TrackServiceOrder />
                </ProtectedRoute>
              }
            />

            <Route
              path="my-custom-orders"
              element={
                <ProtectedRoute>
                  <MyCustomOrders />
                </ProtectedRoute>
              }
            />

            <Route
              path="my-custom-orders/:orderId"
              element={
                <ProtectedRoute>
                  <CustomerCustomOrderDetail />
                </ProtectedRoute>
              }
            />

            <Route
              path="profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            <Route path="offline" element={<OfflineFallback />} />

            {/* Catch all route */}
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* Vendor Routes - Outside main Layout to avoid navbar */}
          <Route
            path="/vendor"
            element={
              <VendorRoute>
                <React.Suspense
                  fallback={
                    <RouteLoading message="Loading vendor dashboard..." />
                  }
                >
                  <VendorDashboardLayout />
                </React.Suspense>
              </VendorRoute>
            }
          >
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
            <Route
              path="service-calendar"
              element={<VendorServiceCalendar />}
            />
            <Route path="product-orders" element={<VendorProductOrders />} />
            <Route path="packages" element={<VendorPackagesPage />} />
            <Route path="package-orders" element={<VendorPackageOrders />} />
            <Route path="discounts" element={<VendorDiscountsPage />} />
            <Route path="discounts/new" element={<CreateDiscount />} />
            <Route path="discounts/:id" element={<VendorDiscountDetail />} />
            <Route path="discounts/:id/edit" element={<EditDiscount />} />
            <Route
              path="discounts/:id/usages"
              element={<VendorDiscountUsages />}
            />
            <Route path="campaigns" element={<VendorCampaignsPage />} />
            <Route
              path="custom-templates"
              element={<VendorCustomTemplates />}
            />
            <Route
              path="custom-templates/new"
              element={<CreateCustomTemplate />}
            />
            <Route
              path="custom-templates/:id"
              element={<VendorCustomTemplateDetail />}
            />
            <Route path="custom-orders" element={<VendorCustomOrders />} />
            <Route
              path="custom-orders/:orderId"
              element={<VendorCustomOrderDetail />}
            />
            <Route path="check-in" element={<VendorCheckInPage />} />
            <Route path="payments" element={<VendorPaymentsPage />} />
            <Route path="payments/chapa" element={<ChapaOnboarding />} />
            <Route
              path="onboarding/return"
              element={<StripeOnboardingReturn />}
            />
            <Route
              path="onboarding/refresh"
              element={<StripeOnboardingRefresh />}
            />
            <Route path="requests" element={<VendorRequests />} />
            <Route path="settings" element={<VendorSettingsPage />} />
            <Route path="resubmit" element={<VendorResubmitPage />} />
          </Route>

          {/* Admin Routes - Outside main Layout to avoid navbar/footer */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <React.Suspense
                  fallback={
                    <RouteLoading message="Loading admin dashboard..." />
                  }
                >
                  <div className="min-h-screen">
                    <Outlet />
                  </div>
                </React.Suspense>
              </AdminRoute>
            }
          >
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
            <Route path="broadcasts" element={<AdminBroadcasts />} />
            <Route
              path="campaign-participations"
              element={<AdminCampaignParticipations />}
            />
            <Route path="featured-ads" element={<AdminFeaturedAds />} />
            <Route path="custom-templates" element={<AdminCustomTemplates />} />
            <Route path="custom-orders" element={<AdminCustomOrders />} />
            <Route path="payment-methods" element={<AdminPaymentMethods />} />
            <Route path="refunds" element={<AdminRefunds />} />
            <Route path="vendor-payouts" element={<AdminVendorPayout />} />
            <Route path="commission" element={<AdminCommission />} />
            <Route path="roles" element={<AdminRoles />} />
            <Route path="permissions" element={<AdminPermissions />} />
          </Route>

          {/* Delivery Person Routes - Outside main Layout to avoid navbar */}
          <Route
            path="/delivery"
            element={
              <DeliveryRoute>
                <React.Suspense
                  fallback={
                    <RouteLoading message="Loading delivery dashboard..." />
                  }
                >
                  <DeliveryLayout />
                </React.Suspense>
              </DeliveryRoute>
            }
          >
            <Route index element={<DeliveryDashboard />} />
            <Route path="available-orders" element={<AvailableOrders />} />
            <Route path="assignments" element={<DeliveryAssignments />} />
            <Route
              path="assignments/:assignmentId"
              element={<DeliveryAssignmentDetail />}
            />
            <Route path="history" element={<DeliveryHistory />} />
            <Route path="profile" element={<DeliveryProfile />} />
          </Route>
        </Routes>
      </React.Suspense>
    </BrowserRouter>
  );
}
