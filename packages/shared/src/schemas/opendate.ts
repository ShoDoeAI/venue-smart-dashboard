/**
 * Zod validation schemas for OpenDate.io Live Music Venue Management API
 * 
 * These schemas validate OpenDate.io API responses and ensure type safety
 * throughout the VenueSync application.
 */

import { z } from 'zod';

// Core Schema Types
export const OpenDateCredentialsSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client secret is required'),
  accessToken: z.string().min(1, 'Access token is required'),
  refreshToken: z.string().optional(),
  environment: z.enum(['production', 'sandbox']),
});

export const OpenDatePaginationSchema = z.object({
  page: z.number().int().positive(),
  per_page: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  total_pages: z.number().int().nonnegative(),
  has_next: z.boolean(),
  has_prev: z.boolean(),
});

export const OpenDateApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) => z.object({
  data: dataSchema.optional(),
  success: z.boolean().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
  pagination: OpenDatePaginationSchema.optional(),
});

// Address Schema
export const OpenDateAddressSchema = z.object({
  street: z.string(),
  city: z.string(),
  state: z.string(),
  zip_code: z.string(),
  country: z.string(),
});

// Social Media Schema
export const OpenDateSocialMediaSchema = z.object({
  facebook: z.string().url().optional(),
  instagram: z.string().url().optional(),
  twitter: z.string().url().optional(),
  spotify: z.string().url().optional(),
  bandcamp: z.string().url().optional(),
});

// Artist Schema
export const OpenDateArtistSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Artist name is required'),
  bio: z.string().optional(),
  genre: z.string().optional(),
  website: z.string().url().optional(),
  social_media: OpenDateSocialMediaSchema.optional(),
  image_url: z.string().url().optional(),
  contact_email: z.string().email().optional(),
  contact_phone: z.string().optional(),
  booking_fee: z.number().nonnegative().optional(),
  tech_rider: z.string().optional(),
  hospitality_rider: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  is_active: z.boolean(),
});

// Event/Show (Confirm) Schema
export const OpenDateConfirmSchema = z.object({
  id: z.string(),
  venue_id: z.string(),
  venue_name: z.string(),
  artist_id: z.string(),
  artist_name: z.string(),
  show_date: z.string().datetime(),
  show_time: z.string().optional(),
  doors_time: z.string().optional(),
  end_time: z.string().optional(),
  status: z.enum(['confirmed', 'pending', 'cancelled', 'completed']),
  show_type: z.enum(['concert', 'festival', 'private', 'showcase', 'other']),
  capacity: z.number().int().positive(),
  tickets_sold: z.number().int().nonnegative(),
  tickets_available: z.number().int().nonnegative(),
  ticket_sales_start: z.string().datetime().optional(),
  ticket_sales_end: z.string().datetime().optional(),
  
  // Financial Information
  guarantee: z.number().optional(),
  door_split: z.number().min(0).max(100).optional(),
  bar_split: z.number().min(0).max(100).optional(),
  merchandise_split: z.number().min(0).max(100).optional(),
  total_gross: z.number().nonnegative(),
  venue_expenses: z.number().nonnegative(),
  artist_payout: z.number().nonnegative(),
  venue_profit: z.number(),
  
  // Additional Details
  age_restriction: z.string().optional(),
  description: z.string().optional(),
  promotional_text: z.string().optional(),
  event_url: z.string().url().optional(),
  image_url: z.string().url().optional(),
  
  // Technical Requirements
  sound_check_time: z.string().optional(),
  load_in_time: z.string().optional(),
  load_out_time: z.string().optional(),
  
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  created_by: z.string(),
});

