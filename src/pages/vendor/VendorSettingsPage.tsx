import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { vendorService, VendorProfile } from "@/services/vendorService";
import { imageService } from "@/services/imageService";
import { certificateService } from "@/services/certificateService";
import {
  GoogleMapsProvider,
  LocationPicker,
  type LocationData,
} from "@/components/maps";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Store,
  Plus,
  RefreshCw,
  ImageIcon,
  Trash2,
  Award,
  Download,
  Loader2,
  XCircle,
  CheckCircle,
} from "lucide-react";

// Vendor Certificate Card Component
function VendorCertificateCard() {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  const {
    data: certificate,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["vendor", "my-certificate"],
    queryFn: () => certificateService.getMyCertificate(),
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const blob = await certificateService.downloadMyCertificatePdf();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-onboarding-certificate.pdf";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "Success",
        description: "Certificate downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to download certificate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading || isRefetching) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Onboarding Certificate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            <span className="ml-2">Loading certificate...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!certificate) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Onboarding Certificate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <XCircle className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-sm mb-2">
              No certificate found for your account.
            </p>
            <p className="text-xs text-gray-400 mb-4 text-center max-w-xs">
              If you completed the onboarding video, your certificate should
              appear here. Try refreshing if you just completed the process.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="text-emerald-600"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-emerald-600" />
          Onboarding Certificate
        </CardTitle>
        <CardDescription>
          Your vendor onboarding completion certificate.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center items-start gap-3 p-4 rounded-lg border bg-green-50 border-green-200">
          <CheckCircle className="h-8 w-8 text-green-600 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-medium text-green-900">Certificate Verified</h4>
            <p className="text-sm text-green-700">
              Issued on {new Date(certificate.issuedAt).toLocaleDateString()}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="w-full sm:w-auto"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg border break-words">
            <Label className="text-muted-foreground text-xs">
              Certificate Code
            </Label>
            <p className="font-mono font-bold text-emerald-600 break-all">
              {certificate.certificateCode}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border break-words">
            <Label className="text-muted-foreground text-xs">Vendor Type</Label>
            <p className="font-medium break-words">{certificate.vendorType}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border break-words">
            <Label className="text-muted-foreground text-xs">Full Name</Label>
            <p className="font-medium break-words">{certificate.fullName}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border break-words">
            <Label className="text-muted-foreground text-xs">Email</Label>
            <p className="font-medium break-all">{certificate.email}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Main Settings Page
export default function VendorSettingsPage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isVendor = user?.role?.toUpperCase() === "VENDOR";

  const [pendingLogo, setPendingLogo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(
    null
  );

  // Fetch vendor profile
  const { data: vendorProfile, isLoading } = useQuery<VendorProfile>({
    queryKey: ["vendor", "profile"],
    queryFn: () => vendorService.getMyProfile(),
    enabled: isAuthenticated && isVendor,
  });

  // Upload logo mutation
  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!vendorProfile?.id) throw new Error("Vendor profile not found");
      return imageService.uploadVendorLogo(vendorProfile.id, file);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Logo uploaded successfully" });
      queryClient.invalidateQueries({ queryKey: ["vendor", "profile"] });
      setPendingLogo(null);
      setPreviewUrl(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload logo",
        variant: "destructive",
      });
    },
  });

  // Delete logo mutation
  const deleteLogoMutation = useMutation({
    mutationFn: async () => {
      if (!vendorProfile?.id) throw new Error("Vendor profile not found");
      return imageService.deleteVendorLogo(vendorProfile.id);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Logo deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["vendor", "profile"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete logo",
        variant: "destructive",
      });
    },
  });

  // Save vendor location mutation
  const saveLocationMutation = useMutation({
    mutationFn: async (location: LocationData) => {
      if (!vendorProfile) {
        throw new Error("Vendor profile not found");
      }

      const shouldFill = (value?: string) =>
        !value || value.trim().length === 0;

      return vendorService.updateMyProfile({
        businessName: vendorProfile.businessName,
        description: vendorProfile.description,
        businessEmail: vendorProfile.businessEmail,
        businessPhone: vendorProfile.businessPhone,
        city: shouldFill(vendorProfile.city)
          ? location.city || undefined
          : vendorProfile.city,
        country: shouldFill(vendorProfile.country)
          ? location.country || undefined
          : vendorProfile.country,
        countryCode: shouldFill(vendorProfile.countryCode)
          ? location.countryCode || undefined
          : vendorProfile.countryCode,
        latitude: location.latitude,
        longitude: location.longitude,
        placeId: shouldFill(vendorProfile.placeId)
          ? location.placeId || undefined
          : vendorProfile.placeId,
        formattedAddress: shouldFill(vendorProfile.formattedAddress)
          ? location.formattedAddress || undefined
          : vendorProfile.formattedAddress,
        streetAddress: shouldFill(vendorProfile.streetAddress)
          ? location.streetAddress || undefined
          : vendorProfile.streetAddress,
        deliveryRadiusKm: vendorProfile.deliveryRadiusKm,
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Location saved successfully" });
      queryClient.invalidateQueries({ queryKey: ["vendor", "profile"] });
      setShowLocationPicker(false);
      setSelectedLocation(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to save location",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Error",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "File size must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      setPendingLogo(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = () => {
    if (pendingLogo) {
      setIsUploading(true);
      uploadLogoMutation.mutate(pendingLogo, {
        onSettled: () => setIsUploading(false),
      });
    }
  };

  const handleCancelUpload = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPendingLogo(null);
    setPreviewUrl(null);
  };

  const handleDeleteLogo = () => {
    if (confirm("Are you sure you want to delete your business logo?")) {
      deleteLogoMutation.mutate();
    }
  };

  const handleSaveLocation = () => {
    if (!selectedLocation) {
      toast({
        title: "Select location",
        description: "Please choose your location on the map first.",
        variant: "destructive",
      });
      return;
    }

    saveLocationMutation.mutate(selectedLocation);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const currentLogoUrl = vendorProfile?.logoUrl;
  const hasCoordinates =
    vendorProfile?.latitude != null && vendorProfile?.longitude != null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold">Business Settings</h2>

      {/* Business Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Business Logo
          </CardTitle>
          <CardDescription>
            Upload your business logo. This will be displayed on your vendor
            profile and products.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Logo or Preview */}
          <div className="flex flex-col lg:flex-row items-start gap-6">
            <div className="flex-shrink-0 mx-auto lg:mx-0">
              {previewUrl ? (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Logo preview"
                    className="w-32 h-32 object-cover rounded-lg border-2 border-dashed border-primary"
                  />
                  <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                    Preview
                  </span>
                </div>
              ) : currentLogoUrl ? (
                <img
                  src={currentLogoUrl}
                  alt="Business logo"
                  className="w-32 h-32 object-cover rounded-lg border"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.nextElementSibling?.classList.remove(
                      "hidden"
                    );
                  }}
                />
              ) : null}
              {!previewUrl && !currentLogoUrl && (
                <div className="w-32 h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                  <Store className="h-12 w-12 text-gray-400" />
                </div>
              )}
              {!previewUrl && currentLogoUrl && (
                <div className="w-32 h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 items-center justify-center hidden">
                  <Store className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </div>

            <div className="flex-1 w-full lg:w-auto space-y-4">
              {pendingLogo ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Selected:{" "}
                    <span className="font-medium">{pendingLogo.name}</span>
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={handleUpload}
                      disabled={isUploading || uploadLogoMutation.isPending}
                      className="w-full sm:w-auto"
                    >
                      {isUploading ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Upload Logo
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancelUpload}
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="logo-upload" className="cursor-pointer">
                    <div className="inline-flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50 transition-colors">
                      <Plus className="h-4 w-4" />
                      {currentLogoUrl ? "Change Logo" : "Upload Logo"}
                    </div>
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleFileSelect}
                      className="hidden"
                      aria-label="Upload logo image"
                    />
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Accepted formats: JPEG, PNG, GIF, WebP. Max size: 5MB.
                  </p>
                  {currentLogoUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive w-full sm:w-auto"
                      onClick={handleDeleteLogo}
                      disabled={deleteLogoMutation.isPending}
                    >
                      {deleteLogoMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Delete Logo
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Information (Read-only for now) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Business Information
          </CardTitle>
          <CardDescription>Your business details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="break-words">
              <Label className="text-muted-foreground">Business Name</Label>
              <p className="font-medium break-words">
                {vendorProfile?.businessName || "-"}
              </p>
            </div>
            <div className="break-words">
              <Label className="text-muted-foreground">Business Email</Label>
              <p className="font-medium break-all">
                {vendorProfile?.businessEmail || "-"}
              </p>
            </div>
            <div className="break-words">
              <Label className="text-muted-foreground">Business Phone</Label>
              <p className="font-medium break-words">
                {vendorProfile?.businessPhone || "-"}
              </p>
            </div>
            <div className="break-words">
              <Label className="text-muted-foreground">City</Label>
              <p className="font-medium break-words">
                {vendorProfile?.city || "-"}
              </p>
            </div>
            <div className="break-words">
              <div className="flex items-center gap-2">
                <Label className="text-muted-foreground">Country</Label>
              </div>
              <p className="font-medium break-words">
                {vendorProfile?.country || "-"}
              </p>
            </div>

            {!hasCoordinates && (
              <div className="break-words">
               
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  onClick={() => setShowLocationPicker((prev) => !prev)}
                >
                  Add your location
                </Button>
              </div>
            )}
          </div>

          {!hasCoordinates && showLocationPicker && (
            <div className="mt-4 space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
              <div>
                <Label className="text-sm font-medium">
                  Pick your business location
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Drop a pin on the map and save to register your coordinates
                  and missing address details.
                </p>
              </div>

              <GoogleMapsProvider>
                <LocationPicker
                  latitude={selectedLocation?.latitude}
                  longitude={selectedLocation?.longitude}
                  onLocationSelect={setSelectedLocation}
                  height="320px"
                  placeholder="Search your business address..."
                />
              </GoogleMapsProvider>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  onClick={handleSaveLocation}
                  disabled={!selectedLocation || saveLocationMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {saveLocationMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Location"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowLocationPicker(false);
                    setSelectedLocation(null);
                  }}
                  className="w-full sm:w-auto"
                  disabled={saveLocationMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {vendorProfile?.description && (
            <div className="mt-4">
              <Label className="text-muted-foreground">Description</Label>
              <p className="text-sm mt-1 break-words">
                {vendorProfile.description}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Onboarding Certificate */}
      <VendorCertificateCard />
    </div>
  );
}
