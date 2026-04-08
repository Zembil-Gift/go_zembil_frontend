import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  Check,
  Clock,
  DollarSign,
  Eye,
  FolderTree,
  Gift,
  Loader2,
  Package,
  Search,
  X,
} from "lucide-react";
import {
  adminService,
  CategoryChangeRequestDto,
} from "@/services/adminService";
import { useToast } from "@/hooks/use-toast";
import { getProductImageUrl } from "@/utils/imageUtils";

interface Product {
  id: number;
  name: string;
  description: string;
  summary?: string;
  cover?: string;
  images?: Array<{
    id: number;
    url: string;
    fullUrl?: string;
    originalFilename?: string;
    altText?: string;
    sortOrder: number;
    isPrimary: boolean;
    fileSize?: number;
    contentType?: string;
    createdAt?: string;
  }>;
  status: "PENDING" | "ACTIVE" | "REJECTED" | "DRAFT" | "INACTIVE" | "ARCHIVED";
  vendorId: number;
  vendorName?: string;
  categoryName?: string;
  subCategoryName?: string;
  subCategoryId?: number;
  price?: {
    id: number;
    amount: number;
    vendorAmount?: number;
    unitAmountMinor?: number;
    vendorAmountMinor?: number;
    currencyCode: string;
    originalCurrencyCode?: string;
    originalVendorAmountMinor?: number;
  };
  productSku?: Array<{
    id: number;
    skuCode: string;
    skuName?: string;
    stockQuantity: number;
    isDefault?: boolean;
    images?: Array<{
      id: number;
      url: string;
      fullUrl?: string;
      sortOrder: number;
      isPrimary?: boolean;
    }>;
    attributes?: Array<{
      id: number;
      name: string;
      value: string;
    }>;
    price?: {
      id?: number;
      amount: number;
      vendorAmount?: number;
      unitAmountMinor?: number;
      vendorAmountMinor?: number;
      currencyCode: string;
      originalCurrencyCode?: string;
      originalVendorAmountMinor?: number;
    };
  }>;
  createdAt: string;
  giftWrappable?: boolean;
  giftWrapPrice?: number;
  giftWrapCustomerPrice?: number;
  giftWrapCurrencyCode?: string;
}

