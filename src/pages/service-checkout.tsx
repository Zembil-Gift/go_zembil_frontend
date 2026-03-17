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

  // Calendar navigation state - track current month
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  // Fetch service details
  const { data: service, isLoading } = useQuery({
    queryKey: ["service", serviceId],
    queryFn: () => serviceService.getService(Number(serviceId)),
    enabled: !!serviceId,
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
  const { data: availableSlots } = useQuery({
    queryKey: [
      "service-available-slots",
      serviceId,
      selectedDate,
      selectedPackage?.id,
    ],
    queryFn: () => {
      if (selectedPackage?.id) {
        return serviceService.getAvailablePackageSlots(
          selectedPackage.id,
          selectedDate
        );
      }
      return serviceService.getAvailableSlots(Number(serviceId), selectedDate);
    },
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

  const minimumBookableDate = useMemo(() => {
    const today = new Date();
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + (availability.advanceBookingDays || 0));
    return `${minDate.getFullYear()}-${String(minDate.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(minDate.getDate()).padStart(2, "0")}`;
  }, [availability.advanceBookingDays]);

  // Generate calendar grid for the current month
  const calendarGrid = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

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
  }, [currentMonth]);

  // Determine available dates for current month using availability config,
  // starting from (today + advanceBookingDays) and extending indefinitely.
  const availableDatesInMonth = useMemo(() => {
    const workingDays = availability.workingDays || [0, 1, 2, 3, 4, 5, 6];
    const blackoutDates = new Set(availability.blackoutDates || []);
    const available = new Set<string>();

    for (const dateStr of calendarGrid) {
      if (!dateStr) continue;
      if (dateStr < minimumBookableDate) continue;

      const [year, month, day] = dateStr.split("-").map(Number);
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();

      if (workingDays.includes(dayOfWeek) && !blackoutDates.has(dateStr)) {
        available.add(dateStr);
      }
    }

    return available;
  }, [availability, calendarGrid, minimumBookableDate]);

  // Navigation functions - move by month
  const goToPreviousMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() - 1);

    // Don't go before the month that contains the minimum bookable date
    const [minYear, minMonth] = minimumBookableDate.split("-").map(Number);
    const minBookableMonthStart = new Date(minYear, minMonth - 1, 1);

    if (newMonth >= minBookableMonthStart) {
      setCurrentMonth(newMonth);
    }
  };

  const goToNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
  };

  // Check if navigation buttons should be disabled
  const canGoPrevious = useMemo(() => {
    const [minYear, minMonth] = minimumBookableDate.split("-").map(Number);
    const currentMonthStart = new Date(minYear, minMonth - 1, 1);
    const prevMonth = new Date(currentMonth);
    prevMonth.setMonth(currentMonth.getMonth() - 1);
    return prevMonth >= currentMonthStart;
  }, [currentMonth, minimumBookableDate]);

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

      if (selectedPackage?.id) {
        const isAvailable = await serviceService.checkPackageSlotAvailability(
          selectedPackage.id,
          scheduledDateTime
        );
        if (!isAvailable) {
          toast({
            title: "Slot Unavailable",
            description:
              "Selected time slot is no longer available. Please choose another slot.",
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }
      } else {
        const isAvailable = await serviceService.checkSlotAvailability(
          service.id,
          scheduledDateTime
        );
        if (!isAvailable) {
          toast({
            title: "Slot Unavailable",
            description:
              "Selected time slot is no longer available. Please choose another slot.",
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }
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
      toast({
        title: "Checkout Failed",
        description:
          error.message || "Failed to process your order. Please try again.",
        variant: "destructive",
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

  const isPastDate = (dateStr: string) => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    return dateStr < todayStr;
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-eagle-green mx-auto mb-4" />
          <p className="font-light text-eagle-green">Loading checkout...</p>
        </div>
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
                    <p className="text-lg font-semibold text-eagle-green">
                      {formatMonthYear(currentMonth)}
                    </p>
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
                      const isPast = isPastDate(dateStr);

                      return (
                        <button
                          key={dateStr}
                          onClick={() => {
                            if (isAvailable && !isPast) {
                              setSelectedDate(dateStr);
                              setSelectedSlotIso(""); // Reset time when date changes
                            }
                          }}
                          disabled={!isAvailable || isPast}
                          className={`p-3 h-12 rounded-lg text-center transition-all duration-200 relative ${
                            isSelected
                              ? "bg-eagle-green text-white shadow-lg scale-105"
                              : isAvailable && !isPast
                              ? "bg-gray-100 hover:bg-june-bud/20 text-eagle-green hover:scale-102"
                              : isPast
                              ? "text-gray-300 cursor-not-allowed"
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
