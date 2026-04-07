import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  vendorService,
  VendorProfile,
  Product,
} from "@/services/vendorService";
import {
  serviceOrderService,
  ServiceOrderResponse,
} from "@/services/serviceOrderService";
import { packageService } from "@/services/packageService";
import { customOrderTemplateService } from "@/services/customOrderTemplateService";
import type {
  CustomOrderTemplate,
  PagedCustomOrderTemplateResponse,
} from "@/types/customOrders";
import { getProductImageUrl } from "@/utils/imageUtils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Calendar,
  CreditCard,
  Plus,
  AlertCircle,
  Clock,
  DollarSign,
  Ticket,
  Layers,
  Briefcase,
  ShoppingBag,
} from "lucide-react";

export default function VendorOverview() {
  const { user, isAuthenticated } = useAuth();

  const isVendor = user?.role?.toUpperCase() === "VENDOR";

  // Fetch vendor profile
  const { data: vendorProfile } = useQuery<VendorProfile>({
    queryKey: ["vendor", "profile"],
    queryFn: () => vendorService.getMyProfile(),
    enabled: isAuthenticated && isVendor,
  });

  // Fetch onboarding status
  const { data: onboardingStatus } = useQuery({
    queryKey: ["vendor", "onboarding-status"],
    queryFn: () => vendorService.getOnboardingStatus(),
    enabled: isAuthenticated && isVendor,
  });

  // Fetch vendor summary
  const { data: vendorSummary } = useQuery({
    queryKey: ["vendor", "summary"],
    queryFn: () => vendorService.getVendorSummary(),
    enabled: isAuthenticated && isVendor,
  });

  // Fetch vendor revenue
  const { data: vendorRevenue } = useQuery({
    queryKey: ["vendor", "revenue"],
    queryFn: () => vendorService.getVendorRevenue(),
    enabled: isAuthenticated && isVendor,
  });

  // Fetch vendor products
  const { data: productsData } = useQuery({
    queryKey: ["vendor", "my-products"],
    queryFn: () => vendorService.getMyProducts(),
    enabled: isAuthenticated && isVendor,
  });

  // Fetch vendor events
  const { data: eventsData } = useQuery({
    queryKey: ["vendor", "events"],
    queryFn: () => vendorService.getMyEvents(),
    enabled: isAuthenticated && isVendor,
  });

  // Fetch vendor service orders
  const { data: serviceOrdersData } = useQuery({
    queryKey: ["vendor", "service-orders"],
    queryFn: () => serviceOrderService.getVendorOrders(0, 100),
    enabled: isAuthenticated && isVendor,
  });

  // Fetch vendor custom templates
  const { data: customTemplatesData } =
    useQuery<PagedCustomOrderTemplateResponse>({
      queryKey: ["vendor", "custom-templates", vendorProfile?.id],
      queryFn: async (): Promise<PagedCustomOrderTemplateResponse> => {
        if (!vendorProfile?.id) {
          return {
            content: [],
            totalElements: 0,
            totalPages: 0,
            size: 100,
            number: 0,
            first: true,
            last: true,
            empty: true,
          };
        }
        return customOrderTemplateService.getByVendor(vendorProfile.id, 0, 100);
      },
      enabled: isAuthenticated && isVendor && !!vendorProfile?.id,
    });

  const { data: packageData } = useQuery({
    queryKey: ["vendor", "packages", "overview"],
    queryFn: () => packageService.getVendorPackages(undefined, 0, 100),
    enabled:
      isAuthenticated &&
      isVendor &&
      (vendorProfile?.vendorType === "PRODUCT" ||
        vendorProfile?.vendorType === "HYBRID"),
  });

  const { data: packageOrdersData } = useQuery({
    queryKey: ["vendor", "package-orders", "overview"],
    queryFn: async () => {
      const allPackages = await packageService.getVendorPackages(
        undefined,
        0,
        100
      );
      const packageRows = allPackages.content || [];

      if (packageRows.length === 0) {
        return [];
      }

      const allOrders = await Promise.all(
        packageRows.map((pkg) =>
          packageService.getPackageOrders(pkg.id, 0, 100)
        )
      );

      return allOrders.flatMap((entry) => entry.content || []);
    },
    enabled:
      isAuthenticated &&
      isVendor &&
      (vendorProfile?.vendorType === "PRODUCT" ||
        vendorProfile?.vendorType === "HYBRID"),
  });

  const products: Product[] = productsData?.content || [];
  const events = eventsData?.content || [];
  const serviceOrders: ServiceOrderResponse[] =
    serviceOrdersData?.content || [];
  const customTemplates: CustomOrderTemplate[] =
    customTemplatesData?.content || [];
  const packages = packageData?.content || [];
  const packageOrders = packageOrdersData || [];

  // Calculate service order statistics
  const serviceOrderStats = {
    pending: serviceOrders.filter(
      (o) => o.status === "BOOKED" && o.paymentStatus === "PAID"
    ).length,
    confirmed: serviceOrders.filter((o) => o.status === "CONFIRMED_BY_VENDOR")
      .length,
    total: serviceOrders.length,
  };

  // Calculate custom template statistics
  const customTemplateStats = {
    pending: customTemplates.filter((t) => t.status === "PENDING_APPROVAL")
      .length,
    approved: customTemplates.filter((t) => t.status === "APPROVED").length,
    total: customTemplates.length,
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
      case "APPROVED":
      case "ENABLED":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "PENDING":
      case "PENDING_APPROVAL":
        return <Badge className="bg-amber-100 text-amber-800">Pending</Badge>;
      case "REJECTED":
      case "DISABLED":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case "DRAFT":
        return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
      case "INACTIVE":
        return <Badge className="bg-slate-100 text-slate-800">Inactive</Badge>;
      case "CANCELLED":
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      case "COMPLETED":
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Products card - only for PRODUCT and HYBRID vendors */}
        {(vendorProfile?.vendorType === "PRODUCT" ||
          vendorProfile?.vendorType === "HYBRID") && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Products
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
              <p className="text-xs text-muted-foreground">
                {products.filter((p) => p.status === "ACTIVE").length} active
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vendorSummary?.totalEvents || events.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {vendorSummary?.activeEvents ||
                events.filter((e) => e.status === "ACTIVE").length}{" "}
              active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vendorSummary?.totalTicketsSold || 0}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Service Bookings
            </CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{serviceOrderStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {serviceOrderStats.pending} pending •{" "}
              {serviceOrderStats.confirmed} confirmed
            </p>
          </CardContent>
        </Card>

        {(vendorProfile?.vendorType === "PRODUCT" ||
          vendorProfile?.vendorType === "HYBRID") && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Packages</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{packages.length}</div>
              <p className="text-xs text-muted-foreground">
                {packages.filter((p: any) => p.status === "ACTIVE").length}{" "}
                active
              </p>
            </CardContent>
          </Card>
        )}

        {(vendorProfile?.vendorType === "PRODUCT" ||
          vendorProfile?.vendorType === "HYBRID") && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Package Orders
              </CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{packageOrders.length}</div>
              <p className="text-xs text-muted-foreground">
                {
                  packageOrders.filter(
                    (o: any) =>
                      o.orderStatus === "PENDING" ||
                      o.orderStatus === "PLACED" ||
                      o.orderStatus === "CONFIRMED"
                  ).length
                }{" "}
                awaiting action
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Custom Templates
            </CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customTemplateStats.total}
            </div>
            <p className="text-xs text-muted-foreground">
              {customTemplateStats.pending} pending •{" "}
              {customTemplateStats.approved} approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vendorRevenue?.currencySymbol || "$"}{" "}
              {vendorRevenue?.totalRevenue?.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">
              {vendorRevenue?.totalOrderCount || 0} orders •{" "}
              {vendorRevenue?.currencyCode || "USD"}
            </p>
            {vendorRevenue?.isVatRegistered &&
              vendorRevenue?.vatIncluded > 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  Includes {vendorRevenue.currencySymbol}
                  {vendorRevenue.vatIncluded.toFixed(2)} VAT (pass-through)
                </p>
              )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Status Alert */}
      {onboardingStatus && !onboardingStatus.canReceivePayments && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertCircle className="h-5 w-5" />
              Payment Setup Required
            </CardTitle>
            <CardDescription className="text-amber-700">
              Set up your payment accounts to receive payouts from sales.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              asChild
              variant="outline"
              className="border-amber-600 text-amber-700"
            >
              <Link to="/vendor/payments">Set Up Payments</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          {!vendorProfile?.isApproved && (
            <CardDescription className="text-amber-600">
              Some actions are disabled until your vendor account is approved.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {/* Add Product - Only for PRODUCT and HYBRID vendors */}
          {(vendorProfile?.vendorType === "PRODUCT" ||
            vendorProfile?.vendorType === "HYBRID") &&
            (vendorProfile?.isApproved ? (
              <Button asChild variant="outline" className="h-20 flex-col">
                <Link to="/vendor/products/new">
                  <Plus className="h-6 w-6 mb-2" />
                  <span>Add Product</span>
                </Link>
              </Button>
            ) : (
              <Button
                variant="outline"
                className="h-20 flex-col opacity-50 cursor-not-allowed"
                disabled
              >
                <Plus className="h-6 w-6 mb-2 text-gray-400" />
                <span className="text-gray-400">Add Product</span>
              </Button>
            ))}
          {(vendorProfile?.vendorType === "PRODUCT" ||
            vendorProfile?.vendorType === "HYBRID") && (
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link to="/vendor/packages">
                <Package className="h-6 w-6 mb-2" />
                <span>Packages</span>
              </Link>
            </Button>
          )}
          {(vendorProfile?.vendorType === "PRODUCT" ||
            vendorProfile?.vendorType === "HYBRID") && (
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link to="/vendor/package-orders">
                <ShoppingBag className="h-6 w-6 mb-2" />
                <span>Package Orders</span>
              </Link>
            </Button>
          )}
          {/* Create Event - Only for SERVICE and HYBRID vendors */}
          {(vendorProfile?.vendorType === "SERVICE" ||
            vendorProfile?.vendorType === "HYBRID") &&
            (vendorProfile?.isApproved ? (
              <Button asChild variant="outline" className="h-20 flex-col">
                <Link to="/vendor/events/new">
                  <Calendar className="h-6 w-6 mb-2" />
                  <span>Create Event</span>
                </Link>
              </Button>
            ) : (
              <Button
                variant="outline"
                className="h-20 flex-col opacity-50 cursor-not-allowed"
                disabled
              >
                <Calendar className="h-6 w-6 mb-2 text-gray-400" />
                <span className="text-gray-400">Create Event</span>
              </Button>
            ))}
          {vendorProfile?.isApproved ? (
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link to="/vendor/custom-templates/new">
                <Layers className="h-6 w-6 mb-2" />
                <span>Custom Template</span>
              </Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              className="h-20 flex-col opacity-50 cursor-not-allowed"
              disabled
            >
              <Layers className="h-6 w-6 mb-2 text-gray-400" />
              <span className="text-gray-400">Custom Template</span>
            </Button>
          )}
          <Button asChild variant="outline" className="h-20 flex-col">
            <Link to="/vendor/requests">
              <Clock className="h-6 w-6 mb-2" />
              <span>My Requests</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-20 flex-col">
            <Link to="/vendor/requests">
              <DollarSign className="h-6 w-6 mb-2" />
              <span>Price Update</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-20 flex-col">
            <Link to="/vendor/payments">
              <CreditCard className="h-6 w-6 mb-2" />
              <span>Payment Setup</span>
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Recent Products */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Products</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/vendor/products">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No products yet. Create your first product!
            </p>
          ) : (
            <div className="space-y-4">
              {products.slice(0, 5).map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={getProductImageUrl(product.images, product.cover)}
                      alt={product.name}
                      className="h-12 w-12 rounded object-cover"
                      onError={(e) => {
                        e.currentTarget.classList.add("hidden");
                        const fallback = e.currentTarget.nextElementSibling;
                        if (fallback) fallback.classList.remove("hidden");
                      }}
                    />
                    <div className="h-12 w-12 rounded bg-gray-200 hidden items-center justify-center">
                      <Package className="h-6 w-6 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.categoryName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(product.status || "")}
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`/vendor/products/${product.id}/edit`}>
                        Edit
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
