import { apiService } from "./apiService";

export type BroadcastTargetRole = "ALL" | "VENDOR" | "CUSTOMER";
export type BroadcastVendorType = "PRODUCT" | "SERVICE" | "HYBRID";

export interface BroadcastMessageResponse {
  id: number;
  title: string;
  message: string;
  targetRole: BroadcastTargetRole;
  vendorTypes: BroadcastVendorType[];
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  createdByAdminId: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBroadcastMessageRequest {
  title: string;
  message: string;
  targetRole: BroadcastTargetRole;
  vendorTypes?: BroadcastVendorType[] | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive?: boolean | null;
}

export interface PageBroadcastMessageResponse {
  content: BroadcastMessageResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface AdminBroadcastListParams {
  isActive?: boolean;
  targetRole?: BroadcastTargetRole;
  activeAt?: string;
  page?: number;
  size?: number;
  sort?: string;
}

class BroadcastService {
  async adminCreate(
    payload: CreateBroadcastMessageRequest
  ): Promise<BroadcastMessageResponse> {
    return await apiService.postRequest<BroadcastMessageResponse>(
      "/api/admin/broadcasts",
      payload
    );
  }

  async adminUpdate(
    id: number,
    payload: CreateBroadcastMessageRequest
  ): Promise<BroadcastMessageResponse> {
    return await apiService.putRequest<BroadcastMessageResponse>(
      `/api/admin/broadcasts/${id}`,
      payload
    );
  }

  async adminGetById(id: number): Promise<BroadcastMessageResponse> {
    return await apiService.getRequest<BroadcastMessageResponse>(
      `/api/admin/broadcasts/${id}`
    );
  }

  async adminList(
    params: AdminBroadcastListParams = {}
  ): Promise<PageBroadcastMessageResponse> {
    const query = new URLSearchParams();

    if (params.isActive !== undefined) {
      query.set("isActive", String(params.isActive));
    }
    if (params.targetRole) {
      query.set("targetRole", params.targetRole);
    }
    if (params.activeAt) {
      query.set("activeAt", params.activeAt);
    }

    query.set("page", String(params.page ?? 0));
    query.set("size", String(params.size ?? 20));
    query.set("sort", params.sort ?? "effectiveFrom,desc");

    return await apiService.getRequest<PageBroadcastMessageResponse>(
      `/api/admin/broadcasts?${query.toString()}`
    );
  }

  async adminSoftDelete(id: number): Promise<void> {
    await apiService.deleteRequest<void>(`/api/admin/broadcasts/${id}`);
  }

  async getMyActiveBroadcasts(): Promise<BroadcastMessageResponse[]> {
    return await apiService.getRequest<BroadcastMessageResponse[]>(
      "/api/broadcasts/me/active"
    );
  }
}

export const broadcastService = new BroadcastService();
