/**
 * Zod validation schemas for WISK Inventory Management API
 * 
 * These schemas validate WISK API responses and ensure type safety
 * throughout the VenueSync application.
 */

import { z } from 'zod';

// Core Schema Types
export const WiskCredentialsSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  accountId: z.string().min(1, 'Account ID is required'),
  environment: z.enum(['production', 'sandbox']),
});

export const WiskErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  field: z.string().optional(),
});

export const WiskPaginationSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().positive(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export const WiskApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) => z.object({
  success: z.boolean(),
  data: dataSchema.optional(),
  message: z.string().optional(),
  errors: z.array(WiskErrorSchema).optional(),
  pagination: WiskPaginationSchema.optional(),
});

// Address Schema
export const WiskAddressSchema = z.object({
  street: z.string(),
  city: z.string(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string(),
});

// Inventory Item Schema
export const WiskInventoryItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  category_id: z.string().optional(),
  category_name: z.string().optional(),
  unit_of_measure: z.string().min(1, 'Unit of measure is required'),
  cost_per_unit: z.number().nonnegative(),
  supplier_id: z.string().optional(),
  supplier_name: z.string().optional(),
  current_stock: z.number().nonnegative(),
  minimum_stock: z.number().nonnegative().optional(),
  maximum_stock: z.number().nonnegative().optional(),
  reorder_point: z.number().nonnegative().optional(),
  location_id: z.string().optional(),
  location_name: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  is_active: z.boolean(),
  is_recipe_ingredient: z.boolean(),
});

// Stock Movement Schema
export const WiskStockMovementSchema = z.object({
  id: z.string(),
  item_id: z.string(),
  item_name: z.string(),
  movement_type: z.enum(['receipt', 'sale', 'adjustment', 'transfer', 'waste', 'production']),
  quantity: z.number(),
  cost_per_unit: z.number().nonnegative().optional(),
  total_cost: z.number().optional(),
  reason: z.string().optional(),
  reference_id: z.string().optional(),
  location_id: z.string().optional(),
  location_name: z.string().optional(),
  user_id: z.string().optional(),
  user_name: z.string().optional(),
  timestamp: z.string().datetime(),
  created_at: z.string().datetime(),
});

// Supplier Schema
export const WiskSupplierSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Supplier name is required'),
  contact_name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: WiskAddressSchema.optional(),
  payment_terms: z.string().optional(),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Purchase Order Schemas
export const WiskPurchaseOrderItemSchema = z.object({
  id: z.string(),
  item_id: z.string(),
  item_name: z.string(),
  sku: z.string().optional(),
  quantity_ordered: z.number().positive(),
  quantity_received: z.number().nonnegative().optional(),
  unit_cost: z.number().nonnegative(),
  total_cost: z.number().nonnegative(),
  unit_of_measure: z.string(),
});

