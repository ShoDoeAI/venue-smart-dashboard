// import type { Json } from '../../types/json';

// Authentication types
export interface EventbriteCredentials {
  accessToken: string;
  environment: 'production' | 'sandbox';
  organizationId?: string;
}

export interface EventbriteAuthToken {
  access_token: string;
  token_type: string;
  scope?: string;
  created_at: number;
}

// Core Eventbrite API types
export interface EventbriteEvent {
  id: string;
  name: {
    text: string;
    html: string;
  };
  description: {
    text: string;
    html: string;
  };
  url: string;
  start: {
    timezone: string;
    local: string;
    utc: string;
  };
  end: {
    timezone: string;
    local: string;
    utc: string;
  };
  organization_id: string;
  created: string;
  changed: string;
  published: string;
  capacity?: number;
  capacity_is_custom?: boolean;
  status: 'draft' | 'live' | 'started' | 'ended' | 'completed' | 'canceled';
  currency: string;
  listed: boolean;
  shareable: boolean;
  online_event: boolean;
  tx_time_limit: number;
  hide_start_date: boolean;
  hide_end_date: boolean;
  locale: string;
  is_locked: boolean;
  privacy_setting: string;
  is_series: boolean;
  is_series_parent: boolean;
  inventory_type: string;
  is_reserved_seating: boolean;
  show_pick_a_seat: boolean;
  show_seatmap_thumbnail: boolean;
  show_colors_in_seatmap_thumbnail: boolean;
  source: string;
  is_free: boolean;
  version: string;
  summary: string;
  facebook_event_id?: string;
  logo_id?: string;
  organizer_id: string;
  venue_id?: string;
  category_id?: string;
  subcategory_id?: string;
  format_id?: string;
  resource_uri: string;
  is_externally_ticketed: boolean;
  logo?: EventbriteLogo;
  venue?: EventbriteVenue;
  organizer?: EventbriteOrganizer;
  ticket_availability?: EventbriteTicketAvailability;
}

export interface EventbriteLogo {
  id: string;
  url: string;
  crop_mask?: {
    top_left: { x: number; y: number };
    width: number;
    height: number;
  };
  original: {
    url: string;
    width: number;
    height: number;
  };
  aspect_ratio: string;
  edge_color: string;
  edge_color_set: boolean;
}

export interface EventbriteVenue {
  id: string;
  name: string;
  address: {
    address_1?: string;
    address_2?: string;
    city?: string;
    region?: string;
    postal_code?: string;
    country?: string;
    latitude?: string;
    longitude?: string;
    localized_address_display?: string;
    localized_area_display?: string;
    localized_multi_line_address_display?: string[];
  };
  resource_uri: string;
  latitude?: string;
  longitude?: string;
}

export interface EventbriteOrganizer {
  id: string;
  name: string;
  description: {
    text: string;
    html: string;
  };
  long_description: {
    text: string;
    html: string;
  };
  logo_id?: string;
  resource_uri: string;
  logo?: EventbriteLogo;
  url: string;
  num_past_events: number;
  num_future_events: number;
  twitter?: string;
  facebook?: string;
}

export interface EventbriteTicketAvailability {
  has_available_tickets: boolean;
  minimum_ticket_price: {
    currency: string;
    value: number;
    major_value: string;
  };
  maximum_ticket_price: {
    currency: string;
    value: number;
    major_value: string;
  };
  is_sold_out: boolean;
  start_sales_date: {
    timezone: string;
    local: string;
    utc: string;
  };
  waitlist_available: boolean;
}

export interface EventbriteOrder {
  id: string;
  created: string;
  changed: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  status: 'placed' | 'refunded' | 'cancelled' | 'partially_refunded';
  time_remaining?: string;
  event_id: string;
  attendees: EventbriteAttendee[];
  costs: {
    base_price: {
      currency: string;
      value: number;
      major_value: string;
    };
    eventbrite_fee: {
      currency: string;
      value: number;
      major_value: string;
    };
    gross: {
      currency: string;
      value: number;
      major_value: string;
    };
    payment_fee: {
      currency: string;
      value: number;
      major_value: string;
    };
    tax: {
      currency: string;
      value: number;
      major_value: string;
    };
  };
  resource_uri: string;
}

