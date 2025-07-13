/**
 * MVP Action System Types
 * Defines actions that can be executed across integrated services
 */

export type ActionService = 'toast' | 'eventbrite' | 'opendate';
export type ActionStatus = 'pending' | 'confirmed' | 'executing' | 'completed' | 'failed' | 'cancelled';
export type ActionPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Base action interface
 */
export interface BaseAction {
  id: string;
  service: ActionService;
  actionType: string;
  status: ActionStatus;
  priority: ActionPriority;
  venueId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: 'ai' | 'user';
  reason?: string;
  impact?: string;
  confidence?: number;
  metadata?: Record<string, any>;
}

/**
 * Toast POS Actions
 */
export interface ToastUpdateItemPriceAction extends BaseAction {
  service: 'toast';
  actionType: 'update_item_price';
  parameters: {
    itemGuid: string;
    itemName: string;
    currentPrice: number;
    newPrice: number;
    priceChangePercent: number;
  };
}

export interface ToastToggleItemAvailabilityAction extends BaseAction {
  service: 'toast';
  actionType: 'toggle_item_availability';
  parameters: {
    itemGuid: string;
    itemName: string;
    currentlyAvailable: boolean;
    setAvailable: boolean;
    reason?: string;
  };
}

export interface ToastCreateDiscountAction extends BaseAction {
  service: 'toast';
  actionType: 'create_discount';
  parameters: {
    name: string;
    type: 'percent' | 'fixed';
    amount: number;
    applicableItems?: string[]; // Item GUIDs
    validFrom?: string;
    validUntil?: string;
    maxUses?: number;
  };
}

export interface ToastUpdateModifierAction extends BaseAction {
  service: 'toast';
  actionType: 'update_modifier';
  parameters: {
    modifierGuid: string;
    modifierName: string;
    currentPrice: number;
    newPrice: number;
  };
}

export type ToastAction = 
  | ToastUpdateItemPriceAction
  | ToastToggleItemAvailabilityAction
  | ToastCreateDiscountAction
  | ToastUpdateModifierAction;

/**
 * Eventbrite Actions
 */
export interface EventbriteUpdateCapacityAction extends BaseAction {
  service: 'eventbrite';
  actionType: 'update_capacity';
  parameters: {
    eventId: string;
    eventName: string;
    currentCapacity: number;
    newCapacity: number;
    ticketClassId?: string;
  };
}

export interface EventbriteUpdateTicketPriceAction extends BaseAction {
  service: 'eventbrite';
  actionType: 'update_ticket_price';
  parameters: {
    eventId: string;
    eventName: string;
    ticketClassId: string;
    ticketClassName: string;
    currentPrice: number;
    newPrice: number;
    includeFees: boolean;
  };
}

export interface EventbriteCreatePromoCodeAction extends BaseAction {
  service: 'eventbrite';
  actionType: 'create_promo_code';
  parameters: {
    eventId: string;
    eventName: string;
    code: string;
    discountType: 'percent' | 'fixed';
    discountAmount: number;
    quantityLimit?: number;
    validFrom?: string;
    validUntil?: string;
  };
}

export interface EventbriteExtendSalePeriodAction extends BaseAction {
  service: 'eventbrite';
  actionType: 'extend_sale_period';
  parameters: {
    eventId: string;
    eventName: string;
    ticketClassId: string;
    currentEndDate: string;
    newEndDate: string;
    hoursExtended: number;
  };
}

export type EventbriteAction = 
  | EventbriteUpdateCapacityAction
  | EventbriteUpdateTicketPriceAction
  | EventbriteCreatePromoCodeAction
  | EventbriteExtendSalePeriodAction;

/**
 * OpenDate.io Actions
 */
export interface OpenDateUpdateShowCapacityAction extends BaseAction {
  service: 'opendate';
  actionType: 'update_show_capacity';
  parameters: {
    confirmId: string;
    showName: string;
    artistName: string;
    currentCapacity: number;
    newCapacity: number;
  };
}

export interface OpenDateModifyTicketTiersAction extends BaseAction {
  service: 'opendate';
  actionType: 'modify_ticket_tiers';
  parameters: {
    confirmId: string;
    showName: string;
    tiers: Array<{
      tierId: string;
      tierName: string;
      currentPrice: number;
      newPrice: number;
      currentQuantity: number;
      newQuantity?: number;
    }>;
  };
}

export interface OpenDateSendFanMessageAction extends BaseAction {
  service: 'opendate';
  actionType: 'send_fan_message';
  parameters: {
    segment: 'all' | 'show_attendees' | 'vip' | 'custom';
    segmentCriteria?: {
      showId?: string;
      minSpend?: number;
      lastVisitDays?: number;
      genres?: string[];
    };
    subject: string;
    message: string;
    includePromoCode?: string;
    estimatedRecipients: number;
  };
}

export interface OpenDateUpdateArtistPayoutAction extends BaseAction {
  service: 'opendate';
  actionType: 'update_artist_payout';
  parameters: {
    confirmId: string;
    showName: string;
    artistName: string;
    currentGuarantee: number;
    newGuarantee: number;
    currentDoorSplit: number;
    newDoorSplit: number;
  };
}

export type OpenDateAction = 
  | OpenDateUpdateShowCapacityAction
  | OpenDateModifyTicketTiersAction
  | OpenDateSendFanMessageAction
  | OpenDateUpdateArtistPayoutAction;

/**
 * Combined action type
 */
export type VenueSyncAction = ToastAction | EventbriteAction | OpenDateAction;

/**
 * Action execution result
 */
export interface ActionExecutionResult {
  actionId: string;
  success: boolean;
  executedAt: string;
  duration: number;
  result?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  rollbackData?: any;
}

/**
 * Action confirmation request
 */
export interface ActionConfirmationRequest {
  action: VenueSyncAction;
  estimatedImpact: {
    revenueChange?: number;
    customerImpact?: number;
    riskLevel: 'low' | 'medium' | 'high';
    affectedItems?: Array<{
      type: string;
      name: string;
      count: number;
    }>;
  };
  alternatives?: Array<{
    description: string;
    action: Partial<VenueSyncAction>;
  }>;
  requiresApproval: boolean;
  expiresAt?: string;
}

/**
 * Action rollback data
 */
export interface ActionRollback {
  actionId: string;
  service: ActionService;
  actionType: string;
  rollbackData: any;
  canRollback: boolean;
  rollbackDeadline?: string;
}

/**
 * Batch action execution
 */
export interface ActionBatch {
  id: string;
  name: string;
  description?: string;
  actions: VenueSyncAction[];
  executionOrder: 'parallel' | 'sequential';
  stopOnError: boolean;
  createdAt: string;
  scheduledFor?: string;
}

/**
 * Action validation
 */
export interface ActionValidation {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

/**
 * Action templates for common scenarios
 */
export interface ActionTemplate {
  id: string;
  name: string;
  description: string;
  category: 'revenue' | 'capacity' | 'marketing' | 'inventory';
  service: ActionService;
  actionType: string;
  defaultParameters: Record<string, any>;
  conditions?: Array<{
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    value: number;
  }>;
}

/**
 * Action history entry
 */
export interface ActionHistoryEntry {
  id: string;
  action: VenueSyncAction;
  executionResult: ActionExecutionResult;
  confirmedBy?: string;
  confirmedAt?: string;
  notes?: string;
  rollbackedAt?: string;
  rollbackReason?: string;
}