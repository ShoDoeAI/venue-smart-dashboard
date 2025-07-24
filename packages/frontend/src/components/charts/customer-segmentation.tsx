import React from 'react';
import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';
import { Users, DollarSign, ShoppingCart, Clock, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CustomerSegment {
  name: string;
  count: number;
  revenue: number;
  avgOrderValue: number;
  frequency: number;
  lastVisit?: string;
  growth?: number;
}

interface SegmentMetrics {
  metric: string;
  vip: number;
  regular: number;
  occasional: number;
  new: number;
}

interface CustomerSegmentationProps {
  segments: CustomerSegment[];
  view?: 'overview' | 'metrics' | 'distribution';
  height?: number;
}

const SEGMENT_COLORS = {
  VIP: '#8b5cf6',
  Regular: '#3b82f6',
  Occasional: '#10b981',
  New: '#f59e0b',
  'At Risk': '#ef4444',
};

export function CustomerSegmentation({
  segments,
  view = 'overview',
  height = 400,
}: CustomerSegmentationProps) {
  if (!segments || segments.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <Info className="w-4 h-4 mr-2" />
        No customer data available
      </div>
    );
  }

  // Calculate totals
  const totalCustomers = segments.reduce((sum, s) => sum + s.count, 0);
  const totalRevenue = segments.reduce((sum, s) => sum + s.revenue, 0);

  // Prepare data for radar chart
  const radarData: SegmentMetrics[] = [
    {
      metric: 'Avg Order',
      vip: segments.find(s => s.name === 'VIP')?.avgOrderValue || 0,
      regular: segments.find(s => s.name === 'Regular')?.avgOrderValue || 0,
      occasional: segments.find(s => s.name === 'Occasional')?.avgOrderValue || 0,
      new: segments.find(s => s.name === 'New')?.avgOrderValue || 0,
    },
    {
      metric: 'Frequency',
      vip: segments.find(s => s.name === 'VIP')?.frequency || 0,
      regular: segments.find(s => s.name === 'Regular')?.frequency || 0,
      occasional: segments.find(s => s.name === 'Occasional')?.frequency || 0,
      new: segments.find(s => s.name === 'New')?.frequency || 0,
    },
    {
      metric: 'Revenue Share',
      vip: ((segments.find(s => s.name === 'VIP')?.revenue || 0) / totalRevenue) * 100,
      regular: ((segments.find(s => s.name === 'Regular')?.revenue || 0) / totalRevenue) * 100,
      occasional: ((segments.find(s => s.name === 'Occasional')?.revenue || 0) / totalRevenue) * 100,
      new: ((segments.find(s => s.name === 'New')?.revenue || 0) / totalRevenue) * 100,
    },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <div className="mt-2 space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm text-gray-600">{entry.name}:</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {entry.dataKey === 'revenue' ? `$${entry.value.toLocaleString()}` : entry.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  if (view === 'overview') {
    return (
      <div className="w-full">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Customer Segmentation</h3>
          <p className="text-sm text-gray-600">Understanding your customer base</p>
        </div>

        {/* Segment Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {segments.map((segment) => {
            const percentage = (segment.count / totalCustomers) * 100;
            const revenuePercentage = (segment.revenue / totalRevenue) * 100;
            
            return (
              <div key={segment.name} className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{segment.name}</h4>
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: SEGMENT_COLORS[segment.name as keyof typeof SEGMENT_COLORS] }}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-2xl font-bold">{segment.count}</span>
                    <span className="text-sm text-gray-500">({percentage.toFixed(0)}%)</span>
                  </div>
                  
                  <div className="text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Revenue:</span>
                      <span className="font-medium">${(segment.revenue / 1000).toFixed(0)}k</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Avg Order:</span>
                      <span className="font-medium">${segment.avgOrderValue.toFixed(0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Frequency:</span>
                      <span className="font-medium">{segment.frequency.toFixed(1)}x/mo</span>
                    </div>
                  </div>
                  
                  {segment.growth !== undefined && (
                    <div className={cn(
                      'text-xs font-medium pt-2 border-t border-gray-100',
                      segment.growth > 0 ? 'text-success-600' : 'text-danger-600'
                    )}>
                      {segment.growth > 0 ? '+' : ''}{segment.growth.toFixed(0)}% growth
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Revenue Distribution */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Revenue Contribution</h4>
          <div className="space-y-2">
            {segments.map((segment) => {
              const percentage = (segment.revenue / totalRevenue) * 100;
              return (
                <div key={segment.name} className="flex items-center gap-3">
                  <div className="w-20 text-sm font-medium">{segment.name}</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                    <div 
                      className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: SEGMENT_COLORS[segment.name as keyof typeof SEGMENT_COLORS]
                      }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-16 text-right text-sm text-gray-600">
                    ${(segment.revenue / 1000).toFixed(0)}k
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'metrics') {
    return (
      <div className="w-full">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Segment Comparison</h3>
          <p className="text-sm text-gray-600">Key metrics across customer segments</p>
        </div>

        <ResponsiveContainer width="100%" height={height}>
          <RadarChart data={radarData}>
            <PolarGrid strokeDasharray="3 3" />
            <PolarAngleAxis dataKey="metric" />
            <PolarRadiusAxis angle={90} domain={[0, 'auto']} />
            <Radar
              name="VIP"
              dataKey="vip"
              stroke={SEGMENT_COLORS.VIP}
              fill={SEGMENT_COLORS.VIP}
              fillOpacity={0.3}
            />
            <Radar
              name="Regular"
              dataKey="regular"
              stroke={SEGMENT_COLORS.Regular}
              fill={SEGMENT_COLORS.Regular}
              fillOpacity={0.3}
            />
            <Radar
              name="Occasional"
              dataKey="occasional"
              stroke={SEGMENT_COLORS.Occasional}
              fill={SEGMENT_COLORS.Occasional}
              fillOpacity={0.3}
            />
            <Radar
              name="New"
              dataKey="new"
              stroke={SEGMENT_COLORS.New}
              fill={SEGMENT_COLORS.New}
              fillOpacity={0.3}
            />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Distribution view
  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Customer Distribution</h3>
        <p className="text-sm text-gray-600">Customer count and revenue by segment</p>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <BarChart 
          data={segments}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" />
          <YAxis yAxisId="left" orientation="left" stroke="#6b7280" />
          <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar yAxisId="left" dataKey="count" name="Customers" fill="#3b82f6">
            {segments.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={SEGMENT_COLORS[entry.name as keyof typeof SEGMENT_COLORS]} />
            ))}
          </Bar>
          <Bar yAxisId="right" dataKey="revenue" name="Revenue ($)" fill="#10b981" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}