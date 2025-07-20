import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  ShoppingCart,
  Ticket,
  AlertCircle,
  Activity,
  Calendar
} from 'lucide-react';
import { MetricCard } from '../components/kpi/metric-card';
import { dashboardApi, alertsApi } from '../services/api';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function DashboardV2() {
  // Fetch dashboard data
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.getDashboard,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch alerts
  const { data: alertsData } = useQuery({
    queryKey: ['alerts'],
    queryFn: alertsApi.getAlerts,
    refetchInterval: 60000, // Refresh every minute
  });

  const kpis = dashboardData?.kpis;
  const activeAlerts = alertsData?.alerts || [];
  const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
  const highAlerts = activeAlerts.filter(a => a.severity === 'high');

  // Generate trend data
  const generateTrend = (base: number, variance: number = 0.2) => {
    return Array.from({ length: 7 }, () => 
      base * (1 + (Math.random() - 0.5) * variance)
    );
  };

  if (isDashboardLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Mock data for visualization (would come from real API)
  const hourlyRevenue = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    revenue: Math.random() * 5000 + 1000,
    transactions: Math.floor(Math.random() * 50 + 10),
  }));

  const categoryBreakdown = [
    { name: 'Food', value: 45, color: '#3b82f6' },
    { name: 'Drinks', value: 30, color: '#10b981' },
    { name: 'Events', value: 15, color: '#f59e0b' },
    { name: 'Other', value: 10, color: '#8b5cf6' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time venue performance metrics</p>
        </div>
        
        {/* Alert Summary */}
        {activeAlerts.length > 0 && (
          <div className="flex items-center gap-4">
            {criticalAlerts.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-danger-50 text-danger-700 rounded-full">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">{criticalAlerts.length} Critical</span>
              </div>
            )}
            {highAlerts.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-warning-50 text-warning-700 rounded-full">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">{highAlerts.length} High</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Today's Revenue"
          value={kpis?.revenueMetrics?.current || 0}
          change={kpis?.revenueMetrics?.growth || 0}
          changeLabel="vs yesterday"
          icon={<DollarSign className="w-5 h-5" />}
          format="currency"
          trend={generateTrend(5000)}
          loading={isDashboardLoading}
        />
        
        <MetricCard
          title="Active Customers"
          value={kpis?.attendanceMetrics?.current || 0}
          change={12.5}
          changeLabel="vs last hour"
          icon={<Users className="w-5 h-5" />}
          format="number"
          trend={generateTrend(150, 0.3)}
          loading={isDashboardLoading}
        />
        
        <MetricCard
          title="Avg Transaction"
          value={kpis?.transactionMetrics?.avgAmount || 0}
          change={-2.3}
          changeLabel="vs yesterday"
          icon={<ShoppingCart className="w-5 h-5" />}
          format="currency"
          trend={generateTrend(45)}
          loading={isDashboardLoading}
        />
        
        <MetricCard
          title="Tickets Sold Today"
          value={kpis?.eventMetrics?.ticketsSoldToday || 0}
          change={25.0}
          changeLabel="vs yesterday"
          icon={<Ticket className="w-5 h-5" />}
          format="number"
          trend={generateTrend(80, 0.4)}
          loading={isDashboardLoading}
        />
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Active Alerts</h2>
            <span className="text-sm text-gray-500">{activeAlerts.length} total</span>
          </div>
          <div className="space-y-3">
            {activeAlerts.slice(0, 3).map((alert) => (
              <div 
                key={alert.id} 
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg',
                  alert.severity === 'critical' ? 'bg-danger-50' :
                  alert.severity === 'high' ? 'bg-warning-50' :
                  'bg-gray-50'
                )}
              >
                <AlertCircle className={cn(
                  'w-5 h-5 mt-0.5',
                  alert.severity === 'critical' ? 'text-danger-600' :
                  alert.severity === 'high' ? 'text-warning-600' :
                  'text-gray-600'
                )} />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{alert.title}</p>
                  <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                  {alert.action_suggestions && alert.action_suggestions.length > 0 && (
                    <div className="mt-2 flex gap-2">
                      {alert.action_suggestions.slice(0, 2).map((action, idx) => (
                        <button
                          key={idx}
                          className="text-xs px-2 py-1 bg-white rounded border border-gray-200 hover:bg-gray-50"
                        >
                          {action.action}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hourly Revenue */}
        <div className="lg:col-span-2 card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Hourly Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hourlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip 
                formatter={(value: number) => [`$${value.toFixed(0)}`, 'Revenue']}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '0.375rem' 
                }}
              />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryBreakdown}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {categoryBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => `${value}%`}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '0.375rem' 
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {categoryBreakdown.map((category) => (
              <div key={category.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-sm text-gray-600">{category.name}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{category.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Upcoming Events</h3>
          <Calendar className="w-5 h-5 text-gray-400" />
        </div>
        <div className="space-y-4">
          {kpis?.upcomingEvents?.slice(0, 3).map((event: any) => (
            <div key={event.eventId} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <div>
                <p className="font-medium text-gray-900">{event.name}</p>
                <p className="text-sm text-gray-500">
                  {new Date(event.startDate).toLocaleDateString()} • {event.source}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">
                  {event.ticketsSold}/{event.capacity}
                </p>
                <p className="text-sm text-gray-500">
                  {((event.ticketsSold / event.capacity) * 100).toFixed(0)}% sold
                </p>
              </div>
            </div>
          )) || (
            <p className="text-gray-500 text-center py-4">No upcoming events</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function (add to utils if not exists)
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}