import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  DollarSign,
  MessageSquare,
  Store,
  CreditCard,
  Send,
  Image as ImageIcon,
  FileText,
  Hash,
  Video,
  ExternalLink,
  Loader2,
  Clock,
  Package,
  Truck,
  Paperclip,
  X
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/protected-route';

import { customOrderService } from '@/services/customOrderService';
import { orderChatService } from '@/services/orderChatService';
import type { OrderChatMessage, CustomOrderValue, CustomOrderStatus } from '@/types/customOrders';


// Status timeline configuration
const STATUS_TIMELINE: { status: CustomOrderStatus; label: string; icon: React.ElementType }[] = [
  { status: 'SUBMITTED', label: 'Submitted', icon: Clock },
  { status: 'PRICE_PROPOSED', label: 'Price Proposed', icon: DollarSign },
  { status: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle },
  { status: 'PAID', label: 'Paid', icon: CreditCard },
  { status: 'IN_PROGRESS', label: 'In Progress', icon: Package },
  { status: 'COMPLETED', label: 'Completed', icon: CheckCircle },
  { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: Truck },
  { status: 'DELIVERED', label: 'Delivered', icon: CheckCircle },
];

function CustomerCustomOrderDetailContent() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  
  const [activeTab, setActiveTab] = useState('details');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const orderIdNum = orderId ? parseInt(orderId) : 0;

  // Helper to get the order currency (backend sends currencyCode)
  const getOrderCurrency = (order: any): string => {
    return order?.currencyCode || order?.currency || 'USD';
  };

  // Fetch order details
  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ['custom-order', orderIdNum],
    queryFn: () => customOrderService.getById(orderIdNum),
    enabled: isAuthenticated && orderIdNum > 0,
  });

  // Fetch chat messages
  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['custom-order-chat', orderIdNum],
    queryFn: () => orderChatService.getMessages(orderIdNum, 0, 100),
    enabled: isAuthenticated && orderIdNum > 0,
    refetchInterval: 10000,
  });

  const messages = messagesData?.content || [];

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  // Mark messages as read when viewing chat
  useEffect(() => {
    if (activeTab === 'chat' && orderIdNum > 0) {
      orderChatService.markAsRead(orderIdNum).catch(console.error);
    }
  }, [activeTab, orderIdNum]);

  // Mutations
  const acceptPriceMutation = useMutation({
    mutationFn: () => customOrderService.acceptPrice(orderIdNum),
    onSuccess: () => {
      toast({ title: 'Price Accepted', description: 'You can now proceed to payment.' });
      queryClient.invalidateQueries({ queryKey: ['custom-order', orderIdNum] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const rejectPriceMutation = useMutation({
    mutationFn: () => customOrderService.rejectPrice(orderIdNum),
    onSuccess: () => {
      toast({ title: 'Price Rejected', description: 'The vendor will be notified to propose a new price.' });
      queryClient.invalidateQueries({ queryKey: ['custom-order', orderIdNum] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => customOrderService.cancel(orderIdNum, reason),
    onSuccess: () => {
      toast({ title: 'Order Cancelled', description: 'Your order has been cancelled.' });
      queryClient.invalidateQueries({ queryKey: ['custom-order', orderIdNum] });
      setCancelDialogOpen(false);
      setCancelReason('');
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, imageFile }: { message: string; imageFile: File | null }) => {
      if (imageFile) {
        return orderChatService.sendMessageWithFile(orderIdNum, message, imageFile);
      } else {
        return orderChatService.sendMessage(orderIdNum, message);
      }
    },
    onSuccess: () => {
      setChatMessage('');
      setSelectedImage(null);
      setImagePreview(null);
      queryClient.invalidateQueries({ queryKey: ['custom-order-chat', orderIdNum] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatMessage.trim() || selectedImage) {
      sendMessageMutation.mutate({ 
        message: chatMessage.trim(), 
        imageFile: selectedImage 
      });
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({ title: 'Error', description: 'Please select an image file', variant: 'destructive' });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: 'Error', description: 'Image must be less than 5MB', variant: 'destructive' });
        return;
      }
      
      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePayment = async (provider: string) => {
    setIsProcessingPayment(true);
    try {
      const paymentInit = await customOrderService.initPayment(orderIdNum, provider);
      
      // Redirect based on payment provider response
      if (paymentInit.checkoutUrl) {
        // Chapa or Stripe Checkout - redirect to their hosted page
        // Don't set isProcessingPayment to false as we're navigating away
        window.location.href = paymentInit.checkoutUrl;
        // Component will unmount during redirect, so don't update state after this
        return;
      } else if (provider.toLowerCase() === 'stripe' && paymentInit.clientSecret) {
        // Stripe Payment Intent - navigate to stripe payment page
        navigate(`/payment/stripe?orderId=${orderIdNum}&orderType=custom`, {
          state: {
            clientSecret: paymentInit.clientSecret,
            publishableKey: paymentInit.publishableKey,
            amount: order?.finalPriceMinor || order?.basePriceMinor || 0,
            currency: getOrderCurrency(order).toLowerCase(),
            orderId: orderIdNum,
            orderNumber: order?.orderNumber,
            returnUrl: `${window.location.origin}/my-custom-orders`,
          },
        });
        // Component will likely unmount during navigation, so return early
        return;
      } else {
        // Fallback - show error
        throw new Error('Payment initialization failed. No checkout URL or client secret returned.');
      }
    } catch (error: any) {
      setIsProcessingPayment(false);
      toast({ 
        title: 'Payment Error', 
        description: error.message || 'Failed to initialize payment', 
        variant: 'destructive' 
      });
    }
  };

  const getFieldIcon = (fieldType: string) => {
    switch (fieldType) {
      case 'TEXT':
        return <FileText className="h-4 w-4" />;
      case 'NUMBER':
        return <Hash className="h-4 w-4" />;
      case 'IMAGE':
        return <ImageIcon className="h-4 w-4" />;
      case 'VIDEO':
        return <Video className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const renderFieldValue = (value: CustomOrderValue) => {
    // Use fullFileUrl if available, fallback to fileUrl
    const imageUrl = value.fullFileUrl || value.fileUrl;
    
    switch (value.fieldType) {
      case 'TEXT':
        return <p className="text-eagle-green">{value.textValue || '-'}</p>;
      case 'NUMBER':
        return <p className="text-eagle-green">{value.numberValue ?? '-'}</p>;
      case 'IMAGE':
        return imageUrl ? (
          <a 
            href={imageUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-600 hover:underline"
          >
            <img 
              src={imageUrl} 
              alt={value.fieldName}
              className="w-20 h-20 object-cover rounded-lg"
            />
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : <p className="text-eagle-green/60">No image provided</p>;
      case 'VIDEO':
        return imageUrl ? (
          <a 
            href={imageUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-600 hover:underline"
          >
            <Video className="h-5 w-5" />
            <span>{value.originalFilename || 'View Video'}</span>
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : <p className="text-eagle-green/60">No video provided</p>;
      default:
        return <p className="text-eagle-green/60">-</p>;
    }
  };

  // Get current status index for timeline
  const getCurrentStatusIndex = (status: CustomOrderStatus): number => {
    if (status === 'CANCELLED') return -1;
    return STATUS_TIMELINE.findIndex(s => s.status === status);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-eagle-green mb-2">Sign In Required</h2>
          <p className="font-light text-eagle-green/70 mb-4">Please sign in to view your order.</p>
          <Button onClick={() => navigate('/signin')} className="bg-eagle-green hover:bg-viridian-green text-white">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (orderLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-eagle-green" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-eagle-green mb-2">Order Not Found</h2>
          <p className="font-light text-eagle-green/70 mb-4">The order you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/my-custom-orders')} className="bg-eagle-green hover:bg-viridian-green text-white">
            Back to My Orders
          </Button>
        </div>
      </div>
    );
  }

  const canRespondToPrice = customOrderService.canCustomerRespondToPrice(order.status);
  const canPay = customOrderService.canCustomerPay(order.status);
  const canCancel = customOrderService.canCustomerCancel(order.status);
  const statusBadgeColor = customOrderService.getStatusBadgeColor(order.status);
  const statusText = customOrderService.getStatusText(order.status);
  const currentStatusIndex = getCurrentStatusIndex(order.status);


  return (
    <div className="min-h-screen bg-gradient-to-b from-light-cream to-white">
      {/* Header */}
      <div className="bg-eagle-green text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" asChild className="text-white hover:bg-white/10">
                <Link to="/my-custom-orders">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-xl font-bold">Order #{order.orderNumber}</h1>
                <p className="text-emerald-100 text-sm">{order.templateName}</p>
              </div>
            </div>
            <Badge className={`${statusBadgeColor} border-none text-sm`}>
              {statusText}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Status Timeline */}
        {order.status !== 'CANCELLED' && (
          <Card className="mb-6">
            <CardContent className="p-4 sm:p-6">
              {/* Mobile: Vertical Layout */}
              <div className="sm:hidden space-y-3">
                {STATUS_TIMELINE.map((step, index) => {
                  const isCompleted = index <= currentStatusIndex;
                  const isCurrent = index === currentStatusIndex;
                  const Icon = step.icon;
                  
                  return (
                    <div key={step.status} className="flex items-center gap-3">
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                        ${isCompleted 
                          ? 'bg-eagle-green text-white' 
                          : 'bg-gray-200 text-gray-400'}
                        ${isCurrent ? 'ring-4 ring-june-bud/30' : ''}
                      `}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <span className={`
                          text-sm font-medium
                          ${isCompleted ? 'text-eagle-green' : 'text-gray-400'}
                        `}>
                          {step.label}
                        </span>
                      </div>
                      {isCompleted && (
                        <CheckCircle className="h-5 w-5 text-eagle-green flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop: Horizontal Layout */}
              <div className="hidden sm:flex items-start relative">
                {STATUS_TIMELINE.map((step, index) => {
                  const isCompleted = index <= currentStatusIndex;
                  const isCurrent = index === currentStatusIndex;
                  const Icon = step.icon;
                  
                  return (
                    <div key={step.status} className="flex flex-col items-center flex-1">
                      <div className="relative w-full flex justify-center">
                        <div className={`
                          w-10 h-10 rounded-full flex items-center justify-center z-10
                          ${isCompleted 
                            ? 'bg-eagle-green text-white' 
                            : 'bg-gray-200 text-gray-400'}
                          ${isCurrent ? 'ring-4 ring-june-bud/30' : ''}
                        `}>
                          <Icon className="h-5 w-5" />
                        </div>
                        {index < STATUS_TIMELINE.length - 1 && (
                          <div className={`
                            absolute left-1/2 top-5 w-full h-1 rounded
                            ${index < currentStatusIndex ? 'bg-eagle-green' : 'bg-gray-200'}
                          `} />
                        )}
                      </div>
                      <span className={`
                        text-xs mt-2 text-center
                        ${isCompleted ? 'text-eagle-green font-medium' : 'text-gray-400'}
                      `}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cancelled Status Banner */}
        {order.status === 'CANCELLED' && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <XCircle className="h-10 w-10 text-red-500" />
                <div>
                  <h3 className="font-semibold text-red-800">Order Cancelled</h3>
                  <p className="text-red-600 text-sm">This order has been cancelled.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="bg-june-bud/10 p-1">
                <TabsTrigger 
                  value="details"
                  className="font-bold data-[state=active]:bg-eagle-green data-[state=active]:text-white"
                >
                  Order Details
                </TabsTrigger>
                <TabsTrigger 
                  value="chat"
                  className="font-bold data-[state=active]:bg-eagle-green data-[state=active]:text-white"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Chat with Vendor
                </TabsTrigger>
                <TabsTrigger 
                  value="history"
                  className="font-bold data-[state=active]:bg-eagle-green data-[state=active]:text-white"
                >
                  History
                </TabsTrigger>
              </TabsList>

              {/* Details Tab */}
              <TabsContent value="details" className="space-y-6">
                {/* Your Customizations */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-eagle-green">Your Customizations</CardTitle>
                    <CardDescription>The values you provided for this order</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {order.values && order.values.length > 0 ? (
                      order.values.map((value) => (
                        <div key={value.id} className="border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            {getFieldIcon(value.fieldType)}
                            <span className="font-medium text-eagle-green">{value.fieldName}</span>
                            <Badge variant="outline" className="text-xs">
                              {value.fieldType}
                            </Badge>
                          </div>
                          {renderFieldValue(value)}
                        </div>
                      ))
                    ) : (
                      <p className="text-eagle-green/60 text-center py-4">No customization values</p>
                    )}
                  </CardContent>
                </Card>

                {/* Additional Description */}
                {order.additionalDescription && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-eagle-green">Additional Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-eagle-green/80 whitespace-pre-wrap">{order.additionalDescription}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Chat Tab */}
              <TabsContent value="chat" className="space-y-4">
                <Card className="h-[500px] flex flex-col">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-eagle-green text-lg">Chat with Vendor</CardTitle>
                    <CardDescription>Communicate with {order.vendorName}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col overflow-hidden">
                    <ScrollArea className="flex-1 pr-4">
                      <div className="space-y-4">
                        {messagesLoading ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-eagle-green" />
                          </div>
                        ) : messages.length === 0 ? (
                          <div className="text-center py-8 text-eagle-green/60">
                            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No messages yet. Start the conversation!</p>
                          </div>
                        ) : (
                          orderChatService.sortMessagesBySentTime(messages).map((msg: OrderChatMessage) => {
                            const isOwnMessage = msg.senderId === user?.id;
                            return (
                              <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                              >
                                <div className={`max-w-[80%] rounded-lg p-3 ${
                                  isOwnMessage 
                                    ? 'bg-eagle-green text-white' 
                                    : 'bg-gray-100 text-eagle-green'
                                }`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium opacity-80">
                                      {isOwnMessage ? 'You' : msg.senderName}
                                    </span>
                                    <span className="text-xs opacity-60">
                                      {orderChatService.formatMessageTime(msg.sentAt)}
                                    </span>
                                  </div>
                                  {(msg.fullImageUrl || msg.imageUrl) && (
                                    <div className="mb-2">
                                      <img 
                                        src={msg.fullImageUrl || msg.imageUrl} 
                                        alt="Chat image" 
                                        className="rounded-lg max-w-full max-h-64 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() => window.open(msg.fullImageUrl || msg.imageUrl, '_blank')}
                                      />
                                    </div>
                                  )}
                                  {msg.message && (
                                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                  )}
                                </div>
                              </motion.div>
                            );
                          })
                        )}
                        <div ref={chatEndRef} />
                      </div>
                    </ScrollArea>
                    
                    <form onSubmit={handleSendMessage} className="mt-4 space-y-2">
                      {/* Image Preview */}
                      {imagePreview && (
                        <div className="relative inline-block">
                          <img 
                            src={imagePreview} 
                            alt="Preview" 
                            className="h-20 w-20 object-cover rounded-lg border-2 border-eagle-green/20"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                      
                      {/* Message Input */}
                      <div className="flex gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={sendMessageMutation.isPending}
                          className="flex-shrink-0"
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                        <Input
                          value={chatMessage}
                          onChange={(e) => setChatMessage(e.target.value)}
                          placeholder="Type your message..."
                          className="flex-1"
                          disabled={sendMessageMutation.isPending}
                        />
                        <Button 
                          type="submit" 
                          disabled={(!chatMessage.trim() && !selectedImage) || sendMessageMutation.isPending}
                          className="bg-eagle-green hover:bg-viridian-green text-white flex-shrink-0"
                        >
                          {sendMessageMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin text-white" />
                          ) : (
                            <Send className="h-4 w-4 text-white" />
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="space-y-6">
                {/* Status History */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-eagle-green">Status History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {order.statusHistory && order.statusHistory.length > 0 ? (
                      <div className="space-y-4">
                        {customOrderService.sortStatusHistoryByDate(order.statusHistory).map((history) => (
                          <div key={history.id} className="flex items-start gap-4">
                            <div className="w-2 h-2 mt-2 rounded-full bg-eagle-green" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Badge className={customOrderService.getStatusBadgeColor(history.status)}>
                                  {customOrderService.getStatusText(history.status)}
                                </Badge>
                                <span className="text-xs text-eagle-green/60">
                                  {new Date(history.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm text-eagle-green/70 mt-1">
                                Changed by {history.changedBy}
                              </p>
                              {history.reason && (
                                <p className="text-sm text-eagle-green/60 mt-1 italic">
                                  Reason: {history.reason}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-eagle-green/60 text-center py-4">No status history</p>
                    )}
                  </CardContent>
                </Card>

                {/* Price History */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-eagle-green">Price History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {order.priceHistory && order.priceHistory.length > 0 ? (
                      <div className="space-y-4">
                        {customOrderService.sortPriceHistoryByDate(order.priceHistory).map((history) => (
                          <div key={history.id} className="flex items-start gap-4">
                            <div className="w-2 h-2 mt-2 rounded-full bg-yellow-500" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-eagle-green">
                                  {customOrderService.formatPrice(history.priceMinor, getOrderCurrency(order))}
                                </span>
                                <span className="text-xs text-eagle-green/60">
                                  {new Date(history.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm text-eagle-green/70 mt-1">
                                Set by {history.setBy}
                              </p>
                              {history.reason && (
                                <p className="text-sm text-eagle-green/60 mt-1 italic">
                                  {history.reason}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-eagle-green/60 text-center py-4">No price changes</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>


          {/* Sidebar */}
          <div className="space-y-6">
            {/* Vendor Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-eagle-green text-lg">Vendor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-eagle-green/50" />
                  <span className="text-eagle-green font-medium">{order.vendorName}</span>
                </div>
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle className="text-eagle-green text-lg">Pricing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-eagle-green/70">Base Price</span>
                  <span className="text-eagle-green">
                    {customOrderService.formatPrice(order.basePriceMinor, order.basePrice, getOrderCurrency(order))}
                  </span>
                </div>
                {order.finalPriceMinor && (
                  <div className="flex justify-between">
                    <span className="text-eagle-green/70">Final Price</span>
                    <span className="font-bold text-eagle-green">
                      {customOrderService.formatPrice(order.finalPriceMinor, order.finalPrice, getOrderCurrency(order))}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between">
                  <span className="font-medium text-eagle-green">Total</span>
                  <span className="font-bold text-eagle-green text-lg">
                    {customOrderService.formatPrice(
                      order.finalPriceMinor || order.basePriceMinor,
                      order.finalPrice || order.basePrice,
                      getOrderCurrency(order)
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-eagle-green/70">Payment:</span>
                  <Badge className={order.paymentStatus === 'PAID' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                  }>
                    {order.paymentStatus}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Price Response Actions */}
            {canRespondToPrice && (
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader>
                  <CardTitle className="text-amber-800 text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Price Proposal
                  </CardTitle>
                  <CardDescription className="text-amber-700">
                    The vendor has proposed a final price
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-2">
                    <p className="text-sm text-amber-700">Proposed Price</p>
                    <p className="text-3xl font-bold text-amber-900">
                      {customOrderService.formatPrice(order.finalPriceMinor || 0, order.finalPrice, getOrderCurrency(order))}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => acceptPriceMutation.mutate()}
                      disabled={acceptPriceMutation.isPending || rejectPriceMutation.isPending}
                    >
                      {acceptPriceMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Accept
                    </Button>
                    <Button 
                      variant="outline"
                      className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => rejectPriceMutation.mutate()}
                      disabled={acceptPriceMutation.isPending || rejectPriceMutation.isPending}
                    >
                      {rejectPriceMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      Reject
                    </Button>
                  </div>
                  <p className="text-xs text-amber-600 text-center">
                    Rejecting will allow continued negotiation via chat
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Payment Actions */}
            {canPay && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-green-800 text-lg flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Ready for Payment
                  </CardTitle>
                  <CardDescription className="text-green-700">
                    Complete your payment to proceed
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-center py-2">
                    <p className="text-sm text-green-700">Amount Due</p>
                    <p className="text-3xl font-bold text-green-900">
                      {customOrderService.formatPrice(order.finalPriceMinor || order.basePriceMinor, order.finalPrice || order.basePrice, getOrderCurrency(order))}
                    </p>
                  </div>
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handlePayment('chapa')}
                    disabled={isProcessingPayment}
                  >
                    {isProcessingPayment ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CreditCard className="h-4 w-4 mr-2" />
                    )}
                    Pay with Chapa
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full"
                    onClick={() => handlePayment('stripe')}
                    disabled={isProcessingPayment}
                  >
                    {isProcessingPayment ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Pay with Stripe
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Cancel Action */}
            {canCancel && (
              <Card>
                <CardContent className="pt-6">
                  <Button 
                    variant="outline"
                    className="w-full border-red-300 text-red-600 hover:bg-red-50"
                    onClick={() => setCancelDialogOpen(true)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Order
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Order Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-eagle-green text-lg">Order Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-eagle-green/70">Order Number</span>
                  <span className="text-eagle-green font-mono">{order.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-eagle-green/70">Created</span>
                  <span className="text-eagle-green">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-eagle-green/70">Template</span>
                  <span className="text-eagle-green">{order.templateName}</span>
                </div>
                {order.deliveredAt && (
                  <div className="flex justify-between">
                    <span className="text-eagle-green/70">Delivered</span>
                    <span className="text-eagle-green">
                      {new Date(order.deliveredAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this order? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Please provide a reason for cancellation (optional)..."
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Order</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelMutation.mutate(cancelReason)}
              disabled={cancelMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Cancel Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function CustomerCustomOrderDetail() {
  return (
    <ProtectedRoute>
      <CustomerCustomOrderDetailContent />
    </ProtectedRoute>
  );
}
