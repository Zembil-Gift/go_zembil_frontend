import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MessageSquare, Send, Loader2, Image as ImageIcon, X, ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

import { orderChatService } from '@/services/orderChatService';
import { imageService } from '@/services/imageService';
import type { OrderChatMessage } from '@/types/customOrders';

interface OrderChatProps {
  orderId: number;
  title?: string;
  description?: string;
  height?: string;
  pollInterval?: number;
  onUnreadCountChange?: (count: number) => void;
}

/**
 * Reusable chat component for custom order communication
 * between vendors and customers.
 * 
 * Features:
 * - Message list with sender info and timestamps
 * - Message input with send button
 * - Auto-scroll to latest message
 * - Unread message indicator
 * - Mark as read on view
 */
export default function OrderChat({
  orderId,
  title = 'Chat',
  description,
  height = '400px',
  pollInterval = 10000,
  onUnreadCountChange,
}: OrderChatProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  
  const [chatMessage, setChatMessage] = useState('');
  const [pendingImage, setPendingImage] = useState<{ file: File; preview: string } | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch chat messages
  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['custom-order-chat', orderId],
    queryFn: () => orderChatService.getMessages(orderId, 0, 100),
    enabled: isAuthenticated && orderId > 0,
    refetchInterval: pollInterval,
  });

  // Fetch unread count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['custom-order-chat-unread', orderId],
    queryFn: () => orderChatService.getUnreadCount(orderId),
    enabled: isAuthenticated && orderId > 0 && !isVisible,
    refetchInterval: pollInterval,
  });

  const messages = messagesData?.content || [];

  // Notify parent of unread count changes
  useEffect(() => {
    if (onUnreadCountChange) {
      onUnreadCountChange(unreadCount);
    }
  }, [unreadCount, onUnreadCountChange]);

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (isVisible) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isVisible]);

  // Mark messages as read when component becomes visible
  useEffect(() => {
    if (isVisible && orderId > 0) {
      orderChatService.markAsRead(orderId)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['custom-order-chat-unread', orderId] });
        })
        .catch(console.error);
    }
  }, [isVisible, orderId, queryClient]);

  // Intersection observer to detect visibility
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, imageUrl }: { message: string; imageUrl?: string }) => {
      return orderChatService.sendMessage(orderId, message, imageUrl);
    },
    onSuccess: () => {
      setChatMessage('');
      setPendingImage(null);
      queryClient.invalidateQueries({ queryKey: ['custom-order-chat', orderId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({ title: 'Invalid File', description: 'Please select an image file', variant: 'destructive' });
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: 'File Too Large', description: 'Image must be less than 5MB', variant: 'destructive' });
        return;
      }
      setPendingImage({ file, preview: URL.createObjectURL(file) });
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearPendingImage = () => {
    if (pendingImage?.preview) {
      URL.revokeObjectURL(pendingImage.preview);
    }
    setPendingImage(null);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = chatMessage.trim();
    
    // Validate that we have at least a message or an image
    if (!trimmedMessage && !pendingImage) {
      toast({ title: 'Empty Message', description: 'Please enter a message or attach an image', variant: 'destructive' });
      return;
    }
    
    // Validate message if present
    if (trimmedMessage) {
      const errors = orderChatService.validateMessage(trimmedMessage);
      if (errors.length > 0) {
        toast({ title: 'Invalid Message', description: errors[0], variant: 'destructive' });
        return;
      }
    }

    let imageUrl: string | undefined;

    // Upload image if present
    if (pendingImage) {
      setIsUploadingImage(true);
      try {
        const uploadResponse = await imageService.uploadCustomOrderFile(pendingImage.file);
        imageUrl = uploadResponse.fileUrl;
      } catch (error: any) {
        setIsUploadingImage(false);
        toast({ title: 'Upload Failed', description: error.message || 'Failed to upload image', variant: 'destructive' });
        return;
      }
      setIsUploadingImage(false);
    }
    
    sendMessageMutation.mutate({ message: trimmedMessage, imageUrl });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // Get current user ID (handle both string and number types)
  const currentUserId = user?.id ? (typeof user.id === 'string' ? parseInt(user.id) : user.id) : 0;

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500">
        <p>Please sign in to view chat messages.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col" style={{ height }}>
      {/* Header */}
      {(title || description || unreadCount > 0) && (
        <div className="pb-3 border-b mb-3">
          <div className="flex items-center justify-between">
            <div>
              {title && (
                <h3 className="text-lg font-semibold text-eagle-green flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  {title}
                  {!isVisible && unreadCount > 0 && (
                    <Badge className="bg-red-500 text-white text-xs ml-2">
                      {unreadCount} new
                    </Badge>
                  )}
                </h3>
              )}
              {description && (
                <p className="text-sm text-eagle-green/60 mt-1">{description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <ScrollArea className="flex-1 pr-4">
        <div className="space-y-4">
          {messagesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-eagle-green" />
            </div>
          ) : messages.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {orderChatService.sortMessagesBySentTime(messages).map((msg: OrderChatMessage) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  isOwnMessage={msg.senderId === currentUserId}
                />
              ))}
              <div ref={chatEndRef} />
            </>
          )}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="mt-4 space-y-2">
        {/* Image Preview */}
        {pendingImage && (
          <div className="relative inline-block">
            <img 
              src={pendingImage.preview} 
              alt="Pending upload" 
              className="h-20 w-20 object-cover rounded-lg border-2 border-eagle-green/20"
            />
            <button
              type="button"
              onClick={clearPendingImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        
        <form onSubmit={handleSendMessage} className="flex gap-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          
          {/* Image upload button */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={sendMessageMutation.isPending || isUploadingImage}
            className="shrink-0"
            title="Attach image"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          
          <Input
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="flex-1"
            disabled={sendMessageMutation.isPending || isUploadingImage}
            maxLength={1000}
          />
          <Button
            type="submit"
            disabled={(!chatMessage.trim() && !pendingImage) || sendMessageMutation.isPending || isUploadingImage}
            className="bg-eagle-green hover:bg-viridian-green text-white"
          >
            {sendMessageMutation.isPending || isUploadingImage ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <Send className="h-4 w-4 text-white" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

// Empty state component
function EmptyState() {
  return (
    <div className="text-center py-8 text-eagle-green/60">
      <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
      <p>No messages yet. Start the conversation!</p>
    </div>
  );
}

// Individual chat message component
interface ChatMessageProps {
  message: OrderChatMessage;
  isOwnMessage: boolean;
}

function ChatMessage({ message, isOwnMessage }: ChatMessageProps) {
  // Use fullImageUrl if available, fallback to imageUrl
  const imageUrl = message.fullImageUrl || message.imageUrl;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[80%] rounded-lg p-3 ${
          isOwnMessage
            ? 'bg-eagle-green text-white'
            : 'bg-gray-100 text-eagle-green'
        }`}
      >
        {/* Message Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium opacity-80">
            {isOwnMessage ? 'You' : message.senderName}
          </span>
          {!isOwnMessage && (
            <Badge
              className={`text-[10px] px-1.5 py-0 ${orderChatService.getSenderRoleBadgeColor(
                message.senderRole
              )}`}
            >
              {orderChatService.getSenderRoleDisplayName(message.senderRole)}
            </Badge>
          )}
          <span className="text-xs opacity-60">
            {orderChatService.formatMessageTime(message.sentAt)}
          </span>
          {!isOwnMessage && !message.isRead && (
            <span className="w-2 h-2 rounded-full bg-blue-500" title="Unread" />
          )}
        </div>
        
        {/* Image Content */}
        {imageUrl && (
          <div className="mb-2">
            <a 
              href={imageUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block relative group"
            >
              <img 
                src={imageUrl} 
                alt="Chat image"
                className="max-w-full max-h-48 rounded-lg object-cover"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                <ExternalLink className="h-6 w-6 text-white" />
              </div>
            </a>
          </div>
        )}
        
        {/* Message Content */}
        {message.message && (
          <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
        )}
      </div>
    </motion.div>
  );
}

// Export named components for flexibility
export { OrderChat, ChatMessage, EmptyState };
