import api from './api';


export interface ImageDto {
  id: number;
  url: string;           // Relative path
  fullUrl: string;       // Complete URL
  originalFilename: string;
  altText?: string;
  sortOrder: number;
  isPrimary: boolean;
  fileSize: number;
  contentType: string;
  createdAt: string;
}

export interface ImageUploadResponse {
  message: string;
  images: ImageDto[];
  totalImages: number;
}


export type ImageEntityType = 'product' | 'sku' | 'event';

export const imageService = {
  async uploadProductImages(productId: number, files: File[]): Promise<ImageUploadResponse> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await api.post<ImageUploadResponse>(
      `/api/images/products/${productId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  async getProductImages(productId: number): Promise<ImageDto[]> {
    const response = await api.get<ImageDto[]>(`/api/images/products/${productId}`);
    return response.data;
  },

  async deleteProductImage(productId: number, imageId: number): Promise<void> {
    await api.delete(`/api/images/products/${productId}/${imageId}`);
  },

  async setProductPrimaryImage(productId: number, imageId: number): Promise<ImageDto> {
    const response = await api.put<ImageDto>(`/api/images/products/${productId}/${imageId}/primary`);
    return response.data;
  },

  async reorderProductImages(productId: number, imageIds: number[]): Promise<ImageDto[]> {
    const response = await api.put<ImageDto[]>(`/api/images/products/${productId}/reorder`, imageIds);
    return response.data;
  },

  async uploadSkuImages(skuId: number, files: File[]): Promise<ImageUploadResponse> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await api.post<ImageUploadResponse>(
      `/api/images/skus/${skuId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  async getSkuImages(skuId: number): Promise<ImageDto[]> {
    const response = await api.get<ImageDto[]>(`/api/images/skus/${skuId}`);
    return response.data;
  },

  async deleteSkuImage(skuId: number, imageId: number): Promise<void> {
    await api.delete(`/api/images/skus/${skuId}/${imageId}`);
  },

  async setSkuPrimaryImage(skuId: number, imageId: number): Promise<ImageDto> {
    const response = await api.put<ImageDto>(`/api/images/skus/${skuId}/${imageId}/primary`);
    return response.data;
  },

  async uploadEventImages(eventId: number, files: File[]): Promise<ImageUploadResponse> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await api.post<ImageUploadResponse>(
      `/api/images/events/${eventId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  async getEventImages(eventId: number): Promise<ImageDto[]> {
    const response = await api.get<ImageDto[]>(`/api/images/events/${eventId}`);
    return response.data;
  },

  async deleteEventImage(eventId: number, imageId: number): Promise<void> {
    await api.delete(`/api/images/events/${eventId}/${imageId}`);
  },

  async setEventPrimaryImage(eventId: number, imageId: number): Promise<ImageDto> {
    const response = await api.put<ImageDto>(`/api/images/events/${eventId}/${imageId}/primary`);
    return response.data;
  },

  async reorderEventImages(eventId: number, imageIds: number[]): Promise<ImageDto[]> {
    const response = await api.put<ImageDto[]>(`/api/images/events/${eventId}/reorder`, imageIds);
    return response.data;
  },

  // Vendor Logo
  async uploadVendorLogo(vendorId: number, file: File): Promise<ImageDto> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<ImageDto>(
      `/api/images/vendors/${vendorId}/logo`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  async getVendorLogo(vendorId: number): Promise<ImageDto | null> {
    try {
      const response = await api.get<ImageDto>(`/api/images/vendors/${vendorId}/logo`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async deleteVendorLogo(vendorId: number): Promise<void> {
    await api.delete(`/api/images/vendors/${vendorId}/logo`);
  },

  // Delivery Proof Images
  async uploadDeliveryProofImage(assignmentId: number, file: File): Promise<ImageDto> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<ImageDto>(
      `/api/images/deliveries/${assignmentId}/proof`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },
};

export default imageService;
