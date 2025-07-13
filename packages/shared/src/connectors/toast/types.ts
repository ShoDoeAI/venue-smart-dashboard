/**
 * Toast API type definitions
 * Based on Toast REST API
 */

import type { Json } from '../../types/json';

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
  businessDate: number;
  checks: ToastCheck[];
  createdDate: string;
  modifiedDate: string;
  deletedDate?: string;
  openedDate?: string;
  closedDate?: string;
  server?: ToastEmployee;
  voided?: boolean;
  voidDate?: string;
  voidBusinessDate?: number;
  approvalStatus?: string;
  guestCount?: number;
  name?: string;
  estimatedFulfillmentDate?: string;
  duration?: number;
  revenueCenter?: {
    guid: string;
    name: string;
  };
}

// Check types
export interface ToastCheck {
  guid: string;
  amount: number;
  tipAmount?: number;
  totalAmount?: number;
  taxAmount?: number;
  appliedDiscountAmount?: number;
  customer?: ToastCustomer;
  selections?: ToastSelection[];
  payments?: ToastPayment[];
  voided?: boolean;
  voidDate?: string;
  openedDate?: string;
  closedDate?: string;
  paymentStatus?: string;
  tabName?: string;
  appliedServiceCharges?: ToastServiceCharge[];
}

// Payment types  
export interface ToastPayment {
  guid: string;
  amount: number;
  tipAmount?: number;
  amountTendered?: number;
  type?: string;
  cardType?: string;
  last4Digits?: string;
  externalPaymentGuid?: string;
  paidDate?: string;
  paidBusinessDate?: number;
  house?: boolean;
  voidInfo?: {
    voidDate?: string;
    voidUser?: ToastEmployee;
  };
  refundStatus?: string;
  mcaRepaymentAmount?: number;
}

// Menu item selection
export interface ToastSelection {
  guid: string;
  itemGroup: {
    guid: string;
    name: string;
  };
  item: {
    guid: string;
    name: string;
  };
  quantity: number;
  price?: number;
  tax?: number;
  displayName?: string;
  modifiers?: ToastModifier[];
  appliedDiscounts?: ToastDiscount[];
  voided?: boolean;
  voidDate?: string;
  voidBusinessDate?: number;
  voidReason?: {
    guid: string;
    name: string;
  };
  fulfillmentStatus?: string;
  salesCategory?: {
    guid: string;
    name: string;
  };
  selectionType?: string;
  deferredPrice?: number;
  preDiscountPrice?: number;
  optionGroupPricingMode?: string;
}

export interface ToastModifier {
  guid: string;
  name: string;
  price?: number;
  quantity?: number;
  displayMode?: string;
}

export interface ToastDiscount {
  guid: string;
  name: string;
  discountAmount?: number;
  discountPercent?: number;
  trigger?: string;
  promoCode?: string;
}

export interface ToastServiceCharge {
  guid: string;
  name: string;
  amount: number;
  gratuity?: boolean;
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
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  phoneNumberCountryCode?: string;
  passcode?: string;
  externalEmployeeId?: string;
  createdDate?: string;
  modifiedDate?: string;
  deletedDate?: string;
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

// Response types
export interface PaginatedResponse<T> {
  data: T[];
  cursor?: string;
  hasMore?: boolean;
  totalCount?: number;
}

// Legacy types for compatibility (will be refactored)
export interface ToastListPaymentsResponse {
  payments?: ToastPayment[];
  cursor?: string;
  errors?: ToastError[];
}

export interface ToastListOrdersResponse {
  orders?: ToastOrder[];
  cursor?: string;
  errors?: ToastError[];
}

export interface ToastListCustomersResponse {
  customers?: ToastCustomer[];
  cursor?: string;
  errors?: ToastError[];
}

export interface ToastSearchTeamMembersResponse {
  team_members?: ToastEmployee[];
  cursor?: string;
  errors?: ToastError[];
}

export interface ToastError {
  category: string;
  code: string;
  detail?: string;
  field?: string;
}

export interface ToastConnectorConfig {
  clientId: string;
  clientSecret: string;
  locationGuid?: string;
  environment?: 'sandbox' | 'production';
}