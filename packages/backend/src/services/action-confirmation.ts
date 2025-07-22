import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared';
import type {
  VenueSyncAction,
  ActionConfirmationRequest,
  ToastAction,
  EventbriteAction,
  OpenDateAction,
  ToastUpdateItemPriceAction,
} from '@venuesync/shared';
import { KPICalculator } from './kpi-calculator';

export class ActionConfirmationService {
  private kpiCalculator: KPICalculator;

  constructor(private supabase: SupabaseClient<Database>) {
    this.kpiCalculator = new KPICalculator(supabase);
  }

  /**
   * Generate confirmation request for an action
   */
  async generateConfirmationRequest(
    action: VenueSyncAction
  ): Promise<ActionConfirmationRequest> {
    // Calculate estimated impact
    const estimatedImpact = await this.calculateImpact(action);

    // Generate alternatives if applicable
    const alternatives = await this.generateAlternatives(action);

    // Determine if approval is required
    const requiresApproval = this.requiresApproval(action, estimatedImpact);

    // Set expiration (15 minutes for critical actions)
    const expiresAt = action.priority === 'critical'
      ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
      : undefined;

    return {
      action,
      estimatedImpact,
      alternatives,
      requiresApproval,
      expiresAt,
    };
  }

  /**
   * Calculate estimated impact of an action
   */
  private async calculateImpact(action: VenueSyncAction) {
    const impact: ActionConfirmationRequest['estimatedImpact'] = {
      riskLevel: 'low',
      affectedItems: [],
    };

    switch (action.service) {
      case 'toast':
        await this.calculateToastImpact(action as ToastAction, impact);
        break;
      case 'eventbrite':
        await this.calculateEventbriteImpact(action as EventbriteAction, impact);
        break;
      case 'opendate':
        await this.calculateOpenDateImpact(action as OpenDateAction, impact);
        break;
    }

    return impact;
  }

