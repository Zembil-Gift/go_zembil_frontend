import { apiService } from "./apiService";

export interface MouTermItem {
  id: number;
  termKey: string;
  title: string;
  summary: string | null;
  description: string;
  sortOrder: number;
  isUniversal: boolean;
}

export interface MouTermsResponse {
  vendorType: string;
  version: number;
  terms: MouTermItem[];
  fullTermsContent?: string;
  fullTermsPdfUrl?: string;
}

class MouTermsService {
  async getUniversalTerms(): Promise<MouTermsResponse> {
    return apiService.getRequest<MouTermsResponse>("/api/mou-terms/universal");
  }

  async getUniversalTermsByVersion(version: number): Promise<MouTermsResponse> {
    return apiService.getRequest<MouTermsResponse>(
      `/api/mou-terms/universal/version/${version}`
    );
  }

  async getTermsByVendorType(
    vendorType: "PRODUCT" | "SERVICE" | "HYBRID"
  ): Promise<MouTermsResponse> {
    return apiService.getRequest<MouTermsResponse>(
      `/api/mou-terms/by-type/${vendorType}`
    );
  }

  async getTermsByVendorTypeAndVersion(
    vendorType: "PRODUCT" | "SERVICE" | "HYBRID",
    version: number
  ): Promise<MouTermsResponse> {
    return apiService.getRequest<MouTermsResponse>(
      `/api/mou-terms/by-type/${vendorType}/version/${version}`
    );
  }

  async getLatestVersion(): Promise<number> {
    return apiService.getRequest<number>(
      "/api/mou-terms/latest-version"
    );
  }
}

export const mouTermsService = new MouTermsService();
