import { apiService } from "./apiService";

export type VendorPackageStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "PENDING"
  | "REJECTED";

export interface ProductPackageItemRequest {
  id?: number;
  productId: number;
  requiredQuantity: number;
  displayOrder?: number;
  description?: string;
}

export interface CreateProductPackageRequest {
  name: string;
  summary?: string;
  description?: string;
  images?: File[];
  subCategoryId?: number;
  giftWrappable?: boolean;
  giftWrapPrice?: number;
  giftWrapCurrency?: string;
  items: ProductPackageItemRequest[];
}

export interface UpdateProductPackageRequest {
  name?: string;
  summary?: string;
  description?: string;
  images?: File[];
  subCategoryId?: number;
  giftWrappable?: boolean;
  giftWrapPrice?: number;
  giftWrapCurrency?: string;
  items?: ProductPackageItemRequest[];
}

export interface ProductPackageItemResponse {
  id: number;
  productId: number;
  productName?: string;
  productSlug?: string;
  productImage?: string;
  productImages?: string[];
  requiredQuantity: number;
  displayOrder: number;
  description?: string;
  availableSkus?: {
    id: number;
    sku?: string;
    name?: string;
    stockQty?: number;
    quantity?: number;
    status?: string;
    priceMinor?: number;
    priceCurrency?: string;
    isDefault?: boolean;
    images?: string[];
  }[];
}

export interface ProductPackageResponse {
  id: number;
  slug?: string;
  vendorId: number;
  vendorName?: string;
  name: string;
  summary?: string;
  description?: string;
  images?: string[];
  status: string;
  subCategoryId?: number;
  subCategoryName?: string;
  giftWrappable?: boolean;
  giftWrapPrice?: number;
  giftWrapCurrency?: string;
  startingFromPriceMinor?: number;
  displayCurrency?: string;
  available?: boolean;
  rejectionReason?: string | null;
  items: ProductPackageItemResponse[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface VendorPackageOrderItem {
  packageItemId: number;
  productId: number;
  productName: string;
  skuId?: number;
  skuCode?: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
}

export interface VendorPackageOrderResponse {
  packageSaleId: number;
  packageId: number;
  packageName: string;
  orderId: number;
  orderNumber: string;
  orderStatus: string;
  customerId: number;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  packageQuantity: number;
  totalPriceMinor: number;
  platformFeeMinor: number;
  deliveryFeeMinor: number;
  currency: string;
  createdAt: string;
  items: VendorPackageOrderItem[];
}

export interface AddPackageToCartRequest {
  packageId: number;
  skuSelections: {
    packageItemId: number;
    productSkuId: number;
  }[];
}

const buildPackageMultipartFormData = (
  payload: CreateProductPackageRequest | UpdateProductPackageRequest
) => {
  const formData = new FormData();
  const { images, ...requestPayload } = payload;

  formData.append(
    "request",
    new Blob([JSON.stringify(requestPayload)], {
      type: "application/json",
    })
  );

  if (Array.isArray(images) && images.length > 0) {
    images.forEach((file) => {
      formData.append("images", file);
    });
  }

  return formData;
};

export const packageService = {
  createPackage: (payload: CreateProductPackageRequest) =>
    apiService.postFormData<ProductPackageResponse>(
      "/api/v1/packages",
      buildPackageMultipartFormData(payload)
    ),

  updatePackage: (packageId: number, payload: UpdateProductPackageRequest) =>
    apiService.putFormData<ProductPackageResponse>(
      `/api/v1/packages/${packageId}`,
      buildPackageMultipartFormData(payload)
    ),

  getVendorPackages: (
    status?: VendorPackageStatus,
    page: number = 0,
    size: number = 20
  ) => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("size", size.toString());
    if (status) {
      params.set("status", status);
    }
    return apiService.getRequest<PageResponse<ProductPackageResponse>>(
      `/api/v1/packages/vendor/me?${params.toString()}`
    );
  },

  browsePackages: (params?: {
    subCategoryId?: number;
    page?: number;
    size?: number;
  }) => {
    const query = new URLSearchParams();
    query.set("page", String(params?.page ?? 0));
    query.set("size", String(params?.size ?? 20));
    if (params?.subCategoryId) {
      query.set("subCategoryId", String(params.subCategoryId));
    }

    return apiService.getRequest<PageResponse<ProductPackageResponse>>(
      `/api/v1/packages?${query.toString()}`
    );
  },

  getPackageDetail: (packageId: number) =>
    apiService.getRequest<ProductPackageResponse>(
      `/api/v1/packages/${packageId}`
    ),

  getPackageAvailability: (packageId: number) =>
    apiService.getRequest<boolean>(
      `/api/v1/packages/${packageId}/availability`
    ),

  addPackageToCart: (payload: AddPackageToCartRequest) =>
    apiService.postRequest("/api/cart/packages", payload),

  deactivatePackage: (packageId: number) =>
    apiService.postRequest<ProductPackageResponse>(
      `/api/v1/packages/${packageId}/deactivate`
    ),

  reactivatePackage: (packageId: number) =>
    apiService.postRequest<ProductPackageResponse>(
      `/api/v1/packages/${packageId}/reactivate`
    ),

  deletePackage: (packageId: number) =>
    apiService.deleteRequest<void>(`/api/v1/packages/${packageId}`),

  getPackageOrders: (packageId: number, page: number = 0, size: number = 20) =>
    apiService.getRequest<PageResponse<VendorPackageOrderResponse>>(
      `/api/vendor/packages/${packageId}/orders?page=${page}&size=${size}`
    ),

  acceptPackageOrder: (packageId: number, orderId: number) =>
    apiService.postRequest<VendorPackageOrderResponse>(
      `/api/vendor/packages/${packageId}/orders/${orderId}/accept`
    ),

  denyPackageOrder: (packageId: number, orderId: number, reason: string) =>
    apiService.postRequest<VendorPackageOrderResponse>(
      `/api/vendor/packages/${packageId}/orders/${orderId}/deny?reason=${encodeURIComponent(
        reason
      )}`
    ),
};
