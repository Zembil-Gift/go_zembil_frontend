import { apiService } from './apiService';

export interface TermItem {
  id: number;
  termKey: string;
  title: string;
  summary: string | null;
  description: string;
  sortOrder: number;
  isUniversal: boolean;
}

export interface VendorTermsResponse {
  vendorType: string;
  version: number;
  terms: TermItem[];
  fullTermsContent?: string;
  fullTermsPdfUrl?: string;
}

export interface AcceptedTerm {
  termId: number;
  termKey: string;
  title: string;
  description: string;
}

export interface VendorTermsAcceptanceResponse {
  id: number;
  vendorId: number;
  vendorBusinessName: string;
  termsVersion: number;
  acceptedTerms: AcceptedTerm[];
  pdfUrl: string | null;
  acceptedAt: string;
}

export const vendorTermsService = {
  /**
   * Get terms and conditions for a specific vendor type
   */
  getTermsByVendorType: async (vendorType: string): Promise<VendorTermsResponse> => {
    return apiService.getRequest<VendorTermsResponse>(`/api/vendor-terms/by-type/${vendorType}`);
  },

  /**
   * Get vendor terms acceptance for admin view
   */
  getVendorTermsAcceptance: async (vendorId: number): Promise<VendorTermsAcceptanceResponse | null> => {
    try {
      return await apiService.getRequest<VendorTermsAcceptanceResponse>(`/api/admin/vendor-terms/vendor/${vendorId}`);
    } catch (error) {
      return null;
    }
  },

  /**
   * Get all terms acceptances for a vendor (admin)
   */
  getAllVendorTermsAcceptances: async (vendorId: number): Promise<VendorTermsAcceptanceResponse[]> => {
    return apiService.getRequest<VendorTermsAcceptanceResponse[]>(`/api/admin/vendor-terms/vendor/${vendorId}/all`);
  },

  /**
   * Download terms acceptance PDF (admin)
   */
  downloadTermsPdf: async (vendorId: number, filename: string): Promise<Blob> => {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/admin/vendor-terms/pdf/${vendorId}/${filename}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`);
    }
    
    return response.blob();
  },

  /**
   * Download full terms and conditions PDF
   */
  downloadFullTermsPdf: async (): Promise<Blob> => {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/vendor-terms/full-document/pdf`, {
      method: 'GET',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`);
    }
    
    return response.blob();
  },
};
