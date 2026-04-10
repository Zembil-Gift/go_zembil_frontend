import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  vendorService,
  VendorProfile,
  EventResponse,
} from "@/services/vendorService";
import { getEventImageUrl } from "@/utils/imageUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar, Plus, Edit, RotateCcw, Search, XCircle } from "lucide-react";

export default function VendorEventsPage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isVendor = user?.role?.toUpperCase() === "VENDOR";

  const [searchQuery, setSearchQuery] = useState("");

  // State for deactivate dialog
  const [deactivateEventDialog, setDeactivateEventDialog] = useState<{
    open: boolean;
    eventId: number | null;
    eventTitle: string;
  }>({
    open: false,
    eventId: null,
    eventTitle: "",
  });

  // Fetch vendor profile
  const { data: vendorProfile } = useQuery<VendorProfile>({
    queryKey: ["vendor", "profile"],
    queryFn: () => vendorService.getMyProfile(),
    enabled: isAuthenticated && isVendor,
  });

  // Fetch vendor events
  const { data: eventsData, isLoading } = useQuery({
    queryKey: ["vendor", "events"],
    queryFn: () => vendorService.getMyEvents(),
    enabled: isAuthenticated && isVendor,
  });

  // Event deactivation mutation
  const deactivateEventMutation = useMutation({
    mutationFn: (eventId: number) => vendorService.deactivateEvent(eventId),
    onSuccess: () => {
      toast({
        title: "Event deactivated",
        description:
          "Your event has been deactivated and hidden from customers.",
      });
      queryClient.invalidateQueries({ queryKey: ["vendor", "events"] });
      setDeactivateEventDialog({ open: false, eventId: null, eventTitle: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to deactivate event.",
        variant: "destructive",
      });
    },
  });

  // Event reactivation mutation
  const reactivateEventMutation = useMutation({
    mutationFn: (eventId: number) => vendorService.reactivateEvent(eventId),
    onSuccess: () => {
      toast({
        title: "Event reactivated",
        description: "Your event has been reactivated and is now visible.",
      });
      queryClient.invalidateQueries({ queryKey: ["vendor", "events"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to reactivate event.",
        variant: "destructive",
      });
    },
  });

  const events: EventResponse[] = eventsData?.content || [];

  const filteredEvents = events.filter(
    (event) =>
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.city &&
        event.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (event.location &&
        event.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
      case "APPROVED":
      case "ENABLED":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "PENDING":
      case "PENDING_APPROVAL":
        return <Badge className="bg-amber-100 text-amber-800">Pending</Badge>;
      case "REJECTED":
      case "DISABLED":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case "DRAFT":
        return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
      case "INACTIVE":
        return <Badge className="bg-slate-100 text-slate-800">Inactive</Badge>;
      case "CANCELLED":
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      case "COMPLETED":
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
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h2 className="text-xl font-semibold">My Events</h2>
          <p className="text-sm text-muted-foreground">
            Manage your hosted events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {vendorProfile?.isApproved ? (
            <Button asChild>
              <Link to="/vendor/events/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              className="opacity-50 cursor-not-allowed"
              disabled
            >
              <Plus className="h-4 w-4 mr-2 text-gray-400" />
              <span className="text-gray-400">Create Event</span>
            </Button>
          )}
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">
              {searchQuery ? "No events match your search" : "No events yet"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? "Try a different search term"
                : "Start by creating your first event"}
            </p>
            {!searchQuery &&
              (vendorProfile?.isApproved ? (
                <Button asChild>
                  <Link to="/vendor/events/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Event
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="opacity-50 cursor-not-allowed"
                  disabled
                >
                  <Plus className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="text-gray-400">Create Event</span>
                </Button>
              ))}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredEvents.map((event) => (
            <Card key={event.id}>
              <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4">
                <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                  <img
                    src={getEventImageUrl(event.images, event.bannerImageUrl)}
                    alt={event.title}
                    className="h-16 w-24 rounded object-cover flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.classList.add("hidden");
                      const fallback = e.currentTarget.nextElementSibling;
                      if (fallback) fallback.classList.remove("hidden");
                    }}
                  />
                  <div className="h-16 w-24 rounded bg-gray-200 hidden items-center justify-center">
                    <Calendar className="h-8 w-8 text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium truncate sm:whitespace-normal">
                      {event.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {event.location}
                    </p>
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
                <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/vendor/events/${event.id}`}>View Details</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/vendor/events/${event.id}/edit`}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/vendor/events/${event.id}/price`}>
                      Update Price
                    </Link>
                  </Button>
                  {event.status?.toUpperCase() === "CANCELLED" ? (
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
                  ) : event.status?.toUpperCase() === "APPROVED" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setDeactivateEventDialog({
                          open: true,
                          eventId: event.id,
                          eventTitle: event.title,
                        })
                      }
                      disabled={deactivateEventMutation.isPending}
                      className="text-red-600 hover:text-red-700"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Deactivate
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Deactivate Event Dialog */}
      <AlertDialog
        open={deactivateEventDialog.open}
        onOpenChange={(open) => {
          if (!open && !deactivateEventMutation.isPending) {
            setDeactivateEventDialog({
              open: false,
              eventId: null,
              eventTitle: "",
            });
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate "
              {deactivateEventDialog.eventTitle}"? This will hide the event from
              customers. You can reactivate it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deactivateEventMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => {
                if (deactivateEventDialog.eventId) {
                  deactivateEventMutation.mutate(deactivateEventDialog.eventId);
                }
              }}
              disabled={deactivateEventMutation.isPending}
            >
              {deactivateEventMutation.isPending
                ? "Deactivating..."
                : "Deactivate"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