  /**
   * Calculate Toast action impact
   */
  private async calculateToastImpact(
    action: ToastAction,
    impact: ActionConfirmationRequest['estimatedImpact']
  ): Promise<void> {
    switch (action.actionType) {
      case 'update_item_price': {
        const { currentPrice, newPrice, priceChangePercent } = action.parameters;
        
        // Estimate revenue impact based on historical sales
        const { data: recentSales } = await this.supabase
          .from('toast_transactions')
          .select('*')
          .gte('transaction_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .limit(100);

        const itemSalesCount = recentSales?.filter(tx => 
          tx.items?.some((item: any) => item.guid === action.parameters.itemGuid)
        ).length || 0;

        const weeklyRevenue = itemSalesCount * currentPrice;
        const projectedRevenue = itemSalesCount * newPrice;
        impact.revenueChange = projectedRevenue - weeklyRevenue;

        // Set risk level based on price change
        if (Math.abs(priceChangePercent) > 30) {
          impact.riskLevel = 'high';
        } else if (Math.abs(priceChangePercent) > 15) {
          impact.riskLevel = 'medium';
        }

        impact.affectedItems = [{
          type: 'menu_item',
          name: action.parameters.itemName,
          count: 1,
        }];

        // Estimate customer impact
        impact.customerImpact = itemSalesCount;
        break;
      }

      case 'toggle_item_availability': {
        const { itemName, setAvailable } = action.parameters;
        
        if (!setAvailable) {
          // Disabling an item has revenue impact
          impact.riskLevel = 'medium';
          impact.revenueChange = -100; // Placeholder - would calculate actual
        }

        impact.affectedItems = [{
          type: 'menu_item',
          name: itemName,
          count: 1,
        }];
        break;
      }

      case 'create_discount': {
        const { amount, type, applicableItems } = action.parameters;
        
        // Estimate discount impact
        const discountMultiplier = type === 'percent' ? (amount / 100) : amount;
        impact.revenueChange = -1000 * discountMultiplier; // Placeholder calculation

        impact.riskLevel = amount > 20 ? 'medium' : 'low';
        
        impact.affectedItems = [{
          type: 'discount',
          name: action.parameters.name,
          count: applicableItems?.length || 0,
        }];
        break;
      }
    }
  }

  /**
   * Calculate Eventbrite action impact
   */
  private async calculateEventbriteImpact(
    action: EventbriteAction,
    impact: ActionConfirmationRequest['estimatedImpact']
  ): Promise<void> {
    switch (action.actionType) {
      case 'update_capacity': {
        const { currentCapacity, newCapacity, eventName } = action.parameters;
        const capacityDiff = newCapacity - currentCapacity;

        if (capacityDiff < 0) {
          // Reducing capacity is high risk
          impact.riskLevel = 'high';
          impact.customerImpact = Math.abs(capacityDiff);
        } else {
          // Increasing capacity is low risk but has revenue opportunity
          impact.revenueChange = capacityDiff * 50; // Assume $50 avg ticket
        }

        impact.affectedItems = [{
          type: 'event',
          name: eventName,
          count: 1,
        }];
        break;
      }

      case 'update_ticket_price': {
        const { currentPrice, newPrice, ticketClassName } = action.parameters;
        const priceDiff = newPrice - currentPrice;
        
        // Get event details to estimate impact
        const { data: eventData } = await this.supabase
          .from('eventbrite_transactions')
          .select('*')
          .eq('event_id', action.parameters.eventId)
          .limit(50);

        const soldTickets = eventData?.length || 0;
        const remainingCapacity = 100; // Would get actual from API

        impact.revenueChange = remainingCapacity * priceDiff;
        
        if (priceDiff > 0 && (priceDiff / currentPrice) > 0.2) {
          impact.riskLevel = 'medium'; // >20% increase is risky
        }

        impact.affectedItems = [{
          type: 'ticket_class',
          name: ticketClassName,
          count: remainingCapacity,
        }];
        break;
      }

      case 'create_promo_code': {
        const { discountAmount, discountType, quantityLimit } = action.parameters;
        
        const maxUsage = quantityLimit || 100;
        const discountValue = discountType === 'percent' 
          ? (discountAmount / 100) * 50 // Assume $50 avg ticket
          : discountAmount;

        impact.revenueChange = -(maxUsage * discountValue);
        impact.riskLevel = discountAmount > 30 ? 'medium' : 'low';

        impact.affectedItems = [{
          type: 'promo_code',
          name: action.parameters.code,
          count: maxUsage,
        }];
        break;
      }
    }
  }

  /**
   * Calculate OpenDate action impact
   */
  private async calculateOpenDateImpact(
    action: OpenDateAction,
    impact: ActionConfirmationRequest['estimatedImpact']
  ): Promise<void> {
    switch (action.actionType) {
      case 'update_show_capacity': {
        const { currentCapacity, newCapacity, showName } = action.parameters;
        const capacityDiff = newCapacity - currentCapacity;

        impact.revenueChange = capacityDiff * 35; // Assume $35 avg ticket
        impact.riskLevel = capacityDiff < 0 ? 'high' : 'low';

        impact.affectedItems = [{
          type: 'show',
          name: showName,
          count: 1,
        }];
        break;
      }

      case 'modify_ticket_tiers': {
        const { tiers, showName } = action.parameters;
        
        let totalRevenueImpact = 0;
        let totalAffectedTickets = 0;

        for (const tier of tiers) {
          const priceDiff = tier.newPrice - tier.currentPrice;
          const quantity = tier.newQuantity || tier.currentQuantity;
          totalRevenueImpact += priceDiff * quantity;
          totalAffectedTickets += quantity;
        }

        impact.revenueChange = totalRevenueImpact;
        impact.riskLevel = Math.abs(totalRevenueImpact) > 1000 ? 'medium' : 'low';

        impact.affectedItems = [{
          type: 'ticket_tiers',
          name: showName,
          count: tiers.length,
        }];

        impact.customerImpact = totalAffectedTickets;
        break;
      }

      case 'send_fan_message': {
        const { estimatedRecipients, includePromoCode } = action.parameters;
        
        impact.customerImpact = estimatedRecipients;
        impact.riskLevel = estimatedRecipients > 5000 ? 'medium' : 'low';

        if (includePromoCode) {
          // Assume 10% redemption rate, $5 discount
          impact.revenueChange = -(estimatedRecipients * 0.1 * 5);
        }

        impact.affectedItems = [{
          type: 'fan_message',
          name: action.parameters.subject,
          count: estimatedRecipients,
        }];
        break;
      }

      case 'update_artist_payout': {
        const { currentGuarantee, newGuarantee, artistName } = action.parameters;
        
        impact.revenueChange = -(newGuarantee - currentGuarantee);
        impact.riskLevel = Math.abs(newGuarantee - currentGuarantee) > 1000 ? 'high' : 'medium';

        impact.affectedItems = [{
          type: 'artist_payout',
          name: artistName,
          count: 1,
        }];
        break;
      }
    }
  }

  /**
   * Generate alternative actions
   */
  private async generateAlternatives(
    action: VenueSyncAction
  ): Promise<ActionConfirmationRequest['alternatives']> {
    const alternatives: ActionConfirmationRequest['alternatives'] = [];

    if (action.service === 'toast' && action.actionType === 'update_item_price') {
      const params = (action as ToastUpdateItemPriceAction).parameters;
      
      // Suggest smaller price change
      if (params.priceChangePercent > 20) {
        alternatives.push({
          description: 'Apply a smaller 10% price increase',
          action: {
            ...action,
            parameters: {
              ...params,
              newPrice: params.currentPrice * 1.1,
              priceChangePercent: 10,
            } as any,
          },
        });
      }

      // Suggest time-limited discount instead of price reduction
      if (params.priceChangePercent < -10) {
        alternatives.push({
          description: 'Create a time-limited discount instead',
          action: {
            service: 'toast',
            actionType: 'create_discount',
            parameters: {
              name: `${params.itemName} Special`,
              type: 'percent',
              amount: Math.abs(params.priceChangePercent),
              validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            },
          },
        });
      }
    }

    if (action.service === 'eventbrite' && action.actionType === 'update_capacity') {
      const params = (action as EventbriteAction).parameters;
      
      // Suggest gradual capacity increase
      if (params.newCapacity > params.currentCapacity * 1.5) {
        alternatives.push({
          description: 'Increase capacity gradually by 25%',
          action: {
            ...action,
            parameters: {
              ...params,
              newCapacity: Math.floor(params.currentCapacity * 1.25),
            },
          },
        });
      }
    }

    return alternatives;
  }

  /**
   * Determine if action requires approval
   */
  private requiresApproval(
    action: VenueSyncAction,
    impact: ActionConfirmationRequest['estimatedImpact']
  ): boolean {
    // High risk always requires approval
    if (impact.riskLevel === 'high') return true;

    // Large revenue impact requires approval
    if (Math.abs(impact.revenueChange || 0) > 1000) return true;

    // Large customer impact requires approval
    if ((impact.customerImpact || 0) > 100) return true;

    // Critical priority requires approval
    if (action.priority === 'critical') return true;

    // AI-generated actions require approval by default
    if (action.createdBy === 'ai' && action.confidence && action.confidence < 0.9) return true;

    return false;
  }

  /**
   * Store confirmation request
   */
  async storeConfirmationRequest(
    request: ActionConfirmationRequest
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from('action_confirmations')
      .insert({
        action_id: request.action.id,
        action: request.action,
        estimated_impact: request.estimatedImpact,
        alternatives: request.alternatives,
        requires_approval: request.requiresApproval,
        expires_at: request.expiresAt,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to store confirmation: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Get pending confirmations for a venue
   */
  async getPendingConfirmations(venueId: string) {
    const { data, error } = await this.supabase
      .from('action_confirmations')
      .select('*')
      .eq('action->venueId', venueId)
      .eq('status', 'pending')
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get confirmations: ${error.message}`);
    }

    return data;
  }

  /**
   * Confirm an action
   */
  async confirmAction(
    confirmationId: string,
    confirmedBy: string,
    notes?: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('action_confirmations')
      .update({
        status: 'confirmed',
        confirmed_by: confirmedBy,
        confirmed_at: new Date().toISOString(),
        notes,
      })
      .eq('id', confirmationId);

    if (error) {
      throw new Error(`Failed to confirm action: ${error.message}`);
    }
  }

  /**
   * Reject an action
   */
  async rejectAction(
    confirmationId: string,
    rejectedBy: string,
    reason: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('action_confirmations')
      .update({
        status: 'rejected',
        rejected_by: rejectedBy,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason,
      })
      .eq('id', confirmationId);

    if (error) {
      throw new Error(`Failed to reject action: ${error.message}`);
    }
  }
}