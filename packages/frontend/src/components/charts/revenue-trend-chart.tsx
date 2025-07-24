import React from 'react';
import { 
  LineChart, 
  Line, 
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  Brush
} from 'recharts';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';

interface RevenueTrendData {
  date: string;
  revenue: number;
  forecast?: number;
  lastYear?: number;
  transactions: number;
}

interface RevenueTrendChartProps {
  data: RevenueTrendData[];
  showForecast?: boolean;
  showComparison?: boolean;
  height?: number;
  showBrush?: boolean;
  averageRevenue?: number;
  targetRevenue?: number;
}

export function RevenueTrendChart({
  data,
  showForecast = false,
  showComparison = false,
  height = 400,
  showBrush = true,
  averageRevenue,
  targetRevenue,
}: RevenueTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <Info className="w-4 h-4 mr-2" />
        No revenue data available
      </div>
    );
  }

  // Calculate trend
  const recentData = data.slice(-7);
  const previousData = data.slice(-14, -7);
  const recentAvg = recentData.reduce((sum, d) => sum + d.revenue, 0) / recentData.length;
  const previousAvg = previousData.length > 0 
    ? previousData.reduce((sum, d) => sum + d.revenue, 0) / previousData.length 
    : recentAvg;
  const trendPercentage = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-900">{formatDate(label)}</p>
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
                  {formatCurrency(entry.value)}
                </span>
              </div>
            ))}
          </div>
          {payload[0]?.payload?.transactions && (
            <p className="text-xs text-gray-500 mt-2">
              {payload[0].payload.transactions} transactions
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      {/* Trend Summary */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
          <p className="text-sm text-gray-600">Daily revenue performance</p>
        </div>
        <div className="flex items-center gap-2">
          {trendPercentage > 0 ? (
            <TrendingUp className="w-5 h-5 text-success-600" />
          ) : (
            <TrendingDown className="w-5 h-5 text-danger-600" />
          )}
          <span className={`text-sm font-medium ${trendPercentage > 0 ? 'text-success-600' : 'text-danger-600'}`}>
            {Math.abs(trendPercentage).toFixed(1)}% vs last week
          </span>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart 
          data={data} 
          margin={{ top: 5, right: 30, left: 20, bottom: showBrush ? 80 : 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            stroke="#6b7280"
            fontSize={12}
          />
          <YAxis 
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            stroke="#6b7280"
            fontSize={12}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
          />
          
          {/* Reference lines */}
          {averageRevenue && (
            <ReferenceLine 
              y={averageRevenue} 
              stroke="#6b7280" 
              strokeDasharray="5 5"
              label={{ value: "Average", position: "right", fill: "#6b7280", fontSize: 12 }}
            />
          )}
          {targetRevenue && (
            <ReferenceLine 
              y={targetRevenue} 
              stroke="#10b981" 
              strokeDasharray="5 5"
              label={{ value: "Target", position: "right", fill: "#10b981", fontSize: 12 }}
            />
          )}
          
          {/* Main revenue line */}
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#3b82f6"
            strokeWidth={3}
            name="Revenue"
            dot={{ fill: '#3b82f6', r: 4 }}
            activeDot={{ r: 6 }}
          />
          
          {/* Last year comparison */}
          {showComparison && (
            <Line
              type="monotone"
              dataKey="lastYear"
              stroke="#9ca3af"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Last Year"
              dot={false}
            />
          )}
          
          {/* Forecast */}
          {showForecast && (
            <Line
              type="monotone"
              dataKey="forecast"
              stroke="#8b5cf6"
              strokeWidth={2}
              strokeDasharray="3 3"
              name="Forecast"
              dot={false}
            />
          )}
          
          {/* Brush for zooming */}
          {showBrush && data.length > 7 && (
            <Brush 
              dataKey="date" 
              height={30} 
              stroke="#3b82f6"
              tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* Legend info */}
      <div className="mt-4 flex gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-gray-400" style={{ borderTop: '2px dashed #6b7280' }} />
          <span>Reference lines</span>
        </div>
        {showBrush && data.length > 7 && (
          <div className="flex items-center gap-2">
            <Info className="w-3 h-3" />
            <span>Drag the bottom slider to zoom</span>
          </div>
        )}
      </div>
    </div>
  );
}