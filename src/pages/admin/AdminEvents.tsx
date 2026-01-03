import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getEventImageUrl } from '@/utils/imageUtils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar, 
  Search,
  Loader2,
  MapPin,
  Check,
  X,
  Star,
  DollarSign,
  Clock,
  AlertCircle,
  Eye,
  Ticket
} from 'lucide-react';
import { adminService } from '@/services/adminService';

export default function AdminEvents() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; eventId?: number; type: 'event' | 'price' }>({ 
    open: false, 
    type: 'event' 
  });
  const [rejectReason, setRejectReason] = useState('');
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all events
  const { data: allEventsData, isLoading: allEventsLoading } = useQuery({
    queryKey: ['admin', 'all-events'],
    queryFn: async () => {
      try {
        const response = await adminService.getAllEvents(0, 100);
        return response.content || [];
      } catch (error) {
        console.error('Failed to fetch all events:', error);
        return [];
      }
    },
  });

  // Fetch pending events
  const { data: pendingEventsData, isLoading: pendingLoading } = useQuery({
    queryKey: ['admin', 'pending-events'],
    queryFn: async () => {
      try {
        const response = await adminService.getPendingEvents(0, 100);
        return response.content || [];
      } catch (error) {
        console.error('Failed to fetch pending events:', error);
        return [];
      }
    },
  });

  // Fetch price update requests
  const { data: priceRequestsData, isLoading: priceRequestsLoading } = useQuery({
    queryKey: ['admin', 'price-requests'],
    queryFn: async () => {
      try {
        const response = await adminService.getPriceUpdateRequests(0, 100);
        return response.content || [];
      } catch (error) {
        console.error('Failed to fetch price requests:', error);
        return [];
      }
    },
  });

  const pendingEvents = pendingEventsData || [];
  const priceRequests = priceRequestsData || [];
  const pendingPriceRequests = priceRequests.filter((r: any) => r.status === 'PENDING');

  // Approve event mutation
  const approveEventMutation = useMutation({
    mutationFn: (eventId: number) => adminService.approveEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-events'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-events'] });
      toast({
        title: 'Event Approved',
        description: 'The event has been approved and is now live.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve event',
        variant: 'destructive',
      });
    },
  });

  // Reject event mutation
  const rejectEventMutation = useMutation({
    mutationFn: ({ eventId, reason }: { eventId: number; reason: string }) => 
      adminService.rejectEvent(eventId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-events'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-events'] });
      toast({
        title: 'Event Rejected',
        description: 'The event has been rejected.',
      });
      setRejectDialog({ open: false, type: 'event' });
      setRejectReason('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject event',
        variant: 'destructive',
      });
    },
  });

  // Approve price update mutation
  const approvePriceUpdateMutation = useMutation({
    mutationFn: (requestId: number) => adminService.approvePriceUpdate(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'price-requests'] });
      toast({
        title: 'Price Update Approved',
        description: 'The ticket price has been updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve price update',
        variant: 'destructive',
      });
    },
  });

  // Reject price update mutation
  const rejectPriceUpdateMutation = useMutation({
    mutationFn: ({ requestId, reason }: { requestId: number; reason: string }) => 
      adminService.rejectPriceUpdate(requestId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'price-requests'] });
      toast({
        title: 'Price Update Rejected',
        description: 'The price update request has been rejected.',
      });
      setRejectDialog({ open: false, type: 'price' });
      setRejectReason('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject price update',
        variant: 'destructive',
      });
    },
  });

  // Set featured mutation
  const setFeaturedMutation = useMutation({
    mutationFn: ({ eventId, featured }: { eventId: number; featured: boolean }) => 
      adminService.setEventFeatured(eventId, featured),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-events'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-events'] });
      toast({
        title: 'Event Updated',
        description: 'Featured status has been updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update featured status',
        variant: 'destructive',
      });
    },
  });

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast({
        title: 'Reason Required',
        description: 'Please provide a reason for rejection.',
        variant: 'destructive',
      });
      return;
    }

    if (rejectDialog.type === 'event' && rejectDialog.eventId) {
      rejectEventMutation.mutate({ eventId: rejectDialog.eventId, reason: rejectReason });
    } else if (rejectDialog.type === 'price' && rejectDialog.eventId) {
      rejectPriceUpdateMutation.mutate({ requestId: rejectDialog.eventId, reason: rejectReason });
    }
  };

  const formatCurrency = (amountMinor: number, _currency: string = 'USD') => {
    const amount = amountMinor / 100;
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status: string) => {
    const upperStatus = status?.toUpperCase();
    switch (upperStatus) {
      case 'ACTIVE':
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'PENDING':
      case 'PENDING_APPROVAL':
        return <Badge className="bg-amber-100 text-amber-800">Pending</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-gray-100 text-gray-800">Cancelled</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  return (
    <AdminLayout 
      title="Event Management" 
      description="Review and manage events and price update requests"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="all" className="relative">
            All Events
            {allEventsData && (
              <Badge className="ml-2 bg-eagle-green text-white">{allEventsData.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending" className="relative">
            Pending Events
            {pendingEvents.length > 0 && (
              <Badge className="ml-2 bg-amber-500 text-white">{pendingEvents.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="price-requests" className="relative">
            Price Update Requests
            {pendingPriceRequests.length > 0 && (
              <Badge className="ml-2 bg-blue-500 text-white">{pendingPriceRequests.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* All Events Tab */}
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-eagle-green" />
                All Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              {allEventsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-eagle-green" />
                </div>
              ) : allEventsData && allEventsData.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Featured</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allEventsData.map((event: any) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <img 
                              src={getEventImageUrl(event.images, event.bannerImageUrl)} 
                              alt={event.title} 
                              className="h-12 w-12 rounded object-cover"
                              onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                            />
                            <div className="h-12 w-12 rounded bg-gray-100 flex items-center justify-center hidden">
                              <Calendar className="h-6 w-6 text-gray-400" />
                            </div>
                            <div>
                              <div className="font-medium">{event.title}</div>
                              <div className="text-sm text-gray-500">{event.category}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {event.location}, {event.city}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(event.eventDate).toLocaleDateString()}
                            <br />
                            {event.eventTime}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            event.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                            event.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                            event.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {event.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant={event.featured ? "default" : "outline"}
                            onClick={() => setFeaturedMutation.mutate({ 
                              eventId: event.id, 
                              featured: !event.featured 
                            })}
                            disabled={setFeaturedMutation.isPending || event.status !== 'APPROVED'}
                            className={event.featured ? "bg-yellow-500 hover:bg-yellow-600" : ""}
                          >
                            <Star className={`h-4 w-4 ${event.featured ? 'fill-current' : ''}`} />
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedEvent(event);
                                setShowViewDialog(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {event.status === 'PENDING' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => approveEventMutation.mutate(event.id)}
                                  disabled={approveEventMutation.isPending}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setRejectDialog({ open: true, eventId: event.id, type: 'event' })}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
                  <p className="text-gray-500">Events will appear here once vendors create them</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Events Tab */}
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                Events Awaiting Approval
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-eagle-green" />
                </div>
              ) : pendingEvents.length > 0 ? (
                <div className="space-y-4">
                  {pendingEvents.map((event: any) => (
                    <div 
                      key={event.id} 
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex gap-4 flex-1">
                          <img 
                            src={getEventImageUrl(event.images, event.coverImage || event.bannerImageUrl)} 
                            alt={event.title}
                            className="h-20 w-20 rounded-lg object-cover flex-shrink-0"
                            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                          />
                          <div className="h-20 w-20 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 hidden">
                            <Calendar className="h-10 w-10 text-gray-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-eagle-green text-lg">{event.title}</h3>
                          <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                            <span className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              {event.location}, {event.city}
                            </span>
                            <span className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {new Date(event.eventDate).toLocaleDateString()}
                            </span>
                            {event.vendorName && (
                              <span className="text-gray-500">by {event.vendorName}</span>
                            )}
                          </div>
                          {event.description && (
                            <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                              {event.description}
                            </p>
                          )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedEvent(event);
                              setShowViewDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => approveEventMutation.mutate(event.id)}
                            disabled={approveEventMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setRejectDialog({ open: true, eventId: event.id, type: 'event' })}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No pending events</h3>
                  <p className="text-gray-500">All events have been reviewed</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Price Update Requests Tab */}
        <TabsContent value="price-requests">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-500" />
                Price Update Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {priceRequestsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-eagle-green" />
                </div>
              ) : priceRequests.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event / Ticket</TableHead>
                      <TableHead>Current Price</TableHead>
                      <TableHead>Requested Price</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {priceRequests.map((request: any) => {
                      // Admin sees customer prices (what customers will pay)
                      const currentCustomerPriceMinor = request.currentCustomerPriceMinor ?? request.currentPriceMinor;
                      const newCustomerPriceMinor = request.newCustomerPriceMinor ?? request.newPriceMinor;
                      const currencyCode = request.currentCurrencyCode || request.newCurrencyCode || 'ETB';
                      
                      return (
                        <TableRow key={request.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{request.eventTitle}</div>
                              <div className="text-sm text-gray-500">{request.ticketTypeName}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatCurrency(currentCustomerPriceMinor, currencyCode)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(newCustomerPriceMinor, currencyCode)}
                          </TableCell>
                        <TableCell>
                          <p className="text-sm text-gray-600 max-w-xs truncate" title={request.reason}>
                            {request.reason}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            request.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                            request.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {request.status === 'PENDING' ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => approvePriceUpdateMutation.mutate(request.id)}
                                disabled={approvePriceUpdateMutation.isPending}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setRejectDialog({ open: true, eventId: request.id, type: 'price' })}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">Processed</span>
                          )}
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No price update requests</h3>
                  <p className="text-gray-500">All requests have been processed</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Event Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
            <DialogDescription>
              View event information and ticket types
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-6">
              {/* Event Header */}
              <div className="flex gap-4">
                <img 
                  src={getEventImageUrl(selectedEvent.images, selectedEvent.bannerImageUrl)} 
                  alt={selectedEvent.title}
                  className="h-32 w-32 rounded-lg object-cover flex-shrink-0"
                  onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                />
                <div className="h-32 w-32 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 hidden">
                  <Calendar className="h-16 w-16 text-gray-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-eagle-green">{selectedEvent.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{selectedEvent.category || selectedEvent.eventTypeName}</p>
                  {getStatusBadge(selectedEvent.status)}
                </div>
              </div>

              {/* Event Info Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">Location</p>
                  <p className="font-medium flex items-center">
                    <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                    {selectedEvent.location}, {selectedEvent.city}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Date & Time</p>
                  <p className="font-medium flex items-center">
                    <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                    {new Date(selectedEvent.eventDate).toLocaleDateString()}
                    {selectedEvent.eventTime && ` at ${selectedEvent.eventTime}`}
                  </p>
                </div>
                {selectedEvent.eventEndDate && (
                  <div>
                    <p className="text-gray-500 mb-1">End Date</p>
                    <p className="font-medium">{new Date(selectedEvent.eventEndDate).toLocaleDateString()}</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-500 mb-1">Vendor</p>
                  <p className="font-medium">{selectedEvent.vendorName || `Vendor #${selectedEvent.vendorId}`}</p>
                </div>
                {selectedEvent.organizerContact && (
                  <div>
                    <p className="text-gray-500 mb-1">Contact</p>
                    <p className="font-medium">{selectedEvent.organizerContact}</p>
                  </div>
                )}
                {selectedEvent.totalCapacity && (
                  <div>
                    <p className="text-gray-500 mb-1">Total Capacity</p>
                    <p className="font-medium">{selectedEvent.totalCapacity} tickets</p>
                  </div>
                )}
                {selectedEvent.totalAvailable !== undefined && (
                  <div>
                    <p className="text-gray-500 mb-1">Available Tickets</p>
                    <p className="font-medium">{selectedEvent.totalAvailable}</p>
                  </div>
                )}
                {selectedEvent.totalSold !== undefined && (
                  <div>
                    <p className="text-gray-500 mb-1">Tickets Sold</p>
                    <p className="font-medium">{selectedEvent.totalSold}</p>
                  </div>
                )}
              </div>

              {/* Description */}
              {selectedEvent.description && (
                <div>
                  <p className="text-gray-500 text-sm mb-2">Description</p>
                  <p className="text-sm leading-relaxed">{selectedEvent.description}</p>
                </div>
              )}

              {/* Ticket Types */}
              {selectedEvent.ticketTypes && selectedEvent.ticketTypes.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Ticket className="h-5 w-5 text-eagle-green" />
                    Ticket Types
                  </h4>
                  <div className="space-y-3">
                    {selectedEvent.ticketTypes.map((ticket: any, idx: number) => (
                      <div key={idx} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{ticket.name}</p>
                            {ticket.description && (
                              <p className="text-sm text-gray-600 mt-1">{ticket.description}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-eagle-green">
                              {formatCurrency(ticket.priceMinor || 0, ticket.currency || selectedEvent.currency)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {ticket.availableQuantity || 0} / {ticket.capacity || 0} available
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rejection Reason */}
              {selectedEvent.status === 'REJECTED' && selectedEvent.rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-red-800 mb-1">Rejection Reason</p>
                  <p className="text-sm text-red-700">{selectedEvent.rejectionReason}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
            {selectedEvent?.status === 'PENDING' && (
              <>
                <Button
                  variant="outline"
                  className="text-red-600"
                  onClick={() => {
                    setShowViewDialog(false);
                    setRejectDialog({ open: true, eventId: selectedEvent.id, type: 'event' });
                  }}
                >
                  Reject
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    setShowViewDialog(false);
                    approveEventMutation.mutate(selectedEvent.id);
                  }}
                >
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ ...rejectDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Reject {rejectDialog.type === 'event' ? 'Event' : 'Price Update'}
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejection. This will be sent to the vendor.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, type: 'event' })}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={rejectEventMutation.isPending || rejectPriceUpdateMutation.isPending}
            >
              {(rejectEventMutation.isPending || rejectPriceUpdateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
