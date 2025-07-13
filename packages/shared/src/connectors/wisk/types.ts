/**
 * WISK Inventory Management API Types
 * 
 * WISK is a restaurant and bar inventory management system that integrates with 40+ POS systems.
 * 
 * Note: WISK API documentation is not publicly available. These types are based on:
 * - Common inventory management API patterns
 * - WISK's documented features (inventory tracking, recipe costing, supplier orders)
 * - Integration patterns observed in similar systems
 * 
 * For official API documentation, contact support@wisk.ai
 */

// Core Authentication Types
export interface WiskCredentials {
  apiKey: string;
  accountId: string;
  environment: 'production' | 'sandbox';
}

// Base API Response Structure
export interface WiskApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: WiskError[];
  pagination?: WiskPagination;
}

export interface WiskError {
  code: string;
  message: string;
  field?: string;
}

export interface WiskPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Inventory Item Types
export interface WiskInventoryItem {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  category_id?: string;
  category_name?: string;
  unit_of_measure: string;
  cost_per_unit: number;
  supplier_id?: string;
  supplier_name?: string;
  current_stock: number;
  minimum_stock?: number;
  maximum_stock?: number;
  reorder_point?: number;
  location_id?: string;
  location_name?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  is_recipe_ingredient: boolean;
}

// Stock Movement Types
export interface WiskStockMovement {
  id: string;
  item_id: string;
  item_name: string;
  movement_type: 'receipt' | 'sale' | 'adjustment' | 'transfer' | 'waste' | 'production';
  quantity: number;
  cost_per_unit?: number;
  total_cost?: number;
  reason?: string;
  reference_id?: string; // Order ID, adjustment ID, etc.
  location_id?: string;
  location_name?: string;
  user_id?: string;
  user_name?: string;
  timestamp: string;
  created_at: string;
}

// Supplier Types
export interface WiskSupplier {
  id: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: WiskAddress;
  payment_terms?: string;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WiskAddress {
  street: string;
  city: string;
  state?: string;
  postal_code?: string;
  country: string;
}

// Purchase Order Types
export interface WiskPurchaseOrder {
  id: string;
  supplier_id: string;
  supplier_name: string;
  order_number: string;
  status: 'draft' | 'pending' | 'sent' | 'received' | 'cancelled';
  order_date: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  subtotal: number;
  tax_amount?: number;
  total_amount: number;
  currency: string;
  location_id?: string;
  location_name?: string;
  notes?: string;
  items: WiskPurchaseOrderItem[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WiskPurchaseOrderItem {
  id: string;
  item_id: string;
  item_name: string;
  sku?: string;
  quantity_ordered: number;
  quantity_received?: number;
  unit_cost: number;
  total_cost: number;
  unit_of_measure: string;
}

// Recipe Types
export interface WiskRecipe {
  id: string;
  name: string;
  description?: string;
  category?: string;
  serving_size: number;
  cost_per_serving: number;
  prep_time_minutes?: number;
  instructions?: string;
  ingredients: WiskRecipeIngredient[];
  yield_quantity: number;
  yield_unit: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WiskRecipeIngredient {
  id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  unit_of_measure: string;
  cost_per_unit: number;
  total_cost: number;
  notes?: string;
}

// Location/Venue Types
export interface WiskLocation {
  id: string;
  name: string;
  type: 'restaurant' | 'bar' | 'kitchen' | 'storage' | 'office';
  address?: WiskAddress;
  phone?: string;
  email?: string;
  manager_name?: string;
  timezone: string;
  currency: string;
  is_active: boolean;
  settings?: WiskLocationSettings;
  created_at: string;
  updated_at: string;
}

export interface WiskLocationSettings {
  auto_reorder: boolean;
  waste_tracking: boolean;
  recipe_costing: boolean;
  supplier_integration: boolean;
}

// Waste Tracking Types
export interface WiskWasteEntry {
  id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  unit_of_measure: string;
  cost_per_unit: number;
  total_cost: number;
  reason: 'spoilage' | 'damage' | 'theft' | 'overproduction' | 'other';
  description?: string;
  location_id?: string;
  location_name?: string;
  recorded_by: string;
  recorded_at: string;
  created_at: string;
}

// Analytics Types
export interface WiskInventoryAnalytics {
  period_start: string;
  period_end: string;
  location_id?: string;
  location_name?: string;
  total_inventory_value: number;
  total_purchases: number;
  total_sales: number;
  total_waste: number;
  waste_percentage: number;
  top_selling_items: WiskTopItem[];
  top_waste_items: WiskTopItem[];
  low_stock_items: WiskInventoryItem[];
  currency: string;
}

export interface WiskTopItem {
  item_id: string;
  item_name: string;
  quantity: number;
  value: number;
  percentage_of_total: number;
}

// Transaction Types (for VenueSync compatibility)
export interface WiskTransaction {
  transaction_id: string;
  item_id: string;
  item_name: string;
  movement_type: string;
  quantity: number;
  unit_cost: number;
  total_amount: number;
  currency: string;
  location_id?: string;
  location_name?: string;
  supplier_id?: string;
  supplier_name?: string;
  order_id?: string;
  order_number?: string;
  reference_type?: string;
  reference_id?: string;
  user_id?: string;
  user_name?: string;
  notes?: string;
  timestamp: string;
  created_at: string;
  updated_at: string;
  
  // Additional metadata for VenueSync
  snapshot_timestamp?: string;
  source: 'wisk';
}

// Filter and Query Types
export interface WiskInventoryFilters {
  location_id?: string;
  category_id?: string;
  supplier_id?: string;
  low_stock?: boolean;
  inactive?: boolean;
  search?: string;
  start_date?: string;
  end_date?: string;
}

export interface WiskMovementFilters {
  item_id?: string;
  location_id?: string;
  movement_type?: string;
  start_date?: string;
  end_date?: string;
  user_id?: string;
}

// Webhook Types
export interface WiskWebhookEvent {
  id: string;
  event_type: 'inventory.updated' | 'stock.low' | 'order.received' | 'waste.recorded' | 'recipe.updated';
  object_type: 'inventory_item' | 'stock_movement' | 'purchase_order' | 'waste_entry' | 'recipe';
  object_id: string;
  data: Record<string, any>;
  location_id?: string;
  timestamp: string;
  webhook_url: string;
}

// API Endpoints Configuration
export const WISK_API_ENDPOINTS = {
  BASE: 'https://api.wisk.ai/v1',
  AUTH: {
    VALIDATE: '/auth/validate',
  },
  INVENTORY: {
    ITEMS: '/inventory/items',
    ITEM: '/inventory/items/:id',
    MOVEMENTS: '/inventory/movements',
    ANALYTICS: '/inventory/analytics',
  },
  SUPPLIERS: {
    LIST: '/suppliers',
    DETAIL: '/suppliers/:id',
  },
  ORDERS: {
    PURCHASE_ORDERS: '/orders/purchase',
    ORDER: '/orders/purchase/:id',
  },
  RECIPES: {
    LIST: '/recipes',
    DETAIL: '/recipes/:id',
    COST: '/recipes/:id/cost',
  },
  LOCATIONS: {
    LIST: '/locations',
    DETAIL: '/locations/:id',
  },
  WASTE: {
    ENTRIES: '/waste/entries',
    ANALYTICS: '/waste/analytics',
  },
  WEBHOOKS: {
    LIST: '/webhooks',
    CREATE: '/webhooks',
    UPDATE: '/webhooks/:id',
    DELETE: '/webhooks/:id',
  },
} as const;