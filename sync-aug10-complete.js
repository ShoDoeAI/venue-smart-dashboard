#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Get Toast token
async function getToastToken() {
  console.log('Getting Toast access token...');

  try {
    const response = await axios.post(
      'https://ws-api.toasttab.com/authentication/v1/authentication/login',
      {
        clientId: process.env.TOAST_CLIENT_ID,
        clientSecret: process.env.TOAST_CLIENT_SECRET,
        userAccessType: 'TOAST_MACHINE_CLIENT',
      },
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );

    if (response.data?.token?.accessToken) {
      console.log('✅ Got Toast token');
      return response.data.token.accessToken;
    }
  } catch (error) {
    console.error('❌ Toast auth error:', error.response?.data || error.message);
    throw error;
  }
}

async function syncAug10Complete() {
  console.log('🔄 COMPLETE SYNC FOR AUGUST 10, 2025\n');
  console.log('='.repeat(80));
  console.log('This sync will match the daily sync endpoint exactly.\n');

  try {
    // Get Toast token
    const token = await getToastToken();

    const businessDate = '20250810';
    const startOfDay = '2025-08-10T00:00:00.000Z';
    const endOfDay = new Date(new Date(startOfDay).getTime() + 24 * 60 * 60 * 1000).toISOString();

    // Clear existing data
    console.log('Clearing existing data...');

    // First get existing checks to delete selections
    const { data: existingChecks } = await supabase
      .from('toast_checks')
      .select('check_guid')
      .gte('created_date', startOfDay)
      .lt('created_date', endOfDay);

    if (existingChecks && existingChecks.length > 0) {
      const checkGuids = existingChecks.map((c) => c.check_guid);

      // Clear selections first
      for (let i = 0; i < checkGuids.length; i += 100) {
        await supabase
          .from('toast_selections')
          .delete()
          .in('check_guid', checkGuids.slice(i, i + 100));
      }

      // Then clear checks
      for (let i = 0; i < checkGuids.length; i += 100) {
        await supabase
          .from('toast_checks')
          .delete()
          .in('check_guid', checkGuids.slice(i, i + 100));
      }
    }

    // Clear orders
    await supabase.from('toast_orders').delete().eq('business_date', parseInt(businessDate));

    // Fetch ALL orders from Toast
    let allOrders = [];
    let page = 1;
    let hasMore = true;
    const snapshotTimestamp = new Date().toISOString();
    let savedCount = 0;
    let totalRevenue = 0;
    let checkCount = 0;
    let selectionCount = 0;

    console.log(`\nFetching orders for business date ${businessDate}...`);

    while (hasMore) {
      console.log(`\nFetching page ${page}...`);

      const url = `https://ws-api.toasttab.com/orders/v2/ordersBulk?businessDate=${businessDate}&page=${page}&pageSize=100`;

      try {
        const response = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Toast-Restaurant-External-ID': process.env.TOAST_LOCATION_ID,
          },
          timeout: 30000,
        });

        const orders = response.data || [];
        console.log(`  Found ${orders.length} orders on page ${page}`);

        if (!orders || orders.length === 0) {
          hasMore = false;
          break;
        }

        // Process each order (following the daily sync logic exactly)
        for (const order of orders) {
          // Save order
          await supabase.from('toast_orders').insert({
            order_guid: order.guid,
            business_date: parseInt(businessDate),
            created_date: order.createdDate || order.openedDate,
            location_id: process.env.TOAST_LOCATION_ID,
          });

          // Process checks
          if (order.checks && Array.isArray(order.checks)) {
            for (const check of order.checks) {
              checkCount++;

              // Collect selections for this check
              const selections = [];
              if (check.selections && Array.isArray(check.selections)) {
                check.selections.forEach((selection) => {
                  selections.push({
                    check_guid: check.guid,
                    order_guid: order.guid,
                    selection,
                  });
                  selectionCount++;
                });
              }

              const checkData = {
                check_guid: check.guid,
                order_guid: order.guid,
                snapshot_timestamp: snapshotTimestamp,
                tab_name: check.tabName || null,
                total_amount: check.totalAmount || 0,
                amount: check.amount || 0,
                tax_amount: check.taxAmount || 0,
                tip_amount: check.tipAmount || 0,
                applied_discount_amount: check.appliedDiscountAmount || 0,
                created_date: check.createdDate || check.openedDate,
                opened_date: check.openedDate,
                closed_date: check.closedDate,
                voided: check.voided || false,
                void_date: check.voidDate,
                payment_status: check.paymentStatus || 'OPEN',
                customer_guid: check.customer?.guid || null,
                customer_first_name: check.customer?.firstName || null,
                customer_last_name: check.customer?.lastName || null,
                customer_phone: check.customer?.phone || null,
                customer_email: check.customer?.email || null,
                applied_service_charges: check.appliedServiceCharges || null,
                applied_discounts: check.appliedDiscounts || null,
                is_historical: false,
              };

              const { error } = await supabase.from('toast_checks').insert(checkData);

              if (!error) {
                savedCount++;
                if (!check.voided) {
                  totalRevenue += checkData.total_amount;
                }
              } else {
                console.log(`  ⚠️  Error saving check ${check.guid}:`, error.message);
              }

              // Save selections for this check
              if (selections.length > 0) {
                for (const { check_guid, order_guid, selection } of selections) {
                  await supabase.from('toast_selections').insert({
                    selection_guid: selection.guid,
                    check_guid: check_guid,
                    order_guid: order_guid,
                    snapshot_timestamp: snapshotTimestamp,
                    item_guid: selection.item?.guid || null,
                    item_name:
                      selection.displayName || selection.item?.entityType || 'Unknown Item',
                    item_group_guid: selection.itemGroup?.guid || null,
                    item_group_name: selection.itemGroup?.entityType || null,
                    quantity: selection.quantity || 1,
                    price: (selection.price || 0) * 100, // Convert to cents
                    tax: (selection.tax || 0) * 100,
                    pre_discount_price: (selection.preDiscountPrice || 0) * 100,
                    receipt_line_price: (selection.receiptLinePrice || 0) * 100,
                    display_name: selection.displayName || null,
                    selection_type: selection.selectionType || null,
                    sales_category_guid: selection.salesCategory?.guid || null,
                    sales_category_name: selection.salesCategory?.entityType || null,
                    voided: selection.voided || false,
                    void_date: selection.voidDate || null,
                    void_business_date: selection.voidBusinessDate || null,
                    fulfillment_status: selection.fulfillmentStatus || null,
                    modifiers: selection.modifiers || null,
                    applied_discounts: selection.appliedDiscounts || null,
                  });
                }
              }
            }
          }
        }

        allOrders = allOrders.concat(orders);

        // Continue if we got a full page
        if (orders.length === 100) {
          page++;
        } else {
          hasMore = false;
        }
      } catch (error) {
        console.log(`\n❌ Error on page ${page}:`, error.message);
        break;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 SYNC COMPLETE - AUGUST 10, 2025');
    console.log('='.repeat(80));
    console.log(`Total Pages Processed: ${page}`);
    console.log(`Total Orders: ${allOrders.length}`);
    console.log(`Total Checks: ${checkCount}`);
    console.log(`Saved Checks: ${savedCount}`);
    console.log(`Total Revenue: $${totalRevenue.toFixed(2)}`);
    console.log(`Total Selections: ${selectionCount}`);
    console.log('='.repeat(80));

    // Verify in database
    console.log('\nVerifying database...');
    const { count: dbOrders } = await supabase
      .from('toast_orders')
      .select('*', { count: 'exact', head: true })
      .eq('business_date', parseInt(businessDate));

    const { data: dbChecks } = await supabase
      .from('toast_checks')
      .select('total_amount, voided')
      .gte('created_date', startOfDay)
      .lt('created_date', endOfDay);

    let dbRevenue = 0;
    let dbNonVoidedChecks = 0;
    if (dbChecks) {
      for (const check of dbChecks) {
        if (!check.voided) {
          dbRevenue += check.total_amount || 0;
          dbNonVoidedChecks++;
        }
      }
    }

    console.log(`Orders in database: ${dbOrders}`);
    console.log(`Checks in database: ${dbChecks?.length || 0}`);
    console.log(`Non-voided checks: ${dbNonVoidedChecks}`);
    console.log(`Database revenue: $${dbRevenue.toFixed(2)}`);

    if (dbRevenue !== totalRevenue) {
      console.log('\n⚠️  WARNING: Database revenue does not match calculated revenue!');
      console.log(`Calculated: $${totalRevenue.toFixed(2)}`);
      console.log(`In Database: $${dbRevenue.toFixed(2)}`);
    }

    console.log('\n✅ Sync complete! The AI should now report accurate revenue for August 10.');
  } catch (error) {
    console.log('\n❌ Sync failed:', error.message);
  }
}

syncAug10Complete().catch(console.error);
