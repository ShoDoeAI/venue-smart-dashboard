# Dashboard Testing Guide

## 🌐 Access Your Dashboard

### Live Dashboard URL:
```
https://venue-smart-dashboard.vercel.app
```

### AI Assistant with Historical Data:
```
https://venue-smart-dashboard.vercel.app/ai
```

## 🧪 Testing Historical Features

### 1. Main Dashboard (Real-time Data)
- Navigate to: https://venue-smart-dashboard.vercel.app
- Shows today's metrics and real-time updates
- Current revenue, transactions, and trends

### 2. AI Assistant (Historical Queries)
- Navigate to: https://venue-smart-dashboard.vercel.app/ai
- Test these queries:

#### Revenue Queries:
- "What was yesterday's revenue?"
- "Show me last week's performance"
- "How much did we make in July?"
- "What was our best day last month?"

#### Comparison Queries:
- "Compare this week to last week"
- "How does today compare to our 30-day average?"
- "Show me weekend vs weekday revenue"
- "What's our growth trend?"

#### Specific Date Queries:
- "What was the revenue on July 4th?"
- "Show me last Friday's performance"
- "How did we do on the 4th of July weekend?"

#### Analysis Queries:
- "What are our peak hours?"
- "Which days are typically busiest?"
- "Show me our top revenue days"
- "Analyze last month's performance"

### 3. Visual Dashboard Features

The dashboard includes:
- **Revenue Chart**: Hourly breakdown with historical overlay
- **Transaction Metrics**: Current vs historical average
- **Trend Indicators**: Up/down arrows showing growth
- **Alert System**: Notifications for unusual patterns

## 📊 Historical Data Available

Your dashboard now has access to:
- ✅ 2 years of Toast POS transaction data
- ✅ Daily, weekly, and monthly aggregations
- ✅ Customer and revenue analytics
- ✅ Trend analysis and comparisons

## 🔍 What to Look For

1. **In the Chat**:
   - Blue "Historical Query" indicator when asking about past dates
   - Specific revenue amounts and percentages
   - Detailed breakdowns and insights

2. **On the Dashboard**:
   - Real-time metrics updating every 30 seconds
   - Historical comparisons in metric cards
   - Trend lines in charts

## 💡 Pro Tips

1. **Be Specific**: "Show me revenue for July 15-20" works better than "recent revenue"
2. **Ask for Insights**: "Why was last Tuesday slow?" or "What drove yesterday's high revenue?"
3. **Compare Periods**: "How does this July compare to last July?"
4. **Action-Oriented**: "What should I do to improve weekday revenue?"

## 🚀 Quick Test Checklist

- [ ] Open the main dashboard
- [ ] Navigate to AI Assistant (/ai)
- [ ] Ask about yesterday's revenue
- [ ] Ask about last week's performance
- [ ] Try a specific date query
- [ ] Ask for a comparison or trend
- [ ] Request actionable insights

## 📱 Mobile Testing

The dashboard is responsive! Test on your phone:
1. Open in mobile browser
2. Check that charts resize properly
3. Test the AI chat on mobile
4. Verify touch interactions work

## 🐛 Troubleshooting

If you see:
- **"No data available"**: The time period might not have data yet
- **"Error loading"**: Refresh the page
- **Slow responses**: Historical queries may take 2-3 seconds

## 🎯 Next Steps

Once you've tested:
1. Save frequently used queries
2. Set up custom alerts
3. Export reports for meetings
4. Share insights with your team

---

Ready to explore your venue's data? Start at: https://venue-smart-dashboard.vercel.app/ai