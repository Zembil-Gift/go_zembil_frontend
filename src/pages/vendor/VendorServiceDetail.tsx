import {useQuery} from '@tanstack/react-query';
import {Link, useParams} from 'react-router-dom';
import {useAuth} from '@/hooks/useAuth';
import {serviceService, type ServicePackageResponse} from '@/services/serviceService';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Separator} from '@/components/ui/separator';
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  Edit,
  Image as ImageIcon,
  MapPin,
  Package,
  XCircle,
  ShieldOff,
  Archive,
} from 'lucide-react';
import {RejectionReasonWithModal} from '@/components/RejectionReasonModal';

export default function VendorServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const serviceId = id ? parseInt(id, 10) : null;

  const { data: service, isLoading } = useQuery({
    queryKey: ['vendor-service', serviceId],
    queryFn: async () => {
      return await serviceService.getMyService(serviceId!);
    },
    enabled: isAuthenticated && !!serviceId,
  });

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string; icon: React.ElementType }> = {
      PENDING_APPROVAL: { label: 'Pending Approval', className: 'bg-amber-100 text-amber-800', icon: Clock },
      APPROVED: { label: 'Approved', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-800', icon: XCircle },
      SUSPENDED: { label: 'Suspended', className: 'bg-orange-100 text-orange-800', icon: ShieldOff },
      ARCHIVED: { label: 'Archived', className: 'bg-slate-100 text-slate-800', icon: Archive },
    };

    const config = statusMap[status?.toUpperCase()] || { label: status, className: 'bg-gray-100 text-gray-800', icon: Briefcase };
    const Icon = config.icon;

    return (
      <Badge className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getPackageStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string; icon: React.ElementType }> = {
      PENDING: { label: 'Pending', className: 'bg-amber-100 text-amber-800', icon: Clock },
      APPROVED: { label: 'Approved', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-800', icon: XCircle },
      SUSPENDED: { label: 'Suspended', className: 'bg-orange-100 text-orange-800', icon: ShieldOff },
      ARCHIVED: { label: 'Archived', className: 'bg-slate-100 text-slate-800', icon: Archive },
    };

    const config = statusMap[status?.toUpperCase()] || { label: status, className: 'bg-gray-100 text-gray-800', icon: Briefcase };
    const Icon = config.icon;

    return (
      <Badge className={`${config.className} text-xs`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const formatAvailability = (pkg: ServicePackageResponse) => {
    const config = pkg.availabilityConfig;
    if (!config) return null;

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const workingDays = config.workingDays?.map(d => dayNames[d]).join(', ');

    return (
      <div className="space-y-1.5">
        {workingDays && (
          <p className="text-sm"><span className="text-muted-foreground">Working Days:</span> {workingDays}</p>
        )}
        {pkg.availabilityType === 'TIME_SLOTS' && config.timeSlots && config.timeSlots.length > 0 && (
          <p className="text-sm"><span className="text-muted-foreground">Time Slots:</span> {config.timeSlots.join(', ')}</p>
        )}
        {pkg.availabilityType === 'WORKING_HOURS' && config.workingHoursStart && config.workingHoursEnd && (
          <p className="text-sm"><span className="text-muted-foreground">Hours:</span> {config.workingHoursStart} – {config.workingHoursEnd}</p>
        )}
        {config.advanceBookingDays != null && (
          <p className="text-sm"><span className="text-muted-foreground">Advance Booking:</span> Up to {config.advanceBookingDays} days</p>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Briefcase className="h-16 w-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Service not found</h3>
        <Button asChild className="mt-4">
          <Link to="/vendor/services">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Services
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
            <Link to="/vendor/services">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl md:text-2xl font-bold truncate">{service.title}</h1>
            <p className="text-sm text-muted-foreground truncate">{service.categoryName}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {getStatusBadge(service.status || '')}
          <Button asChild variant="outline" size="sm" className="md:size-default">
            <Link to={`/vendor/services/${service.id}/edit`}>
              <Edit className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Edit</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Pending Approval Notice */}
      {service.status === 'PENDING_APPROVAL' && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Clock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-amber-900">Pending Approval</h3>
                <p className="text-sm text-amber-700 mt-1">
                  This service is currently under review by our team. You will be notified once it is approved or if changes are needed.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rejection Notice */}
      {service.status === 'REJECTED' && service.rejectionReason && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-red-900">Rejection Reason</h3>
                <RejectionReasonWithModal
                  reason={service.rejectionReason}
                  title="Service rejection reason"
                  className="text-red-700 mt-1"
                  truncateLength={120}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suspension Notice */}
      {service.status === 'SUSPENDED' && service.rejectionReason && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <ShieldOff className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-orange-900">Suspension Reason</h3>
                <RejectionReasonWithModal
                  reason={service.rejectionReason}
                  title="Service suspension reason"
                  className="text-orange-700 mt-1"
                  truncateLength={120}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Service Images */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Service Images
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {service.images && service.images.length > 0 ? (
                service.images.map((image, index) => (
                  <div key={image.id || index} className="relative">
                    <img
                      src={image.fullUrl || image.url}
                      alt={image.altText || service.title}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    {image.isPrimary && (
                      <Badge className="absolute top-2 right-2 bg-blue-500">Primary</Badge>
                    )}
                  </div>
                ))
              ) : (
                <div className="col-span-2 flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg">
                  <ImageIcon className="h-12 w-12 text-gray-300 mb-2" />
                  <p className="text-sm text-muted-foreground">No images uploaded</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Service Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Service Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Description</Label>
              <p className="mt-1 whitespace-pre-wrap">{service.description || 'No description provided'}</p>
            </div>

            {(service.location || service.city) && (
              <>
                <Separator />
                <div>
                  <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    Location
                  </Label>
                  <p className="mt-1">
                    {[service.location, service.city].filter(Boolean).join(', ')}
                  </p>
                </div>
              </>
            )}

            {service.durationMinutes && (
              <>
                <Separator />
                <div>
                  <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Duration
                  </Label>
                  <p className="mt-1">{service.durationMinutes} minutes</p>
                </div>
              </>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Base Price</Label>
                <p className="mt-1 text-lg font-semibold">
                  {serviceService.formatPrice(
                    service.basePrice ?? service.basePriceMinor / 100,
                    service.currency
                  )}
                </p>
              </div>
              {service.vendorPrice != null && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Your Price</Label>
                  <p className="mt-1 text-lg font-semibold">
                    {serviceService.formatPrice(service.vendorPrice, service.currency)}
                  </p>
                </div>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                <p className="mt-1 text-sm">{service.createdAt ? new Date(service.createdAt).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                <p className="mt-1 text-sm">{service.updatedAt ? new Date(service.updatedAt).toLocaleDateString() : 'N/A'}</p>
              </div>
              {service.approvedAt && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Approved</Label>
                  <p className="mt-1 text-sm">{new Date(service.approvedAt).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Packages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Service Packages ({service.packages?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {service.packages && service.packages.length > 0 ? (
            <div className="space-y-4">
              {service.packages.map((pkg, index) => (
                <Card key={pkg.id || index} className={`border-2 ${
                  pkg.status === 'REJECTED' ? 'border-red-200' :
                  pkg.status === 'PENDING' ? 'border-amber-200' :
                  ''
                }`}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {/* Package Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-base">{pkg.name}</h4>
                          {pkg.isDefault && (
                            <Badge variant="secondary" className="text-xs">Default</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {getPackageStatusBadge(pkg.status)}
                          {pkg.sessionDuration && (
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {pkg.sessionDuration} min
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Package Rejection Reason */}
                      {pkg.status === 'REJECTED' && pkg.rejectionReason && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-3">
                          <div className="flex gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-red-900">Rejection Reason</p>
                              <RejectionReasonWithModal
                                reason={pkg.rejectionReason}
                                title={`Package "${pkg.name}" rejection reason`}
                                className="text-red-700 text-sm"
                                truncateLength={100}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Package Description */}
                      {pkg.description && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Description</Label>
                          <p className="text-sm mt-0.5 whitespace-pre-wrap">{pkg.description}</p>
                        </div>
                      )}

                      {/* Pricing & Bookings */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Price</Label>
                          <p className="text-lg font-semibold">
                            {serviceService.formatPrice(
                              pkg.vendorPrice ?? pkg.basePrice ?? pkg.basePriceMinor / 100,
                              pkg.currency
                            )}
                          </p>
                        </div>
                        {pkg.durationMinutes && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Duration</Label>
                            <p className="text-sm font-medium mt-0.5">{pkg.durationMinutes} minutes</p>
                          </div>
                        )}
                        <div>
                          <Label className="text-xs text-muted-foreground">Max Bookings/Day</Label>
                          <p className="text-sm font-medium mt-0.5">{pkg.maxBookingsPerDay || 'Unlimited'}</p>
                        </div>
                      </div>

                      {/* Package Attributes */}
                      {pkg.attributes && pkg.attributes.length > 0 && (
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1.5 block">Details</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {pkg.attributes.map((attr) => (
                              <div key={attr.id} className="bg-gray-50 rounded px-3 py-2">
                                {attr.name && (
                                  <span className="text-xs text-muted-foreground">{attr.name}: </span>
                                )}
                                <span className="text-sm font-medium">{attr.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Features */}
                      {pkg.features && pkg.features.length > 0 && (
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1.5 block">Features</Label>
                          <ul className="list-disc list-inside space-y-1">
                            {pkg.features.map((feature, featureIndex) => (
                              <li key={featureIndex} className="text-sm">{feature}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Availability */}
                      {pkg.availabilityConfig && (
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Availability
                          </Label>
                          {formatAvailability(pkg)}
                        </div>
                      )}

                      {/* Package Images */}
                      {pkg.images && pkg.images.length > 0 && (
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1.5 block">Package Images</Label>
                          <div className="grid grid-cols-3 gap-2">
                            {pkg.images.map((image, imgIdx) => (
                              <img
                                key={image.id || imgIdx}
                                src={image.fullUrl || image.url}
                                alt={image.altText || pkg.name}
                                className="w-full h-24 object-cover rounded-md"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg">
              <Package className="h-12 w-12 text-gray-300 mb-2" />
              <p className="text-sm text-muted-foreground">No packages configured</p>
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
