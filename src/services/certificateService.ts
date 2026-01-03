import { apiService } from './apiService';

export interface CertificateGenerationRequest {
  email: string;
  fullName: string;
  vendorType: string;
}

export interface CertificateResponse {
  certificateCode: string;
  email: string;
  fullName: string;
  vendorType: string;
  issuedAt: string;
  expiresAt: string;
  isUsed: boolean;
  isValid: boolean;
  pdfBase64?: string;
}

export interface CertificateValidationResponse {
  isValid: boolean;
  message: string;
  email?: string;
  fullName?: string;
  vendorType?: string;
}

export const certificateService = {
  /**
   * Generate a new onboarding certificate after watching the video
   */
  generateCertificate: async (request: CertificateGenerationRequest): Promise<CertificateResponse> => {
    return apiService.postRequest<CertificateResponse>('/api/vendor-certificates/generate', request);
  },

  /**
   * Validate a certificate code
   */
  validateCertificate: async (certificateCode: string): Promise<CertificateValidationResponse> => {
    return apiService.postRequest<CertificateValidationResponse>('/api/vendor-certificates/validate', {
      certificateCode,
    });
  },

  /**
   * Get certificate details by code
   */
  getCertificate: async (code: string): Promise<CertificateResponse> => {
    return apiService.getRequest<CertificateResponse>(`/api/vendor-certificates/${code}`);
  },

  /**
   * Download certificate PDF by code
   */
  downloadCertificatePdf: async (code: string): Promise<Blob> => {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/vendor-certificates/${code}/pdf`, {
      method: 'GET',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`);
    }
    
    return response.blob();
  },

  /**
   * Get my certificate (for logged-in vendors)
   */
  getMyCertificate: async (): Promise<CertificateResponse | null> => {
    try {
      return await apiService.getRequest<CertificateResponse>('/api/vendor-certificates/my-certificate');
    } catch (error) {
      return null;
    }
  },

  /**
   * Download my certificate PDF (for logged-in vendors)
   */
  downloadMyCertificatePdf: async (): Promise<Blob> => {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/vendor-certificates/my-certificate/pdf`, {
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
   * Get vendor certificate (admin)
   */
  getVendorCertificate: async (vendorId: number): Promise<CertificateResponse | null> => {
    try {
      return await apiService.getRequest<CertificateResponse>(`/api/admin/vendor-certificates/vendor/${vendorId}`);
    } catch (error) {
      return null;
    }
  },

  /**
   * Download vendor certificate PDF (admin)
   */
  downloadVendorCertificatePdf: async (vendorId: number): Promise<Blob> => {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/admin/vendor-certificates/vendor/${vendorId}/pdf`, {
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
};
