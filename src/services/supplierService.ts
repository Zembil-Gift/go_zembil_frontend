import { apiService } from "./apiService";
import { PartnershipApplication } from "./partnershipApplicationService";

export interface SupplierDto {
  id: number;
  businessName: string;
  description: string;
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
}

export const supplierService = new SupplierService();
