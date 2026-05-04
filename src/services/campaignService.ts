import { apiService } from "./apiService";
import api from "./api";
import { toInstantISOString } from "@/lib/instant";

// ==================== Enums ====================

export type CampaignType =
  | "PRODUCT_EVENT"
  | "VENDOR_PARTICIPATION"
  | "CUSTOMER_PARTICIPATION"
  | "USER_PARTICIPATION";
export type TargetRole = "ALL" | "VENDOR" | "CUSTOMER" | "USER";
export type VerificationMethod = "AUTOMATIC" | "MANUAL" | "HYBRID";
export type ActionType =
  | "UPLOAD_PROOF"
  | "COMPLETE_MIN_SALES"
  | "COMPLETE_MIN_ORDERS"
  | "NO_ACTION_REQUIRED"
  | "USE_REFERRAL_CODE"
  | "COMPLETE_PROFILE"
  | "MANUAL_APPROVAL"
  | "NO_ACTION";
export type ProofType = "TEXT" | "URL" | "FILE" | "MULTIPLE";
export type RewardType =
  | "COMMISSION_BONUS"
  | "FIXED_BONUS"
  | "FEATURED_PLACEMENT"
  | "DISCOUNT_COUPON"
  | "FIXED_DISCOUNT"
  | "WALLET_CREDIT"
  | "FREE_DELIVERY"
  | "GIFT_VOUCHER";
export type RewardDurationType =
  // | "FIXED_PERIOD"
  // | "CAMPAIGN_WINDOW"
  | "ONE_TIME";
export type ParticipationStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "COMPLETED"
  | "PAID";

// ==================== Types ====================

