import React from 'react';
import { Info } from 'lucide-react';
import { cn } from '../../lib/utils';

interface HeatMapData {
  hour: number;
  day: string;
  value: number;
  label?: string;
}

interface HeatMapProps {
  data: HeatMapData[];
  title: string;
  subtitle?: string;
  metric?: 'revenue' | 'customers' | 'orders';
  showLabels?: boolean;
  height?: number;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function HeatMap({
  data,
  title,
  subtitle,
  metric = 'revenue',
  showLabels = true,
  height = 300,
}: HeatMapProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <Info className="w-4 h-4 mr-2" />
        No data available
      </div>
    );
  }

  // Create matrix
  const matrix: number[][] = DAYS.map(() => HOURS.map(() => 0));
  const dataMap = new Map<string, number>();
  
  data.forEach(d => {
    const dayIndex = DAYS.indexOf(d.day);
    if (dayIndex !== -1) {
      matrix[dayIndex][d.hour] = d.value;
      dataMap.set(`${d.day}-${d.hour}`, d.value);
    }
  });

  // Find min and max values for color scaling
  const values = data.map(d => d.value).filter(v => v > 0);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  // Color scale function
  const getColor = (value: number) => {
    if (value === 0) return 'bg-gray-100';
    
    const intensity = (value - minValue) / range;
    
    if (metric === 'revenue') {
      // Green scale for revenue
      if (intensity < 0.2) return 'bg-green-100';
      if (intensity < 0.4) return 'bg-green-200';
      if (intensity < 0.6) return 'bg-green-300';
      if (intensity < 0.8) return 'bg-green-400';
      return 'bg-green-500';
    } else if (metric === 'customers') {
      // Blue scale for customers
      if (intensity < 0.2) return 'bg-blue-100';
      if (intensity < 0.4) return 'bg-blue-200';
      if (intensity < 0.6) return 'bg-blue-300';
      if (intensity < 0.8) return 'bg-blue-400';
      return 'bg-blue-500';
    } else {
      // Purple scale for orders
      if (intensity < 0.2) return 'bg-purple-100';
      if (intensity < 0.4) return 'bg-purple-200';
      if (intensity < 0.6) return 'bg-purple-300';
      if (intensity < 0.8) return 'bg-purple-400';
      return 'bg-purple-500';
    }
  };

  const formatValue = (value: number) => {
    if (value === 0) return '';
    
    if (metric === 'revenue') {
      return value >= 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${value}`;
    }
    return value.toString();
  };

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
      </div>

      <div className="relative overflow-x-auto">
        <div className="min-w-max">
          {/* Hour labels */}
          <div className="flex items-center mb-2">
            <div className="w-12" /> {/* Spacer for day labels */}
            {HOURS.map(hour => (
              <div 
                key={hour} 
                className="flex-1 text-center text-xs text-gray-500 min-w-[40px]"
              >
                {hour === 0 ? '12a' : hour < 12 ? `${hour}a` : hour === 12 ? '12p' : `${hour - 12}p`}
              </div>
            ))}
          </div>

          {/* Heat map grid */}
          {DAYS.map((day, dayIndex) => (
            <div key={day} className="flex items-center mb-1">
              {/* Day label */}
              <div className="w-12 text-right pr-2 text-sm text-gray-600 font-medium">
                {day}
              </div>
              
              {/* Hour cells */}
              {HOURS.map(hour => {
                const value = matrix[dayIndex][hour];
                return (
                  <div
                    key={`${day}-${hour}`}
                    className={cn(
                      'flex-1 aspect-square mx-0.5 rounded transition-all hover:ring-2 hover:ring-primary-500 hover:ring-offset-1 cursor-pointer min-w-[40px] relative group',
                      getColor(value)
                    )}
                  >
                    {showLabels && value > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-medium text-white drop-shadow-sm">
                          {formatValue(value)}
                        </span>
                      </div>
                    )}
                    
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                        <div className="font-medium">{day} {hour}:00</div>
                        <div>
                          {metric === 'revenue' && `Revenue: $${value.toLocaleString()}`}
                          {metric === 'customers' && `Customers: ${value}`}
                          {metric === 'orders' && `Orders: ${value}`}
                        </div>
                      </div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                        <div className="border-4 border-transparent border-t-gray-900" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500">Low</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                className={cn(
                  'w-6 h-4 rounded',
                  metric === 'revenue' ? `bg-green-${i}00` :
                  metric === 'customers' ? `bg-blue-${i}00` :
                  `bg-purple-${i}00`
                )}
              />
            ))}
          </div>
          <span className="text-xs text-gray-500">High</span>
        </div>
        
        <div className="text-xs text-gray-500">
          {metric === 'revenue' && 'Revenue per hour'}
          {metric === 'customers' && 'Customers per hour'}
          {metric === 'orders' && 'Orders per hour'}
        </div>
      </div>
    </div>
  );
}