import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { vendorService, VendorProfile } from "@/services/vendorService";
import { serviceService, ServiceResponse } from "@/services/serviceService";
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
import { Plus, Briefcase, Search, RotateCcw, XCircle } from "lucide-react";
import { useState } from "react";

export default function VendorServicesPage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isVendor = user?.role?.toUpperCase() === "VENDOR";

  const [searchQuery, setSearchQuery] = useState("");
  const [deactivateServiceDialog, setDeactivateServiceDialog] = useState<{
    open: boolean;
    serviceId: number | null;
    serviceTitle: string;
  }>({
    open: false,
    serviceId: null,
    serviceTitle: "",
  });

  // Fetch vendor profile
  const { data: vendorProfile } = useQuery<VendorProfile>({
    queryKey: ["vendor", "profile"],
    queryFn: () => vendorService.getMyProfile(),
    enabled: isAuthenticated && isVendor,
  });

  // Fetch vendor services
  const { data: servicesData, isLoading } = useQuery({
    queryKey: ["vendor", "services"],
    queryFn: () => serviceService.getMyServices(undefined, 0, 100),
    enabled: isAuthenticated && isVendor,
  });

  const deactivateServiceMutation = useMutation({
    mutationFn: (serviceId: number) =>
      serviceService.deactivateService(serviceId),
    onSuccess: () => {
      toast({
        title: "Service deactivated",
        description:
          "Your service has been archived and is no longer visible to customers.",
      });
      queryClient.invalidateQueries({ queryKey: ["vendor", "services"] });
      setDeactivateServiceDialog({
        open: false,
        serviceId: null,
        serviceTitle: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to deactivate service.",
        variant: "destructive",
      });
    },
  });

  const reactivateServiceMutation = useMutation({
    mutationFn: (serviceId: number) =>
      serviceService.reactivateService(serviceId),
    onSuccess: () => {
      toast({
        title: "Service reactivated",
        description:
          "Your service was reactivated and is pending approval again.",
      });
      queryClient.invalidateQueries({ queryKey: ["vendor", "services"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to reactivate service.",
        variant: "destructive",
      });
    },
  });

  const services: ServiceResponse[] = servicesData?.content || [];

  const filteredServices = services.filter(
    (service) =>
      service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (service.categoryName &&
        service.categoryName
          .toLowerCase()
          .includes(searchQuery.toLowerCase())) ||
      (service.description &&
        service.description.toLowerCase().includes(searchQuery.toLowerCase()))
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
          <h2 className="text-xl font-semibold">My Services</h2>
          <p className="text-sm text-muted-foreground">
            Manage your service catalog
          </p>
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
            <Button
              variant="outline"
              className="opacity-50 cursor-not-allowed"
              disabled
            >
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
              {searchQuery
                ? "No services match your search"
                : "No services yet"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? "Try a different search term"
                : "Start by creating your first service"}
            </p>
            {!searchQuery &&
              (vendorProfile?.isApproved ? (
                <Button asChild>
                  <Link to="/vendor/services/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Service
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="opacity-50 cursor-not-allowed"
                  disabled
                >
                  <Plus className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="text-gray-400">Create Service</span>
                </Button>
              ))}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredServices.map((service: ServiceResponse) => (
            <Card key={service.id}>
              <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4">
                <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                  {service.primaryImageUrl ? (
                    <img
                      src={service.primaryImageUrl}
                      alt={service.title}
                      className="h-12 w-12 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded bg-eagle-green/10 flex items-center justify-center">
                      <Briefcase className="h-6 w-6 text-eagle-green" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate sm:whitespace-normal">
                      {service.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {service.city}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                  {getStatusBadge(service.status)}
                  <span className="font-medium">
                    {serviceService.formatPrice(
                      service.defaultPackage?.basePrice ??
                        service.basePrice ??
                        0,
                      service.defaultPackage?.currency ?? service.currency
                    )}
                  </span>
                  {service.hasPackages && (
                    <Badge variant="outline" className="text-xs">
                      {service.packages?.length || 0} packages
                    </Badge>
                  )}
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/vendor/services/${service.id}`}>
                      View Details
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/vendor/services/${service.id}/edit`}>Edit</Link>
                  </Button>
                  {service.status?.toUpperCase() === "ARCHIVED" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        reactivateServiceMutation.mutate(service.id)
                      }
                      disabled={reactivateServiceMutation.isPending}
                      className="text-green-600 hover:text-green-700"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Reactivate
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setDeactivateServiceDialog({
                          open: true,
                          serviceId: service.id,
                          serviceTitle: service.title,
                        })
                      }
                      disabled={deactivateServiceMutation.isPending}
                      className="text-red-600 hover:text-red-700"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Deactivate
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog
        open={deactivateServiceDialog.open}
        onOpenChange={(open) => {
          if (!open && !deactivateServiceMutation.isPending) {
            setDeactivateServiceDialog({
              open: false,
              serviceId: null,
              serviceTitle: "",
            });
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate "
              {deactivateServiceDialog.serviceTitle}"? This will hide the
              service from customers. You can reactivate it later, but it will
              require admin approval again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deactivateServiceMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => {
                if (deactivateServiceDialog.serviceId) {
                  deactivateServiceMutation.mutate(
                    deactivateServiceDialog.serviceId
                  );
                }
              }}
              disabled={deactivateServiceMutation.isPending}
            >
              {deactivateServiceMutation.isPending
                ? "Deactivating..."
                : "Deactivate"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
