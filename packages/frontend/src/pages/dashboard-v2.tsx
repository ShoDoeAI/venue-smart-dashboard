import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  DollarSign, 
  ShoppingCart,
  Ticket,
  AlertCircle,
  Calendar,
  RefreshCw,
  Download
} from 'lucide-react';
import { MetricCard } from '../components/kpi/metric-card';
import { dashboardApi, alertsApi } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AttendanceChart } from '../components/charts/attendance-chart';
import { InventoryChart } from '../components/charts/inventory-chart';
import { DateRangeSelector, DateRange, PRESET_RANGES } from '../components/common/date-range-selector';
import { RevenueTrendChart } from '../components/charts/revenue-trend-chart';
import { HeatMap } from '../components/charts/heat-map';
import { CustomerSegmentation } from '../components/charts/customer-segmentation';
import { InteractiveTooltip } from '../components/common/interactive-tooltip';
import { DrillDownModal } from '../components/common/drill-down-modal';
import { useExport } from '../hooks/use-export';
import { cn } from '../lib/utils';

interface Alert {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  message: string;
  created_at: string;
  action_suggestions?: Array<{ action: string }>;
}

interface Event {
  eventId: string;
  name: string;
  startDate: string;
  source: string;
  ticketsSold: number;
  capacity: number;
}

interface DashboardData {
  success: boolean;
  snapshot?: any;
  kpis?: {
    revenueMetrics?: {
      current: number;
      lastPeriod: number;
      growth: number;
    };
    attendanceMetrics?: {
      current: number;
      capacity: number;
      utilizationRate: number;
    };
    transactionMetrics?: {
      count: number;
      avgAmount: number;
    };
    eventMetrics?: {
      ticketsSoldToday: number;
    };
    upcomingEvents?: Event[];
  };
  alerts?: Alert[];
  hourlyData?: Array<{ hour: string; revenue: number; transactions: number }>;
  categoryBreakdown?: Array<{ name: string; value: number; percentage: number }>;
}

