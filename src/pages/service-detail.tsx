import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Shield,
  CheckCircle,
  Users,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceReviewsSection } from "@/components/reviews";
import { DiscountBadge } from "@/components/DiscountBadge";
import { PriceWithDiscount } from "@/components/PriceWithDiscount";

import {
  serviceService,
  PoliciesConfig,
  AvailabilityConfig,
} from "@/services/serviceService";
import { useAuth } from "@/hooks/useAuth";
import { useActiveCurrency } from "@/hooks/useActiveCurrency";

export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isInitialized } = useAuth();
  const activeCurrency = useActiveCurrency();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(
    null
  );

  const {
    data: service,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["service", id, activeCurrency],
    queryFn: () => (id ? serviceService.getService(parseInt(id)) : null),
    enabled: !!id && isInitialized,
  });

  // Get approved packages for display and selection
  const availablePackages = useMemo(() => {
    if (!service?.packages) return [];
    return service.packages.filter((pkg) => pkg.status === "APPROVED");
  }, [service]);

  // Auto-select when there is exactly one package
  useEffect(() => {
    if (availablePackages.length === 1) {
      const onlyPackageId = availablePackages[0].id;
      if (selectedPackageId !== onlyPackageId) {
        setSelectedPackageId(onlyPackageId);
      }
      return;
    }

    if (
      selectedPackageId != null &&
      !availablePackages.some((pkg) => pkg.id === selectedPackageId)
    ) {
      setSelectedPackageId(null);
    }
  }, [availablePackages, selectedPackageId]);

  // Get the currently selected package
  const selectedPackage = useMemo(() => {
    if (!service) return null;

    if (selectedPackageId != null) {
      return (
        availablePackages.find((pkg) => pkg.id === selectedPackageId) ||
        service.defaultPackage ||
        availablePackages[0] ||
        null
      );
    }

    if (availablePackages.length === 1) {
      return availablePackages[0];
    }

    return service.defaultPackage || availablePackages[0] || null;
  }, [service, selectedPackageId, availablePackages]);

  const policies = useMemo<PoliciesConfig>(() => {
    if (!service) return {};
    return serviceService.parsePoliciesConfig(service);
  }, [service]);

  // Get availability from selected package (package-level availability takes priority)
  const availability = useMemo<AvailabilityConfig>(() => {
    // First try to get from selected package
    if (selectedPackage?.availabilityConfig) {
      return selectedPackage.availabilityConfig;
    }
    // Fallback to service-level availability
    if (!service) return {};
    return serviceService.parseAvailabilityConfig(service);
  }, [selectedPackage, service]);

  // Get availability type from selected package
  const availabilityType = useMemo(() => {
    return selectedPackage?.availabilityType || service?.availabilityType;
  }, [selectedPackage, service]);

  const displayImages = useMemo(() => {
    const images: string[] = [];

    // First, add selected package images (shown first)
    if (selectedPackage?.images && selectedPackage.images.length > 0) {
      const packageImages = [...selectedPackage.images]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((img) => img.fullUrl);
      images.push(...packageImages);
    }

    // Then, add service-level images at the end
    if (service?.images && service.images.length > 0) {
      const serviceImages = [...service.images]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((img) => img.fullUrl);
      images.push(...serviceImages);
    }

    return images;
  }, [service, selectedPackage]);

  // Get price from selected package if available, otherwise use base price
  // Prefer backend-calculated major units (basePrice) over minor units
  const displayPriceMajor = useMemo(() => {
    return selectedPackage?.basePrice ?? service?.basePrice ?? undefined;
  }, [selectedPackage, service]);

  const displayPriceMinor = useMemo(() => {
    return selectedPackage?.basePriceMinor ?? service?.basePriceMinor ?? 0;
  }, [selectedPackage, service]);

  const displayCurrency = useMemo(() => {
    return selectedPackage?.currency ?? service?.currency ?? "ETB";
  }, [selectedPackage, service]);

  useMemo(() => {
    if (!service) return undefined;
    return serviceService.getPrimaryImageUrl(service);
  }, [service]);
  const nextImage = () => {
    if (displayImages.length === 0) return;
    setSelectedImageIndex((prev) => (prev + 1) % displayImages.length);
  };

  const prevImage = () => {
    if (displayImages.length === 0) return;
    setSelectedImageIndex(
      (prev) => (prev - 1 + displayImages.length) % displayImages.length
    );
  };

  const openLightbox = (index: number) => {
    setSelectedImageIndex(index);
    setLightboxOpen(true);
  };

  // Format working days for display
  const workingDaysDisplay = useMemo(() => {
    const days = availability.workingDays || [];
    if (days.length === 7) return "Every day";
    if (days.length === 5 && !days.includes(0) && !days.includes(6))
      return "Weekdays";
    if (days.length === 2 && days.includes(0) && days.includes(6))
      return "Weekends only";
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days.map((d) => dayNames[d]).join(", ");
  }, [availability]);
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-eagle-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-light text-eagle-green">
            Loading service details...
          </p>
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-eagle-green mb-2">
            Service Not Found
          </h2>
          <p className="font-light text-eagle-green/70 mb-4">
            The service you're looking for doesn't exist or is not available.
          </p>
          <Button
            onClick={() => navigate("/services")}
            className="bg-eagle-green hover:bg-viridian-green text-white"
          >
            Browse All Services
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxOpen && displayImages.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
            onClick={() => setLightboxOpen(false)}
          >
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-50"
            >
              <X className="h-8 w-8" />
            </button>

            {displayImages.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prevImage();
                  }}
                  className="absolute left-4 text-white hover:text-gray-300 z-50 p-2 bg-black/50 rounded-full"
                >
                  <ChevronLeft className="h-8 w-8" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextImage();
                  }}
                  className="absolute right-4 text-white hover:text-gray-300 z-50 p-2 bg-black/50 rounded-full"
                >
                  <ChevronRight className="h-8 w-8" />
                </button>
              </>
            )}

            <motion.img
              key={selectedImageIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              src={displayImages[selectedImageIndex]}
              alt={`${service.title} - Image ${selectedImageIndex + 1}`}
              className="max-h-[90vh] max-w-[90vw] object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {displayImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white font-light">
                {selectedImageIndex + 1} / {displayImages.length}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/services")}
          className="mb-6 text-eagle-green hover:text-viridian-green hover:bg-june-bud/10"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Services
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Hero Section with Image Gallery */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* Image Gallery */}
              <div className="space-y-4 mb-6">
                {displayImages.length > 0 ? (
                  <>
                    {/* Main Image */}
                    <div
                      className="relative aspect-[16/9] bg-gray-100 rounded-2xl overflow-hidden shadow-lg cursor-pointer group"
                      onClick={() => openLightbox(selectedImageIndex)}
                    >
                      <img
                        src={displayImages[selectedImageIndex]}
                        alt={service.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center pointer-events-none">
                        <ZoomIn className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>

                      {/* Navigation arrows */}
                      {displayImages.length > 1 && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              prevImage();
                            }}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <ChevronLeft className="h-5 w-5 text-eagle-green" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              nextImage();
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <ChevronRight className="h-5 w-5 text-eagle-green" />
                          </button>
                        </>
                      )}

                      {/* Image counter */}
                      {displayImages.length > 1 && (
                        <div className="absolute bottom-4 left-4">
                          <Badge className="bg-black/60 text-white border-none font-light">
                            {selectedImageIndex + 1} / {displayImages.length}
                          </Badge>
                        </div>
                      )}

                      {/* Location Badge */}
                      {service.city && (
                        <div className="absolute top-4 right-4">
                          <Badge className="bg-white/90 text-eagle-green border-none font-bold">
                            <MapPin className="h-3 w-3 mr-1" />
                            {service.city}
                          </Badge>
                        </div>
                      )}

                      {/* Price Badge */}
                      <div className="absolute bottom-4 right-4">
                        <Badge className="bg-eagle-green text-white border-none font-bold text-lg px-3 py-1">
                          From{" "}
                          {serviceService.formatPrice(
                            displayPriceMajor ?? 0,
                            displayCurrency
                          )}
                        </Badge>
                      </div>
                    </div>

                    {/* Thumbnail Images */}
                    {displayImages.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {displayImages.map((image, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedImageIndex(index)}
                            className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                              index === selectedImageIndex
                                ? "border-viridian-green ring-2 ring-viridian-green/30"
                                : "border-transparent hover:border-gray-300"
                            }`}
                          >
                            <img
                              src={image}
                              alt={`${service.title} thumbnail ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  /* No Image Available */
                  <div className="relative aspect-[16/9] bg-gray-100 rounded-2xl overflow-hidden shadow-lg">
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-16 w-16 text-gray-300" />
                    </div>

                    {/* Location Badge */}
                    {service.city && (
                      <div className="absolute top-4 right-4">
                        <Badge className="bg-white/90 text-eagle-green border-none font-bold">
                          <MapPin className="h-3 w-3 mr-1" />
                          {service.city}
                        </Badge>
                      </div>
                    )}

                    {/* Price Badge */}
                    <div className="absolute bottom-4 right-4">
                      <Badge className="bg-eagle-green text-white border-none font-bold text-lg px-3 py-1">
                        From{" "}
                        {serviceService.formatPrice(
                          displayPriceMajor ?? 0,
                          displayCurrency
                        )}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  {service.categoryName && (
                    <span className="text-sm font-light text-viridian-green">
                      {service.categoryName}
                    </span>
                  )}
                  <h1 className="text-3xl lg:text-4xl font-bold text-eagle-green mt-1">
                    {service.title}
                  </h1>
                </div>

                {service.vendorName && (
                  <div className="flex items-center gap-1 text-sm">
                    <Users className="h-4 w-4 text-viridian-green" />
                    <span className="font-light text-eagle-green/70">
                      by {service.vendorName}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Package Variants */}
            {availablePackages.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="font-bold text-eagle-green">
                      {availablePackages.length === 1
                        ? "Package"
                        : "Available Packages"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {availablePackages.map((pkg) => (
                        <button
                          key={pkg.id}
                          onClick={() => setSelectedPackageId(pkg.id)}
                          className={`p-4 rounded-lg border-2 transition-all text-left ${
                            selectedPackage?.id === pkg.id
                              ? "border-viridian-green bg-june-bud/10"
                              : "border-gray-200 hover:border-viridian-green/50"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-bold text-eagle-green">
                              {pkg.name}
                            </h4>
                            {pkg.isDefault && (
                              <Badge className="bg-viridian-green text-white text-xs">
                                Default
                              </Badge>
                            )}
                          </div>
                          {pkg.description && (
                            <p className="text-sm font-light text-eagle-green/70 mb-2 line-clamp-2">
                              {pkg.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <span className="font-bold text-eagle-green">
                              {serviceService.formatPrice(
                                pkg.basePrice ?? 0,
                                pkg.currency
                              )}
                            </span>
                            {pkg.durationMinutes != null &&
                              pkg.durationMinutes > 0 && (
                                <span className="text-sm font-light text-eagle-green/70 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {pkg.durationMinutes}m
                                </span>
                              )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="font-bold text-eagle-green">
                    About This Service
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-light text-eagle-green/80 leading-relaxed mb-4 whitespace-pre-wrap">
                    {service.description || "No description available."}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {service.location && (
                      <div>
                        <h4 className="font-bold text-eagle-green mb-2">
                          Location
                        </h4>
                        <p className="font-light text-eagle-green/70">
                          {service.location}
                        </p>
                      </div>
                    )}

                    {/* Working Days - from package availability */}
                    {availability.workingDays &&
                      availability.workingDays.length > 0 && (
                        <div>
                          <h4 className="font-bold text-eagle-green mb-2">
                            Working Days
                          </h4>
                          <p className="font-light text-eagle-green/70">
                            {workingDaysDisplay}
                          </p>
                        </div>
                      )}

                    {/* Working Hours Display - from package availability */}
                    {availabilityType === "WORKING_HOURS" &&
                      availability.workingHoursStart &&
                      availability.workingHoursEnd && (
                        <div>
                          <h4 className="font-bold text-eagle-green mb-2">
                            Working Hours
                          </h4>
                          <p className="font-light text-eagle-green/70">
                            {availability.workingHoursStart} -{" "}
                            {availability.workingHoursEnd}
                          </p>
                        </div>
                      )}

                    {/* Time Slots Display - from package availability */}
                    {availabilityType === "TIME_SLOTS" &&
                      availability.timeSlots &&
                      availability.timeSlots.length > 0 && (
                        <div>
                          <h4 className="font-bold text-eagle-green mb-2">
                            Available Time Slots
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {availability.timeSlots.map((slot, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-june-bud/20 text-eagle-green rounded text-sm"
                              >
                                {slot}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Max Bookings Per Day - from package */}
                    {selectedPackage?.maxBookingsPerDay != null &&
                      selectedPackage.maxBookingsPerDay > 0 && (
                        <div>
                          <h4 className="font-bold text-eagle-green mb-2">
                            Daily Availability
                          </h4>
                          <p className="font-light text-eagle-green/70">
                            Limited to {selectedPackage.maxBookingsPerDay}{" "}
                            bookings per day
                          </p>
                        </div>
                      )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Package Attributes */}
            {selectedPackage?.attributes &&
              selectedPackage.attributes.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.25 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="font-bold text-eagle-green">
                        Package Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 gap-4">
                        {selectedPackage.attributes
                          .sort((a, b) => a.sortOrder - b.sortOrder)
                          .map((attr) => (
                            <div
                              key={attr.id}
                              className="flex items-start gap-2"
                            >
                              <Check className="h-5 w-5 text-viridian-green flex-shrink-0 mt-0.5" />
                              <div>
                                {attr.name && (
                                  <span className="font-bold text-eagle-green">
                                    {attr.name}:{" "}
                                  </span>
                                )}
                                <span className="font-light text-eagle-green/80">
                                  {attr.value}
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

            {/* Policies */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="font-bold text-eagle-green flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Payment & Cancellation Policy
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-bold text-eagle-green mb-1">
                        Payment
                      </h4>
                      <p className="font-light text-eagle-green/70 text-sm">
                        Full payment required at booking
                      </p>
                    </div>
                    <div>
                      <h4 className="font-bold text-eagle-green mb-1">
                        Confirmation
                      </h4>
                      <p className="font-light text-eagle-green/70 text-sm">
                        Vendor confirmation required after payment
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-eagle-green mb-1">
                      Cancellation & Refund Policy (System-Enforced)
                    </h4>
                    <p className="font-light text-eagle-green/70 text-sm">
                      Full refund for cancellations 48+ hours before service.
                      50% refund for cancellations 24-48 hours before. No refund
                      for cancellations less than 24 hours before service.
                    </p>
                  </div>

                  {/* Refund Tiers Info */}
                  <div className="bg-june-bud/10 rounded-lg p-4 mt-4">
                    <h4 className="font-bold text-eagle-green mb-2">
                      Refund Tiers
                    </h4>
                    <ul className="space-y-2 text-sm font-light text-eagle-green/70">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>
                          48+ hours before: 100% refund (minus platform fee)
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-yellow-500" />
                        <span>24-48 hours before: 50% refund</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-red-500" />
                        <span>Less than 24 hours: No refund</span>
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Service Reviews Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <ServiceReviewsSection serviceId={service.id} />
            </motion.div>
          </div>

          {/* Booking Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <Card className="border-eagle-green/20">
                <CardHeader className="bg-gradient-to-r from-june-bud/10 to-white">
                  <CardTitle className="font-bold text-eagle-green flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Service Provider
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="text-center">
                    <h3 className="font-bold text-eagle-green text-lg mb-1">
                      {service.vendorName || "Service Provider"}
                    </h3>
                  </div>

                  {service.city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-viridian-green" />
                      <span className="font-light text-eagle-green">
                        {service.city}
                        {service.location ? `, ${service.location}` : ""}
                      </span>
                    </div>
                  )}

                  <div className="bg-june-bud/10 rounded-lg p-4">
                    <div className="text-center">
                      {selectedPackage && (
                        <p className="font-bold text-eagle-green text-sm mb-2">
                          {selectedPackage.name}
                        </p>
                      )}
                      {service.activeDiscount && (
                        <div className="mb-2 flex justify-center">
                          <DiscountBadge
                            discount={service.activeDiscount}
                            variant="compact"
                            size="small"
                          />
                        </div>
                      )}
                      <p className="font-light text-eagle-green/70 text-sm mb-2">
                        {availablePackages.length > 1
                          ? "Selected Package Price"
                          : "Starting from"}
                      </p>
                      <div className="flex justify-center">
                        <PriceWithDiscount
                          originalPrice={displayPriceMajor || 0}
                          currency={displayCurrency}
                          discount={service.activeDiscount}
                          size="medium"
                          showSavings={false}
                        />
                      </div>
                      {selectedPackage?.durationMinutes != null &&
                        selectedPackage.durationMinutes > 0 && (
                          <p className="font-light text-eagle-green/70 text-xs mt-1">
                            Duration: {selectedPackage.durationMinutes} minutes
                          </p>
                        )}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full border-eagle-green text-eagle-green hover:bg-eagle-green hover:text-white font-bold h-12"
                    onClick={() => {
                      const packageParam = selectedPackageId
                        ? `?packageId=${selectedPackageId}`
                        : "";
                      navigate(
                        `/service-checkout/${service.id}${packageParam}`
                      );
                    }}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Book Now
                  </Button>

                  <div className="flex items-center gap-2 text-sm font-light text-eagle-green/70">
                    <Clock className="h-4 w-4" />
                    <span>Responds within 24 hours</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
