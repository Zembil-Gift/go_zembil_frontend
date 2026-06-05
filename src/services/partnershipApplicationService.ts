import { apiService } from "./apiService";

export type PartnershipApplicationStatus =
  | "LEAD"
  | "CONTACTED"
  | "MOU_PENDING"
  | "MOU_SIGNED"
  | "PROFILE_CREATED"
  | "PRODUCTS_ADDED"
  | "ACTIVE"
  | "INACTIVE";

export const PARTNERSHIP_STATUSES: PartnershipApplicationStatus[] = [
  "LEAD",
  "CONTACTED",
  "MOU_PENDING",
  "MOU_SIGNED",
  "PROFILE_CREATED",
  "PRODUCTS_ADDED",
  "ACTIVE",
  "INACTIVE",
];

export const PARTNERSHIP_STATUS_LABELS: Record<PartnershipApplicationStatus, string> = {
  LEAD: "Lead",
  CONTACTED: "Contacted",
  MOU_PENDING: "MOU Pending",
  MOU_SIGNED: "MOU Signed",
  PROFILE_CREATED: "Profile Created",
  PRODUCTS_ADDED: "Products Added",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
};

export interface PartnershipApplication {
  id: number;
  businessName: string;
  businessEmail: string;
  description: string;
  businessPhone: string;
  categoryId: number;
  categoryName: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  vendorCategoryId: number;
  vendorCategoryName: string;
  status: PartnershipApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePartnershipApplicationRequest {
  businessName?: string;
  businessEmail?: string;
  description?: string;
  businessPhone?: string;
  categoryId?: number | null;
  city?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  vendorCategoryId?: number | null;
  status?: PartnershipApplicationStatus;
}

class PartnershipApplicationService {
  async createApplication(
    data: CreatePartnershipApplicationRequest
  ): Promise<PartnershipApplication> {
    return apiService.postRequest<PartnershipApplication>(
      "/api/v1/partnership-applications",
      data
    );
  }

  async listApplications(
    status?: string
  ): Promise<PartnershipApplication[]> {
    let url = "/api/v1/admin/partnership-applications";
    if (status) url += `?status=${status}`;
    return apiService.getRequest<PartnershipApplication[]>(url);
  }

  async getApplication(id: number): Promise<PartnershipApplication> {
    return apiService.getRequest<PartnershipApplication>(
      `/api/v1/admin/partnership-applications/${id}`
    );
  }

  async updateStatus(
    id: number,
    status: PartnershipApplicationStatus
  ): Promise<PartnershipApplication> {
    return apiService.patchRequest<PartnershipApplication>(
      `/api/v1/admin/partnership-applications/${id}/status`,
      { status }
    );
  }
}

export const partnershipApplicationService = new PartnershipApplicationService();
