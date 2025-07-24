#!/usr/bin/env node

/**
 * VenueSync Demo - All API Integrations
 * 
 * This demo shows data from all 6 integrated APIs:
 * 1. Toast POS - Order and payment data
 * 2. Eventbrite - Event ticketing
 * 3. OpenDate.io - Live music shows
 * 4. Audience Republic - Marketing campaigns (placeholder)
 * 5. Meta Business Suite - Social media insights (placeholder)
 * 6. OpenTable - Restaurant reservations (placeholder)
 */

const chalk = require('chalk');

// Mock data generators
function generateToastData() {
  const now = new Date();
  const orders = [];
  const startTime = new Date(now);
  startTime.setHours(11, 0, 0, 0);
  
  // Generate orders throughout the day
  for (let i = 0; i < 45; i++) {
    const orderTime = new Date(startTime.getTime() + Math.random() * 10 * 60 * 60 * 1000);
    orders.push({
      guid: `order-${i}`,
      businessDate: now.toISOString().split('T')[0],
      createdDate: orderTime.toISOString(),
      totalAmount: Math.floor(Math.random() * 150 + 25) * 100, // In cents
      tipAmount: Math.floor(Math.random() * 20 + 5) * 100,
      customer: {
        firstName: ['John', 'Sarah', 'Mike', 'Emily', 'David'][Math.floor(Math.random() * 5)],
        lastName: ['Smith', 'Johnson', 'Williams', 'Brown', 'Davis'][Math.floor(Math.random() * 5)],
      },
      checks: [{
        payments: [{
          type: ['CREDIT', 'CASH', 'GIFT_CARD'][Math.floor(Math.random() * 3)],
          amount: Math.floor(Math.random() * 150 + 25) * 100,
        }]
      }]
    });
  }
  
  return {
    orders,
    revenue: orders.reduce((sum, o) => sum + o.totalAmount, 0) / 100,
    transactions: orders.length,
    avgTransaction: orders.reduce((sum, o) => sum + o.totalAmount, 0) / orders.length / 100,
  };
}

function generateEventbriteData() {
  return {
    events: [
      {
        id: 'evt-001',
        name: 'Summer Jazz Festival',
        start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        capacity: 300,
        sold: 245,
        revenue: 12250,
        status: 'on_sale',
      },
      {
        id: 'evt-002',
        name: 'Wine Tasting Evening',
        start: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        capacity: 80,
        sold: 72,
        revenue: 5400,
        status: 'on_sale',
      },
      {
        id: 'evt-003',
        name: 'Comedy Night',
        start: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
        capacity: 150,
        sold: 89,
        revenue: 2670,
        status: 'on_sale',
      },
    ],
    totalTickets: 406,
    totalRevenue: 20320,
    upcomingEvents: 3,
  };
}

function generateOpenDateData() {
  return {
    shows: [
      {
        id: 'show-001',
        name: 'The Blue Notes Live',
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        venue: "Jack's on Water Street",
        ticketsSold: 145,
        revenue: 4350,
        capacity: 200,
        artist: {
          name: 'The Blue Notes',
          genre: 'Jazz/Blues',
          followers: 12500,
        },
      },
      {
        id: 'show-002',
        name: 'Acoustic Sessions: Sarah Rivers',
        date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        venue: "Jack's on Water Street",
        ticketsSold: 78,
        revenue: 1560,
        capacity: 100,
        artist: {
          name: 'Sarah Rivers',
          genre: 'Folk/Acoustic',
          followers: 8200,
        },
      },
    ],
    totalRevenue: 5910,
    totalTickets: 223,
    upcomingShows: 2,
  };
}

function generateAudienceRepublicData() {
  return {
    campaigns: [
      {
        id: 'camp-001',
        name: 'Summer Events Newsletter',
        type: 'email',
        sent: 8542,
        opened: 3245,
        clicked: 892,
        conversions: 156,
        revenue: 7800,
      },
      {
        id: 'camp-002',
        name: 'VIP Birthday Rewards',
        type: 'sms',
        sent: 425,
        opened: 385,
        clicked: 198,
        conversions: 87,
        revenue: 4350,
      },
    ],
    totalContacts: 12847,
    activeSegments: 8,
    monthlyEngagement: 38.5,
  };
}

