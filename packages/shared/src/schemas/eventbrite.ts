import { z } from 'zod';

// Core schema definitions for Eventbrite API

export const EventbriteCredentialsSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required'),
  environment: z.enum(['production', 'sandbox']).default('production'),
  organizationId: z.string().optional(),
});

export const EventbriteMoneySchema = z.object({
  currency: z.string(),
  value: z.number(),
  major_value: z.string(),
});

export const EventbriteTextSchema = z.object({
  text: z.string(),
  html: z.string(),
});

export const EventbriteDateSchema = z.object({
  timezone: z.string(),
  local: z.string(),
  utc: z.string(),
});

export const EventbriteAddressSchema = z.object({
  address_1: z.string().optional(),
  address_2: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  localized_address_display: z.string().optional(),
  localized_area_display: z.string().optional(),
  localized_multi_line_address_display: z.array(z.string()).optional(),
});

export const EventbriteLogoSchema = z.object({
  id: z.string(),
  url: z.string(),
  crop_mask: z.object({
    top_left: z.object({
      x: z.number(),
      y: z.number(),
    }),
    width: z.number(),
    height: z.number(),
  }).optional(),
  original: z.object({
    url: z.string(),
    width: z.number(),
    height: z.number(),
  }),
  aspect_ratio: z.string(),
  edge_color: z.string(),
  edge_color_set: z.boolean(),
});

export const EventbriteVenueSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: EventbriteAddressSchema,
  resource_uri: z.string(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});

export const EventbriteOrganizerSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: EventbriteTextSchema,
  long_description: EventbriteTextSchema,
  logo_id: z.string().optional(),
  resource_uri: z.string(),
  logo: EventbriteLogoSchema.optional(),
  url: z.string(),
  num_past_events: z.number(),
  num_future_events: z.number(),
  twitter: z.string().optional(),
  facebook: z.string().optional(),
});

export const EventbriteTicketAvailabilitySchema = z.object({
  has_available_tickets: z.boolean(),
  minimum_ticket_price: EventbriteMoneySchema,
  maximum_ticket_price: EventbriteMoneySchema,
  is_sold_out: z.boolean(),
  start_sales_date: EventbriteDateSchema,
  waitlist_available: z.boolean(),
});

export const EventbriteEventSchema = z.object({
  id: z.string(),
  name: EventbriteTextSchema,
  description: EventbriteTextSchema,
  url: z.string(),
  start: EventbriteDateSchema,
  end: EventbriteDateSchema,
  organization_id: z.string(),
  created: z.string(),
  changed: z.string(),
  published: z.string(),
  capacity: z.number().optional(),
  capacity_is_custom: z.boolean().optional(),
  status: z.enum(['draft', 'live', 'started', 'ended', 'completed', 'canceled']),
  currency: z.string(),
  listed: z.boolean(),
  shareable: z.boolean(),
  online_event: z.boolean(),
  tx_time_limit: z.number(),
  hide_start_date: z.boolean(),
  hide_end_date: z.boolean(),
  locale: z.string(),
  is_locked: z.boolean(),
  privacy_setting: z.string(),
  is_series: z.boolean(),
  is_series_parent: z.boolean(),
  inventory_type: z.string(),
  is_reserved_seating: z.boolean(),
  show_pick_a_seat: z.boolean(),
  show_seatmap_thumbnail: z.boolean(),
  show_colors_in_seatmap_thumbnail: z.boolean(),
  source: z.string(),
  is_free: z.boolean(),
  version: z.string(),
  summary: z.string(),
  facebook_event_id: z.string().optional(),
  logo_id: z.string().optional(),
  organizer_id: z.string(),
  venue_id: z.string().optional(),
  category_id: z.string().optional(),
  subcategory_id: z.string().optional(),
  format_id: z.string().optional(),
  resource_uri: z.string(),
  is_externally_ticketed: z.boolean(),
  logo: EventbriteLogoSchema.optional(),
  venue: EventbriteVenueSchema.optional(),
  organizer: EventbriteOrganizerSchema.optional(),
  ticket_availability: EventbriteTicketAvailabilitySchema.optional(),
});

export const EventbriteBarcodeSchema = z.object({
  barcode: z.string(),
  status: z.enum(['unused', 'used']),
  created: z.string(),
  changed: z.string(),
  checkin_type: z.number(),
  is_printed: z.boolean(),
});

export const EventbriteAnswerSchema = z.object({
  question_id: z.string(),
  question: z.string(),
  type: z.string(),
  answer: z.string(),
});

export const EventbriteAttendeeProfileSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().optional(),
  name: z.string().optional(),
  addresses: z.object({
    home: EventbriteAddressSchema.optional(),
    work: EventbriteAddressSchema.optional(),
    ship: EventbriteAddressSchema.optional(),
    bill: EventbriteAddressSchema.optional(),
  }).optional(),
  cell_phone: z.string().optional(),
  work_phone: z.string().optional(),
  blog: z.string().optional(),
  company: z.string().optional(),
  website: z.string().optional(),
  birth_date: z.string().optional(),
  gender: z.string().optional(),
  age: z.string().optional(),
  job_title: z.string().optional(),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
});

export const EventbriteAttendeeCostsSchema = z.object({
  base_price: EventbriteMoneySchema,
  eventbrite_fee: EventbriteMoneySchema,
  gross: EventbriteMoneySchema,
  payment_fee: EventbriteMoneySchema,
  tax: EventbriteMoneySchema,
});

