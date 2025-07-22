/**
 * OpenDate.io Live Music Venue Management API Types
 * 
 * OpenDate.io is an all-in-one live music platform that helps venues and promoters
 * maximize revenue through integrated booking, ticketing, and marketing tools.
 * 
 * API Documentation: https://opendate.readme.io
 * Platform: https://app.opendate.io
 */

// Core Authentication Types
export interface OpenDateCredentials {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken?: string;
  environment: 'production' | 'sandbox';
}

// Base API Response Structure
export interface OpenDateApiResponse<T> {
  data?: T;
  success?: boolean;
  message?: string;
  error?: string;
  pagination?: OpenDatePagination;
}

export interface OpenDatePagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// Artist Types
export interface OpenDateArtist {
  id: string;
  name: string;
  bio?: string;
  genre?: string;
  website?: string;
  social_media?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    spotify?: string;
    bandcamp?: string;
  };
  image_url?: string;
  contact_email?: string;
  contact_phone?: string;
  booking_fee?: number;
  tech_rider?: string;
  hospitality_rider?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

// Event/Show Types (called "Confirms" in OpenDate)
export interface OpenDateConfirm {
  id: string;
  venue_id: string;
  venue_name: string;
  artist_id: string;
  artist_name: string;
  show_date: string;
  show_time?: string;
  doors_time?: string;
  end_time?: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  show_type: 'concert' | 'festival' | 'private' | 'showcase' | 'other';
  capacity: number;
  tickets_sold: number;
  tickets_available: number;
  ticket_sales_start?: string;
  ticket_sales_end?: string;
  
  // Financial Information
  guarantee?: number;
  door_split?: number;
  bar_split?: number;
  merchandise_split?: number;
  total_gross: number;
  venue_expenses: number;
  artist_payout: number;
  venue_profit: number;
  
  // Additional Details
  age_restriction?: string;
  description?: string;
  promotional_text?: string;
  event_url?: string;
  image_url?: string;
  
  // Technical Requirements
  sound_check_time?: string;
  load_in_time?: string;
  load_out_time?: string;
  
  created_at: string;
  updated_at: string;
  created_by: string;
}

// Ticket Types
export interface OpenDateTicketType {
  id: string;
  confirm_id: string;
  name: string;
  description?: string;
  price: number;
  fee: number;
  total_price: number;
  quantity_available: number;
  quantity_sold: number;
  sale_start_date?: string;
  sale_end_date?: string;
  is_active: boolean;
  is_hidden: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface OpenDateTicket {
  id: string;
  ticket_type_id: string;
  ticket_type_name: string;
  order_id: string;
  confirm_id: string;
  barcode: string;
  qr_code?: string;
  status: 'valid' | 'used' | 'refunded' | 'cancelled';
  price: number;
  fee: number;
  total_price: number;
  purchased_at: string;
  used_at?: string;
  refunded_at?: string;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  special_notes?: string;
  created_at: string;
  updated_at: string;
}

// Order Types
export interface OpenDateOrder {
  id: string;
  confirm_id: string;
  customer_id?: string;
  order_number: string;
  status: 'pending' | 'completed' | 'cancelled' | 'refunded' | 'failed';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method: 'card' | 'cash' | 'comp' | 'other';
  
  // Customer Information
  customer_first_name?: string;
  customer_last_name?: string;
  customer_email?: string;
  customer_phone?: string;
  
  // Financial Details
  subtotal: number;
  fees: number;
  taxes: number;
  total: number;
  amount_paid: number;
  amount_refunded: number;
  
  // Tickets
  tickets: OpenDateTicket[];
  ticket_count: number;
  
  // Timestamps
  ordered_at: string;
  paid_at?: string;
  cancelled_at?: string;
  refunded_at?: string;
  created_at: string;
  updated_at: string;
  
  // Additional Information
  promo_code?: string;
  discount_amount?: number;
  source: string; // 'online', 'door', 'phone', etc.
  notes?: string;
}

// Fan/Customer Types
export interface OpenDateFan {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  
  // Preferences
  favorite_genres?: string[];
  marketing_opt_in: boolean;
  sms_opt_in: boolean;
  
  // Engagement Statistics
  total_orders: number;
  total_spent: number;
  first_order_date?: string;
  last_order_date?: string;
  average_order_value: number;
  lifetime_value: number;
  
  // Show Attendance
  shows_attended: number;
  no_shows: number;
  cancellations: number;
  
  // Location
  city?: string;
  state?: string;
  country?: string;
  zip_code?: string;
  
  created_at: string;
  updated_at: string;
  last_seen_at?: string;
}

// Venue Types
export interface OpenDateVenue {
  id: string;
  name: string;
  description?: string;
  capacity: number;
  
  // Location
  address: {
    street: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
  };
  
  // Contact Information
  phone?: string;
  email?: string;
  website?: string;
  
  // Technical Specifications
  stage_info?: {
    stage_width?: number;
    stage_depth?: number;
    ceiling_height?: number;
    power_available?: string;
    sound_system?: string;
    lighting_system?: string;
  };
  
  // Policies
  age_policy?: string;
  parking_info?: string;
  accessibility_info?: string;
  
  // Financial Settings
  default_door_split?: number;
  default_bar_split?: number;
  default_guarantee?: number;
  
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

// Settlement/Financial Types
export interface OpenDateSettlement {
  id: string;
  confirm_id: string;
  venue_id: string;
  artist_id: string;
  settlement_date: string;
  period_start: string;
  period_end: string;
  
  // Revenue Breakdown
  ticket_revenue: number;
  bar_revenue: number;
  merchandise_revenue: number;
  other_revenue: number;
  total_gross_revenue: number;
  