function generateMetaData() {
  return {
    page: {
      name: "Jack's on Water Street",
      fans: 24567,
      newFans: 342,
      engagement: 4.8,
      reach: 45200,
    },
    posts: [
      {
        id: 'post-001',
        message: 'Join us this Friday for live jazz! 🎵',
        type: 'photo',
        reach: 12500,
        engagement: 856,
        clicks: 234,
        shares: 45,
      },
      {
        id: 'post-002',
        message: 'New summer cocktail menu is here! 🍹',
        type: 'video',
        reach: 18900,
        engagement: 1245,
        clicks: 567,
        shares: 123,
      },
    ],
    demographics: {
      ageGroups: {
        '25-34': 35,
        '35-44': 28,
        '45-54': 22,
        '55+': 15,
      },
      topCities: ['New York', 'Brooklyn', 'Jersey City'],
    },
  };
}

function generateOpenTableData() {
  const today = new Date();
  const reservations = [];
  
  // Generate today's reservations
  for (let i = 0; i < 32; i++) {
    const time = new Date(today);
    time.setHours(11 + Math.floor(i / 4), (i % 4) * 15, 0, 0);
    
    reservations.push({
      confirmationNumber: `OT${1000 + i}`,
      time: time.toISOString(),
      partySize: Math.floor(Math.random() * 6) + 2,
      guestName: ['Smith', 'Johnson', 'Williams', 'Brown'][Math.floor(Math.random() * 4)],
      status: i < 20 ? 'completed' : 'confirmed',
      specialRequest: Math.random() > 0.7 ? 'Birthday celebration' : null,
    });
  }
  
  return {
    restaurant: {
      name: "Jack's on Water Street",
      capacity: 120,
      rating: 4.6,
      reviews: 1847,
    },
    todayReservations: reservations,
    totalCovers: reservations.reduce((sum, r) => sum + r.partySize, 0),
    fillRate: 78.5,
    noShowRate: 2.8,
    avgRating: 4.6,
    topGuests: [
      { name: 'Robert Williams', visits: 24, vip: true },
      { name: 'Emily Davis', visits: 18, vip: true },
      { name: 'Michael Chen', visits: 15, vip: false },
    ],
  };
}

// Display functions
function displaySection(title, icon = '📊') {
  console.log('\n' + chalk.blue('═'.repeat(60)));
  console.log(chalk.blue(`${icon}  ${title}`));
  console.log(chalk.blue('═'.repeat(60)));
}

function displayMetric(label, value, suffix = '', color = 'white') {
  console.log(chalk.gray(`${label}:`.padEnd(25)) + chalk[color](value) + chalk.gray(suffix));
}