export const EventbriteAttendeeSchema = z.object({
  id: z.string(),
  created: z.string(),
  changed: z.string(),
  ticket_class_id: z.string(),
  ticket_class_name: z.string(),
  event_id: z.string(),
  order_id: z.string(),
  status: z.enum(['attending', 'not_attending', 'unknown']),
  source: z.string(),
  checked_in: z.boolean(),
  cancelled: z.boolean(),
  refunded: z.boolean(),
  affiliate: z.string().optional(),
  guestlist_id: z.string().optional(),
  invited_by: z.string().optional(),
  profile: EventbriteAttendeeProfileSchema,
  barcodes: z.array(EventbriteBarcodeSchema).optional(),
  team: z.string().optional(),
  costs: EventbriteAttendeeCostsSchema,
  resource_uri: z.string(),
  delivery_method: z.string(),
  answers: z.array(EventbriteAnswerSchema).optional(),
});

export const EventbriteOrderSchema = z.object({
  id: z.string(),
  created: z.string(),
  changed: z.string(),
  name: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  status: z.enum(['placed', 'refunded', 'cancelled', 'partially_refunded']),
  time_remaining: z.string().optional(),
  event_id: z.string(),
  attendees: z.array(EventbriteAttendeeSchema),
  costs: EventbriteAttendeeCostsSchema,
  resource_uri: z.string(),
});

export const EventbriteTicketClassSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  cost: EventbriteMoneySchema,
  fee: EventbriteMoneySchema,
  tax: EventbriteMoneySchema,
  free: z.boolean(),
  minimum_quantity: z.number(),
  maximum_quantity: z.number().optional(),
  quantity_total: z.number(),
  quantity_sold: z.number(),
  sales_start: z.string(),
  sales_end: z.string(),
  hidden: z.boolean(),
  include_fee: z.boolean(),
  split_fee: z.boolean(),
  hide_description: z.boolean(),
  auto_hide: z.boolean(),
  auto_hide_before: z.string().optional(),
  auto_hide_after: z.string().optional(),
  sales_channels: z.array(z.string()),
  resource_uri: z.string(),
});

export const EventbriteOrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  vertical: z.string(),
  locale: z.string(),
  image_id: z.string().optional(),
  image: EventbriteLogoSchema.optional(),
});

export const TransformedEventbriteTransactionSchema = z.object({
  transaction_id: z.string(),
  event_id: z.string(),
  order_id: z.string(),
  attendee_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  status: z.string(),
  total_amount: z.number(), // in cents
  base_price: z.number(), // in cents
  eventbrite_fee: z.number(), // in cents
  payment_fee: z.number(), // in cents
  tax_amount: z.number(), // in cents
  currency: z.string(),
  ticket_class_id: z.string(),
  ticket_class_name: z.string(),
  attendee_name: z.string().optional(),
  attendee_email: z.string().optional(),
  attendee_phone: z.string().optional(),
  checked_in: z.boolean(),
  cancelled: z.boolean(),
  refunded: z.boolean(),
  barcode: z.string().optional(),
  delivery_method: z.string(),
  source: z.string(),
  event_details: z.object({
    event_name: z.string(),
    event_start: z.string(),
    event_end: z.string(),
    venue_name: z.string().optional(),
    organizer_name: z.string(),
  }).optional(),
  answers: z.array(EventbriteAnswerSchema).optional(),
});

export const EventbriteApiResponseSchema = z.object({
  pagination: z.object({
    object_count: z.number(),
    page_number: z.number(),
    page_size: z.number(),
    page_count: z.number(),
    has_more_items: z.boolean(),
    continuation: z.string().optional(),
  }),
  events: z.array(EventbriteEventSchema).optional(),
  orders: z.array(EventbriteOrderSchema).optional(),
  attendees: z.array(EventbriteAttendeeSchema).optional(),
});

export const EventbriteWebhookPayloadSchema = z.object({
  action: z.enum([
    'event.created',
    'event.updated',
    'event.published',
    'order.placed',
    'attendee.updated',
    'attendee.checked_in'
  ]),
  api_url: z.string(),
  created: z.string(),
  config: z.object({
    user_id: z.string(),
    webhook_id: z.string(),
    endpoint_url: z.string(),
    topic: z.string(),
  }),
});

// Export types inferred from schemas
export type EventbriteCredentials = z.infer<typeof EventbriteCredentialsSchema>;
export type EventbriteEvent = z.infer<typeof EventbriteEventSchema>;
export type EventbriteOrder = z.infer<typeof EventbriteOrderSchema>;
export type EventbriteAttendee = z.infer<typeof EventbriteAttendeeSchema>;
export type EventbriteOrganization = z.infer<typeof EventbriteOrganizationSchema>;
export type EventbriteTicketClass = z.infer<typeof EventbriteTicketClassSchema>;
export type TransformedEventbriteTransaction = z.infer<typeof TransformedEventbriteTransactionSchema>;
export type EventbriteApiResponse<T> = z.infer<typeof EventbriteApiResponseSchema> & {
  events?: T[];
  orders?: T[];
  attendees?: T[];
};
export type EventbriteWebhookPayload = z.infer<typeof EventbriteWebhookPayloadSchema>;