  // Expenses
  venue_expenses: number;
  marketing_expenses: number;
  production_expenses: number;
  other_expenses: number;
  total_expenses: number;
  
  // Splits
  artist_guarantee: number;
  artist_door_percentage: number;
  artist_bar_percentage: number;
  artist_total_payout: number;
  venue_total_profit: number;
  
  // Payment Information
  payment_status: 'pending' | 'paid' | 'dispute' | 'cancelled';
  payment_method?: string;
  payment_date?: string;
  payment_reference?: string;
  
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

// Analytics Types
export interface OpenDateAnalytics {
  period_start: string;
  period_end: string;
  venue_id?: string;
  
  // Event Statistics
  total_events: number;
  total_capacity: number;
  total_tickets_sold: number;
  average_attendance_rate: number;
  sold_out_shows: number;
  
  // Revenue Statistics
  total_revenue: number;
  ticket_revenue: number;
  bar_revenue: number;
  merchandise_revenue: number;
  average_revenue_per_show: number;
  
  // Customer Statistics
  total_customers: number;
  new_customers: number;
  returning_customers: number;
  average_order_value: number;
  customer_retention_rate: number;
  
  // Top Performers
  top_artists: Array<{
    artist_id: string;
    artist_name: string;
    shows_count: number;
    total_revenue: number;
    average_attendance: number;
  }>;
  
  top_shows: Array<{
    confirm_id: string;
    artist_name: string;
    show_date: string;
    tickets_sold: number;
    revenue: number;
    attendance_rate: number;
  }>;
}

// Transaction Types (for VenueSync compatibility)
export interface OpenDateTransaction {
  transaction_id: string;
  confirm_id?: string;
  order_id?: string;
  ticket_id?: string;
  artist_id?: string;
  artist_name?: string;
  venue_id?: string;
  venue_name?: string;
  
  // Transaction Details
  transaction_type: 'ticket_sale' | 'refund' | 'settlement' | 'fee' | 'expense';
  amount: number;
  currency: string;
  fee_amount?: number;
  net_amount: number;
  
  // Event Information
  show_date?: string;
  show_name?: string;
  ticket_type?: string;
  quantity?: number;
  
  // Customer Information
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  
  // Payment Information
  payment_method?: string;
  payment_status: string;
  payment_reference?: string;
  
  // Timestamps
  transaction_date: string;
  created_at: string;
  updated_at: string;
  
  // Additional Metadata
  snapshot_timestamp?: string;
  source: 'opendate';
  notes?: string;
}

// Filter Types
export interface OpenDateConfirmFilters {
  venue_id?: string;
  artist_id?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  show_type?: string;
}

export interface OpenDateOrderFilters {
  confirm_id?: string;
  customer_id?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  payment_status?: string;
  min_amount?: number;
  max_amount?: number;
}

export interface OpenDateFanFilters {
  venue_id?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  min_spent?: number;
  max_spent?: number;
  last_order_after?: string;
  last_order_before?: string;
  marketing_opt_in?: boolean;
}

// Webhook Types
export interface OpenDateWebhook {
  id: string;
  event_type: 'order.created' | 'order.completed' | 'order.cancelled' | 'order.refunded' | 
              'ticket.used' | 'confirm.created' | 'confirm.updated' | 'settlement.completed';
  object_type: 'order' | 'ticket' | 'confirm' | 'settlement' | 'fan';
  object_id: string;
  data: Record<string, any>;
  venue_id?: string;
  timestamp: string;
  signature: string;
}

// API Endpoints Configuration
export const OPENDATE_API_ENDPOINTS = {
  BASE: 'https://api.opendate.io/v1',
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
  },
  ARTISTS: {
    LIST: '/artists',
    DETAIL: '/artists/:id',
    CREATE: '/artists',
    UPDATE: '/artists/:id',
  },
  CONFIRMS: {
    LIST: '/confirms',
    DETAIL: '/confirms/:id',
    CREATE: '/confirms',
    UPDATE: '/confirms/:id',
    RECOMMENDATIONS: '/confirms/recommendations',
    PROFIT_LOSS: '/confirms/:id/profit-loss',
  },
  TICKETS: {
    TYPES: '/ticket-types',
    LIST: '/tickets',
    DETAIL: '/tickets/:id',
    CHECKIN: '/tickets/:id/checkin',
    CHECKOUT: '/tickets/:id/checkout',
    PRINT: '/tickets/:id/print',
  },
  ORDERS: {
    LIST: '/orders',
    DETAIL: '/orders/:id',
    CREATE: '/orders',
    UPDATE: '/orders/:id',
    REFUND: '/orders/:id/refund',
    RECEIPT: '/orders/:id/receipt',
  },
  FANS: {
    LIST: '/fans',
    DETAIL: '/fans/:id',
    RECOMMENDATIONS: '/fans/recommendations',
    MARKETING_UPDATE: '/fans/:id/marketing',
  },
  VENUES: {
    LIST: '/venues',
    DETAIL: '/venues/:id',
  },
  SETTLEMENTS: {
    LIST: '/settlements',
    DETAIL: '/settlements/:id',
    CREATE: '/settlements',
    UPDATE: '/settlements/:id',
  },
  ANALYTICS: {
    OVERVIEW: '/analytics/overview',
    EVENTS: '/analytics/events',
    REVENUE: '/analytics/revenue',
    CUSTOMERS: '/analytics/customers',
  },
  WEBHOOKS: {
    LIST: '/webhooks',
    CREATE: '/webhooks',
    UPDATE: '/webhooks/:id',
    DELETE: '/webhooks/:id',
  },
} as const;