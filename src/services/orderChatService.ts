import { apiService } from './apiService';
import type {
  OrderChatMessage,
  OrderChatMessageRequest,
  PagedOrderChatMessageResponse,
} from '../types/customOrders';

class OrderChatService {
  
  async sendMessage(orderId: number, message: string, imageUrl?: string): Promise<OrderChatMessage> {
    const data: OrderChatMessageRequest = { message, imageUrl };
    return await apiService.postRequest<OrderChatMessage>(`/api/custom-orders/${orderId}/chat`, data);
  }
  async sendMessageWithFile(orderId: number, message: string, imageFile: File): Promise<OrderChatMessage> {
    const formData = new FormData();
    if (message) {
      formData.append('message', message);
    }
    formData.append('image', imageFile);
    
    return await apiService.postFormData<OrderChatMessage>(
      `/api/custom-orders/${orderId}/chat/with-image`, 
      formData
    );
  }

  async sendImageMessage(orderId: number, imageUrl: string, caption?: string): Promise<OrderChatMessage> {
    const data: OrderChatMessageRequest = { message: caption || '', imageUrl };
    return await apiService.postRequest<OrderChatMessage>(`/api/custom-orders/${orderId}/chat`, data);
  }

  async getMessages(
    orderId: number, 
    page: number = 0, 
    size: number = 50
  ): Promise<PagedOrderChatMessageResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('size', size.toString());
    
    const url = `/api/custom-orders/${orderId}/chat?${queryParams.toString()}`;
    return await apiService.getRequest<PagedOrderChatMessageResponse>(url);
  }

  async markAsRead(orderId: number): Promise<void> {
    return await apiService.postRequest<void>(`/api/custom-orders/${orderId}/chat/mark-read`);
  }

  async getUnreadCount(orderId: number): Promise<number> {
    return await apiService.getRequest<number>(`/api/custom-orders/${orderId}/chat/unread-count`);
  }

  formatMessageTime(sentAt: string): string {
    const date = new Date(sentAt);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return diffInMinutes <= 1 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  }

  formatFullMessageTime(sentAt: string): string {
    const date = new Date(sentAt);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  getSenderRoleDisplayName(role: string): string {
    switch (role) {
      case 'CUSTOMER':
        return 'Customer';
      case 'VENDOR':
        return 'Vendor';
      case 'ADMIN':
        return 'Admin';
      case 'DELIVERY_PERSON':
        return 'Delivery Person';
      default:
        return role;
    }
  }

  getSenderRoleBadgeColor(role: string): string {
    switch (role) {
      case 'CUSTOMER':
        return 'bg-blue-100 text-blue-800';
      case 'VENDOR':
        return 'bg-green-100 text-green-800';
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800';
      case 'DELIVERY_PERSON':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  isMessageFromCurrentUser(message: OrderChatMessage, currentUserId: number): boolean {
    return message.senderId === currentUserId;
  }

  groupMessagesByDate(messages: OrderChatMessage[]): { date: string; messages: OrderChatMessage[] }[] {
    const groups: { [key: string]: OrderChatMessage[] } = {};
    
    messages.forEach(message => {
      const date = new Date(message.sentAt).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });

    return Object.entries(groups)
      .map(([date, messages]) => ({
        date: this.formatDateGroupHeader(date),
        messages: messages.sort((a, b) => 
          new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
        )
      }))
      .sort((a, b) => 
        new Date(a.messages[0].sentAt).getTime() - new Date(b.messages[0].sentAt).getTime()
      );
  }

  /**
   * Format date for group headers
   */
  private formatDateGroupHeader(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  }

  validateMessage(message: string): string[] {
    const errors: string[] = [];

    if (!message?.trim()) {
      errors.push('Message cannot be empty');
    }

    if (message && message.trim().length > 1000) {
      errors.push('Message cannot exceed 1000 characters');
    }

    return errors;
  }

  sortMessagesBySentTime(messages: OrderChatMessage[]): OrderChatMessage[] {
    return [...messages].sort((a, b) => 
      new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
    );
  }

  getLatestMessage(messages: OrderChatMessage[]): OrderChatMessage | null {
    if (!messages || messages.length === 0) {
      return null;
    }
    
    return messages.reduce((latest, current) => 
      new Date(current.sentAt).getTime() > new Date(latest.sentAt).getTime() 
        ? current 
        : latest
    );
  }

  countUnreadMessages(messages: OrderChatMessage[], currentUserId: number): number {
    return messages.filter(message => 
      message.senderId !== currentUserId && !message.isRead
    ).length;
  }

  hasUnreadMessages(messages: OrderChatMessage[], currentUserId: number): boolean {
    return this.countUnreadMessages(messages, currentUserId) > 0;
  }

  getMessagePreview(message: string, maxLength: number = 50): string {
    if (!message) return '';
    
    if (message.length <= maxLength) {
      return message;
    }
    
    return message.substring(0, maxLength).trim() + '...';
  }

  formatMessageContent(message: string): string {
    if (!message) return '';
    
    // Replace line breaks with HTML breaks for display
    return message.replace(/\n/g, '<br>');
  }

  canUserSendMessage(userRole: string): boolean {
    // Only customers and vendors can send messages in order chats
    return ['CUSTOMER', 'VENDOR'].includes(userRole);
  }
}

export const orderChatService = new OrderChatService();
export default orderChatService;