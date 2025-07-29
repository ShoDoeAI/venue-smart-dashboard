import { z } from 'zod';

// Base schemas
const ToastAddressSchema = z.object({
  address1: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

// Entity reference schemas
const ToastEntityReferenceSchema = z.object({
  guid: z.string(),
  entityType: z.string(),
  externalId: z.string().nullable().optional(),
});

// Payment schemas
export const ToastPaymentSchema = z.object({
  guid: z.string(),
  entityType: z.literal('OrderPayment').optional(),
  externalId: z.string().nullable().optional(),
  amount: z.number(), // Amount in dollars
  tipAmount: z.number().optional(), // Tip in dollars
  amountTendered: z.number().optional(),
  type: z.string().optional(), // CREDIT, CASH, OTHER, etc.
  cardType: z.string().optional(), // VISA, MASTERCARD, etc.
  last4Digits: z.string().optional(),
  cardEntryMode: z.string().optional(),
  paymentStatus: z.string().optional(),
  paidDate: z.string().optional(),
  paidBusinessDate: z.number().optional(),
  refundStatus: z.string().optional(),
  houseAccount: z.any().nullable().optional(),
  otherPayment: ToastEntityReferenceSchema.optional(),
  voidInfo: z.object({
    voidDate: z.string().optional(),
    voidUser: ToastEntityReferenceSchema.optional(),
  }).nullable().optional(),
  refund: z.any().nullable().optional(),
  mcaRepaymentAmount: z.number().optional(),
});

// Selection/Menu Item schemas
const ToastSelectionSchema = z.object({
  guid: z.string(),
  entityType: z.literal('MenuItemSelection').optional(),
  externalId: z.string().nullable().optional(),
  itemGroup: ToastEntityReferenceSchema,
  item: ToastEntityReferenceSchema,
  quantity: z.number(),
  price: z.number().optional(), // Price in dollars after discounts
  preDiscountPrice: z.number().optional(), // Price in dollars before discounts
  tax: z.number().optional(), // Tax amount in dollars
  displayName: z.string().optional(),
  deferred: z.boolean().optional(),
  voidDate: z.string().nullable().optional(),
  voidReason: z.any().nullable().optional(),
  voided: z.boolean().optional(),
  fulfillmentStatus: z.string().optional(),
  modifiers: z.array(z.any()).optional(),
  appliedDiscounts: z.array(z.any()).optional(),
  appliedTaxes: z.array(z.object({
    entityType: z.literal('AppliedTaxRate').optional(),
    taxRate: ToastEntityReferenceSchema,
    name: z.string(),
    rate: z.number(),
    taxAmount: z.number(),
    type: z.string(),
  })).optional(),
  salesCategory: ToastEntityReferenceSchema.nullable().optional(),
  selectionType: z.string().optional(),
  seatNumber: z.number().optional(),
  diningOption: ToastEntityReferenceSchema.optional(),
  openPriceAmount: z.number().optional(),
  receiptLinePrice: z.number().optional(),
});

// Check schema
const ToastCheckSchema = z.object({
  guid: z.string(),
  entityType: z.literal('Check').optional(),
  externalId: z.string().nullable().optional(),
  displayNumber: z.string().optional(),
  amount: z.number(), // Amount in dollars before tax
  totalAmount: z.number(), // Total amount in dollars including tax
  taxAmount: z.number().optional(), // Tax amount in dollars
  tabName: z.string().nullable().optional(),
  taxExempt: z.boolean().optional(),
  openedDate: z.string().optional(),
  closedDate: z.string().nullable().optional(),
  paidDate: z.string().nullable().optional(),
  paymentStatus: z.string().optional(),
  payments: z.array(ToastPaymentSchema).optional(),
  selections: z.array(ToastSelectionSchema).optional(),
  appliedDiscounts: z.array(z.any()).optional(),
  appliedServiceCharges: z.array(z.any()).optional(),
  voided: z.boolean().optional(),
  voidDate: z.string().nullable().optional(),
  customer: z.object({
    guid: z.string().optional(),
    entityType: z.literal('Customer').optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
  }).nullable().optional(),
});

// Order schema
export const ToastOrderSchema = z.object({
  guid: z.string(),
  entityType: z.literal('Order').optional(),
  externalId: z.string().nullable().optional(),
  businessDate: z.number(),
  createdDate: z.string().optional(),
  modifiedDate: z.string().optional(),
  openedDate: z.string().optional(),
  closedDate: z.string().nullable().optional(),
  paidDate: z.string().nullable().optional(),
  source: z.string().optional(), // API, In Store, etc.
  voided: z.boolean().optional(),
  voidDate: z.string().nullable().optional(),
  deleted: z.boolean().optional(),
  deletedDate: z.string().nullable().optional(),
  checks: z.array(ToastCheckSchema).optional(),
  server: ToastEntityReferenceSchema.nullable().optional(),
  revenueCenter: ToastEntityReferenceSchema.nullable().optional(),
  diningOption: ToastEntityReferenceSchema.optional(),
  numberOfGuests: z.number().optional(),
  estimatedFulfillmentDate: z.string().nullable().optional(),
  promisedDate: z.string().nullable().optional(),
  deliveryInfo: z.object({
    address1: z.string().optional(),
    address2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    notes: z.string().optional(),
    deliveredDate: z.string().nullable().optional(),
    dispatchedDate: z.string().nullable().optional(),
    deliveryEmployee: ToastEntityReferenceSchema.nullable().optional(),
  }).nullable().optional(),
  curbsidePickupInfo: z.object({
    guid: z.string().optional(),
    entityType: z.literal('CurbsidePickup').optional(),
    notes: z.string().optional(),
    transportColor: z.string().optional(),
    transportDescription: z.string().optional(),
  }).nullable().optional(),
  requiredPrepTime: z.string().optional(),
  approvalStatus: z.string().optional(),
});

// Customer schemas
export const ToastCustomerSchema = z.object({
  guid: z.string().optional(),
  entityType: z.literal('Customer').optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  companyName: z.string().optional(),
});

// Employee/Team member schemas
export const ToastEmployeeSchema = z.object({
  guid: z.string(),
  entityType: z.literal('RestaurantUser').optional(),
  externalId: z.string().nullable().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  phoneNumber: z.string().optional(),
  phoneNumberCountryCode: z.string().optional(),
  passcode: z.string().optional(),
  externalEmployeeId: z.string().optional(),
  createdDate: z.string().optional(),
  modifiedDate: z.string().optional(),
  deletedDate: z.string().nullable().optional(),
  disabled: z.boolean().optional(),
  jobReferences: z.array(z.object({
    guid: z.string(),
    name: z.string(),
  })).optional(),
});

// Location schemas
export const ToastLocationSchema = z.object({
  guid: z.string(),
  name: z.string(),
  address: ToastAddressSchema.optional(),
  phone: z.string().optional(),
  timeZone: z.string().optional(),
  closeoutHour: z.number().optional(),
  managementGroupGuid: z.string().optional(),
  // For compatibility, some endpoints return 'id' as an alias for 'guid'
  id: z.string().optional(),
});

// Menu schemas
export const ToastMenuItemSchema = z.object({
  guid: z.string(),
  entityType: z.literal('MenuItem').optional(),
  externalId: z.string().nullable().optional(),
  name: z.string(),
  price: z.number().optional(), // Price in dollars
  pricingStrategy: z.string().optional(),
  salesCategory: ToastEntityReferenceSchema.optional(),
  tax: ToastEntityReferenceSchema.optional(),
  isDiscountable: z.boolean().optional(),
  orderableOnline: z.boolean().optional(),
  portionCount: z.number().optional(),
  maxQuantity: z.number().optional(),
  unitOfMeasure: z.string().optional(),
  calories: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
  }).optional(),
});

