/**
 * Toast API type definitions
 * Based on Toast REST API
 */

// import type { Json } from '../../types/json';

// API Credentials
export interface ToastCredentials {
  clientId: string;
  clientSecret: string;
  locationGuid: string;
  environment: 'sandbox' | 'production';
}

// Auth types
export interface ToastAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  created_at?: number;
}

export interface ToastAuthResponse {
  token: {
    accessToken: string;
    tokenType: string;
    expiresIn: number;
    scope?: string;
    idToken?: string;
  };
}

// Restaurant/Location types
export interface ToastLocation {
  id?: string; // Alias for guid in some contexts
  guid: string;
  name: string;
  address?: ToastAddress;
  phone?: string;
  timeZone?: string;
  closeoutHour?: number;
  managementGroupGuid?: string;
}

// Address types
export interface ToastAddress {
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

// Money/Currency types
export interface ToastMoney {
  amount: number;
  currencyCode?: string;
}

// Order types
export interface ToastOrder {
  guid: string;
  entityType?: 'Order';
  externalId?: string | null;
  businessDate: number;
  checks?: ToastCheck[];
  createdDate?: string;
  modifiedDate?: string;
  deletedDate?: string | null;
  openedDate?: string;
  closedDate?: string | null;
  paidDate?: string | null;
  source?: string; // API, In Store, etc.
  server?: ToastEntityReference;
  voided?: boolean;
  voidDate?: string | null;
  voidBusinessDate?: number;
  deleted?: boolean;
  approvalStatus?: string;
  numberOfGuests?: number;
  estimatedFulfillmentDate?: string | null;
  promisedDate?: string | null;
  duration?: number;
  revenueCenter?: ToastEntityReference;
  diningOption?: ToastEntityReference;
  deliveryInfo?: ToastDeliveryInfo | null;
  curbsidePickupInfo?: ToastCurbsidePickupInfo | null;
  requiredPrepTime?: string;
}

// Entity reference type
export interface ToastEntityReference {
  guid: string;
  entityType: string;
  externalId?: string | null;
}

// Check types
export interface ToastCheck {
  guid: string;
  entityType?: 'Check';
  externalId?: string | null;
  displayNumber?: string;
  amount: number; // Amount in dollars before tax
  totalAmount: number; // Total amount in dollars including tax
  taxAmount?: number; // Tax amount in dollars
  tipAmount?: number;
  tabName?: string | null;
  taxExempt?: boolean;
  customer?: ToastCustomer | null;
  selections?: ToastSelection[];
  payments?: ToastPayment[];
  appliedDiscounts?: ToastAppliedDiscount[];
  appliedServiceCharges?: ToastServiceCharge[];
  voided?: boolean;
  voidDate?: string | null;
  openedDate?: string;
  closedDate?: string | null;
  paidDate?: string | null;
  paymentStatus?: string;
  voidBusinessDate?: number;
  deleted?: boolean;
  deletedDate?: string | null;
  modifiedDate?: string;
  appliedLoyaltyInfo?: any;
}

// Payment types  
export interface ToastPayment {
  guid: string;
  entityType?: 'OrderPayment';
  externalId?: string | null;
  amount: number; // Amount in dollars
  tipAmount?: number; // Tip in dollars
  amountTendered?: number;
  type?: string; // CREDIT, CASH, OTHER, etc.
  cardType?: string; // VISA, MASTERCARD, etc.
  last4Digits?: string;
  cardEntryMode?: string;
  paymentStatus?: string;
  paidDate?: string;
  paidBusinessDate?: number;
  refundStatus?: string;
  houseAccount?: any;
  otherPayment?: ToastEntityReference;
  voidInfo?: {
    voidDate?: string;
    voidUser?: ToastEntityReference;
  } | null;
  refund?: any;
  mcaRepaymentAmount?: number;
  originalProcessingFee?: number;
  cashDrawer?: any;
  createdDevice?: { id: string | null };
  lastModifiedDevice?: { id: string | null };
}

// Menu item selection
export interface ToastSelection {
  guid: string;
  entityType?: 'MenuItemSelection';
  externalId?: string | null;
  itemGroup: ToastEntityReference;
  item: ToastEntityReference;
  quantity: number;
  price?: number; // Price in dollars after discounts
  preDiscountPrice?: number; // Price in dollars before discounts
  tax?: number; // Tax amount in dollars
  displayName?: string;
  deferred?: boolean;
  voidDate?: string | null;
  voidReason?: any;
  voided?: boolean;
  fulfillmentStatus?: string;
  modifiers?: ToastModifier[];
  appliedDiscounts?: ToastAppliedDiscount[];
  appliedTaxes?: ToastAppliedTax[];
  salesCategory?: ToastEntityReference | null;
  selectionType?: string;
  seatNumber?: number;
  diningOption?: ToastEntityReference;
  voidBusinessDate?: number;
  createdDate?: string;
  modifiedDate?: string;
  preModifier?: any;
  openPriceAmount?: number;
  receiptLinePrice?: number;
  optionGroup?: ToastEntityReference | null;
  unitOfMeasure?: string;
  taxInclusion?: string;
}

export interface ToastModifier {
  guid: string;
  entityType?: 'MenuItemSelection';
  externalId?: string | null;
  optionGroup?: ToastEntityReference;
  displayName?: string;
  item?: ToastEntityReference;
  quantity?: number;
  price?: number;
  displayMode?: string;
}

export interface ToastAppliedDiscount {
  guid: string;
  entityType?: 'AppliedCustomDiscount';
  externalId?: string | null;
  name: string;
  discountAmount?: number;
  nonTaxDiscountAmount?: number;
  discount?: ToastEntityReference;
  triggers?: any[];
  appliedPromoCode?: string | null;
  comboItems?: any[];
  approver?: any;
  processingState?: any;
  loyaltyDetails?: any;
}

export interface ToastServiceCharge {
  guid: string;
  name: string;
  amount: number;
  gratuity?: boolean;
}

export interface ToastAppliedTax {
  entityType?: 'AppliedTaxRate';
  taxRate: ToastEntityReference;
  name: string;
  rate: number;
  taxAmount: number;
  type: string;
}

// Customer types
export interface ToastCustomer {
  guid?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  companyName?: string;
}

// Employee types
export interface ToastEmployee {
  guid: string;
  entityType?: 'RestaurantUser';
  externalId?: string | null;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  phoneNumberCountryCode?: string;
  passcode?: string;
  externalEmployeeId?: string;
  createdDate?: string;
  modifiedDate?: string;
  deletedDate?: string | null;
  disabled?: boolean;
  jobReferences?: Array<{
    guid: string;
    name: string;
  }>;
}

// Menu types
export interface ToastMenu {
  guid: string;
  name: string;
  masterId?: number;
  isActive?: boolean;
  isDefault?: boolean;
  groups?: ToastMenuGroup[];
}

export interface ToastMenuGroup {
  guid: string;
  name: string;
  items?: ToastMenuItem[];
}

export interface ToastMenuItem {
  guid: string;
  name: string;
  price?: number;
  pricingStrategy?: string;
  pricingRules?: ToastPricingRule[];
  salesCategory?: {
    guid: string;
    name: string;
  };
  tax?: {
    guid: string;
    name: string;
  };
  isDiscountable?: boolean;
  orderableOnline?: boolean;
  portionCount?: number;
  maxQuantity?: number;
  unitOfMeasure?: string;
  preModifiers?: ToastPreModifier[];
  calories?: {
    min?: number;
    max?: number;
  };
}

export interface ToastPricingRule {
  guid: string;
  name?: string;
  price?: number;
  isDefault?: boolean;
  timeSpecificPricingRules?: Array<{
    guid: string;
    price: number;
    basePrice?: number;
    dayOfWeek?: string;
    startTime?: string;
    endTime?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export interface ToastPreModifier {
  guid: string;
  name: string;
  preModifierGroup?: {
    guid: string;
    name: string;
  };
  price?: number;
  displayMode?: string;
}

// Transaction types (for database storage)
export interface TransformedToastTransaction {
  transaction_id: string;
  location_id: string;
  created_at: string;
  total_amount: number;
  tax_amount: number;
  tip_amount: number;
  discount_amount: number;
  service_charge_amount: number;
  source_type?: string;
  status?: string;
  receipt_number?: string;
  receipt_url?: string;
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  team_member_id?: string;
  device_id?: string;
  item_count?: number;
  unique_item_count?: number;
  itemizations?: unknown;
  payment_details?: unknown;
  refunds?: unknown;
}

// Error response
export interface ToastErrorResponse {
  status?: number;
  code?: string;
  message?: string;
  developerMessage?: string;
  moreInfo?: string;
  errors?: Array<{
    field?: string;
    message?: string;
  }>;
}

// Delivery info
export interface ToastDeliveryInfo {
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  deliveredDate?: string | null;
  dispatchedDate?: string | null;
  deliveryEmployee?: ToastEntityReference | null;
}

// Curbside pickup info
export interface ToastCurbsidePickupInfo {
  guid?: string;
  entityType?: 'CurbsidePickup';
  notes?: string;
  transportColor?: string;
  transportDescription?: string;
}

// Response types
export interface PaginatedResponse<T> {
  data: T[];
  cursor?: string;
  hasMore?: boolean;
  totalCount?: number;
}

// Toast API typically returns arrays directly for bulk endpoints
export type ToastOrdersResponse = ToastOrder[];
export type ToastLocationsResponse = ToastLocation[];
export type ToastEmployeesResponse = ToastEmployee[];

export interface ToastConnectorConfig {
  clientId: string;
  clientSecret: string;
  locationGuid?: string;
  environment?: 'sandbox' | 'production';
}