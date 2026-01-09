import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  DollarSign,
  MessageSquare,
  User,
  Mail,
  Play,
  Send,
  Image as ImageIcon,
  FileText,
  Hash,
  Video,
  ExternalLink,
  Loader2,
  Paperclip,
  X,
  Clock,
  CreditCard,
  Package,
  Truck
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

import { customOrderService } from '@/services/customOrderService';
import { orderChatService } from '@/services/orderChatService';
import { vendorService, VendorProfile } from '@/services/vendorService';
import type { OrderChatMessage, CustomOrderValue, CustomOrderStatus } from '@/types/customOrders';

// Status timeline configuration
const STATUS_TIMELINE: { status: CustomOrderStatus; label: string; icon: React.ElementType }[] = [
  { status: 'SUBMITTED', label: 'Submitted', icon: Clock },
  { status: 'PRICE_PROPOSED', label: 'Price Proposed', icon: DollarSign },
  { status: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle },
  { status: 'PAID', label: 'Paid', icon: CreditCard },
  { status: 'IN_PROGRESS', label: 'In Progress', icon: Play },
  { status: 'COMPLETED', label: 'Completed', icon: CheckCircle },
  { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: Truck },
  { status: 'DELIVERED', label: 'Delivered', icon: CheckCircle },
];

// Helper to determine if vendor is Ethiopian
const isEthiopianVendor = (vendorProfile: VendorProfile | undefined): boolean => {
  if (!vendorProfile) return false;
  return vendorProfile.countryCode === 'ET';
};

// Helper to get vendor's preferred currency
const getVendorCurrency = (vendorProfile: VendorProfile | undefined): string => {
  return isEthiopianVendor(vendorProfile) ? 'ETB' : 'USD';
};

