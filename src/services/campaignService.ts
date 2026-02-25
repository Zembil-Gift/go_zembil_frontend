import { apiService } from './apiService';
import api from './api';

export interface EventCampaign {
  id: number;
  name: string;
  description: string;
  imageUrl: string | null;
  startDateTime: string;
  endDateTime: string;
  subCategoryId: number;
  subCategoryName: string;
  subCategorySlug: string;
  active: boolean;
  status: 'DRAFT' | 'SCHEDULED' | 'LIVE' | 'EXPIRED' | 'DISABLED';
  createdAt: string;
  updatedAt: string;
}

export interface EventCampaignRequest {
  name: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  subCategoryId: number;
  active: boolean;
}

// ==================== Service ====================

class CampaignService {

  /**
   * Get all currently live campaigns (public — no auth required).
   * Returns only campaigns where active=true and current time is within range.
   * Sorted by soonest ending first.
   */
  async getActiveCampaigns(): Promise<EventCampaign[]> {
    return apiService.getRequest<EventCampaign[]>('/api/campaigns/active');
  }

  /**
   * Get all campaigns (admin — includes expired/inactive).
   */
  async getAllCampaigns(): Promise<EventCampaign[]> {
    return apiService.getRequest<EventCampaign[]>('/api/campaigns');
  }

  /**
   * Get a single campaign by ID (admin).
   */
  async getCampaign(id: number): Promise<EventCampaign> {
    return apiService.getRequest<EventCampaign>(`/api/campaigns/${id}`);
  }

  /**
   * Create a new campaign (admin).
   */
  async createCampaign(data: EventCampaignRequest): Promise<EventCampaign> {
    return apiService.postRequest<EventCampaign>('/api/campaigns', data);
  }

  /**
   * Update an existing campaign (admin).
   */
  async updateCampaign(id: number, data: EventCampaignRequest): Promise<EventCampaign> {
    return apiService.putRequest<EventCampaign>(`/api/campaigns/${id}`, data);
  }

  /**
   * Toggle campaign active/inactive (admin).
   */
  async toggleCampaign(id: number): Promise<EventCampaign> {
    return apiService.patchRequest<EventCampaign>(`/api/campaigns/${id}/toggle`, {});
  }

  /**
   * Delete a campaign (admin).
   */
  async deleteCampaign(id: number): Promise<void> {
    return apiService.deleteRequest<void>(`/api/campaigns/${id}`);
  }

  /**
   * Upload a banner image for a campaign (admin).
   */
  async uploadCampaignImage(campaignId: number, file: File): Promise<EventCampaign> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<EventCampaign>(
      `/api/campaigns/${campaignId}/image`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  }

  /**
   * Delete the banner image from a campaign (admin).
   */
  async deleteCampaignImage(campaignId: number): Promise<EventCampaign> {
    return apiService.deleteRequest<EventCampaign>(`/api/campaigns/${campaignId}/image`);
  }
}

export const campaignService = new CampaignService();
export default campaignService;