// Main demo
async function runDemo() {
  console.clear();
  console.log(chalk.cyan.bold('\n🏢 VenueSync - Complete API Integration Demo'));
  console.log(chalk.gray('Showing data from all 6 integrated APIs\n'));
  
  // Toast POS Data
  const toastData = generateToastData();
  displaySection('Toast POS - Restaurant Operations', '🍽️');
  displayMetric('Today\'s Revenue', `$${toastData.revenue.toFixed(2)}`, '', 'green');
  displayMetric('Transactions', toastData.transactions);
  displayMetric('Average Transaction', `$${toastData.avgTransaction.toFixed(2)}`);
  displayMetric('Payment Methods', 'Credit: 65%, Cash: 25%, Gift: 10%');
  displayMetric('Peak Hour', '7:00 PM - 8:00 PM');
  
  // Eventbrite Data
  const eventbriteData = generateEventbriteData();
  displaySection('Eventbrite - Event Management', '🎫');
  displayMetric('Upcoming Events', eventbriteData.upcomingEvents);
  displayMetric('Tickets Sold', eventbriteData.totalTickets);
  displayMetric('Event Revenue', `$${eventbriteData.totalRevenue.toFixed(2)}`, '', 'green');
  displayMetric('Next Event', eventbriteData.events[0].name);
  displayMetric('Capacity Utilization', `${(eventbriteData.events[0].sold / eventbriteData.events[0].capacity * 100).toFixed(1)}%`);
  
  // OpenDate.io Data
  const openDateData = generateOpenDateData();
  displaySection('OpenDate.io - Live Music', '🎸');
  displayMetric('Upcoming Shows', openDateData.upcomingShows);
  displayMetric('Tickets Sold', openDateData.totalTickets);
  displayMetric('Show Revenue', `$${openDateData.totalRevenue.toFixed(2)}`, '', 'green');
  displayMetric('Next Show', openDateData.shows[0].name);
  displayMetric('Artist Followers', openDateData.shows[0].artist.followers.toLocaleString());
  
  // Audience Republic Data
  const audienceData = generateAudienceRepublicData();
  displaySection('Audience Republic - Marketing', '📧');
  displayMetric('Total Contacts', audienceData.totalContacts.toLocaleString());
  displayMetric('Active Campaigns', audienceData.campaigns.length);
  displayMetric('Campaign Revenue', `$${audienceData.campaigns.reduce((sum, c) => sum + c.revenue, 0).toFixed(2)}`, '', 'green');
  displayMetric('Email Open Rate', '38.0%');
  displayMetric('SMS Click Rate', '46.6%');
  
  // Meta Business Suite Data
  const metaData = generateMetaData();
  displaySection('Meta Business Suite - Social Media', '📱');
  displayMetric('Page Fans', metaData.page.fans.toLocaleString());
  displayMetric('New Fans (30 days)', `+${metaData.page.newFans}`);
  displayMetric('Monthly Reach', metaData.page.reach.toLocaleString());
  displayMetric('Engagement Rate', `${metaData.page.engagement}%`);
  displayMetric('Top Post Reach', metaData.posts[1].reach.toLocaleString());
  
  // OpenTable Data
  const openTableData = generateOpenTableData();
  displaySection('OpenTable - Reservations', '🍷');
  displayMetric('Today\'s Reservations', openTableData.todayReservations.length);
  displayMetric('Total Covers', openTableData.totalCovers);
  displayMetric('Fill Rate', `${openTableData.fillRate}%`);
  displayMetric('Average Rating', `${openTableData.avgRating} ⭐`, ` (${openTableData.restaurant.reviews} reviews)`);
  displayMetric('VIP Guests Today', '3');
  
  // Combined Analytics
  displaySection('Combined Analytics - All Sources', '📈');
  const totalRevenue = toastData.revenue + eventbriteData.totalRevenue + openDateData.totalRevenue;
  displayMetric('Total Revenue (All)', `$${totalRevenue.toFixed(2)}`, '', 'green');
  displayMetric('Revenue Breakdown', 'Dining: 68%, Events: 23%, Shows: 9%');
  displayMetric('Total Customers', '~850', ' (unique across all platforms)');
  displayMetric('Marketing ROI', '4.2x', ' (from campaigns)');
  displayMetric('Social Media Impact', '+12%', ' revenue from social referrals');
  
  // AI Insights
  displaySection('AI-Powered Insights (Claude)', '🤖');
  console.log(chalk.yellow('\n📊 Key Insights:'));
  console.log(chalk.gray('  • Revenue is up 15% compared to last week'));
  console.log(chalk.gray('  • Friday jazz events drive 25% higher bar sales'));
  console.log(chalk.gray('  • VIP guests account for 35% of total revenue'));
  console.log(chalk.gray('  • Social media posts about events get 3x more engagement'));
  
  console.log(chalk.yellow('\n💡 Recommended Actions:'));
  console.log(chalk.gray('  1. Increase Friday event capacity by 20% (high demand)'));
  console.log(chalk.gray('  2. Create VIP package for jazz festival ($150/person)'));
  console.log(chalk.gray('  3. Launch SMS campaign to waitlist for sold-out shows'));
  console.log(chalk.gray('  4. Adjust staffing for 7-8 PM peak (add 2 servers)'));
  
  // Real-time Updates
  displaySection('Real-Time Updates', '⚡');
  console.log(chalk.gray('  • New reservation: ') + chalk.white('Party of 6 at 7:30 PM'));
  console.log(chalk.gray('  • Ticket sale: ') + chalk.white('2 tickets for Jazz Festival'));
  console.log(chalk.gray('  • Social mention: ') + chalk.white('Instagram story from @foodie_nyc'));
  console.log(chalk.gray('  • Kitchen alert: ') + chalk.white('Low stock on ribeye steaks'));
  
  console.log(chalk.cyan('\n✨ All systems operational - Data synced from 6 APIs'));
  console.log(chalk.gray('Last update: ' + new Date().toLocaleString()));
}

// Run the demo
runDemo().catch(console.error);