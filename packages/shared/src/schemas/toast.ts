import { z } from 'zod';

// Base schemas
const ToastMoneySchema = z.object({
  amount: z.number(),
  currency: z.string().default('USD'),
});

const ToastAddressSchema = z.object({
  address_line_1: z.string().optional(),
  address_line_2: z.string().optional(),
  locality: z.string().optional(),
  administrative_district_level_1: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
});

// Payment schemas
export const ToastPaymentSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  updated_at: z.string().optional(),
  amount_money: ToastMoneySchema,
  total_money: ToastMoneySchema.optional(),
  status: z.enum(['APPROVED', 'PENDING', 'COMPLETED', 'CANCELED', 'FAILED']),
  source_type: z.string().optional(),
  location_id: z.string().optional(),
  order_id: z.string().optional(),
  customer_id: z.string().optional(),
  receipt_number: z.string().optional(),
  receipt_url: z.string().optional(),
  card_details: z.object({
    card_brand: z.string().optional(),
    last_4: z.string().optional(),
    entry_method: z.string().optional(),
  }).optional(),
  processing_fee: z.array(z.object({
    effective_at: z.string(),
    type: z.string(),
    amount_money: ToastMoneySchema,
  })).optional(),
});

// Order schemas
const ToastLineItemSchema = z.object({
  uid: z.string().optional(),
  name: z.string(),
  quantity: z.string(),
  base_price_money: ToastMoneySchema.optional(),
  gross_sales_money: ToastMoneySchema.optional(),
  total_discount_money: ToastMoneySchema.optional(),
  total_tax_money: ToastMoneySchema.optional(),
  total_money: ToastMoneySchema.optional(),
  variation_name: z.string().optional(),
  catalog_object_id: z.string().optional(),
  modifiers: z.array(z.object({
    uid: z.string().optional(),
    name: z.string().optional(),
    base_price_money: ToastMoneySchema.optional(),
  })).optional(),
});

export const ToastOrderSchema = z.object({
  id: z.string(),
  location_id: z.string(),
  created_at: z.string(),
  updated_at: z.string().optional(),
  state: z.enum(['OPEN', 'COMPLETED', 'CANCELED']),
  line_items: z.array(ToastLineItemSchema).optional(),
  total_money: ToastMoneySchema.optional(),
  total_tax_money: ToastMoneySchema.optional(),
  total_discount_money: ToastMoneySchema.optional(),
  total_tip_money: ToastMoneySchema.optional(),
  total_service_charge_money: ToastMoneySchema.optional(),
  customer_id: z.string().optional(),
  fulfillments: z.array(z.object({
    uid: z.string().optional(),
    type: z.string().optional(),
    state: z.string().optional(),
  })).optional(),
  tenders: z.array(z.object({
    id: z.string().optional(),
    type: z.string().optional(),
    amount_money: ToastMoneySchema.optional(),
    payment_id: z.string().optional(),
  })).optional(),
});

// Customer schemas
export const ToastCustomerSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  updated_at: z.string().optional(),
  given_name: z.string().optional(),
  family_name: z.string().optional(),
  email_address: z.string().email().optional(),
  phone_number: z.string().optional(),
  address: ToastAddressSchema.optional(),
  reference_id: z.string().optional(),
  note: z.string().optional(),
  preferences: z.object({
    email_unsubscribed: z.boolean().optional(),
  }).optional(),
  groups: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })).optional(),
  creation_source: z.string().optional(),
});

