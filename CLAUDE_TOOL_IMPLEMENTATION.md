# Claude Revenue Tool Implementation Plan

## Problem Statement
The current AI chat implementation pre-fetches data and passes it as context to Claude, which is failing for certain date queries like "July 2025". This is due to complex date parsing logic and data aggregation issues.

## Solution Overview
Implement a tool-based approach where Claude can directly query the database based on user requests, eliminating the need for complex pre-fetching and date parsing logic.

## Implementation Steps Completed

### 1. Created Revenue Query Tool
- **File**: `packages/backend/src/services/claude-revenue-tool.ts`
- **Features**:
  - Natural language date parsing (today, yesterday, last week, July 2025, etc.)
  - Direct database queries to `revenue_overrides` and `toast_checks` tables
  - Returns structured data with daily breakdowns and insights
  - Proper error handling and logging

### 2. Updated Claude AI Service
- **File**: `packages/backend/src/services/claude-ai.ts`
- **Changes**:
  - Added `processMessageWithTools` method for tool-enabled queries
  - Integrated revenue tool with Claude's tool calling API
  - Handles tool execution and response formatting

### 3. Created New API Endpoint
- **File**: `packages/backend/api/chat-tools.ts`
- **Purpose**: New endpoint for testing tool-based approach
- **Features**:
  - Uses `processMessageWithTools` instead of pre-fetching context
  - Simplified flow without complex date parsing
  - CORS support and error handling

### 4. Updated Frontend API Client
- **File**: `packages/frontend/src/services/api.ts`
- **Changes**:
  - Added URL parameter support to switch between endpoints
  - Use `?tools=true` in URL to test new endpoint

## Testing Instructions

### Local Testing
1. Start the development server:
   ```bash
   pnpm dev
   ```

2. Navigate to the AI chat with tools enabled:
   ```
   http://localhost:5173/ai?tools=true
   ```

3. Test problematic queries:
   - "What was the revenue for July 2025?"
   - "Show me last weekend's sales"
   - "Revenue for August 1st to August 10th"

### Production Testing
1. Deploy the changes:
   ```bash
   git add .
   git commit -m "feat: implement Claude revenue query tool for accurate date handling"
   git push
   ```

2. After deployment, test at:
   ```
   https://your-app.vercel.app/ai?tools=true
   ```

3. Compare results with the regular endpoint (without `?tools=true`)

## Benefits of Tool-Based Approach

1. **Accuracy**: Direct database queries ensure accurate data retrieval
2. **Simplicity**: Eliminates complex date parsing and context building
3. **Flexibility**: Easy to add new query types without API changes
4. **Performance**: Reduces token usage by not sending large context objects
5. **Debugging**: Clearer data flow and easier to trace issues

## Migration Strategy

1. **Phase 1**: Parallel testing with `?tools=true` parameter
2. **Phase 2**: A/B testing with percentage of users
3. **Phase 3**: Full migration after validation
4. **Phase 4**: Remove old context-based code

## Next Steps

1. Test thoroughly with various date formats
2. Monitor Vercel logs for any errors
3. Add more tools (menu analysis, customer insights, etc.)
4. Update documentation
5. Remove old date parsing logic once validated

## Potential Improvements

1. Add caching for frequently requested date ranges
2. Implement rate limiting for database queries
3. Add more sophisticated date parsing patterns
4. Create tools for other data types (events, customers, etc.)
5. Add tool usage analytics

## Troubleshooting

### Debug Logs
Look for these log prefixes in Vercel:
- `[CHAT-TOOLS]` - API endpoint logs
- `[CLAUDE TOOLS]` - Claude AI service logs
- `[Revenue Tool]` - Tool execution logs

### Common Issues
1. **No tool execution**: Check if query contains revenue-related keywords
2. **Database errors**: Verify Supabase connection and permissions
3. **Wrong dates**: Check timezone handling in date parsing
4. **Missing data**: Verify revenue_overrides table has data

## Rollback Plan
If issues arise, simply remove `?tools=true` from the URL to use the original endpoint.