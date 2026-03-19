import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  Mail,
  Phone,
  Gift,
  CheckCircle,
  Clock,
  CreditCard,
  Loader2,
  Shield,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Tag,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { DiscountBadge } from "@/components/DiscountBadge";
import { PriceWithDiscount } from "@/components/PriceWithDiscount";
import PaymentMethodSelector from "@/components/PaymentMethodSelector";

import { serviceService, AvailabilityConfig } from "@/services/serviceService";
import {
  serviceOrderService,
  CreateServiceOrderRequest,
} from "@/services/serviceOrderService";
import {
  discountService,
  type DiscountValidationResult,
} from "@/services/discountService";
import {
  formatPrice,
  calculateDiscountedPrice,
  getDiscountAmountForDisplay,
} from "@/lib/currency";

export default function ServiceCheckout() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const selectedPackageId = useMemo(() => {
    const packageIdParam = searchParams.get("packageId");
    if (!packageIdParam) return undefined;
    const parsed = Number(packageIdParam);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }, [searchParams]);

  // Form state
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlotIso, setSelectedSlotIso] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [discountResult, setDiscountResult] =
    useState<DiscountValidationResult | null>(null);
  const [isValidatingDiscount, setIsValidatingDiscount] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [paymentProvider, setPaymentProvider] = useState<"STRIPE" | "CHAPA">(
    "STRIPE"
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState<{
    title: string;
  } | null>(null);

  // Calendar navigation state - backend availability page index (0-based)
  const [availabilityPage, setAvailabilityPage] = useState(0);

  // Fetch service details
  const {
    data: service,
    isLoading,
    isFetching: isFetchingServiceMonth,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["service", serviceId, availabilityPage],
    queryFn: () =>
      serviceService.getService(Number(serviceId), availabilityPage),
    enabled: !!serviceId,
    // Keep current month data visible while fetching the next/previous month.
    placeholderData: (previousData) => previousData,
  });

  const selectedPackage = useMemo(() => {
    if (!service?.packages?.length) return service?.defaultPackage;
    if (!selectedPackageId) return service.defaultPackage;
    return (
      service.packages.find((pkg) => pkg.id === selectedPackageId) ||
      service.defaultPackage
    );
  }, [service, selectedPackageId]);

  // Fetch available time slots (ISO instants) for selected date
  const {
    data: availableSlots,
    refetch: refetchAvailableSlots,
    isFetching: isFetchingAvailableSlots,
  } = useQuery({
    queryKey: [
      "service-available-slots",
      serviceId,
      selectedDate,
      selectedPackage?.id,
    ],
    queryFn: () =>
      serviceService.getAvailableSlots(Number(serviceId), selectedDate),
    enabled: !!serviceId && !!selectedDate,
  });

  // Parse configs
  const availability = useMemo<AvailabilityConfig>(() => {
    if (!service) return {};
    const config =
      selectedPackage?.availabilityConfig ||
      serviceService.parseAvailabilityConfig(service);
    // Debug: log availability config source
    console.log("Availability Config Debug:", {
      selectedPackageId,
      selectedPackageAvailabilityConfig: selectedPackage?.availabilityConfig,
      serviceAvailabilityConfig: service.availabilityConfig,
      defaultPackageAvailabilityConfig:
        service.defaultPackage?.availabilityConfig,
      parsedConfig: config,
      workingDays: config.workingDays,
    });
    return config;
  }, [service, selectedPackage, selectedPackageId]);

  const displayPriceMajor = useMemo(() => {
    return selectedPackage?.basePrice ?? service?.basePrice ?? undefined;
  }, [selectedPackage, service]);

  const displayPriceMinor = useMemo(() => {
    return selectedPackage?.basePriceMinor ?? service?.basePriceMinor ?? 0;
  }, [selectedPackage, service]);

  const displayCurrency = useMemo(() => {
    return selectedPackage?.currency ?? service?.currency ?? "ETB";
  }, [selectedPackage, service]);

  const effectiveAvailabilityType = useMemo(() => {
    return (
      selectedPackage?.availabilityType ??
      service?.availabilityType ??
      "TIME_SLOTS"
    );
  }, [selectedPackage, service]);

  const bookingDurationMinutes = useMemo(() => {
    const duration =
      selectedPackage?.durationMinutes ?? service?.durationMinutes ?? 60;
    return duration > 0 ? duration : 60;
  }, [selectedPackage, service]);

  useEffect(() => {
    setSelectedDate("");
    setSelectedSlotIso("");
    setAvailabilityPage(0);
  }, [selectedPackageId]);

  useEffect(() => {
    setSelectedSlotIso("");
  }, [selectedDate]);

  const appliedDiscountCode = useMemo(() => {
    const manualCode = discountCode.trim();
    if (manualCode) return manualCode;
    return service?.activeDiscount?.code || "";
  }, [discountCode, service?.activeDiscount?.code]);

  // Calculate the manually-validated discount amount in display (major) units
  const manualDiscountAmountDisplay = useMemo(() => {
    return getDiscountAmountForDisplay(discountResult, displayCurrency);
  }, [discountResult, displayCurrency]);

  const finalAmount = useMemo(() => {
    if (displayPriceMajor === undefined) return 0;

    // If we have a manual discount applied, use its amount (already converted in manualDiscountAmountDisplay)
    if (discountResult?.applicable && manualDiscountAmountDisplay > 0) {
      return Math.max(0, displayPriceMajor - manualDiscountAmountDisplay);
    }

    // Fallback to service's active discount - use the centralized utility
    if (service?.activeDiscount) {
      return calculateDiscountedPrice(
        displayPriceMajor,
        displayCurrency,
        service.activeDiscount
      );
    }

    return displayPriceMajor;
  }, [
    displayPriceMajor,
    displayCurrency,
    discountResult,
    manualDiscountAmountDisplay,
    service?.activeDiscount,
  ]);

  const hasManualDiscount = useMemo(() => {
    return !!(discountResult?.applicable && manualDiscountAmountDisplay > 0);
  }, [discountResult, manualDiscountAmountDisplay]);

  const hasDiscountedTotal = useMemo(() => {
    if (displayPriceMajor === undefined) return false;
    return finalAmount < displayPriceMajor;
  }, [displayPriceMajor, finalAmount]);

  const paymentProviderLabel = useMemo(() => {
    return paymentProvider === "STRIPE" ? "Stripe" : "Chapa";
  }, [paymentProvider]);

  const preferredCurrencyCode = useMemo(() => {
    return (user?.preferredCurrencyCode || "ETB").toUpperCase();
  }, [user?.preferredCurrencyCode]);

  const allowedPaymentMethods = useMemo(() => {
    return preferredCurrencyCode === "ETB"
      ? (["chapa"] as const)
      : (["stripe"] as const);
  }, [preferredCurrencyCode]);

  useEffect(() => {
    if (preferredCurrencyCode === "ETB" && paymentProvider !== "CHAPA") {
      setPaymentProvider("CHAPA");
      return;
    }

    if (preferredCurrencyCode !== "ETB" && paymentProvider !== "STRIPE") {
      setPaymentProvider("STRIPE");
    }
  }, [preferredCurrencyCode, paymentProvider]);

  const handleApplyDiscount = useCallback(async () => {
    const code = discountCode.trim();
    if (!code) {
      setDiscountError("Please enter a discount code");
      return;
    }
    if (!displayCurrency || !displayPriceMinor) {
      setDiscountError("Service price not available");
      return;
    }

    setIsValidatingDiscount(true);
    setDiscountError(null);
    setDiscountResult(null);

    try {
      const result = await discountService.validateDiscountCode({
        discountCode: code,
        orderTotalMinor: displayPriceMinor,
        orderItems: [
          {
            itemId: Number(serviceId),
            categoryId: null,
            itemTotalMinor: displayPriceMinor,
          },
        ],
      });

      if (result.applicable) {
        setDiscountResult(result);
        setDiscountError(null);
        toast({
          title: "Discount Applied",
          description: `Discount code "${code}" applied successfully!`,
        });
      } else {
        setDiscountResult(null);
        setDiscountError(
          result.reason || "Discount code is not valid for this service"
        );
      }
    } catch (error: any) {
      setDiscountResult(null);
      setDiscountError(error?.message || "Failed to validate discount code");
    } finally {
      setIsValidatingDiscount(false);
    }
  }, [discountCode, displayCurrency, displayPriceMinor, serviceId, toast]);

  const handleRemoveDiscount = useCallback(() => {
    setDiscountResult(null);
    setDiscountError(null);
    setDiscountCode("");
  }, []);

  useEffect(() => {
    if (user) {
      if (user.email && !contactEmail) {
        setContactEmail(user.email);
      }
      if (user.phoneNumber && !contactPhone) {
        setContactPhone(user.phoneNumber);
      }
    }
  }, [user]);

  const monthAnchorDate = useMemo(() => {
    const windowStartDate = service?.availabilitySpotsPage?.windowStartDate;
    if (!windowStartDate) {
      const today = new Date();
      return new Date(today.getFullYear(), today.getMonth(), 1);
    }

    const [year, month, day] = windowStartDate.split("-").map(Number);
    if (!year || !month || !day) {
      const today = new Date();
      return new Date(today.getFullYear(), today.getMonth(), 1);
    }

    return new Date(year, month - 1, 1);
  }, [service?.availabilitySpotsPage?.windowStartDate]);

  // Generate calendar grid for the current month
  const calendarGrid = useMemo(() => {
    const year = monthAnchorDate.getFullYear();
    const month = monthAnchorDate.getMonth();

    // Get first day of month and how many days in month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday

    // Create calendar grid (6 weeks x 7 days = 42 cells)
    const grid: (string | null)[] = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      grid.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      // Format date as YYYY-MM-DD in local timezone (avoid toISOString which uses UTC)
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}`;
      grid.push(dateStr);
    }

    // Fill remaining cells to complete the grid (42 total cells)
    while (grid.length < 42) {
      grid.push(null);
    }

    return grid;
  }, [monthAnchorDate]);

  // Backend is the source of truth for which dates are available in this month window.
  const availableDatesInMonth = useMemo(() => {
    return new Set(
      (service?.availabilitySpotsPage?.days || []).map((day) => day.date)
    );
  }, [service?.availabilitySpotsPage?.days]);

  useEffect(() => {
    if (selectedDate && !availableDatesInMonth.has(selectedDate)) {
      setSelectedDate("");
      setSelectedSlotIso("");
    }
  }, [selectedDate, availableDatesInMonth]);

  // Navigation functions - move by backend-provided availability pages
  const goToPreviousMonth = () => {
    setAvailabilityPage((prev) => Math.max(0, prev - 1));
  };

  const goToNextMonth = () => {
    if (canGoNext) {
      setAvailabilityPage((prev) => prev + 1);
    }
  };

  // Check if navigation buttons should be disabled
  const canGoPrevious = availabilityPage > 0;
  const canGoNext = true;

  const slotOptions = useMemo(() => {
    const unique = Array.from(new Set((availableSlots || []).filter(Boolean)));
    const sorted = unique
      .map((iso) => ({
        iso,
        timestamp: new Date(iso).getTime(),
      }))
      .filter((item) => !Number.isNaN(item.timestamp))
      .sort((a, b) => a.timestamp - b.timestamp);

    if (effectiveAvailabilityType !== "WORKING_HOURS") {
      return sorted;
    }

    const minimumGapMs = Math.max(1, bookingDurationMinutes) * 60 * 1000;
    const filtered: { iso: string; timestamp: number }[] = [];

    for (const slot of sorted) {
      const previous = filtered[filtered.length - 1];
      if (!previous || slot.timestamp - previous.timestamp >= minimumGapMs) {
        filtered.push(slot);
      }
    }

    return filtered;
  }, [availableSlots, effectiveAvailabilityType, bookingDurationMinutes]);

  const handleCheckout = async () => {
    if (!service) return;
    setCheckoutError(null);

    // Validation
    if (!selectedDate || !selectedSlotIso) {
      toast({
        title: "Missing Date/Time",
        description: "Please select a date and time for your service.",
        variant: "destructive",
      });
      return;
    }

    if (!contactEmail) {
      toast({
        title: "Missing Contact Email",
        description: "Please enter your contact email.",
        variant: "destructive",
      });
      return;
    }
    setIsProcessing(true);

    try {
      // Debug logging
      console.log("Selected Date:", selectedDate);
      console.log("Selected Slot ISO:", selectedSlotIso);

      // Use server-returned ISO datetime exactly; do not rebuild from local parts
      const scheduledDateTime = selectedSlotIso;
      console.log("Scheduled DateTime:", scheduledDateTime);

      const isAvailable = await serviceService.checkSlotAvailability(
        service.id,
        scheduledDateTime
      );
      if (!isAvailable) {
        setCheckoutError({
          title: "This Time Slot Is No Longer Available",
        });
        setIsProcessing(false);
        return;
      }

      const orderRequest: CreateServiceOrderRequest = {
        serviceId: service.id,
        packageId: selectedPackage?.id,
        scheduledDateTime,
        contactEmail,
        contactPhone: contactPhone || undefined,
        giftMessage: giftMessage || undefined,
        recipientName: recipientName || undefined,
        recipientEmail: recipientEmail || undefined,
        recipientPhone: recipientPhone || undefined,
        paymentProvider,
        discountCode: appliedDiscountCode || undefined,
      };

      // Create order
      const order = await serviceOrderService.createOrder(orderRequest);

      // Check if discount code was provided but not applied
      if (order.discountValidationError && order.discountCode) {
        // Format error message to be more user-friendly
        let errorMessage = order.discountValidationError;
        if (errorMessage.includes("minimum requirement")) {
          errorMessage =
            "Your order total does not meet the minimum amount required for this discount.";
        } else if (errorMessage.includes("usage limit")) {
          errorMessage = "This discount code has reached its usage limit.";
        } else if (errorMessage.includes("not valid")) {
          errorMessage = "This discount code is not valid for this service.";
        } else if (errorMessage.includes("expired")) {
          errorMessage = "This discount code has expired.";
        }

        toast({
          title: "Discount Not Applied",
          description: `The discount code "${order.discountCode}" could not be applied: ${errorMessage} Your order will proceed without the discount.`,
          variant: "destructive",
          duration: 6000, // Show for 6 seconds since it's important info
        });
        // Clear the discount code from UI state since it wasn't applied
        setDiscountCode("");
        setDiscountResult(null);
        setDiscountError(errorMessage);
      }

      if (paymentProvider === "CHAPA") {
        navigate(`/payment/chapa?orderId=${order.id}&orderType=service`);
        return;
      }

      // Initialize payment
      const paymentInit = await serviceOrderService.initializePayment(
        order.id,
        paymentProvider
      );

      // Redirect based on payment provider response
      if (paymentInit.checkoutUrl) {
        // Don't set isProcessing to false as we're navigating away
        window.location.href = paymentInit.checkoutUrl;
        // Component will unmount during redirect, so don't update state after this
        return;
      } else if (paymentProvider === "STRIPE" && paymentInit.clientSecret) {
        // Stripe Payment Intent - navigate to stripe payment page
        navigate(`/payment/stripe?orderId=${order.id}&orderType=service`, {
          state: {
            clientSecret: paymentInit.clientSecret,
            publishableKey: paymentInit.publishableKey,
            amount: order.totalAmountMinor,
            currency: order.currency.toLowerCase(),
            orderId: order.id,
            orderNumber: order.orderNumber,
            returnUrl: `${window.location.origin}/my-service-orders`,
          },
        });
        // Component will likely unmount during navigation, so return early
        return;
      } else {
        throw new Error(
          "Payment initialization failed. No checkout URL returned."
        );
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      const rawMessage =
        error?.message || "Failed to process your order. Please try again.";
      const isSlotConflict = /slot|available|already booked|conflict/i.test(
        rawMessage
      );

      setCheckoutError({
        title: isSlotConflict
          ? "This Time Slot Is No Longer Available"
          : "Checkout Could Not Be Completed",
        description: isSlotConflict
          ? "Another user may have just booked it. Refresh available times and choose a different slot."
          : rawMessage,
      });
      setIsProcessing(false);
    }
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  const getDayOfMonth = (dateStr: string) => {
    return new Date(dateStr).getDate();
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatSlotTime = (isoDateTime: string) => {
    const date = new Date(isoDateTime);
    if (Number.isNaN(date.getTime())) return isoDateTime;
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (isLoading && !service) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-eagle-green mx-auto mb-4" />
          <p className="font-light text-eagle-green">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (isError && !service) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "We could not load this service right now. Please try again.";

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-june-bud/10 flex items-center justify-center px-4">
        <Card className="w-full max-w-xl border-eagle-green/20 shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 border border-red-100">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-eagle-green mb-2">
              Something Went Wrong
            </h2>
            <p className="text-sm font-light text-eagle-green/70 mb-6">
              {errorMessage}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Button
                onClick={() => refetch()}
                className="bg-eagle-green hover:bg-viridian-green text-white"
              >
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/services")}
                className="border-eagle-green/30 text-eagle-green hover:bg-eagle-green/5"
              >
                Back to Services
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-eagle-green mb-2">
            Service Not Found
          </h2>
          <Button
            onClick={() => navigate("/services")}
            className="bg-eagle-green hover:bg-viridian-green text-white"
          >
            Browse Services
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => navigate(`/services/${serviceId}`)}
            className="mb-4 text-eagle-green hover:text-viridian-green"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Service
          </Button>

          <h1 className="text-3xl font-bold text-eagle-green">
            Book Your Service
          </h1>
          <p className="font-light text-eagle-green/70 mt-1">
            Select your preferred date and time, then complete your booking
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Main Form */}
          <div className="lg:col-span-7 space-y-6">
            {checkoutError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="border-red-200 bg-gradient-to-br from-red-50 via-white to-red-50/40 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-red-100 border border-red-200 flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-bold text-red-800">
                          {checkoutError.title}
                        </h3>
                        <p className="text-sm text-red-700/90 mt-1">
                          {checkoutError.description}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-4">
                          <Button
                            type="button"
                            size="sm"
                            onClick={async () => {
                              if (selectedDate) {
                                await refetchAvailableSlots();
                              }
                              setSelectedSlotIso("");
                              setCheckoutError(null);
                            }}
                            className="bg-eagle-green hover:bg-viridian-green text-white"
                            disabled={isFetchingAvailableSlots}
                          >
                            {isFetchingAvailableSlots ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Refreshing...
                              </>
                            ) : (
                              "Refresh Slots"
                            )}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setCheckoutError(null)}
                            className="border-red-300 text-red-700 hover:bg-red-50"
                          >
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Service Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    {serviceService.getPrimaryImageUrl(service) ? (
                      <img
                        src={serviceService.getPrimaryImageUrl(service)}
                        alt={service.title}
                        className="w-24 h-24 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-lg bg-eagle-green/10 flex items-center justify-center">
                        <Calendar className="h-8 w-8 text-eagle-green/50" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h2 className="font-bold text-eagle-green text-xl mb-2">
                        {service.title}
                      </h2>
                      <div className="space-y-1 text-sm text-eagle-green/70">
                        {service.vendorName && (
                          <p className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            by {service.vendorName}
                          </p>
                        )}
                        {service.city && (
                          <p className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {service.city}
                            {service.location ? `, ${service.location}` : ""}
                          </p>
                        )}
                        {service.durationMinutes != null &&
                          service.durationMinutes > 0 && (
                            <p className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              {service.durationMinutes} minutes
                            </p>
                          )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Date Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="font-bold text-eagle-green flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Select Date
                  </CardTitle>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-semibold text-eagle-green">
                        {formatMonthYear(monthAnchorDate)}
                      </p>
                      {isFetchingServiceMonth && (
                        <Loader2 className="h-4 w-4 animate-spin text-eagle-green/60" />
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPreviousMonth}
                        disabled={!canGoPrevious}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNextMonth}
                        disabled={!canGoNext}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Calendar Header - Days of Week */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (day) => (
                        <div
                          key={day}
                          className="p-2 text-center text-sm font-semibold text-eagle-green/70"
                        >
                          {day}
                        </div>
                      )
                    )}
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarGrid.map((dateStr, index) => {
                      if (!dateStr) {
                        // Empty cell for days outside current month
                        return <div key={index} className="p-3 h-12"></div>;
                      }

                      const isAvailable = availableDatesInMonth.has(dateStr);
                      const isSelected = selectedDate === dateStr;

                      return (
                        <button
                          key={dateStr}
                          onClick={() => {
                            if (isAvailable) {
                              setSelectedDate(dateStr);
                              setSelectedSlotIso(""); // Reset time when date changes
                            }
                          }}
                          disabled={!isAvailable}
                          className={`p-3 h-12 rounded-lg text-center transition-all duration-200 relative ${
                            isSelected
                              ? "bg-eagle-green text-white shadow-lg scale-105"
                              : isAvailable
                              ? "bg-gray-100 hover:bg-june-bud/20 text-eagle-green hover:scale-102"
                              : "text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          <span className="font-semibold">
                            {getDayOfMonth(dateStr)}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    {(service?.availabilitySpotsPage?.days?.length || 0) ===
                      0 && (
                      <p className="text-sm font-light text-eagle-green/70 text-center mb-3">
                        No available dates in this month window.
                      </p>
                    )}
                    <div className="flex flex-wrap gap-4 justify-center text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-eagle-green rounded"></div>
                        <span className="text-eagle-green/70">Selected</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-gray-100 rounded border"></div>
                        <span className="text-eagle-green/70">Available</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Time Selection */}
            {selectedDate && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="font-bold text-eagle-green flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Select Time
                    </CardTitle>
                    {effectiveAvailabilityType === "WORKING_HOURS" &&
                      availability.workingHoursStart &&
                      availability.workingHoursEnd && (
                        <p className="text-sm font-light text-eagle-green/70">
                          Available from{" "}
                          {formatTime(availability.workingHoursStart)} to{" "}
                          {formatTime(availability.workingHoursEnd)}
                        </p>
                      )}
                  </CardHeader>
                  <CardContent>
                    {slotOptions.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {slotOptions.map((slot) => (
                          <button
                            key={slot.iso}
                            onClick={() => setSelectedSlotIso(slot.iso)}
                            className={`p-3 rounded-lg text-center transition-colors ${
                              selectedSlotIso === slot.iso
                                ? "bg-eagle-green text-white"
                                : "bg-gray-100 hover:bg-june-bud/20 text-eagle-green"
                            }`}
                          >
                            <span className="font-bold">
                              {formatSlotTime(slot.iso)}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm font-light text-eagle-green/70">
                        No available time slots for the selected date.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Recipient Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="font-bold text-eagle-green flex items-center gap-2">
                    <Gift className="h-5 w-5" />
                    Gift Recipient (Optional)
                  </CardTitle>
                  <p className="text-sm font-light text-eagle-green/70">
                    If this is a gift, enter the recipient's details
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-light">
                        Recipient Name
                      </Label>
                      <div className="relative mt-1">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-eagle-green/50" />
                        <Input
                          placeholder="Full name"
                          value={recipientName}
                          onChange={(e) => setRecipientName(e.target.value)}
                          className="pl-10 border-eagle-green/30"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-light">
                        Recipient Email
                      </Label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-eagle-green/50" />
                        <Input
                          type="email"
                          placeholder="email@example.com"
                          value={recipientEmail}
                          onChange={(e) => setRecipientEmail(e.target.value)}
                          className="pl-10 border-eagle-green/30"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-light">
                      Recipient Phone
                    </Label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-eagle-green/50" />
                      <Input
                        placeholder="+251..."
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(e.target.value)}
                        className="pl-10 border-eagle-green/30"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="font-bold text-eagle-green flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Your Contact Information
                  </CardTitle>
                  <p className="text-sm font-light text-eagle-green/70">
                    We'll send the booking confirmation to this email
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-light">Your Email *</Label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-eagle-green/50" />
                        <Input
                          type="email"
                          placeholder="your@email.com"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          className="pl-10 border-eagle-green/30"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-light">Your Phone</Label>
                      <div className="relative mt-1">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-eagle-green/50" />
                        <Input
                          placeholder="+251..."
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          className="pl-10 border-eagle-green/30"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Gift Message */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="font-bold text-eagle-green flex items-center gap-2">
                    <Gift className="h-5 w-5" />
                    Gift Message (Optional)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Add a personal message..."
                    value={giftMessage}
                    onChange={(e) => setGiftMessage(e.target.value)}
                    className="border-eagle-green/30 min-h-[100px]"
                    maxLength={500}
                  />
                  <p className="text-xs text-eagle-green/50 mt-1">
                    {giftMessage.length}/500 characters
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Discount Code */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="font-bold text-eagle-green flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Discount Code
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {discountResult?.applicable ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="text-sm font-medium text-green-800">
                              Code "{discountCode}" applied
                            </p>
                            <p className="text-xs text-green-600">
                              You save{" "}
                              {formatPrice(
                                manualDiscountAmountDisplay,
                                displayCurrency
                              )}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveDiscount}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex space-x-2">
                        <Input
                          placeholder="Enter discount code"
                          value={discountCode}
                          onChange={(e) => {
                            setDiscountCode(e.target.value);
                            setDiscountError(null);
                          }}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleApplyDiscount()
                          }
                          className={`flex-1 ${
                            discountError ? "border-red-300" : ""
                          }`}
                          disabled={isValidatingDiscount}
                        />
                        <Button
                          type="button"
                          onClick={handleApplyDiscount}
                          disabled={
                            isValidatingDiscount || !discountCode.trim()
                          }
                          className="bg-eagle-green hover:bg-eagle-green/90 text-white font-medium min-w-[90px] transition-all"
                        >
                          {isValidatingDiscount ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Apply Code"
                          )}
                        </Button>
                      </div>
                      {discountError && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <XCircle className="h-3 w-3" />
                          {discountError}
                        </p>
                      )}
                      {!discountError &&
                        !discountCode.trim() &&
                        service?.activeDiscount && (
                          <p className="text-xs text-eagle-green/60 mt-1">
                            A service discount will be applied automatically.
                          </p>
                        )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Payment Method */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="font-bold text-eagle-green flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PaymentMethodSelector
                    amount={finalAmount}
                    currency={displayCurrency}
                    allowedMethods={[...allowedPaymentMethods]}
                    notifyOnSelectionChange
                    onPaymentMethodSelect={(method) => {
                      if (method === "stripe") {
                        setPaymentProvider("STRIPE");
                      } else {
                        setPaymentProvider("CHAPA");
                      }
                    }}
                    userLocation={user?.country || "Ethiopia"}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="sticky top-8 space-y-4"
            >
              <Card className="border-eagle-green/20">
                <CardHeader className="bg-gradient-to-r from-june-bud/10 to-white">
                  <CardTitle className="font-bold text-eagle-green">
                    Booking Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {/* Service */}
                  <div>
                    <p className="font-bold text-eagle-green">
                      {service.title}
                    </p>
                    {selectedPackage?.name && (
                      <p className="text-sm font-light text-eagle-green/70">
                        {selectedPackage.name}
                      </p>
                    )}
                    {bookingDurationMinutes > 0 && (
                      <p className="text-sm font-light text-eagle-green/70">
                        {bookingDurationMinutes} minutes
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Selected Date/Time */}
                  {selectedDate && selectedSlotIso ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-viridian-green" />
                        <span className="font-light text-eagle-green">
                          {new Date(selectedDate).toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-viridian-green" />
                        <span className="font-light text-eagle-green">
                          {formatSlotTime(selectedSlotIso)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CreditCard className="h-4 w-4 text-viridian-green" />
                        <span className="font-light text-eagle-green">
                          Payment: {paymentProviderLabel}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm font-light text-eagle-green/50">
                      Please select a date and time
                    </p>
                  )}

                  <Separator />

                  {/* Total */}
                  {service.activeDiscount && (
                    <div className="flex justify-center">
                      <DiscountBadge
                        discount={service.activeDiscount}
                        variant="compact"
                        size="small"
                        targetCurrency={displayCurrency}
                      />
                    </div>
                  )}
                  <div className="bg-june-bud/10 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="font-light text-eagle-green">Total</span>
                      <div className="font-bold text-eagle-green text-2xl">
                        {hasManualDiscount && hasDiscountedTotal ? (
                          <div className="text-right leading-tight">
                            <div className="text-sm font-medium text-eagle-green/60 line-through">
                              {serviceService.formatPrice(
                                displayPriceMajor ?? 0,
                                displayCurrency
                              )}
                            </div>
                            <div className="font-bold text-eagle-green text-2xl">
                              {formatPrice(finalAmount, displayCurrency)}
                            </div>
                          </div>
                        ) : service.activeDiscount ? (
                          <PriceWithDiscount
                            originalPrice={displayPriceMajor || 0}
                            currency={displayCurrency}
                            discount={service.activeDiscount}
                            size="small"
                            showSavings={false}
                          />
                        ) : (
                          serviceService.formatPrice(
                            displayPriceMajor ?? 0,
                            displayCurrency
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full bg-eagle-green hover:bg-viridian-green text-white font-bold h-12"
                    onClick={handleCheckout}
                    disabled={
                      isProcessing ||
                      !selectedDate ||
                      !selectedSlotIso ||
                      !contactEmail
                    }
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Book & Pay
                      </>
                    )}
                  </Button>

                  <p className="text-xs font-light text-eagle-green/60 text-center">
                    By completing this booking, you agree to our terms of
                    service.
                  </p>
                </CardContent>
              </Card>

              {/* Cancellation Policy */}
              <Card className="border-eagle-green/20">
                <CardHeader className="pb-2">
                  <CardTitle className="font-bold text-eagle-green text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Cancellation Policy
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-2 text-xs font-light text-eagle-green/70">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>48+ hours before: 100% refund</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span>24-48 hours before: 50% refund</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                      <span>Less than 24 hours: No refund</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
