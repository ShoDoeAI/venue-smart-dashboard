import type { VercelRequest, VercelResponse } from '@vercel/node';

// Mock data that matches the dashboard structure
const mockDashboardData = {
  success: true,
  snapshot: {
    venue_id: 'default-venue-id',
    created_at: new Date().toISOString(),
    api_data: {
      toast: {
        success: true,
        data: {
          location: {
            name: "Jack's on Water Street",
            id: "bfb355cb-55e4-4f57-af16-d0d18c11ad3c"
          },
          menus: [
            { name: "Beer", guid: "07351f5f-dc4b-4788-90e8-e7968759ce79" },
            { name: "Cocktails", guid: "7b81d1d5-33f2-4a92-a357-3add0f52ddb7" },
            { name: "Wine", guid: "630680c7-8f7b-4675-9bd9-f951106839a7" }
          ]
        }
      }
    }
  },
  kpis: {
    revenueMetrics: {
      current: 15420,
      lastPeriod: 14200,
      growth: 8.6
    },
    attendanceMetrics: {
      current: 342,
      capacity: 500,
      utilizationRate: 68.4
    },
    transactionMetrics: {
      count: 156,
      avgAmount: 98.85
    },
    eventMetrics: {
      ticketsSoldToday: 0
    },
    upcomingEvents: []
  },
  alerts: [
    {
      id: '1',
      type: 'revenue_target',
      severity: 'medium',
      title: 'Revenue tracking 15% above target',
      message: 'Current revenue $15,420 vs target $13,400',
      value: 15420,
      threshold: 13400,
      source: 'toast',
      action_suggestions: [
        {
          action: 'Optimize staffing',
          description: 'Consider adding extra staff for peak hours'
        }
      ]
    }
  ],
  lastUpdated: new Date().toISOString()
};

// Generate hourly data for charts
function generateHourlyData() {
  const hours = [];
  const currentHour = new Date().getHours();
  
  for (let i = 0; i < 24; i++) {
    if (i <= currentHour) {
      hours.push({
        hour: `${i}:00`,
        revenue: Math.floor(Math.random() * 2000) + 500,
        transactions: Math.floor(Math.random() * 20) + 5
      });
    } else {
      hours.push({
        hour: `${i}:00`,
        revenue: 0,
        transactions: 0
      });
    }
  }
  
  return hours;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Add hourly data
  const responseData = {
    ...mockDashboardData,
    hourlyData: generateHourlyData(),
    categoryBreakdown: [
      { name: 'Beer', value: 5420, percentage: 35.2 },
      { name: 'Cocktails', value: 4380, percentage: 28.4 },
      { name: 'Wine', value: 3200, percentage: 20.8 },
      { name: 'Food', value: 2420, percentage: 15.7 }
    ]
  };

  return res.status(200).json(responseData);
}