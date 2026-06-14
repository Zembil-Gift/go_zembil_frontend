import { apiService } from "./apiService";
import { PartnershipApplication } from "./partnershipApplicationService";

export interface SupplierDto {
  id: number;
  businessName: string;
  description: string;
}

export type ReportOrderType =
  | "PRODUCT"
  | "PRODUCT_PACKAGE_ITEM"
  | "EVENT"
  | "SERVICE"
  | "CUSTOM";

export interface SupplierReportItem {
  itemId: number;
  orderType: ReportOrderType;
  orderId: number;
  orderNumber: string;
  listingId: number;
  listingName: string;
  grossAmountMinor: number;
  vendorNetAmountMinor: number;
  currency: string;
  completedAt: string | null;
  addedToReportAt: string | null;
}

export interface OrderTypeSummary {
  orderType: ReportOrderType;
  count: number;
  grossAmountMinor: number;
  vendorNetAmountMinor: number;
}

export interface SupplierReportSummary {
  reportId: number;
  vendorId: number;
  vendorName: string;
  supplierId: number;
  supplierName: string;
  supplierEmail: string;
  lastGeneratedAt: string | null;
  totalItems: number;
  totalGrossAmountMinor: number;
  totalVendorNetAmountMinor: number;
  byOrderType: OrderTypeSummary[];
}

export interface ReportGenerationResult {
  vendorsProcessed: number;
  supplierPairsProcessed: number;
  newItemsAdded: number;
  errors: number;
}

export interface ReportSendResult {
  reportId: number;
  vendorEmail: string;
  supplierEmail: string;
  summary: SupplierReportSummary;
  items: SupplierReportItem[];
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

class SupplierService {
  async getAvailablePartnerships(): Promise<PartnershipApplication[]> {
    return apiService.getRequest<PartnershipApplication[]>(
      "/api/admin/suppliers/available-partnerships"
    );
  }

  async assignSupplier(
    vendorId: number,
    partnershipApplicationId: number
  ): Promise<SupplierDto> {
    return apiService.postRequest<SupplierDto>(
      `/api/admin/vendors/${vendorId}/suppliers`,
      { partnershipApplicationId }
    );
  }

  async getActiveSuppliers(vendorId: number): Promise<SupplierDto[]> {
    return apiService.getRequest<SupplierDto[]>(
      `/api/vendors/${vendorId}/suppliers/active`
    );
  }

  // ── Supplier Sale Reports ────────────────────────────────────────────────

  async listAllReports(): Promise<SupplierReportSummary[]> {
    return apiService.getRequest<SupplierReportSummary[]>(
      "/api/admin/supplier-reports"
    );
  }

  async generateAllReports(): Promise<ReportGenerationResult> {
    return apiService.postRequest<ReportGenerationResult>(
      "/api/admin/supplier-reports/generate",
      {}
    );
  }

  async generateReportForVendor(vendorId: number): Promise<ReportGenerationResult> {
    return apiService.postRequest<ReportGenerationResult>(
      `/api/admin/supplier-reports/generate/${vendorId}`,
      {}
    );
  }

  async getReportItems(
    vendorId: number,
    supplierId: number,
    page = 0,
    size = 50
  ): Promise<PagedResponse<SupplierReportItem>> {
    return apiService.getRequest<PagedResponse<SupplierReportItem>>(
      `/api/admin/supplier-reports/${vendorId}/${supplierId}?page=${page}&size=${size}&sort=completedAt,desc`
    );
  }

  async getReportSummary(
    vendorId: number,
    supplierId: number
  ): Promise<SupplierReportSummary> {
    return apiService.getRequest<SupplierReportSummary>(
      `/api/admin/supplier-reports/${vendorId}/${supplierId}/summary`
    );
  }

  async sendReport(
    vendorId: number,
    supplierId: number
  ): Promise<ReportSendResult> {
    return apiService.postRequest<ReportSendResult>(
      `/api/admin/supplier-reports/${vendorId}/${supplierId}/send`,
      {}
    );
  }
}

export const supplierService = new SupplierService();