// Ticket Type Schema
export const OpenDateTicketTypeSchema = z.object({
  id: z.string(),
  confirm_id: z.string(),
  name: z.string().min(1, 'Ticket type name is required'),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  fee: z.number().nonnegative(),
  total_price: z.number().nonnegative(),
  quantity_available: z.number().int().nonnegative(),
  quantity_sold: z.number().int().nonnegative(),
  sale_start_date: z.string().datetime().optional(),
  sale_end_date: z.string().datetime().optional(),
  is_active: z.boolean(),
  is_hidden: z.boolean(),
  sort_order: z.number().int(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Ticket Schema
export const OpenDateTicketSchema = z.object({
  id: z.string(),
  ticket_type_id: z.string(),
  ticket_type_name: z.string(),
  order_id: z.string(),
  confirm_id: z.string(),
  barcode: z.string(),
  qr_code: z.string().optional(),
  status: z.enum(['valid', 'used', 'refunded', 'cancelled']),
  price: z.number().nonnegative(),
  fee: z.number().nonnegative(),
  total_price: z.number().nonnegative(),
  purchased_at: z.string().datetime(),
  used_at: z.string().datetime().optional(),
  refunded_at: z.string().datetime().optional(),
  guest_name: z.string().optional(),
  guest_email: z.string().email().optional(),
  guest_phone: z.string().optional(),
  special_notes: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Order Schema
export const OpenDateOrderSchema = z.object({
  id: z.string(),
  confirm_id: z.string(),
  customer_id: z.string().optional(),
  order_number: z.string(),
  status: z.enum(['pending', 'completed', 'cancelled', 'refunded', 'failed']),
  payment_status: z.enum(['pending', 'paid', 'failed', 'refunded']),
  payment_method: z.enum(['card', 'cash', 'comp', 'other']),
  
  // Customer Information
  customer_first_name: z.string().optional(),
  customer_last_name: z.string().optional(),
  customer_email: z.string().email().optional(),
  customer_phone: z.string().optional(),
  
  // Financial Details
  subtotal: z.number().nonnegative(),
  fees: z.number().nonnegative(),
  taxes: z.number().nonnegative(),
  total: z.number().nonnegative(),
  amount_paid: z.number().nonnegative(),
  amount_refunded: z.number().nonnegative(),
  
  // Tickets
  tickets: z.array(OpenDateTicketSchema),
  ticket_count: z.number().int().nonnegative(),
  
  // Timestamps
  ordered_at: z.string().datetime(),
  paid_at: z.string().datetime().optional(),
  cancelled_at: z.string().datetime().optional(),
  refunded_at: z.string().datetime().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  
  // Additional Information
  promo_code: z.string().optional(),
  discount_amount: z.number().nonnegative().optional(),
  source: z.string(),
  notes: z.string().optional(),
});

// Fan/Customer Schema
export const OpenDateFanSchema = z.object({
  id: z.string(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  date_of_birth: z.string().optional(),
  
  // Preferences
  favorite_genres: z.array(z.string()).optional(),
  marketing_opt_in: z.boolean(),
  sms_opt_in: z.boolean(),
  
  // Engagement Statistics
  total_orders: z.number().int().nonnegative(),
  total_spent: z.number().nonnegative(),
  first_order_date: z.string().datetime().optional(),
  last_order_date: z.string().datetime().optional(),
  average_order_value: z.number().nonnegative(),
  lifetime_value: z.number().nonnegative(),
  
  // Show Attendance
  shows_attended: z.number().int().nonnegative(),
  no_shows: z.number().int().nonnegative(),
  cancellations: z.number().int().nonnegative(),
  
  // Location
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  zip_code: z.string().optional(),
  
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  last_seen_at: z.string().datetime().optional(),
});

// Stage Info Schema
export const OpenDateStageInfoSchema = z.object({
  stage_width: z.number().positive().optional(),
  stage_depth: z.number().positive().optional(),
  ceiling_height: z.number().positive().optional(),
  power_available: z.string().optional(),
  sound_system: z.string().optional(),
  lighting_system: z.string().optional(),
});

// Venue Schema
export const OpenDateVenueSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Venue name is required'),
  description: z.string().optional(),
  capacity: z.number().int().positive(),
  
  // Location
  address: OpenDateAddressSchema,
  
  // Contact Information
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  
  // Technical Specifications
  stage_info: OpenDateStageInfoSchema.optional(),
  
  // Policies
  age_policy: z.string().optional(),
  parking_info: z.string().optional(),
  accessibility_info: z.string().optional(),
  
  // Financial Settings
  default_door_split: z.number().min(0).max(100).optional(),
  default_bar_split: z.number().min(0).max(100).optional(),
  default_guarantee: z.number().nonnegative().optional(),
  
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  is_active: z.boolean(),
});

// Settlement Schema
export const OpenDateSettlementSchema = z.object({
  id: z.string(),
  confirm_id: z.string(),
  venue_id: z.string(),
  artist_id: z.string(),
  settlement_date: z.string().datetime(),
  period_start: z.string().datetime(),
  period_end: z.string().datetime(),
  
  // Revenue Breakdown
  ticket_revenue: z.number().nonnegative(),
  bar_revenue: z.number().nonnegative(),
  merchandise_revenue: z.number().nonnegative(),
  other_revenue: z.number().nonnegative(),
  total_gross_revenue: z.number().nonnegative(),
  
  // Expenses
  venue_expenses: z.number().nonnegative(),
  marketing_expenses: z.number().nonnegative(),
  production_expenses: z.number().nonnegative(),
  other_expenses: z.number().nonnegative(),
  total_expenses: z.number().nonnegative(),
  
  // Splits
  artist_guarantee: z.number().nonnegative(),
  artist_door_percentage: z.number().min(0).max(100),
  artist_bar_percentage: z.number().min(0).max(100),
  artist_total_payout: z.number().nonnegative(),
  venue_total_profit: z.number(),
  
  // Payment Information
  payment_status: z.enum(['pending', 'paid', 'dispute', 'cancelled']),
  payment_method: z.string().optional(),
  payment_date: z.string().datetime().optional(),
  payment_reference: z.string().optional(),
  
  notes: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  created_by: z.string(),
});

// Top Artist Schema
export const OpenDateTopArtistSchema = z.object({
  artist_id: z.string(),
  artist_name: z.string(),
  shows_count: z.number().int().nonnegative(),
  total_revenue: z.number().nonnegative(),
  average_attendance: z.number().nonnegative(),
});

// Top Show Schema
export const OpenDateTopShowSchema = z.object({
  confirm_id: z.string(),
  artist_name: z.string(),
  show_date: z.string().datetime(),
  tickets_sold: z.number().int().nonnegative(),
  revenue: z.number().nonnegative(),
  attendance_rate: z.number().min(0).max(100),
});

// Analytics Schema
export const OpenDateAnalyticsSchema = z.object({
  period_start: z.string().datetime(),
  period_end: z.string().datetime(),
  venue_id: z.string().optional(),
  
  // Event Statistics
  total_events: z.number().int().nonnegative(),
  total_capacity: z.number().int().nonnegative(),
  total_tickets_sold: z.number().int().nonnegative(),
  average_attendance_rate: z.number().min(0).max(100),
  sold_out_shows: z.number().int().nonnegative(),
  
  // Revenue Statistics
  total_revenue: z.number().nonnegative(),
  ticket_revenue: z.number().nonnegative(),
  bar_revenue: z.number().nonnegative(),
  merchandise_revenue: z.number().nonnegative(),
  average_revenue_per_show: z.number().nonnegative(),
  
  // Customer Statistics
  total_customers: z.number().int().nonnegative(),
  new_customers: z.number().int().nonnegative(),
  returning_customers: z.number().int().nonnegative(),
  average_order_value: z.number().nonnegative(),
  customer_retention_rate: z.number().min(0).max(100),
  
  // Top Performers
  top_artists: z.array(OpenDateTopArtistSchema),
  top_shows: z.array(OpenDateTopShowSchema),
});

// Transaction Schema (for VenueSync compatibility)
export const OpenDateTransactionSchema = z.object({
  transaction_id: z.string(),
  confirm_id: z.string().optional(),
  order_id: z.string().optional(),
  ticket_id: z.string().optional(),
  artist_id: z.string().optional(),
  artist_name: z.string().optional(),
  venue_id: z.string().optional(),
  venue_name: z.string().optional(),
  
  // Transaction Details
  transaction_type: z.enum(['ticket_sale', 'refund', 'settlement', 'fee', 'expense']),
  amount: z.number(),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  fee_amount: z.number().optional(),
  net_amount: z.number(),
  
  // Event Information
  show_date: z.string().datetime().optional(),
  show_name: z.string().optional(),
  ticket_type: z.string().optional(),
  quantity: z.number().optional(),
  
  // Customer Information
  customer_id: z.string().optional(),
  customer_name: z.string().optional(),
  customer_email: z.string().email().optional(),
  
  // Payment Information
  payment_method: z.string().optional(),
  payment_status: z.string(),
  payment_reference: z.string().optional(),
  
  // Timestamps
  transaction_date: z.string().datetime(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  
  // Additional Metadata
  snapshot_timestamp: z.string().datetime().optional(),
  source: z.literal('opendate'),
  notes: z.string().optional(),
});

// Filter Schemas
export const OpenDateConfirmFiltersSchema = z.object({
  venue_id: z.string().optional(),
  artist_id: z.string().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  status: z.string().optional(),
  show_type: z.string().optional(),
});

export const OpenDateOrderFiltersSchema = z.object({
  confirm_id: z.string().optional(),
  customer_id: z.string().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  status: z.string().optional(),
  payment_status: z.string().optional(),
  min_amount: z.number().optional(),
  max_amount: z.number().optional(),
});

export const OpenDateFanFiltersSchema = z.object({
  venue_id: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  min_spent: z.number().optional(),
  max_spent: z.number().optional(),
  last_order_after: z.string().datetime().optional(),
  last_order_before: z.string().datetime().optional(),
});

// Webhook Schema
export const OpenDateWebhookSchema = z.object({
  id: z.string(),
  event_type: z.enum([
    'order.created',
    'order.completed',
    'order.cancelled',
    'order.refunded',
    'ticket.used',
    'confirm.created',
    'confirm.updated',
    'settlement.completed'
  ]),
  object_type: z.enum(['order', 'ticket', 'confirm', 'settlement', 'fan']),
  object_id: z.string(),
  data: z.record(z.any()),
  venue_id: z.string().optional(),
  timestamp: z.string().datetime(),
  signature: z.string(),
});

// Response Schemas
export const OpenDateArtistsResponseSchema = OpenDateApiResponseSchema(z.array(OpenDateArtistSchema));
export const OpenDateSingleArtistResponseSchema = OpenDateApiResponseSchema(OpenDateArtistSchema);
export const OpenDateConfirmsResponseSchema = OpenDateApiResponseSchema(z.array(OpenDateConfirmSchema));
export const OpenDateSingleConfirmResponseSchema = OpenDateApiResponseSchema(OpenDateConfirmSchema);
export const OpenDateOrdersResponseSchema = OpenDateApiResponseSchema(z.array(OpenDateOrderSchema));
export const OpenDateSingleOrderResponseSchema = OpenDateApiResponseSchema(OpenDateOrderSchema);
export const OpenDateFansResponseSchema = OpenDateApiResponseSchema(z.array(OpenDateFanSchema));
export const OpenDateSingleFanResponseSchema = OpenDateApiResponseSchema(OpenDateFanSchema);
export const OpenDateVenuesResponseSchema = OpenDateApiResponseSchema(z.array(OpenDateVenueSchema));
export const OpenDateSingleVenueResponseSchema = OpenDateApiResponseSchema(OpenDateVenueSchema);
export const OpenDateSettlementsResponseSchema = OpenDateApiResponseSchema(z.array(OpenDateSettlementSchema));
export const OpenDateSingleSettlementResponseSchema = OpenDateApiResponseSchema(OpenDateSettlementSchema);
export const OpenDateAnalyticsResponseSchema = OpenDateApiResponseSchema(OpenDateAnalyticsSchema);
export const OpenDateTransactionsResponseSchema = OpenDateApiResponseSchema(z.array(OpenDateTransactionSchema));

// Export types inferred from schemas
export type OpenDateCredentials = z.infer<typeof OpenDateCredentialsSchema>;
export type OpenDatePagination = z.infer<typeof OpenDatePaginationSchema>;
export type OpenDateArtist = z.infer<typeof OpenDateArtistSchema>;
export type OpenDateConfirm = z.infer<typeof OpenDateConfirmSchema>;
export type OpenDateTicketType = z.infer<typeof OpenDateTicketTypeSchema>;
export type OpenDateTicket = z.infer<typeof OpenDateTicketSchema>;
export type OpenDateOrder = z.infer<typeof OpenDateOrderSchema>;
export type OpenDateFan = z.infer<typeof OpenDateFanSchema>;
export type OpenDateVenue = z.infer<typeof OpenDateVenueSchema>;
export type OpenDateSettlement = z.infer<typeof OpenDateSettlementSchema>;
export type OpenDateAnalytics = z.infer<typeof OpenDateAnalyticsSchema>;
export type OpenDateTransaction = z.infer<typeof OpenDateTransactionSchema>;
export type OpenDateConfirmFilters = z.infer<typeof OpenDateConfirmFiltersSchema>;
export type OpenDateOrderFilters = z.infer<typeof OpenDateOrderFiltersSchema>;
export type OpenDateFanFilters = z.infer<typeof OpenDateFanFiltersSchema>;
export type OpenDateWebhook = z.infer<typeof OpenDateWebhookSchema>;