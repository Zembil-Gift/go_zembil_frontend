import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  adminService,
  type AdminEventOrderListItem,
  type AdminPackageOrderListItem,
  type AdminProductOrderListItem,
  type AdminServiceOrderListItem,
} from "@/services/adminService";
import { cn } from "@/lib/utils";
import { Calendar, Briefcase, Package, Box, Palette } from "lucide-react";

type OrderSection = "products" | "events" | "services" | "custom" | "packages";

type AnyOrderItem =
  | AdminProductOrderListItem
  | AdminEventOrderListItem
  | AdminServiceOrderListItem
  | AdminPackageOrderListItem;

interface OrderFilterState {
  search: string;
  currency: string;
  createdFrom: string;
  createdTo: string;
  minTotal: string;
  maxTotal: string;
  sortBy: string;
  sortDir: "asc" | "desc";
  status: string;
  paymentStatus: string;
  deliveryType: string;
  deliveryConfirmed: string;
  orderStatus: string;
  eventId: string;
  vendorId: string;
  serviceId: string;
  scheduledFrom: string;
  scheduledTo: string;
  paidFrom: string;
  paidTo: string;
  packageId: string;
  vendorUserId: string;
  customerId: string;
}

interface SectionConfig {
  key: OrderSection;
  label: string;
  icon: typeof Package;
}

const PAGE_SIZE = 20;

const SECTION_CONFIG: SectionConfig[] = [
  { key: "products", label: "Products", icon: Package },
  { key: "events", label: "Events", icon: Calendar },
  { key: "services", label: "Services", icon: Briefcase },
  { key: "custom", label: "Custom", icon: Palette },
  { key: "packages", label: "Packages", icon: Box },
];

const PRODUCT_STATUS_OPTIONS = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
];

const PRODUCT_PAYMENT_STATUS_OPTIONS = [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "REFUNDED",
];

const EVENT_PAYMENT_STATUS_OPTIONS = ["PENDING", "PAID", "REFUNDED", "FAILED"];
const EVENT_ORDER_STATUS_OPTIONS = ["CONFIRMED", "CANCELLED"];

const SERVICE_STATUS_OPTIONS = [
  "BOOKED",
  "CONFIRMED_BY_VENDOR",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "RESCHEDULED",
  "NO_SHOW",
];

const SERVICE_PAYMENT_STATUS_OPTIONS = ["PENDING", "PAID", "REFUNDED"];

const DEFAULT_FILTERS: OrderFilterState = {
  search: "",
  currency: "",
  createdFrom: "",
  createdTo: "",
  minTotal: "",
  maxTotal: "",
  sortBy: "createdAt",
  sortDir: "desc",
  status: "",
  paymentStatus: "",
  deliveryType: "",
  deliveryConfirmed: "",
  orderStatus: "",
  eventId: "",
  vendorId: "",
  serviceId: "",
  scheduledFrom: "",
  scheduledTo: "",
  paidFrom: "",
  paidTo: "",
  packageId: "",
  vendorUserId: "",
  customerId: "",
};

const SECTION_DEFAULTS: Record<OrderSection, OrderFilterState> = {
  products: { ...DEFAULT_FILTERS },
  events: { ...DEFAULT_FILTERS },
  services: { ...DEFAULT_FILTERS },
  custom: { ...DEFAULT_FILTERS },
  packages: { ...DEFAULT_FILTERS },
};

const PAGE_DEFAULTS: Record<OrderSection, number> = {
  products: 0,
  events: 0,
  services: 0,
  custom: 0,
  packages: 0,
};

const SORT_FIELDS_BY_SECTION: Record<OrderSection, string[]> = {
  products: [
    "createdAt",
    "totalAmount",
    "status",
    "paymentStatus",
    "orderNumber",
  ],
  events: [
    "createdAt",
    "totalAmount",
    "orderStatus",
    "paymentStatus",
    "paidAt",
  ],
  services: [
    "createdAt",
    "scheduledDateTime",
    "totalAmountMinor",
    "status",
    "paymentStatus",
  ],
  custom: [
    "createdAt",
    "totalAmount",
    "status",
    "paymentStatus",
    "orderNumber",
  ],
  packages: [
    "createdAt",
    "totalPriceMinor",
    "orderStatus",
    "orderNumber",
    "packageName",
  ],
};

function toOptionalNumber(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toIsoDate(value: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = new Date(value);
  return Number.isNaN(normalized.getTime())
    ? undefined
    : normalized.toISOString();
}

function formatDateTime(value?: string): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
}