export const WiskPurchaseOrderSchema = z.object({
  id: z.string(),
  supplier_id: z.string(),
  supplier_name: z.string(),
  order_number: z.string(),
  status: z.enum(['draft', 'pending', 'sent', 'received', 'cancelled']),
  order_date: z.string().datetime(),
  expected_delivery_date: z.string().datetime().optional(),
  actual_delivery_date: z.string().datetime().optional(),
  subtotal: z.number().nonnegative(),
  tax_amount: z.number().nonnegative().optional(),
  total_amount: z.number().nonnegative(),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  location_id: z.string().optional(),
  location_name: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(WiskPurchaseOrderItemSchema),
  created_by: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Recipe Schemas
export const WiskRecipeIngredientSchema = z.object({
  id: z.string(),
  item_id: z.string(),
  item_name: z.string(),
  quantity: z.number().positive(),
  unit_of_measure: z.string(),
  cost_per_unit: z.number().nonnegative(),
  total_cost: z.number().nonnegative(),
  notes: z.string().optional(),
});

export const WiskRecipeSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Recipe name is required'),
  description: z.string().optional(),
  category: z.string().optional(),
  serving_size: z.number().positive(),
  cost_per_serving: z.number().nonnegative(),
  prep_time_minutes: z.number().nonnegative().optional(),
  instructions: z.string().optional(),
  ingredients: z.array(WiskRecipeIngredientSchema),
  yield_quantity: z.number().positive(),
  yield_unit: z.string(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Location Schemas
export const WiskLocationSettingsSchema = z.object({
  auto_reorder: z.boolean(),
  waste_tracking: z.boolean(),
  recipe_costing: z.boolean(),
  supplier_integration: z.boolean(),
});

export const WiskLocationSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Location name is required'),
  type: z.enum(['restaurant', 'bar', 'kitchen', 'storage', 'office']),
  address: WiskAddressSchema.optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  manager_name: z.string().optional(),
  timezone: z.string(),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  is_active: z.boolean(),
  settings: WiskLocationSettingsSchema.optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Waste Tracking Schema
export const WiskWasteEntrySchema = z.object({
  id: z.string(),
  item_id: z.string(),
  item_name: z.string(),
  quantity: z.number().positive(),
  unit_of_measure: z.string(),
  cost_per_unit: z.number().nonnegative(),
  total_cost: z.number().nonnegative(),
  reason: z.enum(['spoilage', 'damage', 'theft', 'overproduction', 'other']),
  description: z.string().optional(),
  location_id: z.string().optional(),
  location_name: z.string().optional(),
  recorded_by: z.string(),
  recorded_at: z.string().datetime(),
  created_at: z.string().datetime(),
});

// Analytics Schemas
export const WiskTopItemSchema = z.object({
  item_id: z.string(),
  item_name: z.string(),
  quantity: z.number().nonnegative(),
  value: z.number().nonnegative(),
  percentage_of_total: z.number().min(0).max(100),
});

export const WiskInventoryAnalyticsSchema = z.object({
  period_start: z.string().datetime(),
  period_end: z.string().datetime(),
  location_id: z.string().optional(),
  location_name: z.string().optional(),
  total_inventory_value: z.number().nonnegative(),
  total_purchases: z.number().nonnegative(),
  total_sales: z.number().nonnegative(),
  total_waste: z.number().nonnegative(),
  waste_percentage: z.number().min(0).max(100),
  top_selling_items: z.array(WiskTopItemSchema),
  top_waste_items: z.array(WiskTopItemSchema),
  low_stock_items: z.array(WiskInventoryItemSchema),
  currency: z.string().length(3, 'Currency must be 3 characters'),
});

// Transaction Schema (for VenueSync compatibility)
export const WiskTransactionSchema = z.object({
  transaction_id: z.string(),
  item_id: z.string(),
  item_name: z.string(),
  movement_type: z.string(),
  quantity: z.number(),
  unit_cost: z.number().nonnegative(),
  total_amount: z.number().nonnegative(),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  location_id: z.string().optional(),
  location_name: z.string().optional(),
  supplier_id: z.string().optional(),
  supplier_name: z.string().optional(),
  order_id: z.string().optional(),
  order_number: z.string().optional(),
  reference_type: z.string().optional(),
  reference_id: z.string().optional(),
  user_id: z.string().optional(),
  user_name: z.string().optional(),
  notes: z.string().optional(),
  timestamp: z.string().datetime(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  snapshot_timestamp: z.string().datetime().optional(),
  source: z.literal('wisk'),
});

// Filter Schemas
export const WiskInventoryFiltersSchema = z.object({
  location_id: z.string().optional(),
  category_id: z.string().optional(),
  supplier_id: z.string().optional(),
  low_stock: z.boolean().optional(),
  inactive: z.boolean().optional(),
  search: z.string().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
});

export const WiskMovementFiltersSchema = z.object({
  item_id: z.string().optional(),
  location_id: z.string().optional(),
  movement_type: z.string().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  user_id: z.string().optional(),
});

// Webhook Schema
export const WiskWebhookEventSchema = z.object({
  id: z.string(),
  event_type: z.enum([
    'inventory.updated',
    'stock.low',
    'order.received',
    'waste.recorded',
    'recipe.updated'
  ]),
  object_type: z.enum(['inventory_item', 'stock_movement', 'purchase_order', 'waste_entry', 'recipe']),
  object_id: z.string(),
  data: z.record(z.any()),
  location_id: z.string().optional(),
  timestamp: z.string().datetime(),
  webhook_url: z.string().url(),
});

// Response Schemas
export const WiskInventoryItemsResponseSchema = WiskApiResponseSchema(z.array(WiskInventoryItemSchema));
export const WiskSingleInventoryItemResponseSchema = WiskApiResponseSchema(WiskInventoryItemSchema);
export const WiskStockMovementsResponseSchema = WiskApiResponseSchema(z.array(WiskStockMovementSchema));
export const WiskSuppliersResponseSchema = WiskApiResponseSchema(z.array(WiskSupplierSchema));
export const WiskPurchaseOrdersResponseSchema = WiskApiResponseSchema(z.array(WiskPurchaseOrderSchema));
export const WiskRecipesResponseSchema = WiskApiResponseSchema(z.array(WiskRecipeSchema));
export const WiskLocationsResponseSchema = WiskApiResponseSchema(z.array(WiskLocationSchema));
export const WiskWasteEntriesResponseSchema = WiskApiResponseSchema(z.array(WiskWasteEntrySchema));
export const WiskAnalyticsResponseSchema = WiskApiResponseSchema(WiskInventoryAnalyticsSchema);
export const WiskTransactionsResponseSchema = WiskApiResponseSchema(z.array(WiskTransactionSchema));

// Export types inferred from schemas
export type WiskCredentials = z.infer<typeof WiskCredentialsSchema>;
export type WiskError = z.infer<typeof WiskErrorSchema>;
export type WiskPagination = z.infer<typeof WiskPaginationSchema>;
export type WiskInventoryItem = z.infer<typeof WiskInventoryItemSchema>;
export type WiskStockMovement = z.infer<typeof WiskStockMovementSchema>;
export type WiskSupplier = z.infer<typeof WiskSupplierSchema>;
export type WiskPurchaseOrder = z.infer<typeof WiskPurchaseOrderSchema>;
export type WiskPurchaseOrderItem = z.infer<typeof WiskPurchaseOrderItemSchema>;
export type WiskRecipe = z.infer<typeof WiskRecipeSchema>;
export type WiskRecipeIngredient = z.infer<typeof WiskRecipeIngredientSchema>;
export type WiskLocation = z.infer<typeof WiskLocationSchema>;
export type WiskLocationSettings = z.infer<typeof WiskLocationSettingsSchema>;
export type WiskWasteEntry = z.infer<typeof WiskWasteEntrySchema>;
export type WiskInventoryAnalytics = z.infer<typeof WiskInventoryAnalyticsSchema>;
export type WiskTopItem = z.infer<typeof WiskTopItemSchema>;
export type WiskTransaction = z.infer<typeof WiskTransactionSchema>;
export type WiskInventoryFilters = z.infer<typeof WiskInventoryFiltersSchema>;
export type WiskMovementFilters = z.infer<typeof WiskMovementFiltersSchema>;
export type WiskWebhookEvent = z.infer<typeof WiskWebhookEventSchema>;