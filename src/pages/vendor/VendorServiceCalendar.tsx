import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Calendar as CalendarIcon, 
  RefreshCw,
  Phone,
  User,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, isToday } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { 
  serviceOrderService, 
  ServiceOrderResponse,
  ServiceOrderStatus 
} from '@/services/serviceOrderService';
import { serviceService, ServiceResponse } from '@/services/serviceService';

export default function VendorServiceCalendar() {
  const queryClient = useQueryClient();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedService, setSelectedService] = useState<string>('all');

  // Fetch vendor's services
  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: ['vendor-services'],
    queryFn: () => serviceService.getMyServices(undefined, 0, 100),
  });

  // Fetch vendor's service orders
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['vendor-service-orders'],
    queryFn: () => serviceOrderService.getVendorOrders(0, 100),
  });

  const services = servicesData?.content || [];
  const orders = ordersData?.content || [];

  // Filter orders by selected service
  const filteredOrders = useMemo(() => {
    if (selectedService === 'all') return orders;
    return orders.filter((order: ServiceOrderResponse) => 
      order.service?.id?.toString() === selectedService
    );
  }, [orders, selectedService]);

  // Get orders for a specific date
  const getOrdersForDate = (date: Date) => {
    return filteredOrders.filter((order: ServiceOrderResponse) => {
      const orderDate = new Date(order.scheduledDateTime);
      return isSameDay(orderDate, date);
    });
  };

  // Calendar navigation
  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    
    // Add padding days from previous month
    const startDay = start.getDay();
    const paddingDays: (Date | null)[] = Array(startDay).fill(null);
    
    return [...paddingDays, ...days];
  }, [currentMonth]);

  const getStatusColor = (status: ServiceOrderStatus) => {
    switch (status) {
      case 'BOOKED': return 'bg-blue-500';
      case 'CONFIRMED_BY_VENDOR': return 'bg-green-500';
      case 'IN_PROGRESS': return 'bg-yellow-500';
      case 'COMPLETED': return 'bg-emerald-500';
      case 'CANCELLED': return 'bg-red-500';
      case 'NO_SHOW': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const DayCell = ({ date }: { date: Date | null }) => {
    if (!date) {
      return <div className="h-24 bg-gray-50/50" />;
    }

    const dayOrders = getOrdersForDate(date);
    const isSelected = selectedDate && isSameDay(date, selectedDate);
    const isCurrentMonth = isSameMonth(date, currentMonth);
    const isTodayDate = isToday(date);

    return (
      <div
        className={`h-24 border border-gray-100 p-1 cursor-pointer transition-all hover:bg-june-bud/10 ${
          isSelected ? 'ring-2 ring-eagle-green bg-june-bud/20' : ''
        } ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''}`}
        onClick={() => setSelectedDate(date)}
      >
        <div className="flex items-center justify-between mb-1">
          <span className={`text-sm font-medium ${
            isTodayDate ? 'bg-eagle-green text-white rounded-full w-6 h-6 flex items-center justify-center' : ''
          }`}>
            {format(date, 'd')}
          </span>
        </div>
        
        <div className="space-y-0.5 overflow-hidden">
          {dayOrders.slice(0, 3).map((order: ServiceOrderResponse) => (
            <div
              key={order.id}
              className={`text-xs px-1 py-0.5 rounded truncate text-white ${getStatusColor(order.status)}`}
              title={`${order.service?.title} - ${serviceOrderService.formatTime(order.scheduledDateTime)}`}
            >
              {serviceOrderService.formatTime(order.scheduledDateTime)}
            </div>
          ))}
          {dayOrders.length > 3 && (
            <div className="text-xs text-eagle-green/70 px-1">
              +{dayOrders.length - 3} more
            </div>
          )}
        </div>
      </div>
    );
  };

  const selectedDateOrders = selectedDate ? getOrdersForDate(selectedDate) : [];

  const isLoading = servicesLoading || ordersLoading;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-eagle-green mb-1">
                Service Calendar
              </h1>
              <p className="font-light text-eagle-green/70">
                View and manage your service bookings
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['vendor-service-orders'] })}
              className="border-eagle-green text-eagle-green hover:bg-eagle-green hover:text-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <h2 className="text-xl font-bold text-eagle-green">
                      {format(currentMonth, 'MMMM yyyy')}
                    </h2>
                    <Button variant="ghost" size="icon" onClick={goToNextMonth}>
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={goToToday}>
                      Today
                    </Button>
                    <Select value={selectedService} onValueChange={setSelectedService}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by service" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Services</SelectItem>
                        {services.map((service: ServiceResponse) => (
                          <SelectItem key={service.id} value={service.id.toString()}>
                            {service.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-full bg-june-bud/20" />
                    <Skeleton className="h-96 w-full bg-june-bud/20" />
                  </div>
                ) : (
                  <>
                    {/* Day headers */}
                    <div className="grid grid-cols-7 mb-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-sm font-medium text-eagle-green/70 py-2">
                          {day}
                        </div>
                      ))}
                    </div>
                    
                    {/* Calendar grid */}
                    <div className="grid grid-cols-7 border-t border-l border-gray-200">
                      {calendarDays.map((date, index) => (
                        <DayCell key={index} date={date} />
                      ))}
                    </div>

                    {/* Legend */}
                    <div className="mt-4 flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-blue-500" />
                        <span className="text-eagle-green/70">Booked</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-green-500" />
                        <span className="text-eagle-green/70">Confirmed</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-yellow-500" />
                        <span className="text-eagle-green/70">In Progress</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-emerald-500" />
                        <span className="text-eagle-green/70">Completed</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-red-500" />
                        <span className="text-eagle-green/70">Cancelled</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Selected Date Details */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-lg text-eagle-green">
                  {selectedDate ? format(selectedDate, 'EEEE, MMM d') : 'Select a Date'}
                </CardTitle>
                {selectedDate && (
                  <CardDescription>
                    {selectedDateOrders.length} booking{selectedDateOrders.length !== 1 ? 's' : ''}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {!selectedDate ? (
                  <p className="text-sm text-eagle-green/60 text-center py-8">
                    Click on a date to view bookings
                  </p>
                ) : selectedDateOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarIcon className="h-12 w-12 text-eagle-green/20 mx-auto mb-2" />
                    <p className="text-sm text-eagle-green/60">No bookings on this date</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDateOrders.map((order: ServiceOrderResponse) => {
                      const statusDisplay = serviceOrderService.getStatusDisplay(order.status);
                      return (
                        <div
                          key={order.id}
                          className="p-3 border border-eagle-green/10 rounded-lg hover:bg-june-bud/10 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge className={`${statusDisplay.bgColor} ${statusDisplay.color} border-none text-xs`}>
                              {statusDisplay.text}
                            </Badge>
                            <span className="text-xs text-eagle-green/60">
                              {serviceOrderService.formatTime(order.scheduledDateTime)}
                            </span>
                          </div>
                          <h4 className="font-medium text-eagle-green text-sm mb-1 truncate">
                            {order.service?.title || 'Service'}
                          </h4>
                          <div className="flex items-center gap-1 text-xs text-eagle-green/70">
                            <User className="h-3 w-3" />
                            <span className="truncate">{order.customerName || 'Customer'}</span>
                          </div>
                          {order.contactPhone && (
                            <div className="flex items-center gap-1 text-xs text-eagle-green/70 mt-1">
                              <Phone className="h-3 w-3" />
                              <span>{order.contactPhone}</span>
                            </div>
                          )}
                          <div className="mt-2 text-xs font-medium text-eagle-green">
                            {serviceOrderService.formatPrice(order.vendorAmountMinor || order.totalAmountMinor, order.currency)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
}
