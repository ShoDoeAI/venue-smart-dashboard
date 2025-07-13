# VenueSync Dashboard Preview

## Layout Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🔷 VenueSync                                            Last sync: 3:45 PM ● │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  📊 Dashboard    Welcome back!                                          │
│  📈 Analytics    Here's what's happening with your venue today.        │
│  💬 AI Assistant                                                        │
│  ⚡ Actions      ┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│  📅 Events       │ 💵 Today's  │ 🎫 Tickets  │ 🛒 Trans-   │ 📈 Average  │ 👥 Customers│
│  👥 Customers    │   Revenue   │    Sold     │   actions   │   Ticket    │    Today    │
│  📊 Activity     │             │             │             │             │             │
│  ⚙️ Settings     │  $12,543    │    245      │    189      │   $66.35    │     156     │
│                  │  ↗ 12.5%    │  ↗ 8.3%     │  ↗ 5.2%     │  ↗ 3.1%     │  ↗ 12.5%    │
│  John Doe        └─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
│  Venue Manager                                                          │
│                  ┌─────────────────────────────┬─────────────────────────────┐
│                  │      Revenue Trend          │   Today's Hourly Performance │
│                  │                             │                             │
│                  │   $15k ┌──────────────┐    │    $6k ┌─┬─┬─┬─┬─┬─┬─┬─┐   │
│                  │        │              /     │        │ │ │ │ │ │ │ │ │   │
│                  │   $10k │          ___/      │    $4k │ │ │ │ │ │ │ │ │   │
│                  │        │      ___/          │        │ │ │ │ │ │ │ │ │   │
│                  │    $5k │  ___/              │    $2k │ │ │ │ │ │ │ │ │   │
│                  │        └──────────────┘     │        └─┴─┴─┴─┴─┴─┴─┴─┘   │
│                  │   Dec 1      Dec 7    Dec 14│    9AM  12PM  3PM  6PM  9PM │
│                  └─────────────────────────────┴─────────────────────────────┘
│                                                                         │
│                  ┌─────────────────────────────────────────────────────┐
│                  │  Recent Activity                                     │
│                  │                                                      │
│                  │  🟢 New reservation for 6 people    2 min ago  Table 12 │
│                  │  🔵 Payment processed               5 min ago  $142.50  │
│                  │  🟣 New event booking confirmed    15 min ago  Dec 28   │
│                  └─────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. **Navigation Sidebar** (Left)
- Logo and brand name
- 8 navigation items with icons
- User profile section at bottom
- Active page highlighted in blue

### 2. **Top Bar**
- Current page title
- Real-time sync status with timestamp
- Green pulsing indicator for live connection

### 3. **Metric Cards** (5 cards)
- **Today's Revenue**: Total revenue with percentage change
- **Tickets Sold**: Number of event tickets sold
- **Transactions**: Total POS transactions
- **Average Ticket**: Average transaction value
- **Customers Today**: Unique customer count
- Each card shows:
  - Colored icon (green for positive, red for negative trends)
  - Current value in large text
  - Percentage change with trend arrow

### 4. **Charts Section**
- **Revenue Trend**: 14-day line chart showing daily revenue
- **Today's Hourly Performance**: Bar chart showing hourly revenue distribution

### 5. **Recent Activity Feed**
- Real-time updates of venue activities
- Color-coded indicators for different event types
- Timestamps and relevant details

## Color Scheme
- **Primary Blue**: #3B82F6 (navigation, links)
- **Success Green**: #10B981 (positive trends)
- **Error Red**: #EF4444 (negative trends)
- **Background**: #F9FAFB (gray-50)
- **Card Background**: White with gray borders

## Responsive Design
- Mobile: Single column layout
- Tablet: 2 columns for metrics, stacked charts
- Desktop: Full 5-column metrics, side-by-side charts

The dashboard auto-refreshes every minute to show the latest data from your integrated systems (Toast POS, Eventbrite, OpenDate.io).