export default function VendorCustomOrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'details');
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [proposedPrice, setProposedPrice] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to get the order currency (backend sends currencyCode)
  const getOrderCurrency = (order: any): string => {
    return order?.currencyCode || order?.currency || 'USD';
  };
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isVendor = user?.role?.toUpperCase() === 'VENDOR';
  const orderIdNum = orderId ? parseInt(orderId) : 0;

  // Handle URL action params
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'propose-price') {
      setPriceDialogOpen(true);
    }
  }, [searchParams]);

  // Fetch vendor profile to get preferred currency
  const { data: vendorProfile } = useQuery({
    queryKey: ['vendor', 'profile'],
    queryFn: () => vendorService.getMyProfile(),
    enabled: isAuthenticated && isVendor,
  });

  const vendorCurrency = getVendorCurrency(vendorProfile);

  // Fetch order details using vendor-specific endpoint
  // The backend will automatically return prices in vendor's preferred currency
  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ['custom-order', 'vendor', orderIdNum],
    queryFn: () => customOrderService.getByIdForVendor(orderIdNum),
    enabled: isAuthenticated && isVendor && orderIdNum > 0,
  });

  // Fetch chat messages
  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['custom-order-chat', orderIdNum],
    queryFn: () => orderChatService.getMessages(orderIdNum, 0, 100),
    enabled: isAuthenticated && isVendor && orderIdNum > 0,
    refetchInterval: 10000, // Poll every 10 seconds
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
  const proposePriceMutation = useMutation({
    mutationFn: ({ price, currency }: { price: number; currency: string }) => 
      customOrderService.proposePrice(orderIdNum, price, currency),
    onSuccess: () => {
      toast({ title: 'Price Proposed', description: 'Your price proposal has been sent to the customer.' });
      queryClient.invalidateQueries({ queryKey: ['custom-order', orderIdNum] });
      setPriceDialogOpen(false);
      setProposedPrice('');
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const markInProgressMutation = useMutation({
    mutationFn: () => customOrderService.markInProgress(orderIdNum),
    onSuccess: () => {
      toast({ title: 'Status Updated', description: 'Order marked as in progress.' });
      queryClient.invalidateQueries({ queryKey: ['custom-order', orderIdNum] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const markCompletedMutation = useMutation({
    mutationFn: () => customOrderService.markCompleted(orderIdNum),
    onSuccess: () => {
      toast({ title: 'Order Completed', description: 'Order has been marked as completed.' });
      queryClient.invalidateQueries({ queryKey: ['custom-order', orderIdNum] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => customOrderService.cancel(orderIdNum, reason),
    onSuccess: () => {
      toast({ title: 'Order Cancelled', description: 'The order has been cancelled.' });
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

  const handleProposePrice = () => {
    const price = parseFloat(proposedPrice);
    if (price > 0) {
      // Validate: warn if proposed price is more than 10x the base price
      const basePrice = order.basePrice || (order.basePriceMinor / 100);
      if (price > basePrice * 10) {
        const confirmed = window.confirm(
          `Warning: The proposed price (${customOrderService.formatPrice(0, price, vendorCurrency)}) is significantly higher than the base price (${customOrderService.formatPrice(order.basePriceMinor, basePrice, vendorCurrency)}).\n\nAre you sure you want to proceed?`
        );
        if (!confirmed) return;
      }
      // Send price in vendor's currency - backend converts to default currency for storage
      proposePriceMutation.mutate({ price, currency: vendorCurrency });
    }
  };

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

  if (!isAuthenticated || !isVendor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertCircle className="h-16 w-16 text-amber-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-4">You need to be a vendor to access this page.</p>
        <Button asChild>
          <Link to="/vendor-signup">Become a Vendor</Link>
        </Button>
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
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h1>
        <p className="text-gray-600 mb-4">The order you're looking for doesn't exist.</p>
        <Button asChild>
          <Link to="/vendor/custom-orders">Back to Orders</Link>
        </Button>
      </div>
    );
  }

  const canProposePrice = customOrderService.canVendorProposePrice(order.status);
  const canMarkInProgress = customOrderService.canVendorMarkInProgress(order.status);
  const canMarkCompleted = customOrderService.canVendorMarkCompleted(order.status);
  const canCancel = customOrderService.canVendorCancel(order.status);
  const statusBadgeColor = customOrderService.getStatusBadgeColor(order.status);
  const statusText = customOrderService.getStatusText(order.status);

  // Get current status index for timeline
  const currentStatusIndex = STATUS_TIMELINE.findIndex(s => s.status === order.status);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-eagle-green text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" asChild className="text-white hover:bg-white/10">
                <Link to="/vendor/custom-orders">
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

      <div className="container mx-auto px-4 py-6">
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
                  <h3 className="text-lg font-bold text-red-700">Order Cancelled</h3>
                  <p className="text-red-600 text-sm mt-1">This order has been cancelled</p>
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
                  Chat
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
                {/* Customization Values */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-eagle-green">Customer's Customizations</CardTitle>
                    <CardDescription>Values provided by the customer for this order</CardDescription>
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
                    <CardTitle className="text-eagle-green text-lg">Chat with Customer</CardTitle>
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
                                Changed by {history.changedBy} ({history.changedByRole})
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
                                  {customOrderService.formatPrice(history.priceMinor, history.price, history.currencyCode || vendorCurrency)}
                                </span>
                                <span className="text-xs text-eagle-green/60">
                                  {new Date(history.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm text-eagle-green/70 mt-1">
                                Set by {history.setByName || 'System'} ({history.setByRole || 'SYSTEM'})
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
            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-eagle-green text-lg">Customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-eagle-green/50" />
                  <span className="text-eagle-green">{order.customerName}</span>
                </div>
                {order.customerEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-eagle-green/50" />
                    <a href={`mailto:${order.customerEmail}`} className="text-blue-600 hover:underline text-sm">
                      {order.customerEmail}
                    </a>
                  </div>
                )}
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
                    {customOrderService.formatPrice(
                      order.baseVendorPriceMinor || order.basePriceMinor, 
                      order.baseVendorPrice || order.basePrice, 
                      vendorCurrency
                    )}
                  </span>
                </div>
                {(order.finalVendorPriceMinor || order.finalPriceMinor) && (
                  <div className="flex justify-between">
                    <span className="text-eagle-green/70">Final Price</span>
                    <span className="font-bold text-eagle-green">
                      {customOrderService.formatPrice(
                        order.finalVendorPriceMinor || order.finalPriceMinor, 
                        order.finalVendorPrice || order.finalPrice, 
                        vendorCurrency
                      )}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between">
                  <span className="font-medium text-eagle-green">Total</span>
                  <span className="font-bold text-eagle-green text-lg">
                    {customOrderService.formatPrice(
                      order.finalVendorPriceMinor || order.baseVendorPriceMinor || order.finalPriceMinor || order.basePriceMinor,
                      order.finalVendorPrice || order.baseVendorPrice || order.finalPrice || order.basePrice,
                      vendorCurrency
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

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-eagle-green text-lg">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {canProposePrice && (
                  <Button 
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
                    onClick={() => setPriceDialogOpen(true)}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Propose Price
                  </Button>
                )}
                
                {canMarkInProgress && (
                  <Button 
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                    onClick={() => markInProgressMutation.mutate()}
                    disabled={markInProgressMutation.isPending}
                  >
                    {markInProgressMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Start Work
                  </Button>
                )}
                
                {canMarkCompleted && (
                  <Button 
                    className="w-full bg-teal-500 hover:bg-teal-600 text-white"
                    onClick={() => markCompletedMutation.mutate()}
                    disabled={markCompletedMutation.isPending}
                  >
                    {markCompletedMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Mark Completed
                  </Button>
                )}
                
                {canCancel && (
                  <Button 
                    variant="outline"
                    className="w-full border-red-300 text-red-600 hover:bg-red-50"
                    onClick={() => setCancelDialogOpen(true)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Order
                  </Button>
                )}
              </CardContent>
            </Card>

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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Price Proposal Dialog */}
      <Dialog open={priceDialogOpen} onOpenChange={setPriceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Propose Final Price</DialogTitle>
            <DialogDescription>
              Set the final price for this custom order based on the customer's requirements.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Base Price</Label>
              <p className="text-lg font-medium text-eagle-green">
                {customOrderService.formatPrice(
                  order.baseVendorPriceMinor || order.basePriceMinor, 
                  order.baseVendorPrice || order.basePrice, 
                  vendorCurrency
                )}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="proposedPrice">Proposed Final Price ({vendorCurrency})</Label>
              <Input
                id="proposedPrice"
                type="number"
                step="0.01"
                min="0"
                value={proposedPrice}
                onChange={(e) => setProposedPrice(e.target.value)}
                placeholder={`Enter price in ${vendorCurrency}`}
              />
              {proposedPrice && parseFloat(proposedPrice) > 0 && (
                <p className="text-sm font-medium text-eagle-green">
                  Preview: {customOrderService.formatPrice(0, parseFloat(proposedPrice), vendorCurrency)}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Customer will see this in their preferred currency
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPriceDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleProposePrice}
              disabled={!proposedPrice || parseFloat(proposedPrice) <= 0 || proposePriceMutation.isPending}
              className="bg-eagle-green hover:bg-viridian-green text-white"
            >
              {proposePriceMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <DollarSign className="h-4 w-4 mr-2 text-white" />
              )}
              Send Proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <Label htmlFor="cancelReason">Reason for cancellation</Label>
            <Textarea
              id="cancelReason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Please provide a reason..."
              className="mt-2"
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