export default function DashboardV2() {
  const [inventoryView, setInventoryView] = useState<'stock-levels' | 'variance' | 'reorder'>('stock-levels');
  const [dateRange, setDateRange] = useState<DateRange>(PRESET_RANGES.today);
  const [customerView, setCustomerView] = useState<'overview' | 'metrics' | 'distribution'>('overview');
  const [drillDownModal, setDrillDownModal] = useState<{ isOpen: boolean; title: string; data: any }>({ isOpen: false, title: '', data: null });
  const { exportToCSV } = useExport();
  
  // Fetch dashboard data with date range
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard', dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: () => dashboardApi.getDashboard({
      startDate: dateRange.start.toISOString(),
      endDate: dateRange.end.toISOString(),
    }),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch alerts
  const { data: alertsData } = useQuery({
    queryKey: ['alerts'],
    queryFn: alertsApi.getAlerts,
    refetchInterval: 60000, // Refresh every minute
  });

  const kpis = dashboardData?.kpis;
  const activeAlerts = (alertsData?.alerts || []) as Alert[];
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

  // Use real API data
  const hourlyRevenue = (dashboardData as any)?.kpis?.hourlyBreakdown?.map((hour: any) => ({
    hour: `${hour.hour}:00`,
    revenue: hour.revenue,
    transactions: hour.transactions
  })) || [];
  
  const categoryColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
  const categoryBreakdown = (dashboardData?.categoryBreakdown?.map((cat: { name: string; value: number; percentage: number }, index: number) => ({
    ...cat,
    color: categoryColors[index % categoryColors.length]
  })) || []) as Array<{ name: string; value: number; percentage: number; color: string }>;

  // Mock attendance data (would come from real API)
  const attendanceData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - 29 + i);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const hasEvent = Math.random() > 0.7 && isWeekend;
    
    return {
      date: date.toISOString().split('T')[0],
      attendance: Math.floor(Math.random() * 200 + (isWeekend ? 300 : 150)),
      capacity: 500,
      events: hasEvent ? [{
        name: `Live Music Night ${i}`,
        type: 'music',
        attendance: Math.floor(Math.random() * 100 + 200)
      }] : undefined
    };
  });

  // Generate revenue trend data
  const generateRevenueTrendData = () => {
    const days = dateRange.label === 'Today' ? 1 : 
                 dateRange.label === 'Yesterday' ? 1 :
                 dateRange.label === 'Last 7 Days' ? 7 :
                 dateRange.label === 'Last 30 Days' ? 30 : 30;
    
    return Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const baseRevenue = isWeekend ? 8000 : 5000;
      
      return {
        date: date.toISOString().split('T')[0],
        revenue: baseRevenue + Math.random() * 2000 - 1000,
        transactions: Math.floor(100 + Math.random() * 50),
        lastYear: baseRevenue * 0.9 + Math.random() * 1500 - 750,
      };
    });
  };

  // Generate heat map data
  const generateHeatMapData = () => {
    const data = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (const day of days) {
      for (let hour = 0; hour < 24; hour++) {
        const isWeekend = day === 'Fri' || day === 'Sat';
        const isPeakHour = (hour >= 12 && hour <= 14) || (hour >= 18 && hour <= 21);
        const baseValue = isPeakHour ? (isWeekend ? 800 : 500) : (isWeekend ? 300 : 200);
        
        data.push({
          day,
          hour,
          value: Math.floor(baseValue + Math.random() * 200),
        });
      }
    }
    
    return data;
  };

  // Generate customer segments
  const generateCustomerSegments = () => {
    return [
      {
        name: 'VIP',
        count: 245,
        revenue: 125000,
        avgOrderValue: 85,
        frequency: 4.2,
        growth: 12.5,
      },
      {
        name: 'Regular',
        count: 580,
        revenue: 180000,
        avgOrderValue: 52,
        frequency: 2.8,
        growth: 5.3,
      },
      {
        name: 'Occasional',
        count: 920,
        revenue: 110000,
        avgOrderValue: 38,
        frequency: 1.2,
        growth: -2.1,
      },
      {
        name: 'New',
        count: 320,
        revenue: 45000,
        avgOrderValue: 42,
        frequency: 0.8,
        growth: 18.7,
      },
    ];
  };

  // Mock inventory data (would come from real API)
  const inventoryItems = [
    { id: '1', name: 'House Beer', category: 'Drinks', currentStock: 120, optimalStock: 200, reorderPoint: 50, unit: 'bottles', lastUpdated: new Date().toISOString(), trend: -5.2, variance: -40 },
    { id: '2', name: 'Premium Vodka', category: 'Drinks', currentStock: 45, optimalStock: 60, reorderPoint: 20, unit: 'bottles', lastUpdated: new Date().toISOString(), trend: -8.1, variance: -25 },
    { id: '3', name: 'Burger Patties', category: 'Food', currentStock: 80, optimalStock: 150, reorderPoint: 40, unit: 'units', lastUpdated: new Date().toISOString(), trend: -12.3, variance: -46.7 },
    { id: '4', name: 'French Fries', category: 'Food', currentStock: 25, optimalStock: 40, reorderPoint: 15, unit: 'kg', lastUpdated: new Date().toISOString(), trend: -15.0, variance: -37.5 },
    { id: '5', name: 'Napkins', category: 'Supplies', currentStock: 3000, optimalStock: 2500, reorderPoint: 1000, unit: 'units', lastUpdated: new Date().toISOString(), trend: 2.1, variance: 20 },
    { id: '6', name: 'Coffee Beans', category: 'Drinks', currentStock: 8, optimalStock: 20, reorderPoint: 10, unit: 'kg', lastUpdated: new Date().toISOString(), trend: -20.0, variance: -60 },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time venue performance metrics</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Date Range Selector */}
          <DateRangeSelector
            value={dateRange}
            onChange={setDateRange}
          />
          
          {/* Alert Summary */}
          {activeAlerts.length > 0 && (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          className="cursor-pointer transition-transform hover:scale-105"
          onClick={() => setDrillDownModal({
            isOpen: true,
            title: "Revenue Details",
            data: {
              summary: {
                todayRevenue: kpis?.revenueMetrics?.current || 0,
                yesterdayRevenue: (kpis?.revenueMetrics?.current || 0) * 0.9,
                weekTotal: (kpis?.revenueMetrics?.current || 0) * 6.5,
                monthTotal: (kpis?.revenueMetrics?.current || 0) * 28,
              },
              trends: {
                todayRevenue: kpis?.revenueMetrics?.growth || 0,
                weekTotal: 8.3,
                monthTotal: 12.7,
              },
              details: hourlyRevenue
            }
          })}
        >
          <InteractiveTooltip content="Click for detailed revenue breakdown">
            <div>
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
            </div>
          </InteractiveTooltip>
        </div>
        
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Today&apos;s Hourly Performance</h3>
            <button
              onClick={() => exportToCSV(hourlyRevenue, { filename: 'hourly-revenue' })}
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 rounded-md hover:bg-gray-100 transition-colors"
            >
              <Download className="w-4 h-4 inline mr-1" />
              Export
            </button>
          </div>
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

      {/* Attendance & Inventory Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Chart */}
        <div className="card p-6">
          <AttendanceChart 
            data={attendanceData}
            showEvents={true}
            showCapacityLine={true}
            showTrend={true}
          />
        </div>

        {/* Inventory Chart */}
        <div className="card p-6">
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Inventory Management</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setInventoryView('stock-levels')}
                  className={cn(
                    "px-3 py-1 text-sm rounded-md transition-colors",
                    inventoryView === 'stock-levels' 
                      ? "bg-brand-50 text-brand-700 font-medium" 
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  Stock Levels
                </button>
                <button
                  onClick={() => setInventoryView('variance')}
                  className={cn(
                    "px-3 py-1 text-sm rounded-md transition-colors",
                    inventoryView === 'variance' 
                      ? "bg-brand-50 text-brand-700 font-medium" 
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  Variance
                </button>
                <button
                  onClick={() => setInventoryView('reorder')}
                  className={cn(
                    "px-3 py-1 text-sm rounded-md transition-colors",
                    inventoryView === 'reorder' 
                      ? "bg-brand-50 text-brand-700 font-medium" 
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  Reorder
                </button>
              </div>
            </div>
          </div>
          <InventoryChart 
            items={inventoryItems}
            view={inventoryView}
            onItemClick={(_item) => {/* Handle item click */}}
          />
        </div>
      </div>

      {/* New Visualizations Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="card p-6">
          <RevenueTrendChart
            data={generateRevenueTrendData()}
            showForecast={false}
            showComparison={false}
            height={350}
            showBrush={dateRange.label !== 'Today' && dateRange.label !== 'Yesterday'}
          />
        </div>

        {/* Heat Map */}
        <div className="card p-6">
          <HeatMap
            data={generateHeatMapData()}
            title="Peak Hours Analysis"
            subtitle="Revenue distribution by day and hour"
            metric="revenue"
            showLabels={false}
            height={350}
          />
        </div>
      </div>

      {/* Customer Segmentation */}
      <div className="card p-6">
        <div className="mb-4 flex justify-end">
          <div className="flex gap-2">
            <button
              onClick={() => setCustomerView('overview')}
              className={cn(
                "px-3 py-1 text-sm rounded-md transition-colors",
                customerView === 'overview' 
                  ? "bg-brand-50 text-brand-700 font-medium" 
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              Overview
            </button>
            <button
              onClick={() => setCustomerView('metrics')}
              className={cn(
                "px-3 py-1 text-sm rounded-md transition-colors",
                customerView === 'metrics' 
                  ? "bg-brand-50 text-brand-700 font-medium" 
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              Metrics
            </button>
            <button
              onClick={() => setCustomerView('distribution')}
              className={cn(
                "px-3 py-1 text-sm rounded-md transition-colors",
                customerView === 'distribution' 
                  ? "bg-brand-50 text-brand-700 font-medium" 
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              Distribution
            </button>
          </div>
        </div>
        <CustomerSegmentation
          segments={generateCustomerSegments()}
          view={customerView}
          height={400}
        />
      </div>

      {/* Upcoming Events */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Upcoming Events</h3>
          <Calendar className="w-5 h-5 text-gray-400" />
        </div>
        <div className="space-y-4">
          {(kpis?.upcomingEvents as Event[] | undefined)?.slice(0, 3).map((event) => (
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

      {/* Drill Down Modal */}
      <DrillDownModal
        isOpen={drillDownModal.isOpen}
        onClose={() => setDrillDownModal({ isOpen: false, title: '', data: null })}
        title={drillDownModal.title}
        data={drillDownModal.data}
      />
    </div>
  );
}

