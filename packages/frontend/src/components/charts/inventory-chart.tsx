import React from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine,
  Legend,
  ComposedChart,
  Area
} from 'recharts';
import { Package, TrendingDown, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  optimalStock: number;
  reorderPoint: number;
  unit: string;
  lastUpdated: string;
  trend: number; // percentage change
  variance: number; // actual vs expected
}

interface InventoryChartProps {
  items: InventoryItem[];
  view: 'stock-levels' | 'variance' | 'reorder';
  onItemClick?: (item: InventoryItem) => void;
}

export function InventoryChart({ items, view, onItemClick }: InventoryChartProps) {
  // Prepare data based on view
  const chartData = items.map(item => {
    const stockPercentage = (item.currentStock / item.optimalStock) * 100;
    const needsReorder = item.currentStock <= item.reorderPoint;
    
    return {
      name: item.name,
      current: item.currentStock,
      optimal: item.optimalStock,
      reorder: item.reorderPoint,
      percentage: stockPercentage,
      variance: item.variance,
      trend: item.trend,
      status: needsReorder ? 'critical' : stockPercentage < 50 ? 'warning' : 'good',
      needsReorder
    };
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'good': return '#10b981';
      default: return '#6b7280';
    }
  };

  if (view === 'stock-levels') {
    return (
      <div className="w-full h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Stock Levels</h3>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-brand-500 rounded" />
              <span className="text-gray-600">Current Stock</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-300 rounded" />
              <span className="text-gray-600">Optimal Level</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-0.5 h-3 bg-danger-500" />
              <span className="text-gray-600">Reorder Point</span>
            </div>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              label={{ value: 'Quantity', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (!active || !payload || !payload[0]) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                    <p className="font-medium text-gray-900">{data.name}</p>
                    <div className="mt-1 space-y-1 text-sm">
                      <p className="text-gray-600">
                        Current: <span className="font-medium text-gray-900">{data.current}</span>
                      </p>
                      <p className="text-gray-600">
                        Optimal: <span className="font-medium text-gray-900">{data.optimal}</span>
                      </p>
                      <p className="text-gray-600">
                        Status: <span className={cn(
                          "font-medium",
                          data.status === 'critical' ? 'text-danger-600' :
                          data.status === 'warning' ? 'text-warning-600' :
                          'text-success-600'
                        )}>{data.status}</span>
                      </p>
                    </div>
                  </div>
                );
              }}
            />
            <Bar 
              dataKey="current" 
              fill="#3b82f6" 
              radius={[4, 4, 0, 0]}
              onClick={(data) => onItemClick?.(items.find(i => i.name === data.name)!)}
              cursor="pointer"
            />
            <Bar 
              dataKey="optimal" 
              fill="#e5e7eb" 
              radius={[4, 4, 0, 0]}
            />
            {chartData.map((item, index) => (
              <ReferenceLine 
                key={index}
                x={item.name} 
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="5 5"
                y={item.reorder}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>

        {/* Items needing reorder */}
        {chartData.filter(item => item.needsReorder).length > 0 && (
          <div className="mt-4 p-3 bg-danger-50 rounded-lg">
            <div className="flex items-center gap-2 text-danger-700">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">
                {chartData.filter(item => item.needsReorder).length} items need reordering
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view === 'variance') {
    const varianceData = chartData.map(item => ({
      ...item,
      positiveVariance: item.variance > 0 ? item.variance : 0,
      negativeVariance: item.variance < 0 ? item.variance : 0
    }));

    return (
      <div className="w-full h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Stock Variance Trends</h3>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-success-500 rounded" />
              <span className="text-gray-600">Overstocked</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-danger-500 rounded" />
              <span className="text-gray-600">Understocked</span>
            </div>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={varianceData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              label={{ value: 'Variance %', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              formatter={(value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`}
            />
            <ReferenceLine y={0} stroke="#6b7280" />
            <Bar 
              dataKey="positiveVariance" 
              fill="#10b981" 
              radius={[4, 4, 0, 0]}
              cursor="pointer"
              onClick={(data) => onItemClick?.(items.find(i => i.name === data.name)!)}
            />
            <Bar 
              dataKey="negativeVariance" 
              fill="#ef4444" 
              radius={[0, 0, 4, 4]}
              cursor="pointer"
              onClick={(data) => onItemClick?.(items.find(i => i.name === data.name)!)}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Reorder points view
  return (
    <div className="w-full h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Reorder Analysis</h3>
        <div className="text-sm text-gray-600">
          Items approaching reorder point
        </div>
      </div>
      
      <div className="space-y-3">
        {chartData
          .sort((a, b) => a.percentage - b.percentage)
          .slice(0, 10)
          .map((item, index) => {
            const urgency = item.needsReorder ? 'critical' : 
                          item.percentage < 30 ? 'high' : 
                          item.percentage < 50 ? 'medium' : 'low';
            
            return (
              <div 
                key={index}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onItemClick?.(items.find(i => i.name === item.name)!)}
              >
                <div className="flex items-center gap-3">
                  <Package className={cn(
                    "w-5 h-5",
                    urgency === 'critical' ? 'text-danger-600' :
                    urgency === 'high' ? 'text-warning-600' :
                    urgency === 'medium' ? 'text-blue-600' :
                    'text-gray-400'
                  )} />
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-600">
                      {item.current} / {item.optimal} units
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={cn(
                    "text-sm font-medium",
                    urgency === 'critical' ? 'text-danger-600' :
                    urgency === 'high' ? 'text-warning-600' :
                    urgency === 'medium' ? 'text-blue-600' :
                    'text-gray-600'
                  )}>
                    {item.percentage.toFixed(0)}% stocked
                  </div>
                  {item.needsReorder && (
                    <p className="text-xs text-danger-600 mt-1">Reorder now</p>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}