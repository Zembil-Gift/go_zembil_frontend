import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { vendorService, VendorProfile, EventResponse } from "@/services/vendorService";
import { getEventImageUrl } from "@/utils/imageUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  Plus,
  Edit,
  RotateCcw,
  XCircle,
} from "lucide-react";

export default function VendorEventsPage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const isVendor = user?.role?.toUpperCase() === 'VENDOR';

  // State for cancel dialog
  const [cancelEventDialog, setCancelEventDialog] = useState<{ open: boolean; eventId: number | null; eventTitle: string }>({
    open: false, eventId: null, eventTitle: ''
  });
  const [cancelReason, setCancelReason] = useState('');

  // Fetch vendor profile
  const { data: vendorProfile } = useQuery<VendorProfile>({
    queryKey: ['vendor', 'profile'],
    queryFn: () => vendorService.getMyProfile(),
    enabled: isAuthenticated && isVendor,
  });

  // Fetch vendor events
  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['vendor', 'events'],
    queryFn: () => vendorService.getMyEvents(),
    enabled: isAuthenticated && isVendor,
  });

  // Event cancellation mutation
  const cancelEventMutation = useMutation({
    mutationFn: ({ eventId, reason }: { eventId: number; reason: string }) => 
      vendorService.cancelEvent(eventId, reason),
    onSuccess: () => {
      toast({ title: "Event cancelled", description: "Your event has been cancelled." });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'events'] });
      setCancelEventDialog({ open: false, eventId: null, eventTitle: '' });
      setCancelReason('');
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Event reactivation mutation
  const reactivateEventMutation = useMutation({
    mutationFn: (eventId: number) => vendorService.reactivateEvent(eventId),
    onSuccess: () => {
      toast({ title: "Event reactivated", description: "Your event has been reactivated and is now visible." });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'events'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const events: EventResponse[] = eventsData?.content || [];

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
      case 'APPROVED':
      case 'ENABLED':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'PENDING':
      case 'PENDING_APPROVAL':
        return <Badge className="bg-amber-100 text-amber-800">Pending</Badge>;
      case 'REJECTED':
      case 'DISABLED':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case 'DRAFT':
        return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
      case 'INACTIVE':
        return <Badge className="bg-slate-100 text-slate-800">Inactive</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">My Events</h2>
        {vendorProfile?.isApproved ? (
          <Button asChild>
            <Link to="/vendor/events/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Link>
          </Button>
        ) : (
          <Button variant="outline" className="opacity-50 cursor-not-allowed" disabled>
            <Plus className="h-4 w-4 mr-2 text-gray-400" />
            <span className="text-gray-400">Create Event</span>
          </Button>
        )}
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No events yet</h3>
            <p className="text-muted-foreground mb-4">Start by creating your first event</p>
            {vendorProfile?.isApproved ? (
              <Button asChild>
                <Link to="/vendor/events/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Event
                </Link>
              </Button>
            ) : (
              <Button variant="outline" className="opacity-50 cursor-not-allowed" disabled>
                <Plus className="h-4 w-4 mr-2 text-gray-400" />
                <span className="text-gray-400">Create Event</span>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {events.map((event) => (
            <Card key={event.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-4">
                  <img 
                    src={getEventImageUrl(event.images, event.bannerImageUrl)} 
                    alt={event.title} 
                    className="h-16 w-24 rounded object-cover"
                    onError={(e) => { e.currentTarget.classList.add('hidden'); const fallback = e.currentTarget.nextElementSibling; if (fallback) fallback.classList.remove('hidden'); }}
                  />
                  <div className="h-16 w-24 rounded bg-gray-200 hidden items-center justify-center">
                    <Calendar className="h-8 w-8 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="font-medium">{event.title}</h3>
                    <p className="text-sm text-muted-foreground">{event.location}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(event.eventDate).toLocaleDateString()}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusBadge(event.status)}
                      <span className="text-xs text-muted-foreground">
                        {event.totalSold || 0}/{event.totalCapacity || 0} sold
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/vendor/events/${event.id}/edit`}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/vendor/events/${event.id}/price`}>Update Price</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/vendor/events/${event.id}/analytics`}>Analytics</Link>
                  </Button>
                  {event.status?.toUpperCase() === 'CANCELLED' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => reactivateEventMutation.mutate(event.id)}
                      disabled={reactivateEventMutation.isPending}
                      className="text-green-600 hover:text-green-700"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Reactivate
                    </Button>
                  ) : event.status?.toUpperCase() === 'APPROVED' || event.status?.toUpperCase() === 'PENDING_APPROVAL' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCancelEventDialog({ 
                        open: true, 
                        eventId: event.id, 
                        eventTitle: event.title 
                      })}
                      className="text-red-600 hover:text-red-700"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Cancel Event Dialog */}
      <Dialog open={cancelEventDialog.open} onOpenChange={(open) => {
        if (!open) {
          setCancelEventDialog({ open: false, eventId: null, eventTitle: '' });
          setCancelReason('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel "{cancelEventDialog.eventTitle}"? 
              Please provide a reason for cancellation.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="cancel-reason">Cancellation Reason</Label>
            <Textarea
              id="cancel-reason"
              placeholder="Enter the reason for cancelling this event..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="mt-2"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCancelEventDialog({ open: false, eventId: null, eventTitle: '' });
              setCancelReason('');
            }}>
              Go Back
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (cancelEventDialog.eventId && cancelReason.trim()) {
                  cancelEventMutation.mutate({ eventId: cancelEventDialog.eventId, reason: cancelReason });
                }
              }}
              disabled={!cancelReason.trim() || cancelEventMutation.isPending}
            >
              {cancelEventMutation.isPending ? 'Cancelling...' : 'Cancel Event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
