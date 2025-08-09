import { 
  Event, 
  Service, 
  EventFilters, 
  ServiceFilters, 
  Order, 
  Quote, 
  Country,
  CITIES,
  EXCHANGE_RATES,
  CurrencyExchange
} from '../types/events';
import { EVENT_HERO, SERVICE_HERO } from '../constants/eventHeroes';

export class EventsService {
  private baseUrl = '/api';

  // Events API
  async getEvents(filters: EventFilters = {}): Promise<{ events: Event[]; total: number }> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    // For demo, return mock data
    return this.getMockEvents(filters);
  }

  async getEvent(id: string): Promise<Event | null> {
    // For demo, return mock event
    const mockEvents = await this.getMockEventsData();
    return mockEvents.find(e => e.id === id) || null;
  }

  async getEventBySlug(slug: string): Promise<Event | null> {
    // For demo, return mock event by slug
    const mockEvents = await this.getMockEventsData();
    return mockEvents.find(e => e.slug === slug) || null;
  }

  async createOrder(eventId: string, orderData: Partial<Order>): Promise<Order> {
    // For demo, return mock order
    return {
      id: `order_${Date.now()}`,
      eventId,
      ...orderData,
      status: 'pending',
      paymentStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Order;
  }

  // Services API
  async getServices(filters: ServiceFilters = {}): Promise<{ services: Service[]; total: number }> {
    // For demo, return mock services
    return this.getMockServices(filters);
  }

  async getService(id: string): Promise<Service | null> {
    const mockServices = await this.getMockServicesData();
    return mockServices.find(s => s.id === id) || null;
  }

  async createQuote(serviceId: string, quoteData: Partial<Quote>): Promise<Quote> {
    return {
      id: `quote_${Date.now()}`,
      serviceId,
      ...quoteData,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Quote;
  }

  // Utility methods
  getCitiesByCountry(country: Country) {
    return CITIES[country];
  }

  getExchangeRate(from: string, to: string): CurrencyExchange | null {
    return EXCHANGE_RATES.find(rate => rate.from === from && rate.to === to) || null;
  }

  convertCurrency(amount: number, from: string, to: string): number {
    const rate = this.getExchangeRate(from, to);
    return rate ? amount * rate.rate : amount;
  }

  formatCurrency(amount: number, currency: string, locale?: string): string {
    const formatOptions: Intl.NumberFormatOptions = {
      style: 'currency',
      currency: currency === 'ETB' ? 'ETB' : 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    };

    if (currency === 'ETB') {
      return new Intl.NumberFormat('en-ET', formatOptions).format(amount).replace('ETB', '') + ' ETB';
    }

    return new Intl.NumberFormat(locale || 'en-US', formatOptions).format(amount);
  }

  // Mock data methods
  private async getMockEvents(filters: EventFilters): Promise<{ events: Event[]; total: number }> {
    const allEvents = await this.getMockEventsData();
    let filteredEvents = allEvents;

    // Apply filters
    if (filters.country) {
      filteredEvents = filteredEvents.filter(e => e.country === filters.country);
    }
    if (filters.city) {
      filteredEvents = filteredEvents.filter(e => e.city === filters.city);
    }
    if (filters.category) {
      filteredEvents = filteredEvents.filter(e => e.categoryId === filters.category);
    }
    if (filters.q) {
      const query = filters.q.toLowerCase();
      filteredEvents = filteredEvents.filter(e => 
        e.title.toLowerCase().includes(query) || 
        e.description.toLowerCase().includes(query) ||
        e.venue.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    if (filters.sort) {
      switch (filters.sort) {
        case 'date':
          filteredEvents.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
          break;
        case 'price-low':
          filteredEvents.sort((a, b) => {
            const aMin = Math.min(...a.ticketTypes.map(t => t.price));
            const bMin = Math.min(...b.ticketTypes.map(t => t.price));
            return aMin - bMin;
          });
          break;
        case 'price-high':
          filteredEvents.sort((a, b) => {
            const aMax = Math.max(...a.ticketTypes.map(t => t.price));
            const bMax = Math.max(...b.ticketTypes.map(t => t.price));
            return bMax - aMax;
          });
          break;
        default:
          // popularity/newest
          filteredEvents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    }

    return { events: filteredEvents, total: filteredEvents.length };
  }

  private async getMockServices(filters: ServiceFilters): Promise<{ services: Service[]; total: number }> {
    const allServices = await this.getMockServicesData();
    let filteredServices = allServices;

    // Apply filters
    if (filters.country) {
      filteredServices = filteredServices.filter(s => s.country === filters.country);
    }
    if (filters.city) {
      filteredServices = filteredServices.filter(s => s.city === filters.city);
    }
    if (filters.category) {
      filteredServices = filteredServices.filter(s => s.category === filters.category);
    }

    return { services: filteredServices, total: filteredServices.length };
  }

  private async getMockEventsData(): Promise<Event[]> {
    return [
      {
        id: 'teddy-afro-addis',
        slug: 'teddy-afro-addis',
        title: 'Teddy Afro Live Concert',
        description: 'An unforgettable evening with Ethiopia\'s beloved artist Teddy Afro, performing his greatest hits and new songs.',
        venue: 'Millennium Hall',
        country: 'ET',
        city: 'addis-ababa',
        timezone: 'Africa/Addis_Ababa',
        baseCurrency: 'ETB',
        startDate: '2024-02-15T19:00:00+03:00',
        endDate: '2024-02-15T23:00:00+03:00',
        poster: EVENT_HERO['teddy-afro-addis'],
        gallery: [
          EVENT_HERO['teddy-afro-addis'],
          '/attached_assets/image_1753075147912.png'
        ],
        categoryId: 'concerts',
        ticketTypes: [
          { id: 'ga', name: 'General Admission', price: 1500, currency: 'ETB', capacity: 500, remaining: 420 },
          { id: 'vip', name: 'VIP Experience', price: 4500, currency: 'ETB', capacity: 100, remaining: 85, description: 'Includes meet & greet' }
        ],
        deliveryOptionsByCity: {
          'addis-ababa': {
            email: true,
            sms: true,
            printable: true,
            in_person: true,
            influencer: true
          }
        },
        policies: {
          refundable: true,
          refundWindowHours: 48,
          reschedulePolicy: 'Free reschedule up to 24 hours before event',
          cancellationPolicy: 'Full refund if cancelled 48+ hours before event'
        },
        badges: ['popular', 'limited'],
        capacity: 600,
        tags: ['ethiopian-music', 'live-concert', 'millennium-hall'],
        organizer: {
          name: 'Ethiopian Music Events',
          contact: 'events@ethiopianmusic.et'
        },
        createdAt: '2024-01-15T08:00:00Z',
        updatedAt: '2024-01-18T12:30:00Z'
      },
      {
        id: 'fikir-eske-mekabir',
        slug: 'fikir-eske-mekabir',
        title: 'Fikir Eske Mekabir (ፍቅር እስከ መቃብር)',
        description: 'Classic Ethiopian play at the National Theatre - a timeless love story that has captivated audiences for decades.',
        venue: 'National Theatre of Ethiopia',
        country: 'ET',
        city: 'addis-ababa',
        timezone: 'Africa/Addis_Ababa',
        baseCurrency: 'ETB',
        startDate: '2024-02-20T18:30:00+03:00',
        endDate: '2024-02-20T21:00:00+03:00',
        poster: EVENT_HERO['fikir-eske-mekabir'],
        gallery: [EVENT_HERO['fikir-eske-mekabir']],
        categoryId: 'theatre',
        ticketTypes: [
          { id: 'balcony', name: 'Balcony Seats', price: 600, currency: 'ETB', capacity: 150, remaining: 92 },
          { id: 'floor', name: 'Floor Seats', price: 900, currency: 'ETB', capacity: 200, remaining: 156 }
        ],
        deliveryOptionsByCity: {
          'addis-ababa': {
            email: true,
            sms: true,
            printable: true,
            in_person: false,
            influencer: false
          }
        },
        policies: {
          refundable: true,
          refundWindowHours: 24,
          cancellationPolicy: 'Refund available up to 24 hours before performance'
        },
        badges: ['refundable'],
        tags: ['ethiopian-theatre', 'classic-play', 'national-theatre'],
        organizer: {
          name: 'National Theatre of Ethiopia',
          contact: 'tickets@nationaltheatre.et'
        },
        createdAt: '2024-01-10T10:00:00Z',
        updatedAt: '2024-01-16T14:20:00Z'
      },
      {
        id: 'habesha-night-dallas',
        slug: 'habesha-night-dallas',
        title: 'Habesha Night - Cultural Celebration',
        description: 'Join the Habesha community in Dallas for an evening of traditional music, dance, and authentic Ethiopian cuisine.',
        venue: 'Dallas Ethiopian Cultural Center',
        country: 'US',
        city: 'dallas-fort-worth',
        timezone: 'America/Chicago',
        baseCurrency: 'USD',
        startDate: '2024-02-17T19:00:00-06:00',
        endDate: '2024-02-17T23:30:00-06:00',
        poster: EVENT_HERO['habesha-night-dallas'],
        gallery: [EVENT_HERO['habesha-night-dallas']],
        categoryId: 'cultural',
        ticketTypes: [
          { id: 'ga', name: 'General Admission', price: 35, currency: 'USD', capacity: 300, remaining: 245 },
          { id: 'vip', name: 'VIP Experience', price: 85, currency: 'USD', capacity: 50, remaining: 38, description: 'Includes premium seating and dinner' }
        ],
        deliveryOptionsByCity: {
          'dallas-fort-worth': {
            email: true,
            sms: true,
            printable: true,
            in_person: true,
            influencer: false
          }
        },
        policies: {
          refundable: true,
          refundWindowHours: 72,
          cancellationPolicy: 'Full refund if cancelled 72+ hours before event'
        },
        badges: ['new', 'popular'],
        tags: ['habesha-culture', 'traditional-music', 'community-event'],
        organizer: {
          name: 'Dallas Ethiopian Community',
          contact: 'events@dallasethiopian.org'
        },
        createdAt: '2024-01-12T09:00:00Z',
        updatedAt: '2024-01-17T16:45:00Z'
      },
      {
        id: 'letters-from-addis-dmv',
        slug: 'letters-from-addis-dmv',
        title: 'Book Release: "Letters from Addis"',
        description: 'Meet the author and celebrate the release of this compelling memoir about Ethiopian-American identity.',
        venue: 'Politics & Prose Bookstore',
        country: 'US',
        city: 'washington-dc-dmv',
        timezone: 'America/New_York',
        baseCurrency: 'USD',
        startDate: '2024-02-22T18:00:00-05:00',
        endDate: '2024-02-22T20:00:00-05:00',
        poster: EVENT_HERO['letters-from-addis-dmv'],
        gallery: [EVENT_HERO['letters-from-addis-dmv']],
        categoryId: 'cultural',
        ticketTypes: [
          { id: 'admission', name: 'Event Admission', price: 20, currency: 'USD', capacity: 80, remaining: 67, description: 'Includes meet-the-author session' }
        ],
        deliveryOptionsByCity: {
          'washington-dc-dmv': {
            email: true,
            sms: true,
            printable: true,
            in_person: false,
            influencer: false
          }
        },
        policies: {
          refundable: true,
          refundWindowHours: 24,
          cancellationPolicy: 'Refund available up to 24 hours before event'
        },
        badges: ['new', 'limited'],
        tags: ['book-launch', 'author-meet', 'ethiopian-diaspora'],
        organizer: {
          name: 'Politics & Prose',
          contact: 'events@politics-prose.com'
        },
        createdAt: '2024-01-08T11:00:00Z',
        updatedAt: '2024-01-19T09:15:00Z'
      },
      {
        id: 'seattle-ethiopian-premiere',
        slug: 'seattle-ethiopian-premiere',
        title: 'Ethiopian Film Premiere - "Aster"',
        description: 'World premiere of the award-winning Ethiopian drama "Aster" with director Q&A session.',
        venue: 'SIFF Cinema Egyptian',
        country: 'US',
        city: 'seattle',
        timezone: 'America/Los_Angeles',
        baseCurrency: 'USD',
        startDate: '2024-02-25T18:30:00-08:00',
        endDate: '2024-02-25T21:00:00-08:00',
        poster: EVENT_HERO['seattle-ethiopian-premiere'],
        gallery: [EVENT_HERO['seattle-ethiopian-premiere']],
        categoryId: 'film',
        ticketTypes: [
          { id: 'evening', name: 'Evening Show (6:30 PM)', price: 25, currency: 'USD', capacity: 220, remaining: 189 },
          { id: 'late', name: 'Late Show (9:00 PM)', price: 25, currency: 'USD', capacity: 220, remaining: 203 }
        ],
        deliveryOptionsByCity: {
          'seattle': {
            email: true,
            sms: true,
            printable: true,
            in_person: true,
            influencer: false
          }
        },
        policies: {
          refundable: false,
          cancellationPolicy: 'No refunds available for this special premiere event'
        },
        badges: ['new', 'limited'],
        tags: ['film-premiere', 'ethiopian-cinema', 'director-qa'],
        organizer: {
          name: 'Seattle International Film Festival',
          contact: 'tickets@siff.net'
        },
        createdAt: '2024-01-05T13:00:00Z',
        updatedAt: '2024-01-18T11:30:00Z'
      },
      {
        id: 'meskel-grounds-pass',
        slug: 'meskel-grounds-pass',
        title: 'Meskel Festival - Bonfire Celebration',
        description: 'Traditional Meskel celebration at the iconic Meskel Square with the lighting of the ceremonial bonfire.',
        venue: 'Meskel Square',
        country: 'ET',
        city: 'addis-ababa',
        timezone: 'Africa/Addis_Ababa',
        baseCurrency: 'ETB',
        startDate: '2024-09-27T17:00:00+03:00',
        endDate: '2024-09-27T21:00:00+03:00',
        poster: EVENT_HERO['meskel-grounds-pass'],
        gallery: [EVENT_HERO['meskel-grounds-pass']],
        categoryId: 'cultural',
        ticketTypes: [
          { id: 'general', name: 'General Access', price: 50, currency: 'ETB', capacity: 5000, remaining: 4800 },
          { id: 'vip', name: 'VIP Viewing Area', price: 200, currency: 'ETB', capacity: 500, remaining: 450, description: 'Premium viewing area with refreshments' }
        ],
        deliveryOptionsByCity: {
          'addis-ababa': {
            email: true,
            sms: true,
            printable: true,
            in_person: true,
            influencer: false
          }
        },
        policies: {
          refundable: false,
          cancellationPolicy: 'No refunds for cultural celebration events'
        },
        badges: ['popular', 'limited'],
        capacity: 5500,
        tags: ['meskel-festival', 'cultural-celebration', 'traditional'],
        organizer: {
          name: 'Ethiopian Cultural Ministry',
          contact: 'events@culture.gov.et'
        },
        createdAt: '2024-01-01T08:00:00Z',
        updatedAt: '2024-01-20T10:00:00Z'
      },
      {
        id: 'addis-wedding-photography',
        slug: 'addis-wedding-photography',
        title: 'Wedding Photography Workshop',
        description: 'Professional photography workshop focusing on Ethiopian wedding traditions and modern techniques.',
        venue: 'Addis Ababa Photography Studio',
        country: 'ET',
        city: 'addis-ababa',
        timezone: 'Africa/Addis_Ababa',
        baseCurrency: 'ETB',
        startDate: '2024-03-10T09:00:00+03:00',
        endDate: '2024-03-10T17:00:00+03:00',
        poster: EVENT_HERO['addis-wedding-photography'],
        gallery: [EVENT_HERO['addis-wedding-photography']],
        categoryId: 'education',
        ticketTypes: [
          { id: 'workshop', name: 'Full Day Workshop', price: 1200, currency: 'ETB', capacity: 25, remaining: 18, description: 'Includes materials and lunch' }
        ],
        deliveryOptionsByCity: {
          'addis-ababa': {
            email: true,
            sms: true,
            printable: true,
            in_person: false,
            influencer: false
          }
        },
        policies: {
          refundable: true,
          refundWindowHours: 48,
          cancellationPolicy: 'Full refund if cancelled 48+ hours before workshop'
        },
        badges: ['new', 'limited'],
        capacity: 25,
        tags: ['photography', 'workshop', 'wedding', 'education'],
        organizer: {
          name: 'Addis Photography Academy',
          contact: 'workshops@addisphoto.et'
        },
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-22T14:30:00Z'
      },
      {
        id: 'dmv-decor-venue',
        slug: 'dmv-decor-venue',
        title: 'DMV Ethiopian Decor & Venue Showcase',
        description: 'Showcase of traditional Ethiopian decor and venue setups for weddings and cultural events in the DMV area.',
        venue: 'Crystal Gateway Marriott',
        country: 'US',
        city: 'washington-dc-dmv',
        timezone: 'America/New_York',
        baseCurrency: 'USD',
        startDate: '2024-03-05T14:00:00-05:00',
        endDate: '2024-03-05T19:00:00-05:00',
        poster: EVENT_HERO['dmv-decor-venue'],
        gallery: [EVENT_HERO['dmv-decor-venue']],
        categoryId: 'business',
        ticketTypes: [
          { id: 'general', name: 'General Admission', price: 15, currency: 'USD', capacity: 150, remaining: 125 },
          { id: 'vendor', name: 'Vendor Package', price: 75, currency: 'USD', capacity: 30, remaining: 22, description: 'Includes booth space and networking session' }
        ],
        deliveryOptionsByCity: {
          'washington-dc-dmv': {
            email: true,
            sms: true,
            printable: true,
            in_person: false,
            influencer: false
          }
        },
        policies: {
          refundable: true,
          refundWindowHours: 24,
          cancellationPolicy: 'Refund available up to 24 hours before event'
        },
        badges: ['new'],
        capacity: 180,
        tags: ['venue-showcase', 'wedding-planning', 'ethiopian-decor', 'business'],
        organizer: {
          name: 'DMV Ethiopian Event Planners',
          contact: 'info@dmvethiopianeventplanning.com'
        },
        createdAt: '2024-01-10T12:00:00Z',
        updatedAt: '2024-01-25T16:15:00Z'
      }
    ];
  }

  private async getMockServicesData(): Promise<Service[]> {
    return [
      {
        id: 'addis-lens-studio',
        name: 'Addis Lens Studio – Wedding & Event Photography',
        description: '📸 Professional wedding and event photography with a focus on capturing authentic Ethiopian moments and traditions. Specializing in traditional ceremonies, cultural celebrations, and modern events.',
        category: 'photography',
        country: 'ET',
        city: 'addis-ababa',
        serviceAreaKm: 50,
        startingPrice: 15000,
        currency: 'ETB',
        rating: 4.8,
        reviewCount: 127,
        images: [SERVICE_HERO['addis-lens-studio']],
        portfolio: [
          SERVICE_HERO['addis-lens-studio'],
          '/attached_assets/image_1753074751900.png'
        ],
        features: [
          'Professional equipment',
          'Same-day preview',
          'Traditional ceremony expertise',
          'Digital gallery included',
          'Edited photos within 2 weeks'
        ],
        policies: {
          rescheduleHours: 72,
          cancellationPolicy: 'Free cancellation up to 72 hours before event',
          depositRequired: true,
          depositPercentage: 30
        },
        provider: {
          name: 'Haben Tekle',
          verified: true,
          yearsExperience: 8,
          contact: 'haben@addislens.et'
        },
        availability: {
          workingDays: [1, 2, 3, 4, 5, 6, 0], // Monday to Sunday
          blackoutDates: ['2024-02-15', '2024-02-16'] // Teddy Afro concert dates
        },
        createdAt: '2024-01-01T08:00:00Z',
        updatedAt: '2024-01-15T10:30:00Z'
      },
      {
        id: 'zema-band-addis',
        name: 'Zema Traditional Band – Live Traditional Music',
        description: '🎵 Authentic Ethiopian traditional music ensemble specializing in wedding ceremonies and cultural celebrations. Master musicians with expertise in traditional instruments and ceremonial songs.',
        category: 'music',
        country: 'ET',
        city: 'addis-ababa',
        serviceAreaKm: 100,
        startingPrice: 15000,
        currency: 'ETB',
        rating: 4.9,
        reviewCount: 89,
        images: [SERVICE_HERO['zema-band-addis']],
        portfolio: [SERVICE_HERO['zema-band-addis']],
        features: [
          'Traditional instruments',
          'Ceremonial expertise',
          'Multiple language songs',
          'Sound system included',
          '4-hour performance minimum'
        ],
        policies: {
          rescheduleHours: 168, // 1 week
          cancellationPolicy: 'Deposit refundable if cancelled 1+ weeks before event',
          depositRequired: true,
          depositPercentage: 50
        },
        provider: {
          name: 'Mulugeta Astatke',
          verified: true,
          yearsExperience: 15,
          contact: 'zema@traditionalmusic.et'
        },
        availability: {
          workingDays: [5, 6, 0], // Friday, Saturday, Sunday
          blackoutDates: ['2024-02-15', '2024-03-01', '2024-03-02']
        },
        createdAt: '2023-12-15T12:00:00Z',
        updatedAt: '2024-01-10T14:45:00Z'
      },
      {
        id: 'dfw-habesha-catering',
        name: 'DFW Habesha Catering – Event Food & Beverage Service',
        description: '🍽️ Authentic Ethiopian cuisine and catering services for the Habesha community in Dallas-Fort Worth. Traditional recipes, modern presentation, and full-service event catering.',
        category: 'catering',
        country: 'US',
        city: 'dallas-fort-worth',
        serviceAreaKm: 80,
        startingPrice: 750,
        currency: 'USD',
        rating: 4.8,
        reviewCount: 102,
        images: [SERVICE_HERO['dfw-habesha-catering']],
        portfolio: [
          SERVICE_HERO['dfw-habesha-catering'],
          '/attached_assets/image_1753073130392.png'
        ],
        features: [
          'Traditional Ethiopian cuisine',
          'Vegetarian and vegan options',
          'Full-service catering',
          'Custom menu planning',
          'Professional serving staff'
        ],
        policies: {
          rescheduleHours: 72,
          cancellationPolicy: 'Deposit refundable if cancelled 72+ hours before event',
          depositRequired: true,
          depositPercentage: 30
        },
        provider: {
          name: 'Selam Kebede',
          verified: true,
          yearsExperience: 7,
          contact: 'selam@dfwhabeshacatering.com'
        },
        availability: {
          workingDays: [1, 2, 3, 4, 5, 6, 0],
          blackoutDates: ['2024-02-17', '2024-02-18'] // Habesha Night weekend
        },
        createdAt: '2023-11-20T10:00:00Z',
        updatedAt: '2024-01-12T16:20:00Z'
      },
      {
        id: 'sheger-decor-dmv',
        name: 'Sheger Decor DMV – Event & Wedding Decoration',
        description: '🎨 Elegant Ethiopian-inspired decoration and floral arrangements for weddings and special events. Creating beautiful traditional and modern Ethiopian-themed celebrations.',
        category: 'decoration',
        country: 'US',
        city: 'washington-dc-dmv',
        serviceAreaKm: 60,
        startingPrice: 900,
        currency: 'USD',
        rating: 4.6,
        reviewCount: 78,
        images: [SERVICE_HERO['sheger-decor-dmv']],
        portfolio: [SERVICE_HERO['sheger-decor-dmv']],
        features: [
          'Ethiopian traditional themes',
          'Full venue transformation',
          'Custom color schemes',
          'Florals and centerpieces',
          'Setup and breakdown included'
        ],
        policies: {
          rescheduleHours: 120, // 5 days
          cancellationPolicy: 'Deposit partially refundable if cancelled 5+ days before event',
          depositRequired: true,
          depositPercentage: 40
        },
        provider: {
          name: 'Sara Wolde',
          verified: true,
          yearsExperience: 4,
          contact: 'sara@shegerdecor.com'
        },
        availability: {
          workingDays: [5, 6, 0],
          blackoutDates: ['2024-02-22'] // Book release event date
        },
        createdAt: '2023-10-05T09:00:00Z',
        updatedAt: '2024-01-08T13:15:00Z'
      }
    ];
  }
}

export const eventsService = new EventsService();

