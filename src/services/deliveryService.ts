import { apiService } from "./apiService";

// Types
export interface DeliveryPersonDto {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string;
  phoneNumber: string;
  vehicleType?: string;
  vehicleNumber?: string;
  avatarUrl?: string;
  status: 'AVAILABLE' | 'BUSY' | 'OFFLINE' | 'ON_BREAK';
  active: boolean;
  notes?: string;
  totalDeliveries: number;
  successfulDeliveries: number;
  activeAssignments: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeliveryPersonRequest {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  employeeId?: string;
  phoneNumber: string;
  vehicleType?: string;
  vehicleNumber?: string;
  notes?: string;
}

export interface UpdateDeliveryPersonRequest {
  phoneNumber?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  avatarUrl?: string;
  status?: 'AVAILABLE' | 'BUSY' | 'OFFLINE' | 'ON_BREAK';
  active?: boolean;
  notes?: string;
}

export interface DeliveryAssignmentDto {
  id: number;
  orderId?: number;
  orderNumber?: string;
  customOrderId?: number;
  customOrderNumber?: string;
  orderType: 'REGULAR' | 'CUSTOM';
  deliveryPersonId: number;
  deliveryPersonName: string;
  status: DeliveryStatus;
  assignedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  expectedDeliveryAt?: string;
  notes?: string;
  pickupImageUrl?: string;
  pickupUploadedAt?: string;
  proofImageUrl?: string;
  proofUploadedAt?: string;
  recipientName?: string;
  failureReason?: string;
  attemptCount: number;
  customerName?: string;
  customerPhone?: string;
  shippingAddress?: string;
  shippingCity?: string;
  // Delivery fee the delivery person earns
  deliveryFee?: number;
  deliveryFeeCurrency?: string;
  distanceMeters?: number;
  estimatedDurationSeconds?: number;
  // Payment status
  deliveryPaymentStatus?: 'UNPAID' | 'PAID';
  createdAt: string;
  updatedAt: string;
}

export interface AdminDeliveryAssignmentDto {
  id: number;
  orderId?: number;
  orderNumber?: string;
  customOrderId?: number;
  customOrderNumber?: string;
  orderType: 'REGULAR' | 'CUSTOM';
  deliveryPersonId: number;
  deliveryPersonName: string;
  status: DeliveryStatus;
  assignedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  expectedDeliveryAt?: string;
  notes?: string;
  // Pickup proof (photo when receiving the product)
  pickupImageUrl?: string;
  pickupUploadedAt?: string;
  // Delivery proof (photo when delivering the product)
  proofImageUrl?: string;
  proofUploadedAt?: string;
  recipientName?: string;
  failureReason?: string;
  attemptCount: number;
  customerName?: string;
  customerPhone?: string;
  shippingAddress?: string;
  shippingCity?: string;
  totalAmountMinor: number;
  currencyCode: string;
  // Delivery fee information
  deliveryFee?: number;
  deliveryFeeCurrency?: string;
  distanceMeters?: number;
  estimatedDurationSeconds?: number;
  trafficDurationSeconds?: number;
  // Delivery payment tracking
  deliveryPaymentStatus?: 'UNPAID' | 'PAID';
  deliveryPaymentApprovedAt?: string;
  deliveryPaymentApprovedByName?: string;
  deliveryPaymentNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export type DeliveryStatus = 
  | 'ASSIGNED' 
  | 'ACCEPTED' 
  | 'PICKED_UP' 
  | 'IN_TRANSIT' 
  | 'ARRIVED' 
  | 'DELIVERED' 
  | 'FAILED' 
  | 'RETURNED' 
  | 'CANCELLED';

export interface AssignDeliveryRequest {
  orderId: number;
  deliveryPersonId: number;
  expectedDeliveryAt?: string;
  notes?: string;
}

export interface UpdateDeliveryStatusRequest {
  status: DeliveryStatus;
  notes?: string;
  failureReason?: string;
  recipientName?: string;
}

export interface UploadDeliveryProofRequest {
  proofImageUrl: string;
  recipientName?: string;
  recipientSignatureUrl?: string;
  notes?: string;
}

export interface UploadPickupProofRequest {
  pickupImageUrl: string;
  notes?: string;
}

export interface DeliveryDashboardDto {
  deliveryPersonId: number;
  employeeId: string;
  name: string;
  status: 'AVAILABLE' | 'BUSY' | 'OFFLINE' | 'ON_BREAK';
  activeAssignments: number;
  pendingPickups: number;
  inTransit: number;
  todayDeliveries: number;
  totalDeliveries: number;
  successfulDeliveries: number;
  successRate: number;
}

export interface OrderReadyForDeliveryDto {
  id: number;
  orderNumber: string;
  status: string;
  customerName?: string;
  customerPhone?: string;
  shippingAddress?: string;
  shippingCity?: string;
  // Precise location
  shippingLatitude?: number;
  shippingLongitude?: number;
  shippingFormattedAddress?: string;
  totalAmountMinor: number;
  currencyCode: string;
  itemCount: number;
  createdAt: string;
  // Estimated delivery fee the delivery person will earn
  estimatedDeliveryFee?: number;
  deliveryFeeCurrency?: string;
  estimatedDistanceMeters?: number;
  estimatedDistanceText?: string;
  estimatedDurationSeconds?: number;
  estimatedDurationText?: string;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

// Admin Delivery Person Service
export const adminDeliveryService = {
  // Delivery Person Management
  createDeliveryPerson: (data: CreateDeliveryPersonRequest) =>
    apiService.postRequest<DeliveryPersonDto>('/api/admin/delivery/persons', data),

  getAllDeliveryPersons: (params?: { active?: boolean; search?: string; page?: number; size?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.active !== undefined) queryParams.append('active', String(params.active));
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page !== undefined) queryParams.append('page', String(params.page));
    if (params?.size !== undefined) queryParams.append('size', String(params.size));
    const url = `/api/admin/delivery/persons${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiService.getRequest<PagedResponse<DeliveryPersonDto>>(url);
  },

  getDeliveryPersonById: (id: number) =>
    apiService.getRequest<DeliveryPersonDto>(`/api/admin/delivery/persons/${id}`),

  updateDeliveryPerson: (id: number, data: UpdateDeliveryPersonRequest) =>
    apiService.patchRequest<DeliveryPersonDto>(`/api/admin/delivery/persons/${id}`, data),

  deactivateDeliveryPerson: (id: number) =>
    apiService.postRequest<void>(`/api/admin/delivery/persons/${id}/deactivate`, {}),

  activateDeliveryPerson: (id: number) =>
    apiService.postRequest<void>(`/api/admin/delivery/persons/${id}/activate`, {}),

  deleteDeliveryPerson: (id: number) =>
    apiService.deleteRequest<void>(`/api/admin/delivery/persons/${id}`),

  getAvailableDeliveryPersons: (params?: { page?: number; size?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.append('page', String(params.page));
    if (params?.size !== undefined) queryParams.append('size', String(params.size));
    const url = `/api/admin/delivery/persons/available${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiService.getRequest<PagedResponse<DeliveryPersonDto>>(url);
  },

  // Delivery Assignment Management
  assignOrderToDeliveryPerson: (data: AssignDeliveryRequest) =>
    apiService.postRequest<AdminDeliveryAssignmentDto>('/api/admin/delivery/assignments', data),

  getAllAssignments: (params?: { status?: string; page?: number; size?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page !== undefined) queryParams.append('page', String(params.page));
    if (params?.size !== undefined) queryParams.append('size', String(params.size));
    const url = `/api/admin/delivery/assignments${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiService.getRequest<PagedResponse<AdminDeliveryAssignmentDto>>(url);
  },

  getAssignmentsByDeliveryPerson: (deliveryPersonId: number, params?: { page?: number; size?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.append('page', String(params.page));
    if (params?.size !== undefined) queryParams.append('size', String(params.size));
    const url = `/api/admin/delivery/assignments/by-person/${deliveryPersonId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiService.getRequest<PagedResponse<AdminDeliveryAssignmentDto>>(url);
  },

  reassignOrder: (assignmentId: number, newDeliveryPersonId: number) =>
    apiService.postRequest<AdminDeliveryAssignmentDto>(
      `/api/admin/delivery/assignments/${assignmentId}/reassign?newDeliveryPersonId=${newDeliveryPersonId}`,
      {}
    ),

  cancelAssignment: (assignmentId: number, reason: string) =>
    apiService.postRequest<void>(
      `/api/admin/delivery/assignments/${assignmentId}/cancel?reason=${encodeURIComponent(reason)}`,
      {}
    ),

  getOrdersReadyForDelivery: (params?: { page?: number; size?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.append('page', String(params.page));
    if (params?.size !== undefined) queryParams.append('size', String(params.size));
    const url = `/api/admin/delivery/orders/ready-for-delivery${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiService.getRequest<PagedResponse<OrderReadyForDeliveryDto>>(url);
  },

  // Custom Order Delivery Assignment Management
  assignCustomOrderToDeliveryPerson: (data: { customOrderId: number; deliveryPersonId: number; notes?: string }) =>
    apiService.postRequest<AdminDeliveryAssignmentDto>('/api/admin/delivery/custom-order-assignments', data),

  getCustomOrderAssignments: (params?: { status?: string; page?: number; size?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page !== undefined) queryParams.append('page', String(params.page));
    if (params?.size !== undefined) queryParams.append('size', String(params.size));
    const url = `/api/admin/delivery/custom-order-assignments${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiService.getRequest<PagedResponse<AdminDeliveryAssignmentDto>>(url);
  },

  getCustomOrdersReadyForDelivery: (params?: { page?: number; size?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.append('page', String(params.page));
    if (params?.size !== undefined) queryParams.append('size', String(params.size));
    const url = `/api/admin/delivery/custom-orders/ready-for-delivery${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiService.getRequest<PagedResponse<OrderReadyForDeliveryDto>>(url);
  },

  // Delivery Payment Management
  approveDeliveryPayment: (assignmentId: number, notes?: string) => {
    const queryParams = new URLSearchParams();
    if (notes) queryParams.append('notes', notes);
    const url = `/api/admin/delivery/assignments/${assignmentId}/approve-payment${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiService.postRequest<AdminDeliveryAssignmentDto>(url, {});
  },

  getAssignmentsByPaymentStatus: (paymentStatus: 'UNPAID' | 'PAID', params?: { page?: number; size?: number }) => {
    const queryParams = new URLSearchParams();
    queryParams.append('paymentStatus', paymentStatus);
    if (params?.page !== undefined) queryParams.append('page', String(params.page));
    if (params?.size !== undefined) queryParams.append('size', String(params.size));
    const url = `/api/admin/delivery/assignments/by-payment-status?${queryParams.toString()}`;
    return apiService.getRequest<PagedResponse<AdminDeliveryAssignmentDto>>(url);
  },
};

// Delivery Person Service (for delivery person's own operations)
export const deliveryService = {
  // Dashboard & Profile
  getDashboard: () =>
    apiService.getRequest<DeliveryDashboardDto>('/api/delivery/dashboard'),

  getProfile: () =>
    apiService.getRequest<DeliveryPersonDto>('/api/delivery/profile'),

  updateStatus: (status: string) =>
    apiService.patchRequest<DeliveryPersonDto>(`/api/delivery/status?status=${status}`, {}),

  // Assignments
  getMyAssignments: (params?: { status?: string; page?: number; size?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page !== undefined) queryParams.append('page', String(params.page));
    if (params?.size !== undefined) queryParams.append('size', String(params.size));
    const url = `/api/delivery/assignments${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiService.getRequest<PagedResponse<DeliveryAssignmentDto>>(url);
  },

  getActiveAssignments: (params?: { page?: number; size?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.append('page', String(params.page));
    if (params?.size !== undefined) queryParams.append('size', String(params.size));
    const url = `/api/delivery/assignments/active${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiService.getRequest<PagedResponse<DeliveryAssignmentDto>>(url);
  },

  getAssignmentById: (assignmentId: number) =>
    apiService.getRequest<DeliveryAssignmentDto>(`/api/delivery/assignments/${assignmentId}`),

  acceptAssignment: (assignmentId: number) =>
    apiService.postRequest<DeliveryAssignmentDto>(`/api/delivery/assignments/${assignmentId}/accept`, {}),

  updateDeliveryStatus: (assignmentId: number, data: UpdateDeliveryStatusRequest) =>
    apiService.postRequest<DeliveryAssignmentDto>(`/api/delivery/assignments/${assignmentId}/status`, data),

  uploadPickupProof: (assignmentId: number, data: UploadPickupProofRequest) =>
    apiService.postRequest<DeliveryAssignmentDto>(`/api/delivery/assignments/${assignmentId}/pickup-proof`, data),

  uploadDeliveryProof: (assignmentId: number, data: UploadDeliveryProofRequest) =>
    apiService.postRequest<DeliveryAssignmentDto>(`/api/delivery/assignments/${assignmentId}/proof`, data),

  completeDelivery: (assignmentId: number, data: UploadDeliveryProofRequest) =>
    apiService.postRequest<DeliveryAssignmentDto>(`/api/delivery/assignments/${assignmentId}/complete`, data),

  reportDeliveryFailure: (assignmentId: number, reason: string) =>
    apiService.postRequest<DeliveryAssignmentDto>(
      `/api/delivery/assignments/${assignmentId}/fail?reason=${encodeURIComponent(reason)}`,
      {}
    ),

  // History
  getDeliveryHistory: (params?: { page?: number; size?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.append('page', String(params.page));
    if (params?.size !== undefined) queryParams.append('size', String(params.size));
    const url = `/api/delivery/history${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiService.getRequest<PagedResponse<DeliveryAssignmentDto>>(url);
  },

  // Available Orders (Self-Assignment)
  getAvailableOrders: (params?: { page?: number; size?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.append('page', String(params.page));
    if (params?.size !== undefined) queryParams.append('size', String(params.size));
    const url = `/api/delivery/available-orders${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiService.getRequest<PagedResponse<OrderReadyForDeliveryDto>>(url);
  },

  getAvailableOrdersCount: () =>
    apiService.getRequest<number>('/api/delivery/available-orders/count'),

  selfAssignOrder: (orderId: number) =>
    apiService.postRequest<DeliveryAssignmentDto>(`/api/delivery/orders/${orderId}/accept`, {}),

  // Custom Order Self-Assignment
  getAvailableCustomOrders: (params?: { page?: number; size?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.append('page', String(params.page));
    if (params?.size !== undefined) queryParams.append('size', String(params.size));
    const url = `/api/delivery/available-custom-orders${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiService.getRequest<PagedResponse<OrderReadyForDeliveryDto>>(url);
  },

  selfAssignCustomOrder: (customOrderId: number) =>
    apiService.postRequest<DeliveryAssignmentDto>(`/api/delivery/custom-orders/${customOrderId}/accept`, {}),
};
