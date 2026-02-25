import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { vendorService, VendorProfile } from "@/services/vendorService";
import { serviceService, ServiceResponse } from "@/services/serviceService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Briefcase,
  Search,
} from "lucide-react";
import { useState } from "react";

export default function VendorServicesPage() {
  const { user, isAuthenticated } = useAuth();
  
  const isVendor = user?.role?.toUpperCase() === 'VENDOR';

  const [searchQuery, setSearchQuery] = useState("");

  // Fetch vendor profile
  const { data: vendorProfile } = useQuery<VendorProfile>({
    queryKey: ['vendor', 'profile'],
    queryFn: () => vendorService.getMyProfile(),
    enabled: isAuthenticated && isVendor,
  });

  // Fetch vendor services
  const { data: servicesData, isLoading } = useQuery({
    queryKey: ['vendor', 'services'],
    queryFn: () => serviceService.getMyServices(undefined, 0, 100),
    enabled: isAuthenticated && isVendor,
  });

  const services: ServiceResponse[] = servicesData?.content || [];

  const filteredServices = services.filter((service) =>
    service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (service.categoryName && service.categoryName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h2 className="text-xl font-semibold">My Services</h2>
          <p className="text-sm text-muted-foreground">Manage your service catalog</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search services..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {vendorProfile?.isApproved ? (
            <Button asChild>
              <Link to="/vendor/services/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Service
              </Link>
            </Button>
          ) : (
            <Button variant="outline" className="opacity-50 cursor-not-allowed" disabled>
              <Plus className="h-4 w-4 mr-2 text-gray-400" />
              <span className="text-gray-400">Add Service</span>
            </Button>
          )}
        </div>
      </div>

      {filteredServices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Briefcase className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">
              {searchQuery ? "No services match your search" : "No services yet"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "Try a different search term" : "Start by creating your first service"}
            </p>
            {!searchQuery && (
              vendorProfile?.isApproved ? (
                <Button asChild>
                  <Link to="/vendor/services/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Service
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" className="opacity-50 cursor-not-allowed" disabled>
                  <Plus className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="text-gray-400">Create Service</span>
                </Button>
              )
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredServices.map((service: ServiceResponse) => (
            <Card key={service.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-4">
                  {service.primaryImageUrl ? (
                    <img 
                      src={service.primaryImageUrl} 
                      alt={service.title} 
                      className="h-12 w-12 rounded object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded bg-eagle-green/10 flex items-center justify-center">
                      <Briefcase className="h-6 w-6 text-eagle-green" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{service.title}</p>
                    <p className="text-sm text-muted-foreground">{service.city}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(service.status)}
                  <span className="font-medium">
                    {serviceService.formatPrice(service.defaultPackage?.basePrice ?? service.basePrice ?? 0, service.defaultPackage?.currency ?? service.currency)}
                  </span>
                  {service.hasPackages && (
                    <Badge variant="outline" className="text-xs">
                      {service.packages?.length || 0} packages
                    </Badge>
                  )}
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/vendor/services/${service.id}`}>View Details</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/vendor/services/${service.id}/edit`}>Edit</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
