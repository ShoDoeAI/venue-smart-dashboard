import React, { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

export const PRESET_RANGES = {
  today: {
    label: 'Today',
    start: new Date(new Date().setHours(0, 0, 0, 0)),
    end: new Date(new Date().setHours(23, 59, 59, 999)),
  },
  yesterday: {
    label: 'Yesterday',
    start: new Date(new Date(Date.now() - 86400000).setHours(0, 0, 0, 0)),
    end: new Date(new Date(Date.now() - 86400000).setHours(23, 59, 59, 999)),
  },
  last7Days: {
    label: 'Last 7 Days',
    start: new Date(new Date(Date.now() - 7 * 86400000).setHours(0, 0, 0, 0)),
    end: new Date(new Date().setHours(23, 59, 59, 999)),
  },
  last30Days: {
    label: 'Last 30 Days',
    start: new Date(new Date(Date.now() - 30 * 86400000).setHours(0, 0, 0, 0)),
    end: new Date(new Date().setHours(23, 59, 59, 999)),
  },
  thisMonth: {
    label: 'This Month',
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    end: new Date(new Date().setHours(23, 59, 59, 999)),
  },
  lastMonth: {
    label: 'Last Month',
    start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
    end: new Date(new Date().getFullYear(), new Date().getMonth(), 0, 23, 59, 59, 999),
  },
};

export function DateRangeSelector({ value, onChange, className }: DateRangeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [activeTab, setActiveTab] = useState<'preset' | 'custom'>('preset');

  const handlePresetSelect = (preset: DateRange) => {
    onChange(preset);
    setIsOpen(false);
  };

  const handleCustomSubmit = () => {
    if (customStart && customEnd) {
      onChange({
        start: new Date(customStart),
        end: new Date(customEnd),
        label: 'Custom Range',
      });
      setIsOpen(false);
    }
  };

  const formatDateRange = (range: DateRange) => {
    const formatOptions: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric',
      year: range.start.getFullYear() !== range.end.getFullYear() ? 'numeric' : undefined
    };
    
    if (range.label !== 'Custom Range') {
      return range.label;
    }
    
    return `${range.start.toLocaleDateString('en-US', formatOptions)} - ${range.end.toLocaleDateString('en-US', formatOptions)}`;
  };

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <Calendar className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium">{formatDateRange(value)}</span>
        <ChevronDown className={cn(
          'w-4 h-4 text-gray-500 transition-transform',
          isOpen && 'transform rotate-180'
        )} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('preset')}
                className={cn(
                  'flex-1 px-4 py-2 text-sm font-medium',
                  activeTab === 'preset'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                Preset Ranges
              </button>
              <button
                onClick={() => setActiveTab('custom')}
                className={cn(
                  'flex-1 px-4 py-2 text-sm font-medium',
                  activeTab === 'custom'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                Custom Range
              </button>
            </div>

            <div className="p-2">
              {activeTab === 'preset' ? (
                <div className="space-y-1">
                  {Object.entries(PRESET_RANGES).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => handlePresetSelect(preset)}
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100',
                        value.label === preset.label && 'bg-primary-50 text-primary-700'
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3 p-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <button
                    onClick={handleCustomSubmit}
                    disabled={!customStart || !customEnd}
                    className="w-full py-2 px-4 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Apply Range
                  </button>
                </div>
              )}
            </div>

            {activeTab === 'preset' && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Showing data from {value.start.toLocaleDateString()} to {value.end.toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}