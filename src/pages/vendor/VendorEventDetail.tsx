import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { vendorService } from '@/services/vendorService';
import { getEventImageUrl } from '@/utils/imageUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Image as ImageIcon,
  MapPin,
  Clock,
  Ticket,
  Edit,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { RejectionReasonWithModal } from '@/components/RejectionReasonModal';

export default function VendorEventDetail() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const eventId = id ? parseInt(id, 10) : null;

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const response = await vendorService.getEventById(eventId!);
      return response;
    },
    enabled: isAuthenticated && !!eventId,
  });

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string; icon: React.ElementType }> = {
      ACTIVE: { label: 'Active', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      PENDING: { label: 'Pending Review', className: 'bg-amber-100 text-amber-800', icon: Clock },
      REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-800', icon: AlertTriangle },
      INACTIVE: { label: 'Inactive', className: 'bg-slate-100 text-slate-800', icon: Calendar },
      DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-800', icon: Edit },
    };

    const config = statusMap[status?.toUpperCase()] || { label: status, className: '', icon: Calendar };
    const Icon = config.icon;

    return (
      <Badge className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Calendar className="h-16 w-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Event not found</h3>
        <Button asChild className="mt-4">
          <Link to="/vendor/events">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 md:gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link to="/vendor/events">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl md:text-2xl font-bold truncate">{event.title}</h1>
            <p className="text-sm text-muted-foreground truncate">{event.eventTypeName}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {getStatusBadge(event.status || '')}
          <Button asChild variant="outline" size="sm" className="md:size-default">
            <Link to={`/vendor/events/${event.id}/edit`}>
              <Edit className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Edit</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="md:size-default">
            <Link to={`/vendor/events/${event.id}/price`}>
              <DollarSign className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Update Price</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Rejection Notice */}
      {event.status === 'REJECTED' && event.rejectionReason && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-red-900">Rejection Reason</h3>
                <RejectionReasonWithModal
                  reason={event.rejectionReason}
                  title="Event rejection reason"
                  className="text-red-700 mt-1"
                  truncateLength={120}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Event Image */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Event Image
            </CardTitle>
          </CardHeader>
          <CardContent>
            {event.bannerImageUrl || (event.images && event.images.length > 0) ? (
              <img
                src={getEventImageUrl(event.images, event.bannerImageUrl)}
                alt={event.title}
                className="w-full h-64 object-cover rounded-lg"
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg">
                <ImageIcon className="h-12 w-12 text-gray-300 mb-2" />
                <p className="text-sm text-muted-foreground">No image uploaded</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Event Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Event Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Summary</Label>
              <p className="mt-1">{event.summary || 'No summary provided'}</p>
            </div>

            <Separator />

            <div>
              <Label className="text-sm font-medium text-muted-foreground">Description</Label>
              <p className="mt-1 whitespace-pre-wrap">{event.description || 'No description provided'}</p>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Start Date</Label>
                <p className="mt-1">{event.eventDate ? new Date(event.eventDate).toLocaleString() : 'N/A'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">End Date</Label>
                <p className="mt-1">{event.eventEndDate ? new Date(event.eventEndDate).toLocaleString() : 'N/A'}</p>
              </div>
            </div>

            {(event.location || event.city) && (
              <>
                <Separator />
                <div>
                  <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location
                  </Label>
                  <p className="mt-1">{event.location || event.city}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ticket Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Ticket Types ({event.ticketTypes?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {event.ticketTypes && event.ticketTypes.length > 0 ? (
            <div className="space-y-4">
              {event.ticketTypes.map((ticketType, index) => (
                <Card key={ticketType.id || index} className="border-2">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{ticketType.name}</h4>
                        </div>

                        {ticketType.description && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Description</Label>
                            <p className="text-sm">{ticketType.description}</p>
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label className="text-xs text-muted-foreground">Price</Label>
                            <p className="text-lg font-semibold">
                              {ticketType.currency || 'ETB'} {(ticketType.vendorPrice || 0).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Available</Label>
                            <p className="text-lg font-semibold">{ticketType.availableCount ?? ticketType.capacity - ticketType.soldCount}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Sold</Label>
                            <p className="text-lg font-semibold">{ticketType.soldCount || 0}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg">
              <Ticket className="h-12 w-12 text-gray-300 mb-2" />
              <p className="text-sm text-muted-foreground">No ticket types configured</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`text-sm font-medium ${className || ''}`}>{children}</div>;
}
