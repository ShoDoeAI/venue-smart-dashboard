require('dotenv').config({ path: '.env.local' });
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Toast credentials
const TOAST_CLIENT_ID = process.env.TOAST_CLIENT_ID || 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7';
const TOAST_CLIENT_SECRET = process.env.TOAST_CLIENT_SECRET || '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4';
const TOAST_LOCATION_ID = process.env.TOAST_LOCATION_ID || 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';

async function getToastToken() {
  const response = await axios.post(
    'https://ws-api.toasttab.com/authentication/v1/authentication/login',
    {
      clientId: TOAST_CLIENT_ID,
      clientSecret: TOAST_CLIENT_SECRET,
      userAccessType: 'TOAST_MACHINE_CLIENT',
    }
  );
  return response.data.token.accessToken;
}

async function fetchRestaurantInfo(token) {
  try {
    const headers = {
      Authorization: `Bearer ${token}`,
      'Toast-Restaurant-External-ID': TOAST_LOCATION_ID,
    };
    
    const response = await axios.get(
      `https://ws-api.toasttab.com/restaurants/v1/restaurants/${TOAST_LOCATION_ID}`,
      { headers }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error fetching restaurant info:', error.message);
    return null;
  }
}

async function syncToastComprehensive() {
  console.log('🔄 Starting Comprehensive Toast Data Sync to Supabase\n');
  
  try {
    // Step 1: Authenticate with Toast
    console.log('1️⃣ Authenticating with Toast...');
    const token = await getToastToken();
    console.log('   ✅ Toast authentication successful');
    
    // Step 2: Get restaurant info
    console.log('\n2️⃣ Fetching restaurant information...');
    const restaurantInfo = await fetchRestaurantInfo(token);
    if (restaurantInfo) {
      console.log(`   ✅ Restaurant: ${restaurantInfo.name}`);
      
      // Store restaurant info
      const { error: restaurantError } = await supabase
        .from('toast_restaurant_info')
        .upsert({
          restaurant_guid: restaurantInfo.guid,
          location_guid: TOAST_LOCATION_ID,
          name: restaurantInfo.name,
          location_name: restaurantInfo.locationName,
          address1: restaurantInfo.address1,
          address2: restaurantInfo.address2,
          city: restaurantInfo.city,
          state: restaurantInfo.state,
          zip: restaurantInfo.zip,
          country: restaurantInfo.country,
          phone: restaurantInfo.phone,
          website: restaurantInfo.website,
          timezone: restaurantInfo.timezone || 'America/Los_Angeles',
          hours_of_operation: restaurantInfo.hoursOfOperation
        }, { 
          onConflict: 'location_guid' 
        });
      
      if (restaurantError) {
        console.error('   ❌ Error storing restaurant info:', restaurantError.message);
      }
    }
    
    // Step 3: Fetch orders for last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    console.log(`\n3️⃣ Fetching orders from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}...`);
    
    const headers = {
      Authorization: `Bearer ${token}`,
      'Toast-Restaurant-External-ID': TOAST_LOCATION_ID,
    };
    
    const response = await axios.get(
      `https://ws-api.toasttab.com/orders/v2/ordersBulk`,
      {
        headers,
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          pageSize: 10000
        }
      }
    );
    
    const orders = response.data || [];
    console.log(`   ✅ Found ${orders.length} orders`);
    
    // Step 4: Process and store data
    console.log('\n4️⃣ Processing and storing data in new schema...');
    const snapshotTimestamp = new Date().toISOString();
    
    let stats = {
      orders: 0,
      checks: 0,
      payments: 0,
      selections: 0,
      errors: 0
    };
    
    for (const order of orders) {
      try {
        // Store order
        const orderData = {
          snapshot_timestamp: snapshotTimestamp,
          order_guid: order.guid,
          external_id: order.externalId,
          display_number: order.displayNumber,
          order_number: order.orderNumber || order.guid,
          source: order.source,
          business_date: order.businessDate,
          revenue_center_guid: order.revenueCenter?.guid,
          revenue_center_name: order.revenueCenter?.name,
          created_date: order.createdDate,
          modified_date: order.modifiedDate,
          opened_date: order.openedDate,
          closed_date: order.closedDate,
          paid_date: order.paidDate,
          deleted_date: order.deletedDate,
          voided: order.voided || false,
          void_date: order.voidDate,
          void_business_date: order.voidBusinessDate,
          approval_status: order.approvalStatus,
          guest_count: order.guestCount || order.numberOfGuests,
          dining_option_guid: order.diningOption?.guid,
          dining_option_name: order.diningOption?.name,
          server_guid: order.server?.guid,
          server_first_name: order.server?.firstName,
          server_last_name: order.server?.lastName,
          server_external_id: order.server?.externalId,
          location_id: TOAST_LOCATION_ID,
          delivery_info: order.deliveryInfo,
          curbside_pickup_info: order.curbsidePickupInfo
        };
        
        const { error: orderError } = await supabase
          .from('toast_orders')
          .insert(orderData);
        
        if (orderError) throw orderError;
        stats.orders++;
        
        // Process checks
        if (order.checks && Array.isArray(order.checks)) {
          for (const check of order.checks) {
            const checkData = {
              snapshot_timestamp: snapshotTimestamp,
              check_guid: check.guid,
              order_guid: order.guid,
              tab_name: check.tabName,
              amount: check.amount || 0,
              tax_amount: check.taxAmount || 0,
              tip_amount: check.tipAmount || 0,
              total_amount: check.totalAmount || 0,
              applied_discount_amount: check.appliedDiscountAmount || 0,
              created_date: check.createdDate,
              opened_date: check.openedDate,
              closed_date: check.closedDate,
              voided: check.voided || false,
              void_date: check.voidDate,
              payment_status: check.paymentStatus,
              customer_guid: check.customer?.guid,
              customer_first_name: check.customer?.firstName,
              customer_last_name: check.customer?.lastName,
              customer_phone: check.customer?.phone,
              customer_email: check.customer?.email,
              customer_company_name: check.customer?.companyName,
              applied_service_charges: check.appliedServiceCharges,
              applied_discounts: check.appliedDiscounts
            };
            
            const { error: checkError } = await supabase
              .from('toast_checks')
              .insert(checkData);
            
            if (checkError) throw checkError;
            stats.checks++;
            
            // Process payments
            if (check.payments && Array.isArray(check.payments)) {
              for (const payment of check.payments) {
                const paymentData = {
                  snapshot_timestamp: snapshotTimestamp,
                  payment_guid: payment.guid,
                  check_guid: check.guid,
                  order_guid: order.guid,
                  amount: payment.amount || 0,
                  tip_amount: payment.tipAmount || 0,
                  amount_tendered: payment.amountTendered,
                  type: payment.type,
                  card_type: payment.cardType,
                  last_4_digits: payment.last4Digits,
                  external_payment_guid: payment.externalPaymentGuid,
                  paid_date: payment.paidDate,
                  paid_business_date: payment.paidBusinessDate,
                  house: payment.house || false,
                  refund_status: payment.refundStatus,
                  voided: payment.voidInfo ? true : false,
                  void_date: payment.voidInfo?.voidDate,
                  void_user_guid: payment.voidInfo?.voidUser?.guid,
                  void_user_name: payment.voidInfo?.voidUser ? 
                    `${payment.voidInfo.voidUser.firstName} ${payment.voidInfo.voidUser.lastName}` : null,
                  refund: payment.refund,
                  mca_repayment_amount: payment.mcaRepaymentAmount
                };
                
                const { error: paymentError } = await supabase
                  .from('toast_payments')
                  .insert(paymentData);
                
                if (paymentError) throw paymentError;
                stats.payments++;
              }
            }
            
            // Process selections (menu items)
            if (check.selections && Array.isArray(check.selections)) {
              for (const selection of check.selections) {
                const selectionData = {
                  snapshot_timestamp: snapshotTimestamp,
                  selection_guid: selection.guid,
                  check_guid: check.guid,
                  order_guid: order.guid,
                  item_guid: selection.item.guid,
                  item_name: selection.item.name,
                  item_group_guid: selection.itemGroup?.guid,
                  item_group_name: selection.itemGroup?.name,
                  quantity: selection.quantity,
                  price: selection.price,
                  tax: selection.tax,
                  pre_discount_price: selection.preDiscountPrice,
                  receipt_line_price: selection.receiptLinePrice,
                  display_name: selection.displayName,
                  selection_type: selection.selectionType,
                  sales_category_guid: selection.salesCategory?.guid,
                  sales_category_name: selection.salesCategory?.name,
                  voided: selection.voided || false,
                  void_date: selection.voidDate,
                  void_business_date: selection.voidBusinessDate,
                  void_reason_guid: selection.voidReason?.guid,
                  void_reason_name: selection.voidReason?.name,
                  fulfillment_status: selection.fulfillmentStatus,
                  deferred_price: selection.deferredPrice,
                  modifiers: selection.modifiers,
                  applied_discounts: selection.appliedDiscounts,
                  refund_details: selection.refundDetails
                };
                
                const { error: selectionError } = await supabase
                  .from('toast_selections')
                  .insert(selectionData);
                
                if (selectionError) throw selectionError;
                stats.selections++;
              }
            }
          }
        }
        
      } catch (error) {
        console.error(`   ❌ Error processing order ${order.guid}:`, error.message);
        stats.errors++;
      }
    }
    
    console.log('\n✅ Sync Complete!');
    console.log('   📊 Summary:');
    console.log(`   - Orders: ${stats.orders}`);
    console.log(`   - Checks: ${stats.checks}`);
    console.log(`   - Payments: ${stats.payments}`);
    console.log(`   - Menu Selections: ${stats.selections}`);
    console.log(`   - Errors: ${stats.errors}`);
    
    // Step 5: Calculate revenue metrics
    console.log('\n5️⃣ Calculating revenue metrics...');
    const { data: metrics, error: metricsError } = await supabase
      .rpc('calculate_toast_revenue_metrics', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        location_id_param: TOAST_LOCATION_ID
      });
    
    if (!metricsError && metrics && metrics.length > 0) {
      const m = metrics[0];
      console.log('   💰 Last 30 days metrics:');
      console.log(`   - Total Revenue: $${m.total_revenue}`);
      console.log(`   - Total Orders: ${m.total_orders}`);
      console.log(`   - Average Order Value: $${m.average_order_value}`);
      console.log(`   - Total Tips: $${m.total_tips}`);
      console.log(`   - Total Tax: $${m.total_tax}`);
      console.log(`   - Total Discounts: $${m.total_discounts}`);
    }
    
    console.log('\n✨ Toast data is now in Supabase with the new comprehensive schema!');
    console.log('The dashboard can now query this normalized data for better performance.');
    
  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

// Run the sync
syncToastComprehensive();