export default function AdminProducts() {
  const MAX_REJECTION_REASON_LENGTH = 1000;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    productId?: number;
    type: "product" | "price" | "category-change";
  }>({
    open: false,
    type: "product",
  });
  const [rejectReason, setRejectReason] = useState("");
  const [rejectReasonError, setRejectReasonError] = useState("");
  const [approvingProductId, setApprovingProductId] = useState<number | null>(
    null
  );
  const [showImagePreviewDialog, setShowImagePreviewDialog] = useState(false);
  const [selectedImagePreview, setSelectedImagePreview] = useState<{
    url: string;
    alt: string;
  } | null>(null);

  const extractErrorMessage = (error: any, fallback: string) => {
    const responseData = error?.response?.data;
    const details = responseData?.details;

    if (details && typeof details === "object") {
      const detailMessage = Object.values(details).find(
        (value) => typeof value === "string"
      ) as string | undefined;
      if (detailMessage) {
        return detailMessage;
      }
    }

    return error?.message || responseData?.message || fallback;
  };

  // Fetch all products
  const { data: allProductsData, isLoading: allProductsLoading } = useQuery({
    queryKey: ["admin", "all-products", searchTerm],
    queryFn: async () => {
      const response = await adminService.getAllProducts(
        0,
        100,
        undefined,
        searchTerm
      );
      return response.content || [];
    },
  });

  // Fetch pending products
  const { data: pendingProductsData, isLoading: pendingLoading } = useQuery({
    queryKey: ["admin", "pending-products"],
    queryFn: async () => {
      const response = await adminService.getPendingProducts(0, 100);
      return response.content || [];
    },
  });

  // Fetch price update requests
  const { data: priceRequestsData, isLoading: priceRequestsLoading } = useQuery(
    {
      queryKey: ["admin", "product-price-requests"],
      queryFn: async () => {
        const response = await adminService.getProductPriceUpdateRequests(
          0,
          100
        );
        return response.content || [];
      },
    }
  );

  // Fetch category change requests
  const { data: categoryChangeRequestsData, isLoading: categoryChangeLoading } =
    useQuery({
      queryKey: ["admin", "category-change-requests"],
      queryFn: async () => {
        const response = await adminService.getCategoryChangeRequests(0, 100);
        return response.content || [];
      },
    });

  const allProducts = allProductsData || [];
  const pendingProducts = pendingProductsData || [];
  const priceRequests = priceRequestsData || [];
  const pendingPriceRequests = priceRequests.filter(
    (r: any) => r.status === "PENDING"
  );
  const categoryChangeRequests = (categoryChangeRequestsData || []).filter(
    (r: CategoryChangeRequestDto) =>
      !r.requestType || r.requestType === "CATEGORY_CHANGE"
  );
  const pendingCategoryChangeRequests = categoryChangeRequests.filter(
    (r: CategoryChangeRequestDto) => r.status === "PENDING"
  );

  const { data: subCategoryNameMap = {} } = useQuery<Record<number, string>>({
    queryKey: ["admin", "sub-category-name-map"],
    queryFn: async () => {
      const categories = await adminService.getCategories();
      const subCategoryGroups = await Promise.allSettled(
        categories.map(async (cat: any) => {
          return await adminService.getSubCategories(cat.id);
        })
      );

      const flatSubs = subCategoryGroups
        .filter(
          (result): result is PromiseFulfilledResult<any[]> =>
            result.status === "fulfilled"
        )
        .flatMap((result) => result.value);

      return flatSubs.reduce((acc: Record<number, string>, sub: any) => {
        if (sub?.id) {
          acc[sub.id] = sub.name;
        }
        return acc;
      }, {});
    },
  });

  const getSubCategoryName = (product: Product) => {
    if (product.subCategoryName) return product.subCategoryName;
    if (!product.subCategoryId) return "N/A";
    return (
      subCategoryNameMap[product.subCategoryId] || `#${product.subCategoryId}`
    );
  };

  // Approve product mutation
  const approveProductMutation = useMutation({
    mutationFn: (productId: number) => {
      setApprovingProductId(productId);
      return adminService.approveProduct(productId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "all-products"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "pending-products"],
      });
      toast({ title: "Success", description: "Product approved successfully" });
      setSelectedProduct(null);
      setApprovingProductId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve product",
        variant: "destructive",
      });
      setApprovingProductId(null);
    },
  });

  // Reject product mutation
  const rejectProductMutation = useMutation({
    mutationFn: ({
      productId,
      reason,
    }: {
      productId: number;
      reason: string;
    }) => adminService.rejectProduct(productId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "all-products"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "pending-products"],
      });
      toast({ title: "Success", description: "Product rejected" });
      setRejectDialog({ open: false, type: "product" });
      setRejectReason("");
      setRejectReasonError("");
      setSelectedProduct(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: extractErrorMessage(error, "Failed to reject product"),
        variant: "destructive",
      });
    },
  });

  // Approve product price update mutation
  const approveProductPriceUpdateMutation = useMutation({
    mutationFn: (requestId: number) =>
      adminService.approveProductPriceUpdate(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "product-price-requests"],
      });
      toast({
        title: "Price Update Approved",
        description: "The product price has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve price update",
        variant: "destructive",
      });
    },
  });

  // Reject product price update mutation
  const rejectProductPriceUpdateMutation = useMutation({
    mutationFn: ({
      requestId,
      reason,
    }: {
      requestId: number;
      reason: string;
    }) => adminService.rejectProductPriceUpdate(requestId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "product-price-requests"],
      });
      toast({
        title: "Price Update Rejected",
        description: "The price update request has been rejected.",
      });
      setRejectDialog({ open: false, type: "price" });
      setRejectReason("");
      setRejectReasonError("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject price update",
        variant: "destructive",
      });
    },
  });

  // Approve category change request mutation
  const approveCategoryChangeMutation = useMutation({
    mutationFn: (requestId: number) =>
      adminService.approveCategoryChange(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "category-change-requests"],
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "all-products"] });
      toast({
        title: "Category Change Approved",
        description: "The product category has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve category change",
        variant: "destructive",
      });
    },
  });

  // Reject category change request mutation
  const rejectCategoryChangeMutation = useMutation({
    mutationFn: ({
      requestId,
      reason,
    }: {
      requestId: number;
      reason: string;
    }) => adminService.rejectCategoryChange(requestId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "category-change-requests"],
      });
      toast({
        title: "Category Change Rejected",
        description: "The category change request has been rejected.",
      });
      setRejectDialog({ open: false, type: "category-change" });
      setRejectReason("");
      setRejectReasonError("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject category change",
        variant: "destructive",
      });
    },
  });

  const handleReject = () => {
    const trimmedReason = rejectReason.trim();

    if (!trimmedReason) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for rejection.",
        variant: "destructive",
      });
      return;
    }

    if (trimmedReason.length > MAX_REJECTION_REASON_LENGTH) {
      const message = `Rejection reason must be ${MAX_REJECTION_REASON_LENGTH} characters or fewer.`;
      setRejectReasonError(message);
      toast({
        title: "Reason Too Long",
        description: message,
        variant: "destructive",
      });
      return;
    }

    setRejectReasonError("");

    if (rejectDialog.type === "product" && rejectDialog.productId) {
      rejectProductMutation.mutate({
        productId: rejectDialog.productId,
        reason: trimmedReason,
      });
    } else if (rejectDialog.type === "price" && rejectDialog.productId) {
      rejectProductPriceUpdateMutation.mutate({
        requestId: rejectDialog.productId,
        reason: trimmedReason,
      });
    } else if (
      rejectDialog.type === "category-change" &&
      rejectDialog.productId
    ) {
      rejectCategoryChangeMutation.mutate({
        requestId: rejectDialog.productId,
        reason: trimmedReason,
      });
    }
  };

  const formatPrice = (product: Product) => {
    if (product.price) {
      return `${product.price.amount.toLocaleString()} ${
        product.price.currencyCode
      }`;
    }
    // Fallback to first SKU price
    if (
      product.productSku &&
      product.productSku.length > 0 &&
      product.productSku[0].price
    ) {
      return `${product.productSku[0].price.amount.toLocaleString()} ${
        product.productSku[0].price.currencyCode
      }`;
    }
    return "N/A";
  };

  const formatVendorPrice = (product: Product) => {
    const price = product.price || product.productSku?.[0]?.price;
    if (!price) return "N/A";

    // originalCurrencyCode + originalVendorAmountMinor are always populated with
    // the currency the vendor stored the price in (regardless of admin display currency)
    if (price.originalCurrencyCode && price.originalVendorAmountMinor != null) {
      const major = price.originalVendorAmountMinor / 100;
      return `${major.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} ${price.originalCurrencyCode}`;
    }

    // Fallback for older API responses without original fields
    const vendorAmt =
      price.vendorAmount ??
      (price.vendorAmountMinor != null ? price.vendorAmountMinor / 100 : null);
    if (vendorAmt == null) return "N/A";
    return `${vendorAmt.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${price.currencyCode}`;
  };

  const formatCurrency = (amountMinor: number, currency: string = "ETB") => {
    const amount = amountMinor / 100;
    const symbol =
      currency === "ETB" ? "ETB " : currency === "USD" ? "$" : `${currency} `;
    return `${symbol}${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Format amount in major units (e.g., 1.36 USD)
  const formatAmount = (amount: number, currency: string = "ETB") => {
    const symbol =
      currency === "ETB" ? "ETB " : currency === "USD" ? "$" : `${currency} `;
    return `${symbol}${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getStock = (product: Product) => {
    if (product.productSku && product.productSku.length > 0) {
      return product.productSku.reduce(
        (sum, sku) => sum + (sku.stockQuantity || 0),
        0
      );
    }
    return 0;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      PENDING: { color: "bg-amber-100 text-amber-800", label: "Pending" },
      ACTIVE: { color: "bg-green-100 text-green-800", label: "Active" },
      APPROVED: { color: "bg-green-100 text-green-800", label: "Approved" },
      REJECTED: { color: "bg-red-100 text-red-800", label: "Rejected" },
      DRAFT: { color: "bg-gray-100 text-gray-800", label: "Draft" },
      INACTIVE: { color: "bg-gray-100 text-gray-800", label: "Inactive" },
      ARCHIVED: { color: "bg-gray-100 text-gray-800", label: "Archived" },
    };
    const badge = badges[status] || badges["DRAFT"];
    return <Badge className={badge.color}>{badge.label}</Badge>;
  };

  return (
    <AdminLayout
      title="Product Management"
      description="Manage products and price update requests"
    >
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="flex flex-wrap gap-1 w-full h-auto p-1">
          <TabsTrigger
            value="all"
            className="relative whitespace-normal text-xs sm:text-sm text-center px-2 sm:px-4"
          >
            All Products
            {allProducts && (
              <Badge className="ml-2 bg-eagle-green text-white">
                {allProducts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="pending"
            className="relative whitespace-normal text-xs sm:text-sm text-center px-2 sm:px-4"
          >
            Pending Products
            {pendingProducts.length > 0 && (
              <Badge className="ml-2 bg-amber-500 text-white">
                {pendingProducts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="price-requests"
            className="relative whitespace-normal text-xs sm:text-sm text-center px-2 sm:px-4"
          >
            Price Update Requests
            {pendingPriceRequests.length > 0 && (
              <Badge className="ml-2 bg-blue-500 text-white">
                {pendingPriceRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="category-changes"
            className="relative whitespace-normal text-xs sm:text-sm text-center px-2 sm:px-4"
          >
            Category Changes
            {pendingCategoryChangeRequests.length > 0 && (
              <Badge className="ml-2 bg-purple-500 text-white">
                {pendingCategoryChangeRequests.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* All Products Tab */}
        <TabsContent value="all">
          <Card className="mb-6">
            <CardContent className="pt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-eagle-green" />
                All Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              {allProductsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-eagle-green" />
                </div>
              ) : allProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No products found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Customer Price</TableHead>
                        <TableHead>Vendor Price</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {product.images?.length || product.cover ? (
                                <img
                                  src={getProductImageUrl(
                                    product.images as any,
                                    product.cover
                                  )}
                                  alt={product.name}
                                  className="h-10 w-10 rounded object-cover"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center">
                                  <Package className="h-5 w-5 text-gray-400" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {product.categoryName || "Uncategorized"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Subcategory: {getSubCategoryName(product)}
                                </p>
                                {product.giftWrappable && (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <Gift className="h-3 w-3 text-green-600" />
                                    <span className="text-xs text-green-600">
                                      Gift wrappable
                                      {product.giftWrapCustomerPrice != null &&
                                        product.giftWrapCustomerPrice > 0 && (
                                          <>
                                            {" "}
                                            ({
                                              product.giftWrapCustomerPrice
                                            }{" "}
                                            {product.giftWrapCurrencyCode || ""}
                                            )
                                          </>
                                        )}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {product.vendorName ||
                              `Vendor #${product.vendorId}`}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatPrice(product)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatVendorPrice(product)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {getStock(product)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(product.status)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setShowViewDialog(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {product.status === "PENDING" && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      approveProductMutation.mutate(product.id)
                                    }
                                    disabled={approvingProductId === product.id}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    {approvingProductId === product.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Check className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() =>
                                      setRejectDialog({
                                        open: true,
                                        productId: product.id,
                                        type: "product",
                                      })
                                    }
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Products Tab */}
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                Products Awaiting Approval
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-eagle-green" />
                </div>
              ) : pendingProducts.length > 0 ? (
                <div className="space-y-4">
                  {pendingProducts.map((product: any) => (
                    <div
                      key={product.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {product.images?.length || product.cover ? (
                              <img
                                src={getProductImageUrl(
                                  product.images as any,
                                  product.cover
                                )}
                                alt={product.name}
                                className="h-16 w-16 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="h-16 w-16 rounded-lg bg-gray-100 flex items-center justify-center">
                                <Package className="h-8 w-8 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <h3 className="font-bold text-eagle-green text-lg">
                                {product.name}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {product.categoryName || "Uncategorized"}
                              </p>
                              <p className="text-xs text-gray-500">
                                Subcategory: {getSubCategoryName(product)}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 line-clamp-2">
                            {product.description}
                          </p>
                          <div className="flex gap-4 mt-2 text-sm text-gray-600">
                            <span>Customer Price: {formatPrice(product)}</span>
                            <span className="text-muted-foreground">
                              Vendor Price: {formatVendorPrice(product)}
                            </span>
                            <span>Stock: {getStock(product)}</span>
                            <span>
                              Vendor:{" "}
                              {product.vendorName || `#${product.vendorId}`}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 lg:flex-col">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedProduct(product);
                              setShowViewDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button
                            onClick={() =>
                              approveProductMutation.mutate(product.id)
                            }
                            disabled={approvingProductId === product.id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {approvingProductId === product.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4 mr-2" />
                            )}
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            className="border-red-300 text-red-600 hover:bg-red-50"
                            onClick={() =>
                              setRejectDialog({
                                open: true,
                                productId: product.id,
                                type: "product",
                              })
                            }
                          >
                            <X className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No pending products
                  </h3>
                  <p className="text-gray-500">
                    All products have been reviewed
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Price Update Requests Tab */}
        <TabsContent value="price-requests">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-500" />
                Price Update Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {priceRequestsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-eagle-green" />
                </div>
              ) : priceRequests.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product / SKU</TableHead>
                      <TableHead className="text-right">
                        Current Price
                      </TableHead>
                      <TableHead className="text-right">
                        Requested Price
                      </TableHead>
                      <TableHead className="text-right">Change</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {priceRequests.map((request: any) => {
                      // Admin sees customer prices (what customers will pay)
                      const currentCustomerPrice =
                        request.currentCustomerPrice?.amount ??
                        (request.currentCustomerPrice?.unitAmountMinor
                          ? request.currentCustomerPrice.unitAmountMinor / 100
                          : request.currentPrice?.amount ??
                            (request.currentPrice?.unitAmountMinor
                              ? request.currentPrice.unitAmountMinor / 100
                              : 0));
                      const newCustomerPrice =
                        request.newCustomerPrice?.amount ??
                        (request.newCustomerPrice?.unitAmountMinor
                          ? request.newCustomerPrice.unitAmountMinor / 100
                          : request.newPrice?.amount ??
                            (request.newPrice?.unitAmountMinor
                              ? request.newPrice.unitAmountMinor / 100
                              : 0));
                      const currency =
                        request.currentCustomerPrice?.currencyCode ||
                        request.newCustomerPrice?.currencyCode ||
                        request.currentPrice?.currencyCode ||
                        request.newPrice?.currencyCode ||
                        "ETB";
                      const priceDiff = newCustomerPrice - currentCustomerPrice;
                      const percentChange =
                        currentCustomerPrice > 0
                          ? ((priceDiff / currentCustomerPrice) * 100).toFixed(
                              1
                            )
                          : 0;

                      return (
                        <TableRow key={request.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {request.entityName || request.productName}
                              </div>
                              {request.skuCode && (
                                <div className="text-sm text-gray-500 font-mono">
                                  SKU: {request.skuCode}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground">
                                Vendor: {request.vendorName}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatAmount(currentCustomerPrice, currency)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            <span
                              className={
                                priceDiff > 0
                                  ? "text-red-600"
                                  : priceDiff < 0
                                  ? "text-green-600"
                                  : ""
                              }
                            >
                              {formatAmount(newCustomerPrice, currency)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={
                                priceDiff > 0
                                  ? "text-red-600"
                                  : priceDiff < 0
                                  ? "text-green-600"
                                  : "text-gray-500"
                              }
                            >
                              {priceDiff > 0 ? "+" : ""}
                              {formatAmount(priceDiff, currency)}
                              <span className="text-xs ml-1">
                                ({priceDiff > 0 ? "+" : ""}
                                {percentChange}%)
                              </span>
                            </span>
                          </TableCell>
                          <TableCell>
                            <p
                              className="text-sm text-gray-600 max-w-xs truncate"
                              title={request.reason}
                            >
                              {request.reason}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                request.status === "PENDING"
                                  ? "bg-amber-100 text-amber-800"
                                  : request.status === "APPROVED"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }
                            >
                              {request.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {request.status === "PENDING" ? (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    approveProductPriceUpdateMutation.mutate(
                                      request.id
                                    )
                                  }
                                  disabled={
                                    approveProductPriceUpdateMutation.isPending
                                  }
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() =>
                                    setRejectDialog({
                                      open: true,
                                      productId: request.id,
                                      type: "price",
                                    })
                                  }
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">
                                Processed
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No price update requests
                  </h3>
                  <p className="text-gray-500">
                    All requests have been processed
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Category Change Requests Tab */}
        <TabsContent value="category-changes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderTree className="h-5 w-5 text-purple-500" />
                Category Change Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categoryChangeLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-eagle-green" />
                </div>
              ) : categoryChangeRequests.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Current Category</TableHead>
                      <TableHead>New Category</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryChangeRequests.map(
                      (request: CategoryChangeRequestDto) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {request.entityImageUrl ||
                              request.productCover ? (
                                <img
                                  src={
                                    request.entityImageUrl ||
                                    request.productCover
                                  }
                                  alt={
                                    request.entityName || request.productName
                                  }
                                  className="h-10 w-10 rounded object-cover"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center">
                                  <Package className="h-5 w-5 text-gray-400" />
                                </div>
                              )}
                              <div className="font-medium">
                                {request.entityName || request.productName}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{request.vendorName || "-"}</TableCell>
                          <TableCell>
                            <span className="text-muted-foreground">
                              {request.currentSubCategoryName}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-purple-600">
                              {request.newSubCategoryName}
                            </span>
                          </TableCell>
                          <TableCell>
                            <p
                              className="text-sm text-gray-600 max-w-xs truncate"
                              title={request.reason}
                            >
                              {request.reason}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                request.status === "PENDING"
                                  ? "bg-amber-100 text-amber-800"
                                  : request.status === "APPROVED"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }
                            >
                              {request.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {request.status === "PENDING" ? (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    approveCategoryChangeMutation.mutate(
                                      request.id
                                    )
                                  }
                                  disabled={
                                    approveCategoryChangeMutation.isPending
                                  }
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() =>
                                    setRejectDialog({
                                      open: true,
                                      productId: request.id,
                                      type: "category-change",
                                    })
                                  }
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">
                                Processed
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <FolderTree className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No category change requests
                  </h3>
                  <p className="text-gray-500">
                    All requests have been processed
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Product Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="w-[96vw] max-w-6xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription>View product information</DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="flex gap-4">
                {selectedProduct.images?.length || selectedProduct.cover ? (
                  <img
                    src={getProductImageUrl(
                      selectedProduct.images as any,
                      selectedProduct.cover
                    )}
                    alt={selectedProduct.name}
                    className="h-32 w-32 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-32 w-32 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Package className="h-16 w-16 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">
                    {selectedProduct.name}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-2">
                    {selectedProduct.categoryName}
                  </p>
                  <p className="text-muted-foreground text-xs mb-2">
                    Subcategory: {getSubCategoryName(selectedProduct)}
                  </p>
                  {getStatusBadge(selectedProduct.status)}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Base Price</p>
                  <p className="font-medium">{formatPrice(selectedProduct)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Stock</p>
                  <p className="font-medium">{getStock(selectedProduct)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Vendor</p>
                  <p className="font-medium">
                    {selectedProduct.vendorName ||
                      `Vendor #${selectedProduct.vendorId}`}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">
                    {new Date(selectedProduct.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {selectedProduct.description && (
                <div>
                  <p className="text-muted-foreground text-sm">Description</p>
                  <p className="text-sm mt-1">{selectedProduct.description}</p>
                </div>
              )}

              {/* Gift Wrapping Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Gift Wrappable</p>
                  <p className="font-medium flex items-center gap-1">
                    {selectedProduct.giftWrappable ? (
                      <>
                        <Gift className="h-4 w-4 text-green-600" />
                        <span className="text-green-600">Yes</span>
                      </>
                    ) : (
                      <span className="text-gray-400">No</span>
                    )}
                  </p>
                </div>
                {selectedProduct.giftWrappable &&
                  selectedProduct.giftWrapPrice != null &&
                  selectedProduct.giftWrapPrice > 0 && (
                    <div>
                      <p className="text-muted-foreground">
                        Gift Wrap Vendor Price
                      </p>
                      <p className="font-medium">
                        {selectedProduct.giftWrapPrice}{" "}
                        {selectedProduct.giftWrapCurrencyCode || ""}
                      </p>
                    </div>
                  )}
                {selectedProduct.giftWrappable &&
                  selectedProduct.giftWrapCustomerPrice != null &&
                  selectedProduct.giftWrapCustomerPrice > 0 && (
                    <div>
                      <p className="text-muted-foreground">
                        Gift Wrap Customer Price
                      </p>
                      <p className="font-medium">
                        {selectedProduct.giftWrapCustomerPrice}{" "}
                        {selectedProduct.giftWrapCurrencyCode || ""}
                      </p>
                    </div>
                  )}
              </div>

              {/* SKU Prices Section */}
              {selectedProduct.productSku &&
                selectedProduct.productSku.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-eagle-green" />
                      SKU Prices
                    </h4>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>SKU Code</TableHead>
                            <TableHead>Variant Name</TableHead>
                            <TableHead>Attributes</TableHead>
                            <TableHead className="text-right">
                              Customer Price
                            </TableHead>
                            <TableHead className="text-right">
                              Vendor Price
                            </TableHead>
                            <TableHead className="text-right">
                              Platform Fee
                            </TableHead>
                            <TableHead className="text-right">Stock</TableHead>
                            <TableHead>Images</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedProduct.productSku.map((sku) => {
                            const customerPrice =
                              sku.price?.unitAmountMinor ||
                              (sku.price?.amount ? sku.price.amount * 100 : 0);
                            const vendorPrice =
                              sku.price?.vendorAmountMinor ||
                              (sku.price?.vendorAmount
                                ? sku.price.vendorAmount * 100
                                : 0);
                            const platformFee = customerPrice - vendorPrice;
                            const currency = sku.price?.currencyCode || "ETB";

                            return (
                              <TableRow key={sku.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm">
                                      {sku.skuCode}
                                    </span>
                                    {sku.isDefault && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        Default
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm text-gray-700">
                                    {sku.skuName || "-"}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {sku.attributes &&
                                  sku.attributes.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {sku.attributes.map((attr, idx) => (
                                        <Badge
                                          key={idx}
                                          variant="secondary"
                                          className="text-xs"
                                        >
                                          {attr.name}: {attr.value}
                                        </Badge>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">
                                      -
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(customerPrice)} {currency}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                  {formatCurrency(vendorPrice)} {currency}
                                </TableCell>
                                <TableCell className="text-right text-green-600">
                                  {formatCurrency(platformFee)} {currency}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge
                                    variant={
                                      sku.stockQuantity > 0
                                        ? "outline"
                                        : "destructive"
                                    }
                                  >
                                    {sku.stockQuantity}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {sku.images && sku.images.length > 0 ? (
                                    <div className="flex items-center gap-1.5">
                                      {sku.images.slice(0, 4).map((img) => {
                                        const imgUrl = getProductImageUrl([
                                          img,
                                        ]);
                                        return (
                                          <button
                                            key={img.id}
                                            type="button"
                                            className="rounded-md ring-1 ring-gray-200 transition-transform duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-eagle-green"
                                            onClick={() => {
                                              setSelectedImagePreview({
                                                url: imgUrl,
                                                alt: sku.skuName || sku.skuCode,
                                              });
                                              setShowImagePreviewDialog(true);
                                            }}
                                          >
                                            <img
                                              src={imgUrl}
                                              alt={sku.skuName || sku.skuCode}
                                              className="h-8 w-8 rounded-md object-cover cursor-zoom-in"
                                            />
                                          </button>
                                        );
                                      })}
                                      {sku.images.length > 4 && (
                                        <Badge
                                          variant="secondary"
                                          className="text-[10px]"
                                        >
                                          +{sku.images.length - 4}
                                        </Badge>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">
                                      -
                                    </span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
            {selectedProduct?.status === "PENDING" && (
              <>
                <Button
                  variant="outline"
                  className="text-red-600"
                  onClick={() => {
                    setShowViewDialog(false);
                    setRejectDialog({
                      open: true,
                      productId: selectedProduct.id,
                      type: "product",
                    });
                  }}
                >
                  Reject
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    setShowViewDialog(false);
                    approveProductMutation.mutate(selectedProduct.id);
                  }}
                >
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showImagePreviewDialog}
        onOpenChange={setShowImagePreviewDialog}
      >
        <DialogContent className="w-[96vw] max-w-7xl max-h-[96vh] p-2 sm:p-4">
          <DialogHeader>
            <DialogTitle>Variant Image Preview</DialogTitle>
          </DialogHeader>
          {selectedImagePreview && (
            <div className="w-full h-[82vh] bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center">
              <img
                src={selectedImagePreview.url}
                alt={selectedImagePreview.alt}
                className="w-full h-full object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) => setRejectDialog({ ...rejectDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Reject{" "}
              {rejectDialog.type === "product"
                ? "Product"
                : rejectDialog.type === "price"
                ? "Price Update"
                : "Category Change"}
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejection. This will be sent to the
              vendor.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason..."
            value={rejectReason}
            onChange={(e) => {
              const value = e.target.value;
              setRejectReason(value);

              if (value.trim().length > MAX_REJECTION_REASON_LENGTH) {
                setRejectReasonError(
                  `Rejection reason must be ${MAX_REJECTION_REASON_LENGTH} characters or fewer.`
                );
              } else {
                setRejectReasonError("");
              }
            }}
            rows={4}
            maxLength={MAX_REJECTION_REASON_LENGTH}
          />
          <div className="flex items-center justify-between text-xs">
            <p
              className={
                rejectReasonError ? "text-red-600" : "text-muted-foreground"
              }
            >
              {rejectReasonError || "Reason must be clear and concise."}
            </p>
            <p
              className={
                rejectReason.trim().length > MAX_REJECTION_REASON_LENGTH
                  ? "text-red-600"
                  : "text-muted-foreground"
              }
            >
              {rejectReason.trim().length}/{MAX_REJECTION_REASON_LENGTH}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialog({ open: false, type: "product" });
                setRejectReasonError("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={
                rejectProductMutation.isPending ||
                rejectProductPriceUpdateMutation.isPending ||
                rejectCategoryChangeMutation.isPending ||
                !rejectReason.trim() ||
                rejectReason.trim().length > MAX_REJECTION_REASON_LENGTH
              }
            >
              {(rejectProductMutation.isPending ||
                rejectProductPriceUpdateMutation.isPending ||
                rejectCategoryChangeMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
