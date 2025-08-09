export type Country = 'ET' | 'US';
export type Currency = 'ETB' | 'USD';

export interface City {
  id: string;
  name: string;
  country: Country;
  timezone: string;
}

export const CITIES: Record<Country, City[]> = {
  ET: [
    { id: 'addis-ababa', name: 'Addis Ababa', country: 'ET', timezone: 'Africa/Addis_Ababa' },
    { id: 'mekelle', name: 'Mekelle', country: 'ET', timezone: 'Africa/Addis_Ababa' },
    { id: 'dire-dawa', name: 'Dire Dawa', country: 'ET', timezone: 'Africa/Addis_Ababa' },
    { id: 'hawassa', name: 'Hawassa', country: 'ET', timezone: 'Africa/Addis_Ababa' },
    { id: 'bahir-dar', name: 'Bahir Dar', country: 'ET', timezone: 'Africa/Addis_Ababa' },
  ],
  US: [
    { id: 'dallas-fort-worth', name: 'Dallas–Fort Worth', country: 'US', timezone: 'America/Chicago' },
    { id: 'washington-dc-dmv', name: 'Washington DC / DMV', country: 'US', timezone: 'America/New_York' },
    { id: 'seattle', name: 'Seattle', country: 'US', timezone: 'America/Los_Angeles' },
    { id: 'minneapolis', name: 'Minneapolis', country: 'US', timezone: 'America/Chicago' },
    { id: 'denver', name: 'Denver', country: 'US', timezone: 'America/Denver' },
    { id: 'atlanta', name: 'Atlanta', country: 'US', timezone: 'America/New_York' },
    { id: 'bay-area', name: 'Bay Area', country: 'US', timezone: 'America/Los_Angeles' },
  ],
};

export type DeliveryMethod = 'email' | 'sms' | 'printable' | 'in_person' | 'influencer';

export interface DeliveryOptions {
  email: boolean;
  sms: boolean;
  printable: boolean;
  in_person: boolean;
  influencer: boolean;
}

export interface TicketType {
  id: string;
  name: string;
  price: number;
  currency: Currency;
  capacity?: number;
  remaining?: number;
  description?: string;
}

export interface EventCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

export const EVENT_CATEGORIES: EventCategory[] = [
  { id: 'concerts', name: 'Concerts & Music', slug: 'concerts', icon: '🎵' },
  { id: 'theatre', name: 'Theatre & Arts', slug: 'theatre', icon: '🎭' },
  { id: 'festivals', name: 'Festivals & Celebrations', slug: 'festivals', icon: '🎉' },
  { id: 'film', name: 'Film & Cinema', slug: 'film', icon: '🎬' },
  { id: 'cultural', name: 'Cultural Events', slug: 'cultural', icon: '🏛️' },
  { id: 'sports', name: 'Sports & Recreation', slug: 'sports', icon: '⚽' },
  { id: 'food', name: 'Food & Dining', slug: 'food', icon: '🍽️' },
  { id: 'networking', name: 'Networking & Business', slug: 'networking', icon: '🤝' },
];

export interface Event {
  id: string;
  slug?: string;
  title: string;
  description: string;
  venue: string;
  country: Country;
  city: string;
  timezone: string;
  baseCurrency: Currency;
  startDate: string;
  endDate: string;
  poster: string;
  gallery: string[];
  categoryId: string;
  ticketTypes: TicketType[];
  deliveryOptionsByCity: Record<string, DeliveryOptions>;
  policies: {
    refundable: boolean;
    refundWindowHours?: number;
    reschedulePolicy?: string;
    cancellationPolicy?: string;
  };
  badges: Array<'new' | 'limited' | 'refundable' | 'popular'>;
  capacity?: number;
  tags: string[];
  organizer: {
    name: string;
    contact: string;
  };
  createdAt: string;
  updatedAt: string;
}

export type ServiceCategory = 
  | 'photography' 
  | 'videography' 
  | 'decoration' 
  | 'catering' 
  | 'music' 
  | 'mc-host' 
  | 'planning';

export const SERVICE_CATEGORIES: Record<ServiceCategory, { name: string; icon: string }> = {
  photography: { name: 'Photography', icon: '📸' },
  videography: { name: 'Videography', icon: '🎥' },
  decoration: { name: 'Decoration', icon: '🎨' },
  catering: { name: 'Catering', icon: '🍽️' },
  music: { name: 'Live Music', icon: '🎵' },
  'mc-host': { name: 'MC/Host', icon: '🎤' },
  planning: { name: 'Event Planning', icon: '📋' },
};

export interface Service {
  id: string;
  name: string;
  description: string;
  category: ServiceCategory;
  country: Country;
  city: string;
  serviceAreaKm: number;
  startingPrice: number;
  currency: Currency;
  rating: number;
  reviewCount: number;
  images: string[];
  portfolio: string[];
  features: string[];
  policies: {
    rescheduleHours: number;
    cancellationPolicy: string;
    depositRequired: boolean;
    depositPercentage: number;
  };
  provider: {
    name: string;
    verified: boolean;
    yearsExperience: number;
    contact: string;
  };
  availability: {
    workingDays: number[];
    blackoutDates: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface EventFilters {
  q?: string;
  country?: Country;
  city?: string;
  tz?: string;
  dateFrom?: string;
  dateTo?: string;
  category?: string;
  sort?: string;
  priceMin?: number;
  priceMax?: number;
}

export interface ServiceFilters {
  country?: Country;
  city?: string;
  category?: ServiceCategory;
  sort?: string;
  priceMin?: number;
  priceMax?: number;
}

export interface Order {
  id: string;
  eventId: string;
  buyerInfo: {
    name: string;
    email: string;
    phone?: string;
    country: string;
    timezone: string;
  };
  recipientInfo: {
    name: string;
    email: string;
    phone?: string;
    country: string;
    timezone: string;
  };
  lineItems: Array<{
    ticketTypeId: string;
    quantity: number;
    price: number;
    currency: Currency;
  }>;
  addons: Array<{
    id: string;
    name: string;
    price: number;
    currency: Currency;
  }>;
  deliveryMethod: DeliveryMethod;
  deliveryRegion: Country;
  scheduleAt?: string;
  giftMessage?: string;
  subtotal: number;
  taxes: number;
  fees: number;
  total: number;
  currency: Currency;
  taxSummary: {
    rate: number;
    type: 'VAT' | 'Sales Tax';
    jurisdiction: string;
  };
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled' | 'refunded';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  qrCode?: string;
  voucher?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Quote {
  id: string;
  serviceId: string;
  clientInfo: {
    name: string;
    email: string;
    phone?: string;
    eventDate: string;
    eventLocation: string;
    guestCount: number;
    requirements: string;
  };
  status: 'pending' | 'quoted' | 'accepted' | 'declined' | 'completed';
  providerResponse?: {
    price: number;
    currency: Currency;
    details: string;
    timeline: string;
    termsAndConditions: string;
    validUntil: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CurrencyExchange {
  from: Currency;
  to: Currency;
  rate: number;
  lastUpdated: string;
}

export const EXCHANGE_RATES: CurrencyExchange[] = [
  { from: 'ETB', to: 'USD', rate: 0.018, lastUpdated: '2024-01-20T10:00:00Z' },
  { from: 'USD', to: 'ETB', rate: 55.5, lastUpdated: '2024-01-20T10:00:00Z' },
];

