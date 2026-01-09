export type CustomizationFieldType = 'TEXT' | 'NUMBER' | 'IMAGE' | 'VIDEO';

export type CustomOrderTemplateStatus = 
  | 'PENDING_APPROVAL' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'ARCHIVED';

export type CustomOrderStatus = 
  | 'SUBMITTED' 
  | 'PRICE_PROPOSED' 
  | 'CONFIRMED' 
  | 'PAID' 
  | 'IN_PROGRESS' 
  | 'COMPLETED' 
  | 'OUT_FOR_DELIVERY' 
  | 'DELIVERED' 
  | 'CANCELLED';


export interface CustomOrderTemplateField {
  id: number;
  fieldName: string;
  fieldType: CustomizationFieldType;
  required: boolean;
  description?: string;
  sortOrder: number;
}

export interface CustomOrderTemplateImage {
  id: number;
  url: string;
  fullUrl: string;
  originalFilename?: string;
  sortOrder: number;
}

export interface CustomOrderTemplatePrice {
  id?: number;
  currencyCode?: string;
  currencyId?: number;
  unitAmountMinor?: number;
  vendorAmountMinor?: number;
  amount?: number;
  vendorAmount?: number;
  useExchangeRate?: boolean;
  active?: boolean;
}

export interface CustomOrderTemplate {
  id: number;
  vendorId: number;
  vendorName: string;
  vendorBusinessName?: string;
  name: string;
  description?: string;
  basePriceMinor: number;
  vendorPriceMinor?: number;
  currencyCode: string;   // Backend sends 'currencyCode' not 'currency'
  currencyId?: number;
  price?: CustomOrderTemplatePrice;
  categoryId?: number;
  categoryName?: string;
  parentCategoryId?: number;
  parentCategoryName?: string;
  status: CustomOrderTemplateStatus;
  rejectionReason?: string;
  approvedById?: number;
  approvedByName?: string;
  approvedAt?: string;
  fields: CustomOrderTemplateField[];
  images: CustomOrderTemplateImage[];
  createdAt: string;
  updatedAt: string;
}

export interface CategoryWithTemplateCount {
  categoryId: number;
  categoryName: string;
  categorySlug?: string | null;
  categoryDescription?: string | null;
  categoryImage?: string | null;
  parentCategoryId?: number | null;
  parentCategoryName?: string | null;
  templateCount: number;
}

// ==================== Order Types ====================

export interface CustomOrderValue {
  id: number;
  fieldId: number;
  fieldName: string;
  fieldType: CustomizationFieldType;
  textValue?: string;
  numberValue?: number;
  fileUrl?: string;
  fullFileUrl?: string;  // Full resolved URL from FileStorageService
  originalFilename?: string;
}

export interface CustomOrderStatusHistory {
  id: number;
  status: CustomOrderStatus;
  changedBy: string;
  changedByRole: string;
  reason?: string;
  createdAt: string;
}

export interface CustomOrderPriceHistory {
  id: number;
  priceMinor: number;
  price?: number;           // Major units for display
  currencyCode?: string;    // Currency code
  setById?: number;
  setByName?: string;
  setByRole?: string;
  reason?: string;
  createdAt: string;
}

export interface CustomOrder {
  id: number;
  orderNumber: string;
  templateId: number;
  templateName: string;
  customerId: number;
  customerName: string;
  customerEmail: string;
  vendorId: number;
  vendorName: string;
  additionalDescription?: string;
  basePriceMinor: number;
  finalPriceMinor?: number;
  baseVendorPriceMinor?: number;
  finalVendorPriceMinor?: number;
  basePrice?: number;
  finalPrice?: number;
  baseVendorPrice?: number;
  finalVendorPrice?: number;
  currency: string;
  currencyCode: string;
  originalCurrencyCode?: string;
  status: CustomOrderStatus;
  paymentStatus: string;
  paymentProvider?: string;
  paymentReference?: string;
  paidAt?: string;
  assignedDeliveryPersonId?: number;
  assignedDeliveryPersonName?: string;
  deliveredAt?: string;
  values: CustomOrderValue[];
  statusHistory: CustomOrderStatusHistory[];
  priceHistory: CustomOrderPriceHistory[];
  createdAt: string;
  updatedAt: string;
}


export interface OrderChatMessage {
  id: number;
  orderId: number;
  senderId: number;
  senderName: string;
  senderRole: string;
  message: string;
  imageUrl?: string;
  fullImageUrl?: string;
  sentAt: string;
  isRead: boolean;
}


export interface CreateCustomOrderTemplateRequest {
  name: string;
  description?: string;
  basePrice: number;
  currency: string;
  categoryId?: number;
  fields: {
    fieldName: string;
    fieldType: CustomizationFieldType;
    required: boolean;
    description?: string;
    sortOrder: number;
  }[];
}

export interface UpdateCustomOrderTemplateRequest {
  name?: string;
  description?: string;
  basePrice?: number;
  currency?: string;
  categoryId?: number;
  fields?: {
    fieldName: string;
    fieldType: CustomizationFieldType;
    required: boolean;
    description?: string;
    sortOrder: number;
  }[];
}

export interface CreateCustomOrderRequest {
  templateId: number;
  additionalDescription?: string;
  values: {
    fieldId: number;
    textValue?: string;
    numberValue?: number;
    fileUrl?: string;
    originalFilename?: string;
  }[];
}

export interface ProposePriceRequest {
  finalPrice: number;
  currencyCode?: string;
}

export interface OrderChatMessageRequest {
  message?: string;
  imageUrl?: string;
}

export interface PaymentInitResponse {
  provider: string;
  paymentId?: string;
  clientSecret?: string;
  publishableKey?: string;
  checkoutUrl?: string;
}


export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export type PagedCustomOrderTemplateResponse = PagedResponse<CustomOrderTemplate>;
export type PagedCustomOrderResponse = PagedResponse<CustomOrder>;
export type PagedOrderChatMessageResponse = PagedResponse<OrderChatMessage>;


export interface CustomOrderTemplateFilters {
  page?: number;
  size?: number;
  status?: CustomOrderTemplateStatus;
  categoryId?: number;
  vendorId?: number;
}

export interface CustomOrderFilters {
  page?: number;
  size?: number;
  status?: CustomOrderStatus;
  customerId?: number;
  vendorId?: number;
}

export interface OrderChatFilters {
  page?: number;
  size?: number;
  orderId: number;
}