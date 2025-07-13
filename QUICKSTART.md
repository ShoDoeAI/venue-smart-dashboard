# VenueSync Quick Start Guide

Get your smart venue dashboard up and running in 15 minutes! 🚀

## What is VenueSync?

VenueSync is an AI-powered dashboard that integrates your venue's systems:
- **Toast POS** - Sales and transaction data
- **Eventbrite** - Event ticketing and management  
- **OpenDate.io** - Reservations and table management
- **Claude AI** - Intelligent insights and recommendations

## Prerequisites

- Node.js 18+ installed
- API accounts for Toast, Eventbrite, and OpenDate.io
- Supabase account (free tier works)
- Anthropic API key for Claude

## 5-Minute Setup

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/venue-smart-dashboard.git
cd venue-smart-dashboard
npm install -g pnpm
pnpm install
```

### 2. Configure Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the SQL migrations:

```sql
-- Copy contents from packages/backend/supabase/migrations/
-- Run in Supabase SQL editor
```

### 3. Set Environment Variables

Create `.env` files:

**Backend** (`packages/backend/.env`):
```env
SUPABASE_URL=your_project_url
SUPABASE_SERVICE_KEY=your_service_key
TOAST_CLIENT_ID=your_toast_id
TOAST_CLIENT_SECRET=your_toast_secret
EVENTBRITE_PRIVATE_TOKEN=your_eventbrite_token
ANTHROPIC_API_KEY=your_claude_key
```

**Frontend** (`packages/frontend/.env`):
```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 4. Start Development Servers

```bash
# Terminal 1 - Backend
cd packages/backend
pnpm dev

# Terminal 2 - Frontend
cd packages/frontend
pnpm dev
```

### 5. Open Dashboard

Visit [http://localhost:5173](http://localhost:5173) 🎉

## First Time Setup

### 1. Connect Your Services

The dashboard will guide you through connecting:
- Toast POS (requires restaurant GUID)
- Eventbrite (organization ID needed)
- OpenDate.io (OAuth flow)

### 2. Initial Data Sync

Click "Sync Now" to fetch your first data:
- Past 30 days of transactions
- Active events and tickets
- Today's reservations

### 3. Explore Your Dashboard

**Key Metrics:**
- Today's Revenue
- Tickets Sold
- Transaction Count
- Average Ticket Size
- Customer Count

**AI Features:**
- Ask questions in natural language
- Get daily insights and recommendations
- Automated action suggestions

## Common Use Cases

### Daily Operations

```
"Hey Claude, how are we doing today compared to last Tuesday?"
"What's our busiest hour so far?"
"Any tables still available for tonight?"
```

### Revenue Optimization

```
"Which menu items are underperforming?"
"Should we add more tables for the 7pm slot?"
"What's our optimal event capacity based on past data?"
```

### Event Management

```
"How are ticket sales for this weekend's event?"
"What's our typical no-show rate?"
"Should we release more tickets?"
```

## Keyboard Shortcuts

- `Cmd/Ctrl + K` - Quick search
- `Cmd/Ctrl + /` - Open AI assistant
- `R` - Refresh data
- `D` - Go to dashboard
- `A` - Go to analytics

## Mobile Access

The dashboard is fully responsive. Access it from any device:
- Save to home screen for app-like experience
- Touch-optimized interface
- Real-time updates on the go

## Troubleshooting

### No Data Showing?

1. Check API credentials in Settings
2. Click "Sync Now" to manually fetch
3. Verify services are connected (green status)

### AI Not Responding?

1. Check Anthropic API key
2. Ensure you have credits
3. Try refreshing the page

### Slow Performance?

1. Check internet connection
2. Reduce date range in analytics
3. Clear browser cache

## Pro Tips 💡

1. **Schedule Reports**: Set up daily AI summaries
2. **Custom Alerts**: Get notified of important changes
3. **Export Data**: Download CSV for detailed analysis
4. **Team Access**: Invite staff with role-based permissions
5. **API Webhooks**: Real-time updates from your services

## Getting Help

- 📚 [Full Documentation](README.md)
- 🧪 [Testing Guide](TESTING.md)
- 🚀 [Deployment Guide](DEPLOYMENT.md)
- 💬 [GitHub Issues](https://github.com/yourusername/venue-smart-dashboard/issues)
- 📧 Email: support@venuesync.com

## What's Next?

1. **Customize**: Adjust KPIs for your venue type
2. **Integrate**: Add more services (Square, Resy, etc.)
3. **Automate**: Set up AI-powered actions
4. **Scale**: Deploy to production with Vercel

---

Welcome to smarter venue management! 🎯