// Team member schemas
export const ToastTeamMemberSchema = z.object({
  id: z.string(),
  reference_id: z.string().optional(),
  is_owner: z.boolean(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  given_name: z.string().optional(),
  family_name: z.string().optional(),
  email_address: z.string().email().optional(),
  phone_number: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string().optional(),
  assigned_locations: z.object({
    assignment_type: z.enum(['EXPLICIT_LOCATIONS', 'ALL_CURRENT_AND_FUTURE_LOCATIONS']).optional(),
    location_ids: z.array(z.string()).optional(),
  }).optional(),
});

// Location schemas
export const ToastLocationSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  address: ToastAddressSchema.optional(),
  timezone: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  created_at: z.string(),
  merchant_id: z.string().optional(),
  country: z.string().optional(),
  language_code: z.string().optional(),
  currency: z.string().optional(),
  phone_number: z.string().optional(),
  business_name: z.string().optional(),
  type: z.string().optional(),
  website_url: z.string().url().optional(),
  business_hours: z.object({
    periods: z.array(z.object({
      day_of_week: z.string(),
      start_local_time: z.string(),
      end_local_time: z.string(),
    })).optional(),
  }).optional(),
});

// Catalog item schemas (for future use)
export const ToastCatalogItemSchema = z.object({
  type: z.literal('ITEM'),
  id: z.string(),
  updated_at: z.string().optional(),
  version: z.string().optional(),
  is_deleted: z.boolean().optional(),
  item_data: z.object({
    name: z.string(),
    description: z.string().optional(),
    category_id: z.string().optional(),
    variations: z.array(z.object({
      type: z.literal('ITEM_VARIATION'),
      id: z.string(),
      item_variation_data: z.object({
        item_id: z.string(),
        name: z.string().optional(),
        price_money: ToastMoneySchema.optional(),
        ordinal: z.number().optional(),
      }),
    })).optional(),
  }),
});

// Response envelope schemas
export const ToastPaymentListResponseSchema = z.object({
  payments: z.array(ToastPaymentSchema).optional(),
  cursor: z.string().optional(),
  errors: z.array(z.object({
    category: z.string(),
    code: z.string(),
    detail: z.string().optional(),
    field: z.string().optional(),
  })).optional(),
});

export const ToastOrderSearchResponseSchema = z.object({
  orders: z.array(ToastOrderSchema).optional(),
  cursor: z.string().optional(),
  errors: z.array(z.object({
    category: z.string(),
    code: z.string(),
    detail: z.string().optional(),
    field: z.string().optional(),
  })).optional(),
});

export const ToastCustomerListResponseSchema = z.object({
  customers: z.array(ToastCustomerSchema).optional(),
  cursor: z.string().optional(),
  errors: z.array(z.object({
    category: z.string(),
    code: z.string(),
    detail: z.string().optional(),
    field: z.string().optional(),
  })).optional(),
});

export const ToastTeamMemberSearchResponseSchema = z.object({
  team_members: z.array(ToastTeamMemberSchema).optional(),
  cursor: z.string().optional(),
  errors: z.array(z.object({
    category: z.string(),
    code: z.string(),
    detail: z.string().optional(),
    field: z.string().optional(),
  })).optional(),
});

export const ToastLocationListResponseSchema = z.object({
  locations: z.array(ToastLocationSchema).optional(),
  errors: z.array(z.object({
    category: z.string(),
    code: z.string(),
    detail: z.string().optional(),
    field: z.string().optional(),
  })).optional(),
});

// Partial schemas for updates
export const ToastPaymentUpdateSchema = ToastPaymentSchema.partial();
export const ToastOrderUpdateSchema = ToastOrderSchema.partial();
export const ToastCustomerUpdateSchema = ToastCustomerSchema.partial();
export const ToastTeamMemberUpdateSchema = ToastTeamMemberSchema.partial();

// Type exports
export type ToastPayment = z.infer<typeof ToastPaymentSchema>;
export type ToastOrder = z.infer<typeof ToastOrderSchema>;
export type ToastCustomer = z.infer<typeof ToastCustomerSchema>;
export type ToastTeamMember = z.infer<typeof ToastTeamMemberSchema>;
export type ToastLocation = z.infer<typeof ToastLocationSchema>;
export type SquareCatalogItem = z.infer<typeof ToastCatalogItemSchema>;