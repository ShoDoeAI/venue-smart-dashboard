#!/usr/bin/env tsx
/**
 * Comprehensive test script for Phase 3 features
 * Tests: Alert Generation, Error Isolation, KPI Calculator enhancements
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared';
import { config } from 'dotenv';

import { AlertGenerator } from './services/alert-generator';
import { ErrorIsolationService } from './services/error-isolation';
import { KPICalculator } from './services/kpi-calculator';


// Load environment variables
config({ path: '../../.env' });

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testAlertGeneration() {
  console.log('\n🚨 Testing Alert Generation System...\n');
  
  const alertGenerator = new AlertGenerator();
  
  // Create mock KPI data with various alert conditions
  const mockKPIData = {
    venueMetrics: {
      venueId: 'test-venue-123',
      venueName: 'Test Venue',
      period: 'daily' as const,
      revenueMetrics: {
        current: 5000,
        lastPeriod: 8000, // 37.5% drop - should trigger alert
        growth: -37.5
      },
      attendanceMetrics: {
        current: 450,
        capacity: 500, // 90% capacity - should trigger alert
        utilizationRate: 90
      },
      hourlyBreakdown: [
        { hour: 10, revenue: 500, transactions: 20 },
        { hour: 11, revenue: 2000, transactions: 50 },
        { hour: 12, revenue: 200, transactions: 10 },
        { hour: 13, revenue: 1800, transactions: 45 },
        { hour: 14, revenue: 500, transactions: 20 },
      ]
    },
    eventMetrics: {
      upcomingEvents: [
        {
          eventId: 'evt-123',
          name: 'Summer Concert',
          startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days away
          capacity: 1000,
          ticketsSold: 300, // Only 30% sold - should trigger alert
          source: 'eventbrite'
        }
      ]
    }
  };

  try {
    // Generate alerts
    const alerts = await alertGenerator.generateAlerts(mockKPIData);
    console.log(`✅ Generated ${alerts.length} alerts:`);
    
    alerts.forEach((alert, index) => {
      console.log(`\n${index + 1}. ${alert.severity.toUpperCase()}: ${alert.title}`);
      console.log(`   Message: ${alert.message}`);
      if (alert.action_suggestions) {
        console.log('   Suggested Actions:');
        alert.action_suggestions.forEach(action => {
          console.log(`   - ${action.action}: ${action.description}`);
        });
      }
    });

    // Test priority sorting
    const sortedAlerts = alertGenerator.sortByPriority(alerts);
    console.log('\n📊 Alerts sorted by priority:');
    sortedAlerts.forEach((alert, index) => {
      const score = alertGenerator.getPriorityScore(alert);
      console.log(`${index + 1}. [Score: ${score}] ${alert.title}`);
    });

    // Test fetching active alerts
    const activeAlerts = await alertGenerator.getActiveAlerts();
    console.log(`\n📋 Active alerts in database: ${activeAlerts.length}`);

  } catch (error) {
    console.error('❌ Alert generation test failed:', error);
  }
}

async function testErrorIsolation() {
  console.log('\n🛡️  Testing Error Isolation System...\n');
  
  const errorService = new ErrorIsolationService();
  
  // Test different error scenarios
  const testErrors = [
    {
      source: 'toast' as const,
      error: new Error('Connection refused: ECONNREFUSED'),
      context: { venueId: 'test-venue-123', endpoint: '/transactions' }
    },
    {
      source: 'eventbrite' as const,
      error: new Error('HTTP 500: Internal Server Error'),
      context: { venueId: 'test-venue-123', endpoint: '/events' }
    },
    {
      source: 'opendate' as const,
      error: new Error('Rate limit exceeded'),
      context: { venueId: 'test-venue-123', endpoint: '/shows' }
    }
  ];

  for (const testCase of testErrors) {
    try {
      console.log(`\nTesting ${testCase.source} error isolation:`);
      const { fallbackData, errorId } = await errorService.isolateError(
        testCase.source,
        testCase.error,
        testCase.context
      );
      
      console.log(`✅ Error isolated successfully`);
      console.log(`   Error ID: ${errorId}`);
      console.log(`   Fallback data provided:`, JSON.stringify(fallbackData, null, 2));
      
    } catch (error) {
      console.error(`❌ Error isolation failed for ${testCase.source}:`, error);
    }
  }

  // Test error statistics
  try {
    const stats = await errorService.getErrorStats();
    console.log('\n📊 Error Statistics (last 24 hours):');
    console.log('   By Source:', stats.bySource);
    console.log('   By Severity:', stats.bySeverity);
    console.log('   Unresolved:', stats.unresolvedCount);
    console.log('   Total in 24h:', stats.last24Hours);
  } catch (error) {
    console.error('❌ Failed to get error stats:', error);
  }
}

async function testKPICalculatorEnhancements() {
  console.log('\n📈 Testing KPI Calculator Enhancements...\n');
  
  const kpiCalculator = new KPICalculator(supabase);
  
  // Get test venue
  const { data: venues } = await supabase
    .from('venues')
    .select('id, name')
    .limit(1);
  
  if (!venues || venues.length === 0) {
    console.log('⚠️  No venues found for testing');
    return;
  }
  
  const venueId = venues[0].id;
  console.log(`Using venue: ${venues[0].name} (${venueId})`);

  try {
    // Test real-time metrics (includes getUpcomingEvents)
    console.log('\n1. Testing real-time metrics with upcoming events:');
    const realtimeMetrics = await kpiCalculator.calculateRealtimeMetrics(venueId);
    console.log(`✅ Real-time metrics calculated`);
    console.log(`   Upcoming events: ${realtimeMetrics.upcomingEvents?.length || 0}`);
    if (realtimeMetrics.upcomingEvents && realtimeMetrics.upcomingEvents.length > 0) {
      console.log('   Next event:', {
        name: realtimeMetrics.upcomingEvents[0].name,
        date: realtimeMetrics.upcomingEvents[0].startTime,
        ticketsSold: realtimeMetrics.upcomingEvents[0].soldTickets,
        capacity: realtimeMetrics.upcomingEvents[0].capacity
      });
    }

    // Test weekly KPIs with growth rates
    console.log('\n2. Testing weekly KPIs with growth rates:');
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const weeklyKPIs = await kpiCalculator.calculateWeeklyKPIs(
      venueId,
      startDate,
      endDate
    );
    
    if (weeklyKPIs) {
      console.log(`✅ Weekly KPIs calculated`);
      console.log('   Growth Rates:', weeklyKPIs.growthRates);
      console.log('   Period:', `${weeklyKPIs.weekStart} to ${weeklyKPIs.weekEnd}`);
    }

    // Test monthly KPIs with YoY comparison
    console.log('\n3. Testing monthly KPIs with YoY comparison:');
    const monthEnd = new Date();
    const monthStart = new Date(monthEnd.getFullYear(), monthEnd.getMonth(), 1);
    
    const monthlyKPIs = await kpiCalculator.calculateMonthlyKPIs(
      venueId,
      monthStart,
      monthEnd
    );
    
    if (monthlyKPIs) {
      console.log(`✅ Monthly KPIs calculated`);
      console.log('   Year-over-Year:', monthlyKPIs.yearOverYear);
      console.log('   Period:', `${monthlyKPIs.month}/${monthlyKPIs.year}`);
    }

  } catch (error) {
    console.error('❌ KPI Calculator test failed:', error);
  }
}

async function testDatabaseConnections() {
  console.log('\n🔌 Testing Database Connections...\n');
  
  // Test new tables
  const tablesToTest = [
    { name: 'alerts', query: supabase.from('alerts').select('*').limit(1) },
    { name: 'api_errors', query: supabase.from('api_errors').select('*').limit(1) },
    { name: 'alert_history', query: supabase.from('alert_history').select('*').limit(1) },
    { name: 'error_recovery_strategies', query: supabase.from('error_recovery_strategies').select('*').limit(1) }
  ];

  for (const table of tablesToTest) {
    try {
      const { error } = await table.query;
      if (error) throw error;
      console.log(`✅ ${table.name} table is accessible`);
    } catch (error) {
      console.error(`❌ ${table.name} table error:`, error);
    }
  }
}

// Main test runner
async function runAllTests() {
  console.log('='.repeat(60));
  console.log('🧪 PHASE 3 COMPREHENSIVE TESTING');
  console.log('='.repeat(60));

  await testDatabaseConnections();
  await testAlertGeneration();
  await testErrorIsolation();
  await testKPICalculatorEnhancements();

  console.log('\n' + '='.repeat(60));
  console.log('✅ Phase 3 testing complete!');
  console.log('='.repeat(60));
  
  process.exit(0);
}

// Run tests
runAllTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});