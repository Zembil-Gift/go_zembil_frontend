import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Star,
  MapPin,
  Calendar,
  Clock,
  Shield,
  CheckCircle,
  Mail,
  Phone,
  Award,
  Users,
  MessageSquare,
  Send
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

import { 
  Service, 
  Quote,
  CITIES,
  SERVICE_CATEGORIES
} from '@/types/events';
import { eventsService } from '@/services/eventsService';

export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    name: '',
    email: '',
    phone: '',
    eventDate: '',
    eventLocation: '',
    guestCount: '',
    requirements: '',
  });

  // Fetch service details
  const { data: service, isLoading } = useQuery({
    queryKey: ['service', id],
    queryFn: () => id ? eventsService.getService(id) : null,
    enabled: !!id,
  });

  // Quote mutation
  const quoteMutation = useMutation({
    mutationFn: (quoteData: Partial<Quote>) => eventsService.createQuote(id!, quoteData),
    onSuccess: () => {
      setShowQuoteModal(false);
      setQuoteForm({
        name: '',
        email: '',
        phone: '',
        eventDate: '',
        eventLocation: '',
        guestCount: '',
        requirements: '',
      });
      // Show success message
      alert('Quote request sent successfully! The provider will contact you within 24 hours.');
    },
  });

  const handleQuoteSubmit = () => {
    const quoteData: Partial<Quote> = {
      serviceId: id!,
      clientInfo: {
        name: quoteForm.name,
        email: quoteForm.email,
        phone: quoteForm.phone,
        eventDate: quoteForm.eventDate,
        eventLocation: quoteForm.eventLocation,
        guestCount: parseInt(quoteForm.guestCount) || 0,
        requirements: quoteForm.requirements,
      },
    };

    quoteMutation.mutate(quoteData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-eagle-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-gotham-light text-eagle-green">Loading service details...</p>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-gotham-bold text-eagle-green mb-2">Service Not Found</h2>
          <p className="font-gotham-light text-eagle-green/70 mb-4">The service you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/events?tab=services')} className="bg-eagle-green hover:bg-viridian-green text-white">
            Browse All Services
          </Button>
        </div>
      </div>
    );
  }

  const categoryInfo = SERVICE_CATEGORIES[service.category];
  const cityName = CITIES[service.country].find(c => c.id === service.city)?.name || service.city;
  const countryFlag = service.country === 'ET' ? '🇪🇹' : '🇺🇸';

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/events?tab=services')}
          className="mb-6 text-eagle-green hover:text-viridian-green hover:bg-june-bud/10"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Services
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Hero Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-6">
                <img
                  src={service.images[0]}
                  alt={service.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                {/* Verified Badge */}
                {service.provider.verified && (
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-green-500 text-white border-none font-gotham-bold">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified Provider
                    </Badge>
                  </div>
                )}

                {/* Location */}
                <div className="absolute top-4 right-4">
                  <Badge className="bg-white/90 text-eagle-green border-none font-gotham-bold">
                    {countryFlag} {cityName}
                  </Badge>
                </div>

                {/* Price */}
                <div className="absolute bottom-4 right-4">
                  <Badge className="bg-eagle-green text-white border-none font-gotham-bold text-lg px-3 py-1">
                    From {eventsService.formatCurrency(service.startingPrice, service.currency)}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-sm font-gotham-light text-viridian-green">
                    {categoryInfo.icon} {categoryInfo.name}
                  </span>
                  <h1 className="text-3xl lg:text-4xl font-gotham-bold text-eagle-green mt-1">
                    {service.name}
                  </h1>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-gotham-bold text-eagle-green">{service.rating}</span>
                    <span className="font-gotham-light text-eagle-green/70">
                      ({service.reviewCount} reviews)
                    </span>
                  </div>
                  
                  <Separator orientation="vertical" className="h-4" />
                  
                  <div className="flex items-center gap-1">
                    <Award className="h-4 w-4 text-viridian-green" />
                    <span className="font-gotham-light text-eagle-green/70">
                      {service.provider.yearsExperience} years experience
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="font-gotham-bold text-eagle-green">About This Service</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-gotham-light text-eagle-green/80 leading-relaxed mb-4">
                    {service.description}
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-gotham-bold text-eagle-green mb-2">Service Area</h4>
                      <p className="font-gotham-light text-eagle-green/70">
                        {service.serviceAreaKm}km radius from {cityName}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-gotham-bold text-eagle-green mb-2">Working Days</h4>
                      <p className="font-gotham-light text-eagle-green/70">
                        {service.availability.workingDays.length === 7 ? 'Every day' : 
                         service.availability.workingDays.length === 5 ? 'Weekdays' :
                         'Custom schedule'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Features */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="font-gotham-bold text-eagle-green">What's Included</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {service.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="font-gotham-light text-eagle-green">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Portfolio */}
            {service.portfolio.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="font-gotham-bold text-eagle-green">Portfolio</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {service.portfolio.map((image, index) => (
                        <div key={index} className="aspect-square rounded-lg overflow-hidden">
                          <img
                            src={image}
                            alt={`Portfolio ${index + 1}`}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          />
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
                  <CardTitle className="font-gotham-bold text-eagle-green flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Policies & Terms
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-gotham-bold text-eagle-green mb-1">Reschedule Policy</h4>
                      <p className="font-gotham-light text-eagle-green/70 text-sm">
                        Free reschedule up to {service.policies.rescheduleHours} hours before event
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-gotham-bold text-eagle-green mb-1">Deposit Required</h4>
                      <p className="font-gotham-light text-eagle-green/70 text-sm">
                        {service.policies.depositRequired ? 
                          `${service.policies.depositPercentage}% deposit required to book` :
                          'No deposit required'
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-gotham-bold text-eagle-green mb-1">Cancellation Policy</h4>
                    <p className="font-gotham-light text-eagle-green/70 text-sm">
                      {service.policies.cancellationPolicy}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Quote Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <Card className="border-eagle-green/20">
                <CardHeader className="bg-gradient-to-r from-june-bud/10 to-white">
                  <CardTitle className="font-gotham-bold text-eagle-green flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Provider Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="text-center">
                    <h3 className="font-gotham-bold text-eagle-green text-lg mb-1">
                      {service.provider.name}
                    </h3>
                    <div className="flex items-center justify-center gap-2 mb-3">
                      {service.provider.verified && (
                        <Badge className="bg-green-100 text-green-700 border-green-300">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                      <span className="font-gotham-light text-eagle-green/70 text-sm">
                        {service.provider.yearsExperience} years experience
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-center gap-1 mb-4">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-gotham-bold text-eagle-green">{service.rating}</span>
                      <span className="font-gotham-light text-eagle-green/70 text-sm">
                        ({service.reviewCount} reviews)
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-viridian-green" />
                      <span className="font-gotham-light text-eagle-green">
                        {cityName}, {service.country === 'ET' ? 'Ethiopia' : 'United States'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-viridian-green" />
                      <span className="font-gotham-light text-eagle-green text-sm">
                        {service.provider.contact}
                      </span>
                    </div>
                  </div>

                  <div className="bg-june-bud/10 rounded-lg p-4">
                    <div className="text-center">
                      <p className="font-gotham-light text-eagle-green/70 text-sm mb-2">Starting from</p>
                      <p className="font-gotham-bold text-eagle-green text-2xl">
                        {eventsService.formatCurrency(service.startingPrice, service.currency)}
                      </p>
                      <p className="font-gotham-light text-eagle-green/70 text-xs">
                        Final price depends on your requirements
                      </p>
                    </div>
                  </div>

                  <Dialog open={showQuoteModal} onOpenChange={setShowQuoteModal}>
                    <DialogTrigger asChild>
                      <Button className="w-full bg-eagle-green hover:bg-viridian-green text-white font-gotham-bold h-12">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Request Quote
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="font-gotham-bold text-eagle-green">
                          Request Quote from {service.provider.name}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="font-gotham-light text-eagle-green">Your Name *</Label>
                            <Input
                              value={quoteForm.name}
                              onChange={(e) => setQuoteForm(prev => ({ ...prev, name: e.target.value }))}
                              className="border-eagle-green/30 focus:border-viridian-green"
                            />
                          </div>
                          
                          <div>
                            <Label className="font-gotham-light text-eagle-green">Email *</Label>
                            <Input
                              type="email"
                              value={quoteForm.email}
                              onChange={(e) => setQuoteForm(prev => ({ ...prev, email: e.target.value }))}
                              className="border-eagle-green/30 focus:border-viridian-green"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="font-gotham-light text-eagle-green">Phone</Label>
                          <Input
                            value={quoteForm.phone}
                            onChange={(e) => setQuoteForm(prev => ({ ...prev, phone: e.target.value }))}
                            className="border-eagle-green/30 focus:border-viridian-green"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="font-gotham-light text-eagle-green">Event Date *</Label>
                            <Input
                              type="date"
                              value={quoteForm.eventDate}
                              onChange={(e) => setQuoteForm(prev => ({ ...prev, eventDate: e.target.value }))}
                              className="border-eagle-green/30 focus:border-viridian-green"
                            />
                          </div>
                          
                          <div>
                            <Label className="font-gotham-light text-eagle-green">Guest Count</Label>
                            <Input
                              type="number"
                              value={quoteForm.guestCount}
                              onChange={(e) => setQuoteForm(prev => ({ ...prev, guestCount: e.target.value }))}
                              className="border-eagle-green/30 focus:border-viridian-green"
                              placeholder="50"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="font-gotham-light text-eagle-green">Event Location *</Label>
                          <Input
                            value={quoteForm.eventLocation}
                            onChange={(e) => setQuoteForm(prev => ({ ...prev, eventLocation: e.target.value }))}
                            className="border-eagle-green/30 focus:border-viridian-green"
                            placeholder="Venue name or address"
                          />
                        </div>

                        <div>
                          <Label className="font-gotham-light text-eagle-green">Requirements</Label>
                          <Textarea
                            value={quoteForm.requirements}
                            onChange={(e) => setQuoteForm(prev => ({ ...prev, requirements: e.target.value }))}
                            className="border-eagle-green/30 focus:border-viridian-green"
                            placeholder="Describe your specific needs..."
                            rows={3}
                          />
                        </div>

                        <Button
                          onClick={handleQuoteSubmit}
                          disabled={!quoteForm.name || !quoteForm.email || !quoteForm.eventDate || !quoteForm.eventLocation || quoteMutation.isPending}
                          className="w-full bg-eagle-green hover:bg-viridian-green text-white font-gotham-bold"
                        >
                          {quoteMutation.isPending ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              Send Quote Request
                            </>
                          )}
                        </Button>

                        <p className="text-xs font-gotham-light text-eagle-green/70 text-center">
                          The provider will respond within 24 hours with a detailed quote.
                        </p>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <div className="flex items-center gap-2 text-sm font-gotham-light text-eagle-green/70">
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