export interface EventCampaign {
  id: number;
  name: string;
  description: string;
  imageUrl: string | null;
  startDateTime: string;
  endDateTime: string;
  subCategoryId: number | null;
  subCategoryName: string | null;
  subCategorySlug: string | null;
  active: boolean;
  status: "DRAFT" | "SCHEDULED" | "LIVE" | "EXPIRED" | "DISABLED";
  campaignType: CampaignType;
  targetRole: TargetRole;
  displayPriority: number;
  ctaText: string | null;
  ctaUrl: string | null;
  verificationMethod: VerificationMethod | null;
  actionType: ActionType | null;
  criteria: string | null;
  proofType: ProofType | null;
  proofDescription: string | null;
  eligibilityRules: string | null;
  rewardType: RewardType | null;
  rewardValue: number | null;
  rewardDurationType: RewardDurationType | null;
  rewardDurationDays: number | null;
  participationCount: number;
  approvedCount: number;
  pendingCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface EventCampaignRequest {
  name: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  subCategoryId?: number | null;
  active: boolean;
  campaignType: CampaignType;
  targetRole?: TargetRole;
  displayPriority?: number;
  ctaText?: string | null;
  ctaUrl?: string | null;
  verificationMethod?: VerificationMethod | null;
  actionType?: ActionType | null;
  criteria?: string | null;
  proofType?: ProofType | null;
  proofDescription?: string | null;
  eligibilityRules?: string | null;
  rewardType?: RewardType | null;
  rewardValue?: number | null;
  rewardDurationType?: RewardDurationType | null;
  rewardDurationDays?: number | null;
}

export interface CampaignParticipation {
  id: number;
  campaignId: number;
  campaignName: string;
  participantId: number;
  participantName: string | null;
  participantEmail: string | null;
  participantRole: TargetRole;
  status: ParticipationStatus;
  rewardType?: RewardType | null;
  submittedData: string | null;
  adminNote: string | null;
  approvedAt: string | null;
  rewardStartDate: string | null;
  rewardEndDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignRewardPreviewItem {
  participationId: number;
  campaignName: string;
  rewardType: Extract<
    RewardType,
    "FIXED_DISCOUNT" | "DISCOUNT_COUPON" | "FREE_DELIVERY"
  >;
  valueMinor: number;
}

export interface CampaignRewardPreview {
  freeDeliveryActive: boolean;
  discountAmountMinor: number;
  hasDiscount: boolean;
  rewards: CampaignRewardPreviewItem[];
}

export interface CampaignActionProgress {
  participationId: number;
  campaignId: number;
  actionType: "COMPLETE_MIN_SALES" | "COMPLETE_MIN_ORDERS";
  verificationMethod: VerificationMethod;
  participationStatus: ParticipationStatus;
  requiredValue: number;
  recordedValue: number | null;
  computedValue: number;
  effectiveActualValue: number;
  requirementMet: boolean;
  valueUnit: "MINOR_CURRENCY" | "COUNT";
  campaignStartDateTime: string;
  campaignEndDateTime: string;
  soldObjects?: CampaignActionProgressObject[];
  orderedObjects?: CampaignActionProgressObject[];
  qualifyingObjects?: CampaignActionProgressObject[];
}

export interface CampaignActionProgressObject {
  orderType?: string | null;
  orderId?: number | null;
  orderNumber?: string | null;
  soldAt?: string | null;
  amountMinor?: number | null;
  quantity?: number | null;
  product?: CampaignActionProgressProduct | null;
  service?: unknown;
  event?: unknown;
}

export interface CampaignActionProgressProduct {
  id: number;
  name: string;
  description?: string;
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
  status?:
    | "PENDING"
    | "ACTIVE"
    | "REJECTED"
    | "DRAFT"
    | "INACTIVE"
    | "ARCHIVED"
    | "APPROVED";
  vendorId?: number;
  vendorName?: string;
  categoryName?: string;
  subCategoryName?: string;
  subCategoryId?: number;
  createdAt?: string;
  giftWrappable?: boolean;
  giftWrapPrice?: number;
  giftWrapCustomerPrice?: number;
  giftWrapCurrencyCode?: string;
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
  productSku?: Array<{
    id: number;
    skuCode?: string | null;
    skuName?: string | null;
    stockQuantity: number;
    isDefault?: boolean;
    attributes?: Array<{
      id?: number;
      name: string;
      value: string;
    }> | null;
    images?: Array<{
      id: number;
      url: string;
      fullUrl?: string;
      originalFilename?: string;
      altText?: string;
      sortOrder?: number;
      isPrimary?: boolean;
      fileSize?: number;
      contentType?: string;
      createdAt?: string;
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
}

export interface CampaignParticipationRequest {
  submittedData?: string;
}

export interface TextProofRequest {
  proofText: string;
}

export interface UrlProofRequest {
  proofUrl: string;
}

export interface MultipleProofMetadataRequest {
  proofText?: string | null;
  proofUrl?: string | null;
}

export interface ParticipationReviewRequest {
  status: "APPROVED" | "REJECTED";
  adminNote?: string;
}

export interface CampaignPayoutReportParticipation {
  id: number;
  campaignId: number;
  campaignName: string;
  participantId: number;
  participantName: string | null;
  participantEmail: string | null;
  participantRole: Extract<TargetRole, "VENDOR" | "CUSTOMER">;
  status: "PAID";
  submittedData: string | null;
  adminNote: string | null;
  approvedAt: string | null;
  rewardStartDate: string | null;
  rewardEndDate: string | null;
  salesSnapshotAmountMinor: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CampaignPayoutReportItem {
  participation: CampaignPayoutReportParticipation;
  paidAt: string | null;
  rewardType: string | null;
  rewardValue: number | string | null;
  payoutAmountMinor: number | null;
  payoutAmountNote: string | null;
}

export interface CampaignPayoutReportFilters {
  from?: string;
  to?: string;
  participantRole?: Extract<TargetRole, "VENDOR" | "CUSTOMER">;
}

export interface VendorCampaignStatusItem {
  status: ParticipationStatus;
  statusSummary: string;
  nextRecommendedAction: string;
  rewardWindowActive: boolean;
  paidAt: string | null;
  payoutAmountMinor: number | null;
  actionType: string | null;
  verificationMethod: VerificationMethod | null;
  rewardType: RewardType | null;
  rewardValue: number | string | null;
  campaignStartDateTime: string | null;
  campaignEndDateTime: string | null;
  participation: {
    id: number;
    campaignId: number;
    campaignName: string;
    participantId: number;
    participantName: string | null;
    participantEmail: string | null;
    participantRole: "VENDOR";
    status: ParticipationStatus;
    submittedData: string | null;
    adminNote: string | null;
    approvedAt: string | null;
    rewardStartDate: string | null;
    rewardEndDate: string | null;
    salesSnapshotAmountMinor: number | null;
    createdAt: string | null;
    updatedAt: string | null;
  };
  actionProgress: {
    participationId: number;
    campaignId: number;
    actionType: "COMPLETE_MIN_SALES" | "COMPLETE_MIN_ORDERS";
    verificationMethod: VerificationMethod | null;
    participationStatus: string;
    requiredValue: number;
    recordedValue: number | null;
    computedValue: number;
    effectiveActualValue: number;
    requirementMet: boolean;
    valueUnit: "MINOR_CURRENCY" | "COUNT";
    campaignStartDateTime: string | null;
    campaignEndDateTime: string | null;
    soldObjects: unknown[] | null;
  } | null;
}

// ==================== Labels ====================

export const CAMPAIGN_TYPE_LABELS: Record<CampaignType, string> = {
  PRODUCT_EVENT: "Product / Event",
  VENDOR_PARTICIPATION: "Vendor Participation",
  CUSTOMER_PARTICIPATION: "Customer Participation",
  USER_PARTICIPATION: "User Participation",
};

export const TARGET_ROLE_LABELS: Record<TargetRole, string> = {
  ALL: "All Users",
  VENDOR: "Vendors Only",
  CUSTOMER: "Customers Only",
  USER: "Customers Only",
};

export const VERIFICATION_METHOD_LABELS: Record<VerificationMethod, string> = {
  AUTOMATIC: "Automatic",
  MANUAL: "Manual Review",
  HYBRID: "Hybrid (Auto + Manual)",
};

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  UPLOAD_PROOF: "Upload Proof",
  COMPLETE_MIN_SALES: "Complete Minimum Sales",
  COMPLETE_MIN_ORDERS: "Complete Minimum Orders",
  NO_ACTION_REQUIRED: "No Action Required",
  USE_REFERRAL_CODE: "Use Referral Code",
  COMPLETE_PROFILE: "Complete Profile",
  MANUAL_APPROVAL: "Manual Approval",
  NO_ACTION: "No Action Required",
};

export const PROOF_TYPE_LABELS: Record<ProofType, string> = {
  TEXT: "Text Input",
  URL: "URL / Link",
  FILE: "File Upload",
  MULTIPLE: "Multiple Fields",
};

export const REWARD_TYPE_LABELS: Record<RewardType, string> = {
  COMMISSION_BONUS: "Commission Bonus (% of platform fee)",
  FIXED_BONUS: "Fixed Bonus Amount",
  FEATURED_PLACEMENT: "Featured Placement",
  DISCOUNT_COUPON: "Discount Coupon (%)",
  FIXED_DISCOUNT: "Fixed Discount",
  WALLET_CREDIT: "Wallet Credit",
  FREE_DELIVERY: "Free Delivery",
  GIFT_VOUCHER: "Gift Voucher",
};

export const VENDOR_REWARD_TYPES: RewardType[] = [
  "COMMISSION_BONUS",
  "FIXED_BONUS",
  "FEATURED_PLACEMENT",
];
export const USER_REWARD_TYPES: RewardType[] = [
  "DISCOUNT_COUPON",
  "FIXED_DISCOUNT",
  "WALLET_CREDIT",
  "FREE_DELIVERY",
  "GIFT_VOUCHER",
];

export const REWARD_DURATION_LABELS: Record<RewardDurationType, string> = {
  // FIXED_PERIOD: "Fixed Period (days)",
  // CAMPAIGN_WINDOW: "Campaign Duration",
  ONE_TIME: "One-Time",
};

// ==================== Service ====================

class CampaignService {
  async getActiveCampaigns(): Promise<EventCampaign[]> {
    return apiService.getRequest<EventCampaign[]>("/api/campaigns/active");
  }

  async getActiveCampaignsByType(type: CampaignType): Promise<EventCampaign[]> {
    return apiService.getRequest<EventCampaign[]>(
      `/api/campaigns/active/type/${type}`
    );
  }

  async getActiveCampaignsByRole(role: TargetRole): Promise<EventCampaign[]> {
    return apiService.getRequest<EventCampaign[]>(
      `/api/campaigns/active/role/${role}`
    );
  }

  async getActiveCampaign(id: number): Promise<EventCampaign> {
    return apiService.getRequest<EventCampaign>(`/api/campaigns/active/${id}`);
  }

  async getAllCampaigns(): Promise<EventCampaign[]> {
    return apiService.getRequest<EventCampaign[]>("/api/campaigns");
  }

  async getCampaignsByType(type: CampaignType): Promise<EventCampaign[]> {
    return apiService.getRequest<EventCampaign[]>(
      `/api/campaigns/type/${type}`
    );
  }

  async getCampaign(id: number): Promise<EventCampaign> {
    return apiService.getRequest<EventCampaign>(`/api/campaigns/${id}`);
  }

  async createCampaign(data: EventCampaignRequest): Promise<EventCampaign> {
    return apiService.postRequest<EventCampaign>("/api/campaigns", {
      ...data,
      startDateTime:
        toInstantISOString(data.startDateTime) || data.startDateTime,
      endDateTime: toInstantISOString(data.endDateTime) || data.endDateTime,
    });
  }

  async updateCampaign(
    id: number,
    data: EventCampaignRequest
  ): Promise<EventCampaign> {
    return apiService.putRequest<EventCampaign>(`/api/campaigns/${id}`, {
      ...data,
      startDateTime:
        toInstantISOString(data.startDateTime) || data.startDateTime,
      endDateTime: toInstantISOString(data.endDateTime) || data.endDateTime,
    });
  }

  async toggleCampaign(id: number): Promise<EventCampaign> {
    return apiService.patchRequest<EventCampaign>(
      `/api/campaigns/${id}/toggle`,
      {}
    );
  }

  async deleteCampaign(id: number): Promise<void> {
    return apiService.deleteRequest<void>(`/api/campaigns/${id}`);
  }

  async uploadCampaignImage(
    campaignId: number,
    file: File
  ): Promise<EventCampaign> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post<EventCampaign>(
      `/api/campaigns/${campaignId}/image`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return response.data;
  }

  async deleteCampaignImage(campaignId: number): Promise<EventCampaign> {
    return apiService.deleteRequest<EventCampaign>(
      `/api/campaigns/${campaignId}/image`
    );
  }

  // ==================== Participation ====================

  async submitParticipation(
    campaignId: number,
    data: CampaignParticipationRequest
  ): Promise<CampaignParticipation> {
    return apiService.postRequest<CampaignParticipation>(
      `/api/campaigns/${campaignId}/participate`,
      data
    );
  }

  async hasParticipated(campaignId: number): Promise<boolean> {
    const result = await apiService.getRequest<{ participated: boolean }>(
      `/api/campaigns/${campaignId}/has-participated`
    );
    return result.participated;
  }

  async getMyParticipations(): Promise<CampaignParticipation[]> {
    return apiService.getRequest<CampaignParticipation[]>(
      "/api/campaigns/my-participations"
    );
  }

  async previewRewards(
    subtotalMinor: number = 0
  ): Promise<CampaignRewardPreview> {
    const params = new URLSearchParams({
      subtotalMinor: String(Math.max(0, subtotalMinor)),
    });

    return apiService.getRequest<CampaignRewardPreview>(
      `/api/campaigns/rewards/preview?${params.toString()}`
    );
  }

  async getParticipationsByCampaign(
    campaignId: number,
    status?: ParticipationStatus
  ): Promise<CampaignParticipation[]> {
    const params = status ? `?status=${status}` : "";
    return apiService.getRequest<CampaignParticipation[]>(
      `/api/campaigns/${campaignId}/participations${params}`
    );
  }

  async getParticipationCountByCampaign(campaignId: number): Promise<number> {
    const result = await apiService.getRequest<
      number | { count?: number; participationCount?: number }
    >(`/api/campaigns/${campaignId}/participations/count`);

    if (typeof result === "number") return result;
    if (typeof result?.count === "number") return result.count;
    if (typeof result?.participationCount === "number") {
      return result.participationCount;
    }

    return 0;
  }

  async getParticipationsByRole(
    role: TargetRole,
    status?: ParticipationStatus
  ): Promise<CampaignParticipation[]> {
    const params = status ? `?status=${status}` : "";
    return apiService.getRequest<CampaignParticipation[]>(
      `/api/campaigns/participations/role/${role}${params}`
    );
  }

  async getParticipation(
    participationId: number
  ): Promise<CampaignParticipation> {
    return apiService.getRequest<CampaignParticipation>(
      `/api/campaigns/participations/${participationId}`
    );
  }

  async reviewParticipation(
    participationId: number,
    data: ParticipationReviewRequest
  ): Promise<CampaignParticipation> {
    return apiService.patchRequest<CampaignParticipation>(
      `/api/campaigns/participations/${participationId}/review`,
      data
    );
  }

  async completeParticipation(
    participationId: number
  ): Promise<CampaignParticipation> {
    return apiService.patchRequest<CampaignParticipation>(
      `/api/campaigns/participations/${participationId}/complete`,
      {}
    );
  }

  async getActionProgress(
    participationId: number
  ): Promise<CampaignActionProgress> {
    return apiService.getRequest<CampaignActionProgress>(
      `/api/campaigns/participations/${participationId}/action-progress`
    );
  }

  async getCampaignPayoutReport(
    campaignId: number,
    filters?: CampaignPayoutReportFilters
  ): Promise<CampaignPayoutReportItem[]> {
    const params = new URLSearchParams();

    if (filters?.from) params.append("from", filters.from);
    if (filters?.to) params.append("to", filters.to);
    if (filters?.participantRole) {
      params.append("participantRole", filters.participantRole);
    }

    const query = params.toString();
    const suffix = query ? `?${query}` : "";

    return apiService.getRequest<CampaignPayoutReportItem[]>(
      `/api/campaigns/${campaignId}/participations/payout-report${suffix}`
    );
  }

  async getVendorMyStatus(
    status?: Extract<
      ParticipationStatus,
      "PENDING" | "APPROVED" | "COMPLETED" | "PAID" | "REJECTED"
    >
  ): Promise<VendorCampaignStatusItem[]> {
    const suffix = status ? `?status=${status}` : "";
    return apiService.getRequest<VendorCampaignStatusItem[]>(
      `/api/campaigns/vendor/my-status${suffix}`
    );
  }

  async submitTextProof(
    participationId: number,
    data: TextProofRequest
  ): Promise<CampaignParticipation> {
    return apiService.patchRequest<CampaignParticipation>(
      `/api/campaigns/participations/${participationId}/proof/text`,
      data
    );
  }

  async submitUrlProof(
    participationId: number,
    data: UrlProofRequest
  ): Promise<CampaignParticipation> {
    return apiService.patchRequest<CampaignParticipation>(
      `/api/campaigns/participations/${participationId}/proof/url`,
      data
    );
  }

  async submitFileProof(
    participationId: number,
    file: File
  ): Promise<CampaignParticipation> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.patch<CampaignParticipation>(
      `/api/campaigns/participations/${participationId}/proof/file`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );

    return response.data;
  }

  async submitMultipleProof(
    participationId: number,
    metadata?: MultipleProofMetadataRequest,
    file?: File
  ): Promise<CampaignParticipation> {
    const formData = new FormData();

    if (metadata && (metadata.proofText || metadata.proofUrl)) {
      formData.append(
        "metadata",
        new Blob([JSON.stringify(metadata)], { type: "application/json" })
      );
    }

    if (file) {
      formData.append("file", file);
    }

    const response = await api.patch<CampaignParticipation>(
      `/api/campaigns/participations/${participationId}/proof/multiple`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );

    return response.data;
  }

  async completeProfileParticipation(
    participationId: number
  ): Promise<CampaignParticipation> {
    return apiService.patchRequest<CampaignParticipation>(
      `/api/campaigns/participations/${participationId}/complete-profile`,
      {}
    );
  }
}

export const campaignService = new CampaignService();
export default campaignService;
