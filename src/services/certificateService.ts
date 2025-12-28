import { apiService } from './apiService';

export interface CertificateGenerationRequest {
  email: string;
  fullName: string;
}

export interface CertificateResponse {
  certificateCode: string;
  email: string;
  fullName: string;
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
};
