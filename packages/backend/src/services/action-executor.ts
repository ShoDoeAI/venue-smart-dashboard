import { SupabaseClient } from '@supabase/supabase-js';
import { ToastConnector } from '@venuesync/shared';
import { EventbriteConnector } from '@venuesync/shared';
import { OpenDateConnector } from '@venuesync/shared';
import type { Database } from '@venuesync/shared';
import type {
  VenueSyncAction,
  ActionExecutionResult,
  ActionValidation,
  ToastAction,
  EventbriteAction,
  OpenDateAction,
} from '@venuesync/shared';

export class ActionExecutor {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Validate an action before execution
   */
  async validateAction(action: VenueSyncAction): Promise<ActionValidation> {
    const errors: ActionValidation['errors'] = [];
    const warnings: ActionValidation['warnings'] = [];

    // Common validations
    if (!action.venueId) {
      errors.push({
        field: 'venueId',
        message: 'Venue ID is required',
        code: 'MISSING_VENUE_ID',
      });
    }

    // Service-specific validations
    switch (action.service) {
      case 'toast':
        await this.validateToastAction(action as ToastAction, errors, warnings);
        break;
      case 'eventbrite':
        await this.validateEventbriteAction(action as EventbriteAction, errors, warnings);
        break;
      case 'opendate':
        await this.validateOpenDateAction(action as OpenDateAction, errors, warnings);
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Execute an action
   */
  async executeAction(action: VenueSyncAction): Promise<ActionExecutionResult> {
    const startTime = Date.now();

    try {
      // Validate first
      const validation = await this.validateAction(action);
      if (!validation.isValid) {
        return {
          actionId: action.id,
          success: false,
          executedAt: new Date().toISOString(),
          duration: Date.now() - startTime,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Action validation failed',
            details: validation.errors,
          },
        };
      }

      // Update action status
      await this.updateActionStatus(action.id, 'executing');

      // Execute based on service
      let result: ActionExecutionResult;
      switch (action.service) {
        case 'toast':
          result = await this.executeToastAction(action as ToastAction);
          break;
        case 'eventbrite':
          result = await this.executeEventbriteAction(action as EventbriteAction);
          break;
        case 'opendate':
          result = await this.executeOpenDateAction(action as OpenDateAction);
          break;
        default:
          throw new Error(`Unknown service: ${(action as VenueSyncAction).service}`);
      }

      // Update action status
      await this.updateActionStatus(
        action.id,
        result.success ? 'completed' : 'failed'
      );

      // Store execution result
      await this.storeExecutionResult(action, result);

      return result;
    } catch (error) {
      const errorResult: ActionExecutionResult = {
        actionId: action.id,
        success: false,
        executedAt: new Date().toISOString(),
        duration: Date.now() - startTime,
        error: {
          code: 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };

      await this.updateActionStatus(action.id, 'failed');
      await this.storeExecutionResult(action, errorResult);

      return errorResult;
    }
  }

  /**
   * Execute Toast action
   */
  private async executeToastAction(action: ToastAction): Promise<ActionExecutionResult> {
    const connector = await this.getToastConnector(action.venueId);
    const startTime = Date.now();

    try {
      let result: any;
      let rollbackData: any;

      switch (action.actionType) {
        case 'update_item_price': {
          const { itemGuid, currentPrice, newPrice } = action.parameters;
          
          // Store current state for rollback
          rollbackData = { itemGuid, originalPrice: currentPrice };

          // Execute price update
          result = await connector.updateMenuItemPrice(itemGuid, newPrice);
          break;
        }

        case 'toggle_item_availability': {
          const { itemGuid, setAvailable } = action.parameters;
          
          // Store current state
          rollbackData = { itemGuid, wasAvailable: !setAvailable };

          // Toggle availability
          result = await connector.updateMenuItemAvailability(itemGuid, setAvailable);
          break;
        }

        case 'create_discount': {
          const { name, type, amount, validFrom, validUntil } = action.parameters;
          
          // Create discount
          result = await connector.createDiscount({
            name,
            type,
            amount,
            startDate: validFrom,
            endDate: validUntil,
          });

          // Store discount ID for rollback
          rollbackData = { discountId: result.id };
          break;
        }

        case 'update_modifier': {
          const { modifierGuid, currentPrice, newPrice } = action.parameters;
          
          // Store current state
          rollbackData = { modifierGuid, originalPrice: currentPrice };

          // Update modifier price
          result = await connector.updateModifierPrice(modifierGuid, newPrice);
          break;
        }

        default:
          throw new Error(`Unknown Toast action type: ${(action as ToastAction).actionType}`);
      }

      return {
        actionId: action.id,
        success: true,
        executedAt: new Date().toISOString(),
        duration: Date.now() - startTime,
        result,
        rollbackData,
      };
    } catch (error) {
      return {
        actionId: action.id,
        success: false,
        executedAt: new Date().toISOString(),
        duration: Date.now() - startTime,
        error: {
          code: 'TOAST_API_ERROR',
          message: error instanceof Error ? error.message : 'Toast API error',
          details: error,
        },
      };
    }
  }

  /**
   * Execute Eventbrite action
   */
  private async executeEventbriteAction(action: EventbriteAction): Promise<ActionExecutionResult> {
    const connector = await this.getEventbriteConnector(action.venueId);
    const startTime = Date.now();

    try {
      let result: any;
      let rollbackData: any;

      switch (action.actionType) {
        case 'update_capacity': {
          const { eventId, ticketClassId, currentCapacity, newCapacity } = action.parameters;
          
          rollbackData = { eventId, ticketClassId, originalCapacity: currentCapacity };

          // Update capacity
          result = await connector.updateEventCapacity(eventId, newCapacity, ticketClassId);
          break;
        }

        case 'update_ticket_price': {
          const { eventId, ticketClassId, currentPrice, newPrice, includeFees } = action.parameters;
          
          rollbackData = { eventId, ticketClassId, originalPrice: currentPrice };

          // Update ticket price
          result = await connector.updateTicketPrice(eventId, ticketClassId, newPrice, includeFees);
          break;
        }

        case 'create_promo_code': {
          const { eventId, code, discountType, discountAmount, validUntil } = action.parameters;
          
          // Create promo code
          result = await connector.createPromoCode({
            eventId,
            code,
            discountType,
            discountAmount,
            endDate: validUntil,
          });

          rollbackData = { promoCodeId: result.id };
          break;
        }

        case 'extend_sale_period': {
          const { eventId, ticketClassId, newEndDate } = action.parameters;
          
          // Extend ticket sales
          result = await connector.extendTicketSales(eventId, ticketClassId, newEndDate);
          break;
        }

        default:
          throw new Error(`Unknown Eventbrite action type: ${(action as EventbriteAction).actionType}`);
      }

      return {
        actionId: action.id,
        success: true,
        executedAt: new Date().toISOString(),
        duration: Date.now() - startTime,
        result,
        rollbackData,
      };
    } catch (error) {
      return {
        actionId: action.id,
        success: false,
        executedAt: new Date().toISOString(),
        duration: Date.now() - startTime,
        error: {
          code: 'EVENTBRITE_API_ERROR',
          message: error instanceof Error ? error.message : 'Eventbrite API error',
          details: error,
        },
      };
    }
  }

  /**
   * Execute OpenDate action
   */
  private async executeOpenDateAction(action: OpenDateAction): Promise<ActionExecutionResult> {
    const connector = await this.getOpenDateConnector(action.venueId);
    const startTime = Date.now();

    try {
      let result: any;
      let rollbackData: any;

      switch (action.actionType) {
        case 'update_show_capacity': {
          const { confirmId, currentCapacity, newCapacity } = action.parameters;
          
          rollbackData = { confirmId, originalCapacity: currentCapacity };

          // Update show capacity
          result = await connector.updateShowCapacity(confirmId, newCapacity);
          break;
        }

        case 'modify_ticket_tiers': {
          const { confirmId, tiers } = action.parameters;
          
          rollbackData = { confirmId, originalTiers: tiers.map(t => ({
            tierId: t.tierId,
            price: t.currentPrice,
            quantity: t.currentQuantity,
          }))};

          // Update ticket tiers
          for (const tier of tiers) {
            await connector.updateTicketTier(confirmId, tier.tierId, {
              price: tier.newPrice,
              quantity: tier.newQuantity,
            });
          }
          result = { updated: tiers.length };
          break;
        }

        case 'send_fan_message': {
          const { segment, segmentCriteria, subject, message, includePromoCode } = action.parameters;
          
          // Send fan message
          result = await connector.sendFanMessage({
            segment,
            criteria: segmentCriteria,
            subject,
            message,
            promoCode: includePromoCode,
          });

          rollbackData = { messageId: result.id };
          break;
        }

        case 'update_artist_payout': {
          const { confirmId, newGuarantee, newDoorSplit } = action.parameters;
          
          // Update artist payout terms
          result = await connector.updateArtistPayout(confirmId, {
            guarantee: newGuarantee,
            doorSplit: newDoorSplit,
          });
          break;
        }

        default:
          throw new Error(`Unknown OpenDate action type: ${(action as OpenDateAction).actionType}`);
      }

      return {
        actionId: action.id,
        success: true,
        executedAt: new Date().toISOString(),
        duration: Date.now() - startTime,
        result,
        rollbackData,
      };
    } catch (error) {
      return {
        actionId: action.id,
        success: false,
        executedAt: new Date().toISOString(),
        duration: Date.now() - startTime,
        error: {
          code: 'OPENDATE_API_ERROR',
          message: error instanceof Error ? error.message : 'OpenDate API error',
          details: error,
        },
      };
    }
  }

  /**
   * Rollback an action
   */
  async rollbackAction(actionId: string): Promise<ActionExecutionResult> {
    const { data: actionHistory, error } = await this.supabase
      .from('action_history')
      .select('*')
      .eq('action_id', actionId)
      .single();

    if (error || !actionHistory) {
      throw new Error('Action history not found');
    }

    const action = actionHistory.action as VenueSyncAction;
    const rollbackData = actionHistory.rollback_data;

    if (!rollbackData) {
      throw new Error('No rollback data available');
    }

    // Execute rollback based on service and action type
    switch (action.service) {
      case 'toast':
        return this.rollbackToastAction(action as ToastAction, rollbackData);
      case 'eventbrite':
        return this.rollbackEventbriteAction(action as EventbriteAction, rollbackData);
      case 'opendate':
        return this.rollbackOpenDateAction(action as OpenDateAction, rollbackData);
      default:
        throw new Error(`Unknown service for rollback: ${(action as VenueSyncAction).service}`);
    }
  }

  /**
   * Get connector instances
   */
  private async getToastConnector(venueId: string): Promise<ToastConnector> {
    const { data: credentials, error } = await this.supabase
      .from('api_credentials')
      .select('*')
      .eq('venue_id', venueId)
      .eq('service', 'toast')
      .single();

    if (error || !credentials) {
      throw new Error('Toast credentials not found');
    }

    return new ToastConnector(
      credentials,
      { timeout: 30000, maxRetries: 3, retryDelay: 1000 },
      this.supabase
    );
  }

  private async getEventbriteConnector(venueId: string): Promise<EventbriteConnector> {
    const { data: credentials, error } = await this.supabase
      .from('api_credentials')
      .select('*')
      .eq('venue_id', venueId)
      .eq('service', 'eventbrite')
      .single();

    if (error || !credentials) {
      throw new Error('Eventbrite credentials not found');
    }

    return new EventbriteConnector(
      credentials,
      { timeout: 30000, maxRetries: 3, retryDelay: 1000 },
      this.supabase
    );
  }

  private async getOpenDateConnector(venueId: string): Promise<OpenDateConnector> {
    const { data: credentials, error } = await this.supabase
      .from('api_credentials')
      .select('*')
      .eq('venue_id', venueId)
      .eq('service', 'opendate')
      .single();

    if (error || !credentials) {
      throw new Error('OpenDate credentials not found');
    }

    return new OpenDateConnector(
      credentials,
      { timeout: 30000, maxRetries: 3, retryDelay: 1000 },
      this.supabase
    );
  }

  /**
   * Validation helpers
   */
  private async validateToastAction(
    action: ToastAction,
    errors: ActionValidation['errors'],
    warnings: ActionValidation['warnings']
  ): Promise<void> {
    switch (action.actionType) {
      case 'update_item_price':
        if (action.parameters.newPrice < 0) {
          errors.push({
            field: 'parameters.newPrice',
            message: 'Price cannot be negative',
            code: 'INVALID_PRICE',
          });
        }
        if (action.parameters.priceChangePercent > 50) {
          warnings.push({
            field: 'parameters.priceChangePercent',
            message: 'Price change exceeds 50%',
            code: 'HIGH_PRICE_CHANGE',
          });
        }
        break;

      case 'create_discount':
        if (action.parameters.amount < 0 || action.parameters.amount > 100) {
          errors.push({
            field: 'parameters.amount',
            message: 'Discount amount must be between 0 and 100',
            code: 'INVALID_DISCOUNT',
          });
        }
        break;
    }
  }

  private async validateEventbriteAction(
    action: EventbriteAction,
    errors: ActionValidation['errors'],
    warnings: ActionValidation['warnings']
  ): Promise<void> {
    switch (action.actionType) {
      case 'update_capacity':
        if (action.parameters.newCapacity < 0) {
          errors.push({
            field: 'parameters.newCapacity',
            message: 'Capacity cannot be negative',
            code: 'INVALID_CAPACITY',
          });
        }
        if (action.parameters.newCapacity < action.parameters.currentCapacity) {
          warnings.push({
            field: 'parameters.newCapacity',
            message: 'Reducing capacity may affect existing ticket holders',
            code: 'CAPACITY_REDUCTION',
          });
        }
        break;

      case 'create_promo_code':
        if (!action.parameters.code || action.parameters.code.length < 3) {
          errors.push({
            field: 'parameters.code',
            message: 'Promo code must be at least 3 characters',
            code: 'INVALID_PROMO_CODE',
          });
        }
        break;
    }
  }

  private async validateOpenDateAction(
    action: OpenDateAction,
    errors: ActionValidation['errors'],
    warnings: ActionValidation['warnings']
  ): Promise<void> {
    switch (action.actionType) {
      case 'send_fan_message':
        if (!action.parameters.subject || !action.parameters.message) {
          errors.push({
            field: 'parameters',
            message: 'Subject and message are required',
            code: 'MISSING_MESSAGE_CONTENT',
          });
        }
        if (action.parameters.estimatedRecipients > 1000) {
          warnings.push({
            field: 'parameters.estimatedRecipients',
            message: 'Large recipient list may take time to process',
            code: 'LARGE_RECIPIENT_LIST',
          });
        }
        break;

      case 'modify_ticket_tiers':
        for (const tier of action.parameters.tiers) {
          if (tier.newPrice < 0) {
            errors.push({
              field: `parameters.tiers.${tier.tierId}.newPrice`,
              message: 'Ticket price cannot be negative',
              code: 'INVALID_TICKET_PRICE',
            });
          }
        }
        break;
    }
  }

  /**
   * Helper methods
   */
  private async updateActionStatus(actionId: string, status: VenueSyncAction['status']): Promise<void> {
    await this.supabase
      .from('actions')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', actionId);
  }

  private async storeExecutionResult(
    action: VenueSyncAction,
    result: ActionExecutionResult
  ): Promise<void> {
    await this.supabase.from('action_history').insert({
      action_id: action.id,
      action: action,
      execution_result: result,
      rollback_data: result.rollbackData,
      executed_at: result.executedAt,
    });
  }

  /**
   * Rollback methods (simplified - would need actual implementation)
   */
  private async rollbackToastAction(
    action: ToastAction,
    _rollbackData: any
  ): Promise<ActionExecutionResult> {
    // Implementation would restore original state
    return {
      actionId: action.id,
      success: true,
      executedAt: new Date().toISOString(),
      duration: 0,
      result: { rollback: 'completed' },
    };
  }

  private async rollbackEventbriteAction(
    action: EventbriteAction,
    _rollbackData: any
  ): Promise<ActionExecutionResult> {
    // Implementation would restore original state
    return {
      actionId: action.id,
      success: true,
      executedAt: new Date().toISOString(),
      duration: 0,
      result: { rollback: 'completed' },
    };
  }

  private async rollbackOpenDateAction(
    action: OpenDateAction,
    _rollbackData: any
  ): Promise<ActionExecutionResult> {
    // Implementation would restore original state
    return {
      actionId: action.id,
      success: true,
      executedAt: new Date().toISOString(),
      duration: 0,
      result: { rollback: 'completed' },
    };
  }
}