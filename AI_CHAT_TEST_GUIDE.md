# AI Chat Testing Guide

## Overview
This guide provides comprehensive test scenarios to ensure the AI chat is working effectively with accurate data and helpful insights.

## Test URL
https://venue-smart-dashboard.vercel.app/ai

## Test Categories

### 1. Data Accuracy Tests
Test that the AI has accurate access to your venue data.

#### Test 1.1: Basic Data Query
**Input:** "How much revenue did we generate today?"
**Expected:** 
- Should provide today's revenue from Toast POS
- Should mention it's demo data from "Jack's on Water Street"
- Should break down by payment types if available

#### Test 1.2: Historical Data
**Input:** "What was our revenue last week compared to this week?"
**Expected:**
- Should calculate weekly totals
- Should show comparison and growth rate
- Should identify trends

#### Test 1.3: Specific Metrics
**Input:** "What's our average transaction value?"
**Expected:**
- Should calculate from Toast payment data
- Should provide context (good/bad/average)
- Should suggest improvements if low

### 2. Insight Generation Tests
Test the AI's ability to provide valuable insights.

#### Test 2.1: Pattern Recognition
**Input:** "What are our busiest hours?"
**Expected:**
- Should analyze hourly transaction data
- Should identify peak hours
- Should suggest staffing optimizations

#### Test 2.2: Customer Insights
**Input:** "Tell me about our customer behavior"
**Expected:**
- Should analyze transaction patterns
- Should identify repeat customers if data available
- Should suggest customer retention strategies

#### Test 2.3: Performance Analysis
**Input:** "How is our business performing?"
**Expected:**
- Should provide multi-metric overview
- Should identify strengths and weaknesses
- Should compare to historical performance

### 3. Action Suggestion Tests
Test the AI's ability to suggest actionable improvements.

#### Test 3.1: Revenue Optimization
**Input:** "How can we increase revenue?"
**Expected:**
- Should analyze current performance
- Should suggest specific actions (pricing, promotions, etc.)
- Should prioritize suggestions by impact

#### Test 3.2: Problem Solving
**Input:** "Our sales are down today, what should we do?"
**Expected:**
- Should analyze the drop
- Should identify potential causes
- Should suggest immediate actions

#### Test 3.3: Strategic Planning
**Input:** "What should we focus on this month?"
**Expected:**
- Should analyze trends and opportunities
- Should provide prioritized recommendations
- Should align with venue goals

### 4. Alert and Anomaly Tests
Test the AI's ability to identify and explain issues.

#### Test 4.1: Alert Context
**Input:** "What alerts do we have?"
**Expected:**
- Should list active alerts
- Should explain each alert's significance
- Should suggest resolutions

#### Test 4.2: Anomaly Detection
**Input:** "Is anything unusual happening today?"
**Expected:**
- Should compare to historical patterns
- Should identify anomalies
- Should provide context

### 5. Conversation Context Tests
Test the AI's ability to maintain context.

#### Test 5.1: Follow-up Questions
**First Input:** "What's our revenue today?"
**Second Input:** "How does that compare to yesterday?"
**Expected:**
- Should remember the context of revenue
- Should provide the comparison without re-asking

#### Test 5.2: Multi-turn Analysis
**Conversation:**
1. "Show me top selling items"
2. "Why is the first one so popular?"
3. "Should we promote it more?"
**Expected:**
- Should maintain context throughout
- Should provide progressively deeper insights

### 6. Error Handling Tests
Test how the AI handles edge cases.

#### Test 6.1: Missing Data
**Input:** "What's our Instagram engagement rate?"
**Expected:**
- Should acknowledge lack of Meta integration
- Should suggest how to add it
- Should not make up data

#### Test 6.2: Ambiguous Queries
**Input:** "How are we doing?"
**Expected:**
- Should ask for clarification or provide comprehensive overview
- Should not fail or give irrelevant response

#### Test 6.3: Future Predictions
**Input:** "What will revenue be next month?"
**Expected:**
- Should acknowledge limitations
- Should provide trend-based estimates if possible
- Should caveat appropriately

### 7. Template Tests
Test the pre-built analysis templates.

#### Test 7.1: Daily Summary
**Click:** "Daily Summary" template
**Expected:**
- Comprehensive overview of today's performance
- Key metrics and comparisons
- Action items for tomorrow

#### Test 7.2: Revenue Analysis
**Click:** "Revenue Analysis" template
**Expected:**
- Detailed revenue breakdown
- Trends and patterns
- Optimization opportunities

### 8. Performance Tests

#### Test 8.1: Response Time
**Measure:** Time from query to response
**Expected:** < 5 seconds for standard queries

#### Test 8.2: Large Data Queries
**Input:** "Analyze our performance for the last 30 days"
**Expected:**
- Should handle without timeout
- Should provide comprehensive analysis

## Testing Checklist

- [ ] All data queries return accurate information
- [ ] Historical comparisons work correctly
- [ ] Insights are relevant and actionable
- [ ] Action suggestions are specific and feasible
- [ ] Conversation context is maintained
- [ ] Error handling is graceful
- [ ] Response times are acceptable
- [ ] Templates provide valuable analysis

## Common Issues to Check

1. **Data Freshness**
   - Is the AI using the latest data?
   - Are sync timestamps accurate?

2. **Context Window**
   - Can it access historical data (2 years)?
   - Does it maintain conversation context?

3. **Action Feasibility**
   - Are suggested actions actually possible?
   - Do they align with the APIs available?

4. **Response Quality**
   - Are responses concise yet comprehensive?
   - Is the tone appropriate for business users?

## Debugging Commands

If issues arise, test these:

1. **Check data access:**
   "What data sources do you have access to?"

2. **Verify time range:**
   "What's the oldest data you can see?"

3. **Test calculation accuracy:**
   "Calculate total revenue for [specific date]"

4. **Verify venue context:**
   "What venue am I looking at?"

## Success Criteria

The AI chat is working properly when:
- ✅ Accurately reports venue metrics
- ✅ Provides actionable insights
- ✅ Maintains conversation context
- ✅ Handles errors gracefully
- ✅ Responds within 5 seconds
- ✅ Suggests relevant actions
- ✅ Acknowledges data limitations