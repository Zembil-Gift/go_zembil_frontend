import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
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
  ChevronRight
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

import { serviceService, AvailabilityConfig } from '@/services/serviceService';
import { serviceOrderService, CreateServiceOrderRequest } from '@/services/serviceOrderService';

export default function ServiceCheckout() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // Form state
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [giftMessage, setGiftMessage] = useState('');
  const [paymentProvider, setPaymentProvider] = useState<'STRIPE' | 'CHAPA'>('STRIPE');
  const [isProcessing, setIsProcessing] = useState(false);

  // Calendar navigation state - track current month
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  // Fetch service details
  const { data: service, isLoading } = useQuery({
    queryKey: ['service', serviceId],
    queryFn: () => serviceService.getService(Number(serviceId)),
    enabled: !!serviceId,
  });

  // Fetch available dates for the next 30 days
  const { data: availableDates } = useQuery({
    queryKey: ['service-available-dates', serviceId],
    queryFn: () => {
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      return serviceService.getAvailableDates(Number(serviceId), startDate, endDate);
    },
    enabled: !!serviceId,
  });

  // Fetch available time slots for selected date
  const { data: availableSlots } = useQuery({
    queryKey: ['service-available-slots', serviceId, selectedDate],
    queryFn: () => serviceService.getAvailableSlots(Number(serviceId), selectedDate),
    enabled: !!serviceId && !!selectedDate,
  });

  // Parse configs
  const availability = useMemo<AvailabilityConfig>(() => {
    if (!service) return {};
    return serviceService.parseAvailabilityConfig(service);
  }, [service]);

  // Prefill contact information from user profile
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

  // Generate available dates for calendar (improved version)
  const calendarDates = useMemo(() => {
    const dates: string[] = [];
    const today = new Date();
    const workingDays = availability.workingDays || [0, 1, 2, 3, 4, 5, 6];
    const blackoutDates = availability.blackoutDates || [];
    const advanceBookingDays = availability.advanceBookingDays || 60; // Increased to 60 days

    for (let i = 1; i <= advanceBookingDays; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayOfWeek = date.getDay();
      const dateStr = date.toISOString().split('T')[0];

      if (workingDays.includes(dayOfWeek) && !blackoutDates.includes(dateStr)) {
        dates.push(dateStr);
      }
    }
    return availableDates || dates;
  }, [availability, availableDates]);

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
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      grid.push(dateStr);
    }
    
    // Fill remaining cells to complete the grid (42 total cells)
    while (grid.length < 42) {
      grid.push(null);
    }
    
    return grid;
  }, [currentMonth]);

  // Filter available dates for current month
  const availableDatesInMonth = useMemo(() => {
    const monthStart = currentMonth.toISOString().split('T')[0];
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString().split('T')[0];
    
    return calendarDates.filter(date => date >= monthStart && date <= monthEnd);
  }, [calendarDates, currentMonth]);

  // Navigation functions - move by month
  const goToPreviousMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() - 1);
    
    // Don't go before current month if it would make all dates unavailable
    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    if (newMonth >= currentMonthStart) {
      setCurrentMonth(newMonth);
    }
  };

  const goToNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + 1);
    
    // Don't go beyond reasonable booking limit (e.g., 6 months ahead)
    const maxMonth = new Date();
    maxMonth.setMonth(maxMonth.getMonth() + 6);
    
    if (newMonth <= maxMonth) {
      setCurrentMonth(newMonth);
    }
  };

  // Check if navigation buttons should be disabled
  const canGoPrevious = useMemo(() => {
    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const prevMonth = new Date(currentMonth);
    prevMonth.setMonth(currentMonth.getMonth() - 1);
    return prevMonth >= currentMonthStart;
  }, [currentMonth]);

  const canGoNext = useMemo(() => {
    const maxMonth = new Date();
    maxMonth.setMonth(maxMonth.getMonth() + 6);
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(currentMonth.getMonth() + 1);
    return nextMonth <= maxMonth;
  }, [currentMonth]);

  // Generate time slots or time picker based on availability type
  const timeSlots = useMemo(() => {
    // For TIME_SLOTS mode, use predefined slots
    if (service?.availabilityType === "TIME_SLOTS") {
      if (availableSlots && availableSlots.length > 0) {
        // If API returns full datetime strings, extract just the time portion (HH:MM)
        return availableSlots.map(slot => {
          if (typeof slot === 'string' && slot.includes('T')) {
            // Extract time from datetime string like "2025-12-31T09:00:00"
            const timePart = slot.split('T')[1];
            return timePart ? timePart.substring(0, 5) : slot; // Get HH:MM
          }
          return slot;
        });
      }
      return availability.timeSlots || ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
    }
    
    // For WORKING_HOURS mode, generate hourly slots within working hours
    if (service?.availabilityType === "WORKING_HOURS" && availability.workingHoursStart && availability.workingHoursEnd) {
      const slots: string[] = [];
      const [startHour, startMin] = availability.workingHoursStart.split(':').map(Number);
      const [endHour, endMin] = availability.workingHoursEnd.split(':').map(Number);
      
      for (let hour = startHour; hour < endHour || (hour === endHour && startMin < endMin); hour++) {
        const hourStr = hour.toString().padStart(2, '0');
        slots.push(`${hourStr}:00`);
        if (hour < endHour) {
          slots.push(`${hourStr}:30`);
        }
      }
      
      return slots;
    }
    
    // Fallback to default slots
    return ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
  }, [service?.availabilityType, availability, availableSlots]);

  const handleCheckout = async () => {
    if (!service) return;

    // Validation
    if (!selectedDate || !selectedTime) {
      toast({
        title: 'Missing Date/Time',
        description: 'Please select a date and time for your service.',
        variant: 'destructive',
      });
      return;
    }

    // For WORKING_HOURS mode, validate time is within range
    if (service.availabilityType === "WORKING_HOURS" && availability.workingHoursStart && availability.workingHoursEnd) {
      if (selectedTime < availability.workingHoursStart || selectedTime > availability.workingHoursEnd) {
        toast({
          title: 'Invalid Time',
          description: `Please select a time between ${formatTime(availability.workingHoursStart)} and ${formatTime(availability.workingHoursEnd)}.`,
          variant: 'destructive',
        });
        return;
      }
    }

    if (!contactEmail) {
      toast({
        title: 'Missing Contact Email',
        description: 'Please enter your contact email.',
        variant: 'destructive',
      });
      return;
    }
    setIsProcessing(true);

    try {
      // Debug logging
      console.log('Selected Date:', selectedDate);
      console.log('Selected Time:', selectedTime);
      
      // Ensure date is in YYYY-MM-DD format
      const dateOnly = selectedDate.includes('T') ? selectedDate.split('T')[0] : selectedDate;
      // Ensure time is in HH:MM format
      const timeOnly = selectedTime.includes('T') ? selectedTime.split('T')[1]?.substring(0, 5) || selectedTime : selectedTime;
      
      console.log('Date Only:', dateOnly);
      console.log('Time Only:', timeOnly);
      
      // Combine date and time into ISO datetime string
      const scheduledDateTime = `${dateOnly}T${timeOnly}:00`;
      console.log('Scheduled DateTime:', scheduledDateTime);

      const orderRequest: CreateServiceOrderRequest = {
        serviceId: service.id,
        scheduledDateTime,
        contactEmail,
        contactPhone: contactPhone || undefined,
        giftMessage: giftMessage || undefined,
        recipientName: recipientName || undefined,
        recipientEmail: recipientEmail || undefined,
        recipientPhone: recipientPhone || undefined,
        paymentProvider,
      };

      // Create order
      const order = await serviceOrderService.createOrder(orderRequest);

      // Initialize payment
      const paymentInit = await serviceOrderService.initializePayment(order.id, paymentProvider);

      // Redirect based on payment provider response
      if (paymentInit.checkoutUrl) {
        // Chapa or Stripe Checkout - redirect to their hosted page
        // Don't set isProcessing to false as we're navigating away
        window.location.href = paymentInit.checkoutUrl;
        // Component will unmount during redirect, so don't update state after this
        return;
      } else if (paymentProvider === 'STRIPE' && paymentInit.clientSecret) {
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
        throw new Error('Payment initialization failed. No checkout URL returned.');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        title: 'Checkout Failed',
        description: error.message || 'Failed to process your order. Please try again.',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateLong = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  const getDayOfMonth = (dateStr: string) => {
    return new Date(dateStr).getDate();
  };

  const isToday = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

  const isTomorrow = (dateStr: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return dateStr === tomorrow.toISOString().split('T')[0];
  };

  const isPastDate = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr < today;
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
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
          <h2 className="text-2xl font-bold text-eagle-green mb-2">Service Not Found</h2>
          <Button onClick={() => navigate('/services')} className="bg-eagle-green hover:bg-viridian-green text-white">
            Browse Services
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
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
                            {service.city}{service.location ? `, ${service.location}` : ''}
                          </p>
                        )}
                        {service.durationMinutes && (
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
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="p-2 text-center text-sm font-semibold text-eagle-green/70">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarGrid.map((dateStr, index) => {
                      if (!dateStr) {
                        // Empty cell for days outside current month
                        return <div key={index} className="p-3 h-12"></div>;
                      }
                      
                      const isAvailable = availableDatesInMonth.includes(dateStr);
                      const isSelected = selectedDate === dateStr;
                      const isPast = isPastDate(dateStr);
                      const todayDate = isToday(dateStr);
                      const tomorrowDate = isTomorrow(dateStr);
                      
                      return (
                        <button
                          key={dateStr}
                          onClick={() => {
                            if (isAvailable && !isPast) {
                              setSelectedDate(dateStr);
                              setSelectedTime(''); // Reset time when date changes
                            }
                          }}
                          disabled={!isAvailable || isPast}
                          className={`p-3 h-12 rounded-lg text-center transition-all duration-200 relative ${
                            isSelected
                              ? 'bg-eagle-green text-white shadow-lg scale-105'
                              : isAvailable && !isPast
                              ? 'bg-gray-100 hover:bg-june-bud/20 text-eagle-green hover:scale-102'
                              : isPast
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          <span className="font-semibold">{getDayOfMonth(dateStr)}</span>
                          {todayDate && (
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                          {tomorrowDate && (
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Legend */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex flex-wrap gap-4 justify-center text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-eagle-green/70">Today</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-eagle-green/70">Tomorrow</span>
                      </div>
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
                    {service?.availabilityType === "WORKING_HOURS" && availability.workingHoursStart && availability.workingHoursEnd && (
                      <p className="text-sm font-light text-eagle-green/70">
                        Available from {formatTime(availability.workingHoursStart)} to {formatTime(availability.workingHoursEnd)}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    {service?.availabilityType === "WORKING_HOURS" ? (
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-light mb-2 block">Select or enter your preferred time</Label>
                          <input
                            type="time"
                            value={selectedTime || ''}
                            onChange={(e) => setSelectedTime(e.target.value)}
                            min={availability.workingHoursStart}
                            max={availability.workingHoursEnd}
                            className="w-full p-3 rounded-lg border border-gray-200 focus:border-eagle-green focus:ring-2 focus:ring-eagle-green/20 outline-none"
                          />
                        </div>
                        <div>
                          <p className="text-sm font-light text-eagle-green/70 mb-2">Or choose a suggested time:</p>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {timeSlots.map((time) => (
                              <button
                                key={time}
                                onClick={() => setSelectedTime(time)}
                                className={`p-3 rounded-lg text-center transition-colors ${
                                  selectedTime === time
                                    ? 'bg-eagle-green text-white'
                                    : 'bg-gray-100 hover:bg-june-bud/20 text-eagle-green'
                                }`}
                              >
                                <span className="font-bold">{formatTime(time)}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {timeSlots.map((time) => (
                          <button
                            key={time}
                            onClick={() => setSelectedTime(time)}
                            className={`p-3 rounded-lg text-center transition-colors ${
                              selectedTime === time
                                ? 'bg-eagle-green text-white'
                                : 'bg-gray-100 hover:bg-june-bud/20 text-eagle-green'
                            }`}
                          >
                            <span className="font-bold">{formatTime(time)}</span>
                          </button>
                        ))}
                      </div>
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
                      <Label className="text-sm font-light">Recipient Name</Label>
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
                      <Label className="text-sm font-light">Recipient Email</Label>
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
                    <Label className="text-sm font-light">Recipient Phone</Label>
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
                  <RadioGroup 
                    value={paymentProvider} 
                    onValueChange={(value) => setPaymentProvider(value as 'STRIPE' | 'CHAPA')}
                  >
                    <div className={`flex items-center space-x-3 border rounded-lg p-4 cursor-pointer transition-colors ${
                      paymentProvider === 'STRIPE' 
                        ? 'border-eagle-green bg-june-bud/10' 
                        : 'border-gray-200 hover:border-eagle-green/50'
                    }`}>
                      <RadioGroupItem value="STRIPE" id="stripe" />
                      <Label htmlFor="stripe" className="flex-1 cursor-pointer">
                        <span className="font-bold text-eagle-green">Card Payment (Stripe)</span>
                        <p className="text-sm font-light text-eagle-green/70">
                          Pay with Visa, Mastercard, or American Express
                        </p>
                      </Label>
                    </div>
                    <div className={`flex items-center space-x-3 border rounded-lg p-4 cursor-pointer transition-colors ${
                      paymentProvider === 'CHAPA' 
                        ? 'border-eagle-green bg-june-bud/10' 
                        : 'border-gray-200 hover:border-eagle-green/50'
                    }`}>
                      <RadioGroupItem value="CHAPA" id="chapa" />
                      <Label htmlFor="chapa" className="flex-1 cursor-pointer">
                        <span className="font-bold text-eagle-green">Chapa</span>
                        <p className="text-sm font-light text-eagle-green/70">
                          Pay with Telebirr, CBE Birr, Awash Bank, or other local options
                        </p>
                      </Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
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
                    <p className="font-bold text-eagle-green">{service.title}</p>
                    {service.durationMinutes && (
                      <p className="text-sm font-light text-eagle-green/70">
                        {service.durationMinutes} minutes
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Selected Date/Time */}
                  {selectedDate && selectedTime ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-viridian-green" />
                        <span className="font-light text-eagle-green">
                          {new Date(selectedDate).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-viridian-green" />
                        <span className="font-light text-eagle-green">
                          {formatTime(selectedTime)}
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
                  <div className="bg-june-bud/10 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="font-light text-eagle-green">Total</span>
                      <span className="font-bold text-eagle-green text-2xl">
                        {serviceService.formatPrice(service.basePriceMinor, service.currency)}
                      </span>
                    </div>
                  </div>

                  <Button 
                    className="w-full bg-eagle-green hover:bg-viridian-green text-white font-bold h-12"
                    onClick={handleCheckout}
                    disabled={isProcessing || !selectedDate || !selectedTime || !contactEmail}
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
                    By completing this booking, you agree to our terms of service.
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