function formatCurrency(amount: number, currency?: string): string {
  const safeCurrency = currency || "USD";

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: safeCurrency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${safeCurrency} ${amount.toFixed(2)}`;
  }
}

function getStatusBadgeClass(status?: string | null): string {
  if (!status) return "bg-gray-100 text-gray-700";
  switch (status.toUpperCase()) {
    case "DELIVERED":
    case "COMPLETED":
    case "PAID":
    case "CONFIRMED":
    case "CONFIRMED_BY_VENDOR":
      return "bg-green-100 text-green-800";
    case "PENDING":
    case "PROCESSING":
    case "BOOKED":
    case "IN_PROGRESS":
      return "bg-amber-100 text-amber-800";
    case "CANCELLED":
    case "FAILED":
    case "REFUNDED":
    case "NO_SHOW":
      return "bg-red-100 text-red-800";
    case "SHIPPED":
    case "RESCHEDULED":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function AdminOrders() {
  const [activeSection, setActiveSection] = useState<OrderSection>("products");
  const [filtersBySection, setFiltersBySection] =
    useState<Record<OrderSection, OrderFilterState>>(SECTION_DEFAULTS);
  const [pageBySection, setPageBySection] =
    useState<Record<OrderSection, number>>(PAGE_DEFAULTS);

  const currentFilters = filtersBySection[activeSection];
  const currentPage = pageBySection[activeSection];

  const queryKey = useMemo(
    () => ["admin", "orders", activeSection, currentPage, currentFilters],
    [activeSection, currentPage, currentFilters]
  );

  const ordersQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const commonParams = {
        page: currentPage,
        size: PAGE_SIZE,
        currency: currentFilters.currency || undefined,
        createdFrom: toIsoDate(currentFilters.createdFrom),
        createdTo: toIsoDate(currentFilters.createdTo),
        minTotal: toOptionalNumber(currentFilters.minTotal),
        maxTotal: toOptionalNumber(currentFilters.maxTotal),
        search: currentFilters.search || undefined,
        sortBy: currentFilters.sortBy,
        sortDir: currentFilters.sortDir,
      };

      if (activeSection === "products") {
        return await adminService.getAdminProductOrders({
          ...commonParams,
          status: currentFilters.status || undefined,
          deliveryType: currentFilters.deliveryType || undefined,
          paymentStatus: currentFilters.paymentStatus || undefined,
          deliveryConfirmed:
            currentFilters.deliveryConfirmed === ""
              ? undefined
              : currentFilters.deliveryConfirmed === "true",
        });
      }

      if (activeSection === "events") {
        return await adminService.getAdminEventOrders({
          ...commonParams,
          paymentStatus: currentFilters.paymentStatus || undefined,
          orderStatus: currentFilters.orderStatus || undefined,
          eventId: toOptionalNumber(currentFilters.eventId),
          vendorId: toOptionalNumber(currentFilters.vendorId),
          paidFrom: toIsoDate(currentFilters.paidFrom),
          paidTo: toIsoDate(currentFilters.paidTo),
        });
      }

      if (activeSection === "services") {
        return await adminService.getAdminServiceOrders({
          ...commonParams,
          status: currentFilters.status || undefined,
          paymentStatus: currentFilters.paymentStatus || undefined,
          vendorId: toOptionalNumber(currentFilters.vendorId),
          serviceId: toOptionalNumber(currentFilters.serviceId),
          scheduledFrom: toIsoDate(currentFilters.scheduledFrom),
          scheduledTo: toIsoDate(currentFilters.scheduledTo),
          paidFrom: toIsoDate(currentFilters.paidFrom),
          paidTo: toIsoDate(currentFilters.paidTo),
        });
      }

      if (activeSection === "packages") {
        return await adminService.getAdminPackageOrders({
          ...commonParams,
          packageId: toOptionalNumber(currentFilters.packageId),
          vendorUserId: toOptionalNumber(currentFilters.vendorUserId),
          customerId: toOptionalNumber(currentFilters.customerId),
          orderStatus: currentFilters.orderStatus || undefined,
        });
      }

      const productResponse = await adminService.getAdminProductOrders({
        ...commonParams,
        status: currentFilters.status || undefined,
        paymentStatus: currentFilters.paymentStatus || undefined,
      });

      const customOnly = productResponse.content.filter(
        (order) => order.orderType?.toUpperCase() === "CUSTOM"
      );

      return {
        ...productResponse,
        content: customOnly,
        totalElements: customOnly.length,
        totalPages: 1,
        number: 0,
      };
    },
    placeholderData: keepPreviousData,
  });

  const data = ordersQuery.data;
  const rows = (data?.content ?? []) as AnyOrderItem[];
  const totalPages = Math.max(data?.totalPages ?? 1, 1);

  const updateCurrentFilter = <K extends keyof OrderFilterState>(
    key: K,
    value: OrderFilterState[K]
  ) => {
    setFiltersBySection((previous) => ({
      ...previous,
      [activeSection]: {
        ...previous[activeSection],
        [key]: value,
      },
    }));

    setPageBySection((previous) => ({
      ...previous,
      [activeSection]: 0,
    }));
  };

  const resetFilters = () => {
    setFiltersBySection((previous) => ({
      ...previous,
      [activeSection]: { ...DEFAULT_FILTERS },
    }));
    setPageBySection((previous) => ({
      ...previous,
      [activeSection]: 0,
    }));
  };

  const isCustomSection = activeSection === "custom";

  return (
    <AdminLayout
      title="Orders"
      description="Manage and filter orders across all order types"
    >
      <Card>
        <CardHeader>
          <CardTitle>Order Type</CardTitle>
          <CardDescription>
            Switch between Products, Events, Services, Custom, and Packages
            orders.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {SECTION_CONFIG.map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                type="button"
                variant={activeSection === key ? "default" : "outline"}
                onClick={() => setActiveSection(key)}
                className={cn(
                  "gap-2",
                  activeSection === key &&
                    "bg-eagle-green hover:bg-eagle-green/90"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Input
              placeholder="Search order #, customer name, email"
              value={currentFilters.search}
              onChange={(event) =>
                updateCurrentFilter("search", event.target.value)
              }
            />

            <Input
              placeholder="Currency (ETB, USD)"
              value={currentFilters.currency}
              onChange={(event) =>
                updateCurrentFilter(
                  "currency",
                  event.target.value.toUpperCase()
                )
              }
            />

            <Input
              type="number"
              placeholder="Min total"
              value={currentFilters.minTotal}
              onChange={(event) =>
                updateCurrentFilter("minTotal", event.target.value)
              }
            />

            <Input
              type="number"
              placeholder="Max total"
              value={currentFilters.maxTotal}
              onChange={(event) =>
                updateCurrentFilter("maxTotal", event.target.value)
              }
            />

            <Input
              type="datetime-local"
              value={currentFilters.createdFrom}
              onChange={(event) =>
                updateCurrentFilter("createdFrom", event.target.value)
              }
            />

            <Input
              type="datetime-local"
              value={currentFilters.createdTo}
              onChange={(event) =>
                updateCurrentFilter("createdTo", event.target.value)
              }
            />

            <Select
              value={currentFilters.sortBy}
              onValueChange={(value) => updateCurrentFilter("sortBy", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_FIELDS_BY_SECTION[activeSection].map((field) => (
                  <SelectItem key={field} value={field}>
                    {field}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={currentFilters.sortDir}
              onValueChange={(value: "asc" | "desc") =>
                updateCurrentFilter("sortDir", value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sort direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">desc</SelectItem>
                <SelectItem value="asc">asc</SelectItem>
              </SelectContent>
            </Select>

            {(activeSection === "products" ||
              activeSection === "services" ||
              activeSection === "custom") && (
              <Select
                value={currentFilters.status || "all"}
                onValueChange={(value) =>
                  updateCurrentFilter("status", value === "all" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Order status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {(activeSection === "services"
                    ? SERVICE_STATUS_OPTIONS
                    : PRODUCT_STATUS_OPTIONS
                  ).map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {(activeSection === "products" ||
              activeSection === "events" ||
              activeSection === "services" ||
              activeSection === "custom") && (
              <Select
                value={currentFilters.paymentStatus || "all"}
                onValueChange={(value) =>
                  updateCurrentFilter(
                    "paymentStatus",
                    value === "all" ? "" : value
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Payment status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payment Statuses</SelectItem>
                  {(activeSection === "events"
                    ? EVENT_PAYMENT_STATUS_OPTIONS
                    : activeSection === "services"
                    ? SERVICE_PAYMENT_STATUS_OPTIONS
                    : PRODUCT_PAYMENT_STATUS_OPTIONS
                  ).map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {activeSection === "products" && (
              <Select
                value={currentFilters.deliveryType || "all"}
                onValueChange={(value) =>
                  updateCurrentFilter(
                    "deliveryType",
                    value === "all" ? "" : value
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Delivery type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Delivery Types</SelectItem>
                  <SelectItem value="PICKUP">PICKUP</SelectItem>
                  <SelectItem value="DELIVERY">DELIVERY</SelectItem>
                </SelectContent>
              </Select>
            )}

            {activeSection === "products" && (
              <Select
                value={
                  currentFilters.deliveryConfirmed === ""
                    ? "all"
                    : currentFilters.deliveryConfirmed
                }
                onValueChange={(value) =>
                  updateCurrentFilter(
                    "deliveryConfirmed",
                    value === "all" ? "" : value
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Delivery confirmed" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Confirmed</SelectItem>
                  <SelectItem value="false">Not Confirmed</SelectItem>
                </SelectContent>
              </Select>
            )}

            {(activeSection === "events" || activeSection === "packages") && (
              <Select
                value={currentFilters.orderStatus || "all"}
                onValueChange={(value) =>
                  updateCurrentFilter(
                    "orderStatus",
                    value === "all" ? "" : value
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Order status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {EVENT_ORDER_STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {(activeSection === "events" || activeSection === "services") && (
              <Input
                type="number"
                placeholder="Vendor ID"
                value={currentFilters.vendorId}
                onChange={(event) =>
                  updateCurrentFilter("vendorId", event.target.value)
                }
              />
            )}

            {activeSection === "events" && (
              <Input
                type="number"
                placeholder="Event ID"
                value={currentFilters.eventId}
                onChange={(event) =>
                  updateCurrentFilter("eventId", event.target.value)
                }
              />
            )}

            {activeSection === "services" && (
              <Input
                type="number"
                placeholder="Service ID"
                value={currentFilters.serviceId}
                onChange={(event) =>
                  updateCurrentFilter("serviceId", event.target.value)
                }
              />
            )}

            {activeSection === "services" && (
              <Input
                type="datetime-local"
                value={currentFilters.scheduledFrom}
                onChange={(event) =>
                  updateCurrentFilter("scheduledFrom", event.target.value)
                }
              />
            )}

            {activeSection === "services" && (
              <Input
                type="datetime-local"
                value={currentFilters.scheduledTo}
                onChange={(event) =>
                  updateCurrentFilter("scheduledTo", event.target.value)
                }
              />
            )}

            {(activeSection === "events" || activeSection === "services") && (
              <Input
                type="datetime-local"
                value={currentFilters.paidFrom}
                onChange={(event) =>
                  updateCurrentFilter("paidFrom", event.target.value)
                }
              />
            )}

            {(activeSection === "events" || activeSection === "services") && (
              <Input
                type="datetime-local"
                value={currentFilters.paidTo}
                onChange={(event) =>
                  updateCurrentFilter("paidTo", event.target.value)
                }
              />
            )}

            {activeSection === "packages" && (
              <Input
                type="number"
                placeholder="Package ID"
                value={currentFilters.packageId}
                onChange={(event) =>
                  updateCurrentFilter("packageId", event.target.value)
                }
              />
            )}

            {activeSection === "packages" && (
              <Input
                type="number"
                placeholder="Vendor User ID"
                value={currentFilters.vendorUserId}
                onChange={(event) =>
                  updateCurrentFilter("vendorUserId", event.target.value)
                }
              />
            )}

            {activeSection === "packages" && (
              <Input
                type="number"
                placeholder="Customer ID"
                value={currentFilters.customerId}
                onChange={(event) =>
                  updateCurrentFilter("customerId", event.target.value)
                }
              />
            )}
          </div>

          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={resetFilters}>
              Reset Filters
            </Button>
          </div>

          {isCustomSection && (
            <p className="text-xs text-muted-foreground">
              Custom uses the product orders endpoint and shows only items where
              orderType is CUSTOM.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>
            {
              SECTION_CONFIG.find((section) => section.key === activeSection)
                ?.label
            }{" "}
            Orders
          </CardTitle>
          <CardDescription>
            Total items on this page: {rows.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ordersQuery.isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading orders...
            </div>
          ) : ordersQuery.isError ? (
            <div className="py-8 text-center text-red-600">
              Failed to load orders.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="py-8 text-center text-muted-foreground"
                        >
                          No orders found for the selected filters.
                        </TableCell>
                      </TableRow>
                    )}

                    {activeSection === "products" &&
                      (rows as AdminProductOrderListItem[]).map((order, i) => (
                        <TableRow
                          key={`product-${
                            order.orderId ?? order.orderNumber ?? i
                          }`}
                        >
                          <TableCell className="font-medium">
                            {order.orderNumber}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={getStatusBadgeClass(order.status)}
                            >
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={getStatusBadgeClass(
                                order.paymentStatus || "PENDING"
                              )}
                            >
                              {order.paymentStatus || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p>{order.customerName}</p>
                              <p className="text-xs text-muted-foreground">
                                {order.customerEmail}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatCurrency(order.totalAmount, order.currency)}
                          </TableCell>
                          <TableCell>
                            <div className="text-xs text-muted-foreground">
                              <p>Type: {order.orderType || "REGULAR"}</p>
                              <p>Delivery: {order.deliveryType || "-"}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatDateTime(order.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}

                    {activeSection === "custom" &&
                      (rows as AdminProductOrderListItem[]).map((order, i) => (
                        <TableRow
                          key={`custom-${
                            order.orderId ?? order.orderNumber ?? i
                          }`}
                        >
                          <TableCell className="font-medium">
                            {order.orderNumber}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={getStatusBadgeClass(order.status)}
                            >
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={getStatusBadgeClass(
                                order.paymentStatus || "PENDING"
                              )}
                            >
                              {order.paymentStatus || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p>{order.customerName}</p>
                              <p className="text-xs text-muted-foreground">
                                {order.customerEmail}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatCurrency(order.totalAmount, order.currency)}
                          </TableCell>
                          <TableCell>
                            <div className="text-xs text-muted-foreground">
                              <p>Type: CUSTOM</p>
                              <p>Delivery: {order.deliveryType || "-"}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatDateTime(order.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}

                    {activeSection === "events" &&
                      (rows as AdminEventOrderListItem[]).map((order, i) => (
                        <TableRow
                          key={`event-${
                            order.eventId ??
                            order.eventOrderId ??
                            order.orderNumber ??
                            i
                          }`}
                        >
                          <TableCell className="font-medium">
                            {order.orderNumber}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={getStatusBadgeClass(order.orderStatus)}
                            >
                              {order.orderStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={getStatusBadgeClass(
                                order.paymentStatus
                              )}
                            >
                              {order.paymentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p>{order.customerName}</p>
                              <p className="text-xs text-muted-foreground">
                                {order.customerEmail}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatCurrency(order.totalAmount, order.currency)}
                          </TableCell>
                          <TableCell>
                            <div className="text-xs text-muted-foreground">
                              <p>Event: {order.eventTitle}</p>
                              <p>Paid: {formatDateTime(order.paidAt)}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatDateTime(order.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}

                    {activeSection === "services" &&
                      (rows as AdminServiceOrderListItem[]).map((order, i) => (
                        <TableRow
                          key={`service-${
                            order.serviceOrderId ?? order.orderNumber ?? i
                          }`}
                        >
                          <TableCell className="font-medium">
                            {order.orderNumber}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={getStatusBadgeClass(order.status)}
                            >
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={getStatusBadgeClass(
                                order.paymentStatus
                              )}
                            >
                              {order.paymentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p>{order.customerName}</p>
                              <p className="text-xs text-muted-foreground">
                                {order.customerEmail}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatCurrency(
                              order.totalAmountMinor / 100,
                              order.currency
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-xs text-muted-foreground">
                              <p>Service: {order.serviceTitle}</p>
                              <p>
                                Scheduled:{" "}
                                {formatDateTime(order.scheduledDateTime)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatDateTime(order.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}

                    {activeSection === "packages" &&
                      (rows as AdminPackageOrderListItem[]).map((order, i) => (
                        <TableRow
                          key={`package-${
                            order.packageSaleId ?? order.orderNumber ?? i
                          }`}
                        >
                          <TableCell className="font-medium">
                            {order.orderNumber}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={getStatusBadgeClass(order.orderStatus)}
                            >
                              {order.orderStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-gray-100 text-gray-700">
                              -
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p>{order.customerName}</p>
                              <p className="text-xs text-muted-foreground">
                                {order.customerEmail}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatCurrency(
                              order.totalPriceMinor / 100,
                              order.currency
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-xs text-muted-foreground">
                              <p>Package: {order.packageName}</p>
                              <p>Qty: {order.packageQuantity}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatDateTime(order.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {Math.min((data?.number ?? 0) + 1, totalPages)} of{" "}
                  {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={(data?.number ?? 0) <= 0}
                    onClick={() =>
                      setPageBySection((previous) => ({
                        ...previous,
                        [activeSection]: Math.max(
                          (previous[activeSection] ?? 0) - 1,
                          0
                        ),
                      }))
                    }
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    disabled={(data?.number ?? 0) + 1 >= totalPages}
                    onClick={() =>
                      setPageBySection((previous) => ({
                        ...previous,
                        [activeSection]: (previous[activeSection] ?? 0) + 1,
                      }))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
