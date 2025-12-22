import api from './api';
import { AxiosResponse } from 'axios';

// Generic API service with reusable HTTP methods
class ApiService {
  /**
   * Generic GET request
   */
  async getRequest<T>(url: string): Promise<T> {
    try {
      const response: AxiosResponse<T> = await api.get(url);
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'An error occurred while fetching data'
      );
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
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'An error occurred while posting data'
      );
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
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'An error occurred while updating data'
      );
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
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'An error occurred while deleting data'
      );
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
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'An error occurred while patching data'
      );
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;