export const ToastMenuGroupSchema = z.object({
  guid: z.string(),
  entityType: z.literal('MenuGroup').optional(),
  externalId: z.string().nullable().optional(),
  name: z.string(),
  items: z.array(ToastMenuItemSchema).optional(),
});

export const ToastMenuSchema = z.object({
  guid: z.string(),
  name: z.string(),
  masterId: z.number().optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  groups: z.array(ToastMenuGroupSchema).optional(),
});

// Response schemas
// Note: Toast API typically returns arrays directly, not wrapped in an object
export const ToastOrdersResponseSchema = z.array(ToastOrderSchema);
export const ToastLocationsResponseSchema = z.array(ToastLocationSchema);
export const ToastEmployeesResponseSchema = z.array(ToastEmployeeSchema);

// Error response schema
export const ToastErrorResponseSchema = z.object({
  status: z.number().optional(),
  code: z.string().optional(),
  message: z.string().optional(),
  developerMessage: z.string().optional(),
  moreInfo: z.string().optional(),
  errors: z.array(z.object({
    field: z.string().optional(),
    message: z.string().optional(),
  })).optional(),
});

// Paginated response schema (for some endpoints)
export const ToastPaginatedResponseSchema = z.object({
  data: z.array(z.any()),
  cursor: z.string().optional(),
  hasMore: z.boolean().optional(),
  totalCount: z.number().optional(),
});

// Type exports
export type ToastPayment = z.infer<typeof ToastPaymentSchema>;
export type ToastOrder = z.infer<typeof ToastOrderSchema>;
export type ToastCheck = z.infer<typeof ToastCheckSchema>;
export type ToastSelection = z.infer<typeof ToastSelectionSchema>;
export type ToastCustomer = z.infer<typeof ToastCustomerSchema>;
export type ToastEmployee = z.infer<typeof ToastEmployeeSchema>;
export type ToastLocation = z.infer<typeof ToastLocationSchema>;
export type ToastMenuItem = z.infer<typeof ToastMenuItemSchema>;
export type ToastMenuGroup = z.infer<typeof ToastMenuGroupSchema>;
export type ToastMenu = z.infer<typeof ToastMenuSchema>;
export type ToastErrorResponse = z.infer<typeof ToastErrorResponseSchema>;