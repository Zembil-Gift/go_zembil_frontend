import {useQuery} from '@tanstack/react-query';
import {Link, useParams} from 'react-router-dom';
import {useAuth} from '@/hooks/useAuth';
import {serviceService} from '@/services/serviceService';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Separator} from '@/components/ui/separator';
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  CheckCircle,
  Clock,
  Edit,
  Image as ImageIcon,
  Package,
  Tag,
} from 'lucide-react';
import {RejectionReasonWithModal} from '@/components/RejectionReasonModal';

export default function VendorServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const serviceId = id ? parseInt(id, 10) : null;

  const { data: service, isLoading } = useQuery({
    queryKey: ['service', serviceId],
    queryFn: async () => {
      return await serviceService.getServiceById(serviceId!);
    },
    enabled: isAuthenticated && !!serviceId,
  });

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string; icon: React.ElementType }> = {
      ACTIVE: { label: 'Active', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      PENDING: { label: 'Pending Review', className: 'bg-amber-100 text-amber-800', icon: Clock },
      REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-800', icon: AlertTriangle },
      INACTIVE: { label: 'Inactive', className: 'bg-slate-100 text-slate-800', icon: Briefcase },
      DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-800', icon: Edit },
    };

    const config = statusMap[status?.toUpperCase()] || { label: status, className: '', icon: Briefcase };
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
            <h1 className="text-xl md:text-2xl font-bold truncate">{service.name}</h1>
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
                      alt={image.altText || service.name}
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
              <Label className="text-sm font-medium text-muted-foreground">Summary</Label>
              <p className="mt-1">{service.summary || 'No summary provided'}</p>
            </div>

            <Separator />

            <div>
              <Label className="text-sm font-medium text-muted-foreground">Description</Label>
              <p className="mt-1 whitespace-pre-wrap">{service.description || 'No description provided'}</p>
            </div>

            {service.tags && service.tags.length > 0 && (
              <>
                <Separator />
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {service.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

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
                <Card key={pkg.id || index} className="border-2">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{pkg.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {pkg.sessionDuration} min
                        </Badge>
                      </div>

                      {pkg.description && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Description</Label>
                          <p className="text-sm">{pkg.description}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Price</Label>
                          <p className="text-lg font-semibold">
                            {pkg.currency} {(pkg.vendorPrice || pkg.basePrice || 0).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Max Bookings Per Day</Label>
                          <p className="text-lg font-semibold">{pkg.maxBookingsPerDay || 'Unlimited'}</p>
                        </div>
                      </div>

                      {pkg.features && pkg.features.length > 0 && (
                        <div>
                          <Label className="text-xs text-muted-foreground mb-2 block">Features</Label>
                          <ul className="list-disc list-inside space-y-1">
                            {pkg.features.map((feature, featureIndex) => (
                              <li key={featureIndex} className="text-sm">{feature}</li>
                            ))}
                          </ul>
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
