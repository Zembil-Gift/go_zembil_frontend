import api from './api';
import { AxiosResponse } from 'axios';

// Generic API service with reusable HTTP methods
class ApiService {

  private handleError(error: any, fallbackMessage: string): never {
    const data = error.response?.data;

    const enrich = (err: Error): never => {
      // Attach original response so callers can inspect status / error codes
      (err as any).response = error.response;
      throw err;
    };
    
    if (data) {
      // Handle structured validation errors — but only for actual field-validation
      // responses (400). Non-validation errors like EMAIL_NOT_VERIFIED carry a
      // `details` object that must NOT be flattened into a string.
      const isFieldValidation =
        data.details &&
        typeof data.details === 'object' &&
        Object.keys(data.details).length > 0 &&
        !data.error; // structured backend errors set an `error` code; skip them

      if (isFieldValidation) {
        const fieldErrors = Object.entries(data.details)
          .map(([field, msg]) => {
            // If the message already starts with the field name (case insensitive), don't repeat it
            const fieldLabel = field.charAt(0).toUpperCase() + field.slice(1);
            if (typeof msg === 'string' && msg.toLowerCase().startsWith(field.toLowerCase())) {
              return msg;
            }
            return `${fieldLabel}: ${msg}`;
          })
          .join('. ');
        
        return enrich(new Error(fieldErrors || data.message || fallbackMessage));
      }
      
      // Handle standard message
      if (data.message) {
        return enrich(new Error(data.message));
      }
    }
    
    // Fallback to axios error message or generic one
    return enrich(new Error(error.message || fallbackMessage));
  }

  /**
   * Generic GET request
   */
  async getRequest<T>(url: string): Promise<T> {
    try {
      const response: AxiosResponse<T> = await api.get(url);
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'An error occurred while fetching data');
    }
  }

  /**
   * Generic POST request
   */
  async postRequest<T, D = any>(url: string, data?: D, headers?: Record<string, string>): Promise<T> {
    try {
      const config = headers ? { headers } : undefined;
      const response: AxiosResponse<T> = await api.post(url, data, config);
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'An error occurred while posting data');
    }
  }

  /**
   * POST request with FormData (for file uploads)
   */
  async postFormData<T>(url: string, formData: FormData): Promise<T> {
    try {
      const response: AxiosResponse<T> = await api.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'An error occurred while uploading file');
    }
  }

  /**
   * PUT request with FormData (for multipart updates)
   */
  async putFormData<T>(url: string, formData: FormData): Promise<T> {
    try {
      const response: AxiosResponse<T> = await api.put(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'An error occurred while uploading file');
    }
  }

  /**
   * Generic PUT request
   */
  async putRequest<T, D = any>(url: string, data?: D): Promise<T> {
    try {
      const response: AxiosResponse<T> = await api.put(url, data);
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'An error occurred while updating data');
    }
  }

  /**
   * Generic DELETE request
   */
  async deleteRequest<T, D = any>(url: string, data?: D): Promise<T> {
    try {
      const config = data ? { data } : undefined;
      const response: AxiosResponse<T> = await api.delete(url, config);
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'An error occurred while deleting data');
    }
  }

  /**
   * Generic PATCH request
   */
  async patchRequest<T, D = any>(url: string, data?: D): Promise<T> {
    try {
      const response: AxiosResponse<T> = await api.patch(url, data);
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'An error occurred while patching data');
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;