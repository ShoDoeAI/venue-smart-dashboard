/**
 * OpenTable API Types
 * 
 * Note: OpenTable doesn't have a public API. This is a placeholder implementation
 * based on typical restaurant reservation data that OpenTable would provide.
 * In production, you would need to use web scraping or contact OpenTable
 * for partnership API access.
 */

export interface OpenTableConfig {
  restaurantId: string;
  apiKey?: string;
  username?: string;
  password?: string;
  baseUrl?: string;
  timeout?: number;
}

export interface OpenTableCredentials {
  restaurantId: string;
  apiKey?: string;
  username?: string;
  password?: string;
}

// Reservation types
export interface OpenTableReservation {
  confirmationNumber: string;
  restaurantId: string;
  partySize: number;
  dateTime: string;
  status: 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';
  guestInfo: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  specialRequests?: string;
  tablePreference?: string;
  tags?: string[];
  source?: 'opentable' | 'restaurant_website' | 'phone' | 'walk_in';
  createdAt: string;
  updatedAt?: string;
}

// Restaurant info
export interface OpenTableRestaurant {
  id: string;
  name: string;
  cuisineType: string[];
  priceRange: '$' | '$$' | '$$$' | '$$$$';
  neighborhood: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  phone: string;
  email?: string;
  website?: string;
  hours: Record<string, { open: string; close: string }>;
  capacity: number;
  averageRating?: number;
  totalReviews?: number;
}

// Availability
export interface OpenTableAvailability {
  date: string;
  slots: Array<{
    time: string;
    partySize: number[];
    available: boolean;
    tablesAvailable?: number;
  }>;
}

// Guest/Diner info
export interface OpenTableGuest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  joinDate: string;
  totalReservations: number;
  noShows: number;
  cancellations: number;
  favoriteRestaurants?: string[];
  dietaryRestrictions?: string[];
  specialOccasions?: Array<{
    type: string;
    date: string;
  }>;
  notes?: string;
  vipStatus?: boolean;
  tags?: string[];
}

// Reviews
export interface OpenTableReview {
  id: string;
  reservationId: string;
  guestId: string;
  rating: {
    overall: number;
    food: number;
    service: number;
    ambiance: number;
    value: number;
  };
  comment?: string;
  dinedOn: string;
  reviewDate: string;
  managementResponse?: {
    message: string;
    respondedAt: string;
  };
}

// Analytics
export interface OpenTableAnalytics {
  dateRange: {
    start: string;
    end: string;
  };
  overview: {
    totalReservations: number;
    totalCovers: number;
    totalRevenue?: number;
    averagePartySize: number;
    averageRating: number;
    fillRate: number;
    noShowRate: number;
    cancellationRate: number;
  };
  peakHours: Array<{
    dayOfWeek: string;
    hour: string;
    averageCovers: number;
  }>;
  popularDishes?: string[];
  guestDemographics?: {
    newGuests: number;
    returningGuests: number;
    vipGuests: number;
  };
  sourceBreakdown: Record<string, number>;
  revenueByDay?: Record<string, number>;
}

// Wait list
export interface OpenTableWaitlistEntry {
  id: string;
  guestName: string;
  phone: string;
  partySize: number;
  requestedTime: string;
  quotedWait: number; // minutes
  actualWait?: number;
  status: 'waiting' | 'seated' | 'cancelled' | 'no_show';
  addedAt: string;
  seatedAt?: string;
  notes?: string;
}

// Shifts and Floor Plan
export interface OpenTableShift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  days: string[];
  maxCovers?: number;
  tables?: Array<{
    number: string;
    capacity: number;
    section?: string;
  }>;
}

// Transformed data for VenueSync
export interface TransformedOpenTableData {
  restaurant: OpenTableRestaurant;
  reservations: OpenTableReservation[];
  analytics: OpenTableAnalytics;
  upcomingReservations: OpenTableReservation[];
  todayStats: {
    totalReservations: number;
    totalCovers: number;
    completedReservations: number;
    noShows: number;
    cancellations: number;
    currentlySeated: number;
    upcomingToday: number;
  };
  guestInsights: {
    topGuests: Array<{
      guest: OpenTableGuest;
      totalSpent?: number;
      lastVisit: string;
    }>;
    newGuestsThisMonth: number;
    returningGuestRate: number;
  };
}

// API Response types
export interface OpenTableApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  pagination?: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}