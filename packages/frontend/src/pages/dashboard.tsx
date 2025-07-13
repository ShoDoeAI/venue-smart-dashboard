import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  ShoppingCart,
  Ticket,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatNumber, formatPercent } from '../lib/utils';
import { supabase } from '../lib/supabase';

interface DailySummary {
  summary_date: string;
  total_revenue: number;
  transaction_count: number;
  average_transaction: number;
  unique_customers: number;
  total_tickets_sold: number | null;
}

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ElementType;
  trend: 'up' | 'down';
}

function MetricCard({ title, value, change, icon: Icon, trend }: MetricCardProps) {
  const isPositive = trend === 'up';
  const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight;
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={`p-2 rounded-lg ${isPositive ? 'bg-green-50' : 'bg-red-50'}`}>
            <Icon className={`h-6 w-6 ${isPositive ? 'text-green-600' : 'text-red-600'}`} />
          </div>
        </div>
        <div className={`flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          <TrendIcon className="h-4 w-4 mr-1" />
          {formatPercent(Math.abs(change))}
        </div>
      </div>
      <div className="mt-4">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: dailySummaries = [], isLoading } = useQuery({
    queryKey: ['dailySummaries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_summaries')
        .select('*')
        .order('summary_date', { ascending: false })
        .limit(30);
      
      if (error) throw error;
      return data as DailySummary[];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Calculate metrics
  const today = dailySummaries[0];
  const yesterday = dailySummaries[1];
  const lastWeek = dailySummaries.slice(0, 7);
  const previousWeek = dailySummaries.slice(7, 14);

  const todayRevenue = today?.total_revenue || 0;
  const yesterdayRevenue = yesterday?.total_revenue || 0;
  const revenueChange = yesterdayRevenue > 0 
    ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 
    : 0;

  const todayTransactions = today?.transaction_count || 0;
  const yesterdayTransactions = yesterday?.transaction_count || 0;
  const transactionChange = yesterdayTransactions > 0 
    ? ((todayTransactions - yesterdayTransactions) / yesterdayTransactions) * 100 
    : 0;

  const weekRevenue = lastWeek.reduce((sum, day) => sum + (day?.total_revenue || 0), 0);
  const prevWeekRevenue = previousWeek.reduce((sum, day) => sum + (day?.total_revenue || 0), 0);

  const avgTicket = today?.average_transaction || 0;
  const yesterdayAvgTicket = yesterday?.average_transaction || 0;
  const avgTicketChange = yesterdayAvgTicket > 0 
    ? ((avgTicket - yesterdayAvgTicket) / yesterdayAvgTicket) * 100 
    : 0;

  const todayTickets = today?.total_tickets_sold || 0;
  const yesterdayTickets = yesterday?.total_tickets_sold || 0;
  const ticketsChange = yesterdayTickets > 0 
    ? ((todayTickets - yesterdayTickets) / yesterdayTickets) * 100 
    : 0;

  // Prepare chart data
  const revenueChartData = dailySummaries.slice(0, 14).reverse().map(day => ({
    date: new Date(day.summary_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: day.total_revenue / 100,
    transactions: day.transaction_count,
  }));

  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    revenue: Math.random() * 5000 + 1000,
    customers: Math.floor(Math.random() * 50 + 10),
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back!</h1>
        <p className="text-gray-600 mt-1">Here's what's happening with your venue today.</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <MetricCard
          title="Today's Revenue"
          value={formatCurrency(todayRevenue / 100)}
          change={revenueChange}
          icon={DollarSign}
          trend={revenueChange >= 0 ? 'up' : 'down'}
        />
        <MetricCard
          title="Tickets Sold"
          value={formatNumber(todayTickets)}
          change={ticketsChange}
          icon={Ticket}
          trend={ticketsChange >= 0 ? 'up' : 'down'}
        />
        <MetricCard
          title="Transactions"
          value={formatNumber(todayTransactions)}
          change={transactionChange}
          icon={ShoppingCart}
          trend={transactionChange >= 0 ? 'up' : 'down'}
        />
        <MetricCard
          title="Average Ticket"
          value={formatCurrency(avgTicket / 100)}
          change={avgTicketChange}
          icon={TrendingUp}
          trend={avgTicketChange >= 0 ? 'up' : 'down'}
        />
        <MetricCard
          title="Customers Today"
          value={formatNumber(today?.unique_customers || 0)}
          change={12.5}
          icon={Users}
          trend="up"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.375rem' }}
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly Performance */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Hourly Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.375rem' }}
              />
              <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">New reservation for 6 people</p>
                <p className="text-xs text-gray-500">2 minutes ago</p>
              </div>
            </div>
            <span className="text-sm text-gray-600">Table 12</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">Payment processed</p>
                <p className="text-xs text-gray-500">5 minutes ago</p>
              </div>
            </div>
            <span className="text-sm font-medium text-gray-900">$142.50</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">New event booking confirmed</p>
                <p className="text-xs text-gray-500">15 minutes ago</p>
              </div>
            </div>
            <span className="text-sm text-gray-600">Dec 28</span>
          </div>
        </div>
      </div>
    </div>
  );
}