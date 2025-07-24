# 🔍 Debugging Wrong Revenue Totals

## Quick Checks:

### 1. What the AI Currently Uses:
The AI chat.js calculates revenue using:
```javascript
// Line 71 in chat.js
const amount = check.totalAmount || 0;
analysis.totalRevenue += amount;

// Later converts from cents at line 156
analysis.totalRevenue = analysis.totalRevenue / 100;
```

This SHOULD give correct totals including tax and tips.

### 2. Common Issues:

**Issue 1: Double Counting**
- AI might be counting both orders AND checks
- Each order can have multiple checks
- Solution: Only sum check.totalAmount

**Issue 2: Wrong Field**
- `check.amount` = subtotal (no tax/tips)
- `check.totalAmount` = total (includes everything)
- `check.payments[].amount` = what customer paid

**Issue 3: Time Zone**
- Toast uses restaurant's time zone
- API might use UTC
- Weekend data might be off by a day

**Issue 4: Void/Refunded Orders**
- Negative amounts not handled
- Voided orders still counted
- Check for order.voided flag

## Manual Verification:

### Step 1: Check One Day
Ask the AI: "What was our revenue on [specific date]?"
Then check that exact date in Toast reports.

### Step 2: Check Raw Data
Look at the actual API response:
- Visit: https://venue-smart-dashboard.vercel.app/api/dashboard
- Check the "last7Days" revenue number
- Compare to Toast's 7-day report

### Step 3: Check Specific Order
Ask the AI: "Show me order details for last Saturday"
See if it's counting orders correctly.

## Likely Fix:

The AI might be including voided orders or counting wrong fields. Update chat.js line 67-72 to:

```javascript
orders.forEach(order => {
  // Skip voided orders
  if (order.voided || order.deleted) return;
  
  if (order.checks && Array.isArray(order.checks)) {
    order.checks.forEach(check => {
      // Skip voided checks
      if (check.voided || check.deleted) return;
      
      // Use totalAmount for accurate total
      const amount = check.totalAmount || 0;
      analysis.totalRevenue += amount;
```

## Questions:

1. Is the AI revenue always higher or lower than actual?
2. Is it off by a consistent percentage?
3. Does it match if you exclude tips?
4. Are refunds/voids common at your restaurant?