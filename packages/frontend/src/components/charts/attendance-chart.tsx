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
  ReferenceLine,
  ReferenceDot,
  ComposedChart
} from 'recharts';
import { Users, Calendar, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AttendanceData {
  date: string;
  attendance: number;
  capacity: number;
  events?: Array<{
    name: string;
    type: string;
    attendance: number;
  }>;
}

interface AttendanceChartProps {
  data: AttendanceData[];
  showEvents?: boolean;
  showCapacityLine?: boolean;
  showTrend?: boolean;
}

export function AttendanceChart({ 
  data, 
  showEvents = true, 
  showCapacityLine = true,
  showTrend = true 
}: AttendanceChartProps) {
  
  // Calculate utilization percentage for each day
  const chartData = data.map(day => ({
    ...day,
    utilization: (day.attendance / day.capacity) * 100,
    hasEvent: day.events && day.events.length > 0
  }));

  // Calculate trend line (simple moving average)
  const trendData = chartData.map((day, index) => {
    const window = 7; // 7-day moving average
    const start = Math.max(0, index - Math.floor(window / 2));
    const end = Math.min(chartData.length, index + Math.floor(window / 2) + 1);
    const slice = chartData.slice(start, end);
    const avgAttendance = slice.reduce((sum, d) => sum + d.attendance, 0) / slice.length;
    
    return {
      ...day,
      trend: avgAttendance
    };
  });

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload[0]) return null;
    
    const data = payload[0].payload;
    
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <p className="font-medium text-gray-900 mb-2">
          {new Date(label).toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
          })}
        </p>
        <div className="space-y-1 text-sm">
          <p className="text-gray-600">
            Attendance: <span className="font-medium text-gray-900">{data.attendance}</span>
          </p>
          <p className="text-gray-600">
            Capacity: <span className="font-medium text-gray-900">{data.capacity}</span>
          </p>
          <p className="text-gray-600">
            Utilization: <span className={cn(
              "font-medium",
              data.utilization > 90 ? "text-danger-600" :
              data.utilization > 70 ? "text-warning-600" :
              "text-success-600"
            )}>{data.utilization.toFixed(1)}%</span>
          </p>
          
          {data.events && data.events.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <p className="font-medium text-gray-700 mb-1">Events:</p>
              {data.events.map((event: any, idx: number) => (
                <p key={idx} className="text-gray-600 ml-2">
                  • {event.name} ({event.attendance} attendees)
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Custom dot for events
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    
    if (!payload.hasEvent) return null;
    
    return (
      <g>
        <circle 
          cx={cx} 
          cy={cy} 
          r={6} 
          fill="#8b5cf6" 
          stroke="#fff" 
          strokeWidth={2}
        />
        <Calendar 
          x={cx - 8} 
          y={cy - 20} 
          className="w-4 h-4 text-purple-600"
        />
      </g>
    );
  };

  return (
    <div className="w-full h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Attendance Overview</h3>
          <p className="text-sm text-gray-600 mt-1">
            Daily attendance with capacity utilization
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-brand-500 rounded" />
            <span className="text-gray-600">Attendance</span>
          </div>
          {showTrend && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-brand-300" />
              <span className="text-gray-600">Trend</span>
            </div>
          )}
          {showCapacityLine && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-danger-500" style={{ borderTop: '2px dashed' }} />
              <span className="text-gray-600">Capacity</span>
            </div>
          )}
          {showEvents && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-purple-600" />
              <span className="text-gray-600">Event Day</span>
            </div>
          )}
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <defs>
            <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric' 
            })}
          />
          
          <YAxis 
            label={{ value: 'Attendees', angle: -90, position: 'insideLeft' }}
            tick={{ fontSize: 12 }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          {/* Attendance area */}
          <Area
            type="monotone"
            dataKey="attendance"
            stroke="#3b82f6"
            fill="url(#attendanceGradient)"
            strokeWidth={2}
          />
          
          {/* Attendance line */}
          <Line
            type="monotone"
            dataKey="attendance"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={showEvents ? <CustomDot /> : { fill: '#3b82f6', r: 3 }}
            activeDot={{ r: 6 }}
          />
          
          {/* Trend line */}
          {showTrend && (
            <Line
              type="monotone"
              dataKey="trend"
              stroke="#93bbfd"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          )}
          
          {/* Capacity line */}
          {showCapacityLine && data[0]?.capacity && (
            <ReferenceLine 
              y={data[0].capacity} 
              stroke="#ef4444"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{ value: "Max Capacity", position: "right" }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Summary stats */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Users className="w-4 h-4" />
            <span className="text-sm">Avg Attendance</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {Math.round(data.reduce((sum, d) => sum + d.attendance, 0) / data.length)}
          </p>
        </div>
        
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Avg Utilization</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {(data.reduce((sum, d) => sum + (d.attendance / d.capacity) * 100, 0) / data.length).toFixed(1)}%
          </p>
        </div>
        
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">Event Days</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {data.filter(d => d.events && d.events.length > 0).length}
          </p>
        </div>
      </div>
    </div>
  );
}