export interface EventbriteAttendee {
  id: string;
  created: string;
  changed: string;
  ticket_class_id: string;
  ticket_class_name: string;
  event_id: string;
  order_id: string;
  status: 'attending' | 'not_attending' | 'unknown';
  source: string;
  checked_in: boolean;
  cancelled: boolean;
  refunded: boolean;
  affiliate?: string;
  guestlist_id?: string;
  invited_by?: string;
  profile: {
    first_name?: string;
    last_name?: string;
    email?: string;
    name?: string;
    addresses?: {
      home?: EventbriteAddress;
      work?: EventbriteAddress;
      ship?: EventbriteAddress;
      bill?: EventbriteAddress;
    };
    cell_phone?: string;
    work_phone?: string;
    blog?: string;
    company?: string;
    website?: string;
    birth_date?: string;
    gender?: string;
    age?: string;
    job_title?: string;
    prefix?: string;
    suffix?: string;
  };
  barcodes?: EventbriteBarcode[];
  team?: string;
  costs: {
    base_price: {
      currency: string;
      value: number;
      major_value: string;
    };
    eventbrite_fee: {
      currency: string;
      value: number;
      major_value: string;
    };
    gross: {
      currency: string;
      value: number;
      major_value: string;
    };
    payment_fee: {
      currency: string;
      value: number;
      major_value: string;
    };
    tax: {
      currency: string;
      value: number;
      major_value: string;
    };
  };
  resource_uri: string;
  delivery_method: string;
  answers?: EventbriteAnswer[];
}

export interface EventbriteAddress {
  address_1?: string;
  address_2?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country?: string;
  latitude?: string;
  longitude?: string;
}

export interface EventbriteBarcode {
  barcode: string;
  status: 'unused' | 'used';
  created: string;
  changed: string;
  checkin_type: number;
  is_printed: boolean;
}

export interface EventbriteAnswer {
  question_id: string;
  question: string;
  type: string;
  answer: string;
}

export interface EventbriteOrganization {
  id: string;
  name: string;
  vertical: string;
  locale: string;
  image_id?: string;
  image?: EventbriteLogo;
}

export interface EventbriteTicketClass {
  id: string;
  name: string;
  description?: string;
  cost: {
    currency: string;
    value: number;
    major_value: string;
  };
  fee: {
    currency: string;
    value: number;
    major_value: string;
  };
  tax: {
    currency: string;
    value: number;
    major_value: string;
  };
  free: boolean;
  minimum_quantity: number;
  maximum_quantity?: number;
  quantity_total: number;
  quantity_sold: number;
  sales_start: string;
  sales_end: string;
  hidden: boolean;
  include_fee: boolean;
  split_fee: boolean;
  hide_description: boolean;
  auto_hide: boolean;
  auto_hide_before?: string;
  auto_hide_after?: string;
  sales_channels: string[];
  resource_uri: string;
}

// Transformed types for VenueSync database
export interface TransformedEventbriteTransaction {
  transaction_id: string;
  event_id: string;
  order_id: string;
  attendee_id: string;
  created_at: string;
  updated_at: string;
  status: string;
  total_amount: number; // in cents
  base_price: number; // in cents
  eventbrite_fee: number; // in cents
  payment_fee: number; // in cents
  tax_amount: number; // in cents
  currency: string;
  ticket_class_id: string;
  ticket_class_name: string;
  attendee_name?: string;
  attendee_email?: string;
  attendee_phone?: string;
  checked_in: boolean;
  cancelled: boolean;
  refunded: boolean;
  barcode?: string;
  delivery_method: string;
  source: string;
  event_details?: {
    event_name: string;
    event_start: string;
    event_end: string;
    venue_name?: string;
    organizer_name: string;
  };
  answers?: EventbriteAnswer[];
}

// API Response wrappers
export interface EventbriteApiResponse<T> {
  pagination: {
    object_count: number;
    page_number: number;
    page_size: number;
    page_count: number;
    has_more_items: boolean;
    continuation?: string;
  };
  events?: T[];
  orders?: T[];
  attendees?: T[];
}

export interface EventbriteError {
  error: string;
  error_description: string;
  status_code: number;
}

// Webhook types
export interface EventbriteWebhook {
  config: {
    endpoint_url: string;
    user_id: string;
    webhook_id: string;
    resource_uri: string;
    topic: string;
  };
  api_url: string;
}

export interface EventbriteWebhookPayload {
  action: 'event.created' | 'event.updated' | 'event.published' | 'order.placed' | 'attendee.updated' | 'attendee.checked_in';
  api_url: string;
  created: string;
  config: {
    user_id: string;
    webhook_id: string;
    endpoint_url: string;
    topic: string;
  };
}