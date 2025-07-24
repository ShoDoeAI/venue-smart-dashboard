import React from 'react';
import { X, Download, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useExport } from '../../hooks/use-export';

interface DrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: any;
  children?: React.ReactNode;
}

export function DrillDownModal({
  isOpen,
  onClose,
  title,
  data,
  children,
}: DrillDownModalProps) {
  const { exportToCSV, exportToJSON } = useExport();

  if (!isOpen) return null;

  const handleExport = (format: 'csv' | 'json') => {
    if (format === 'csv' && Array.isArray(data)) {
      exportToCSV(data, { filename: `${title.toLowerCase().replace(/\s+/g, '-')}-details` });
    } else {
      exportToJSON(data, { filename: `${title.toLowerCase().replace(/\s+/g, '-')}-details` });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block w-full max-w-4xl px-4 pt-5 pb-4 my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-xl sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExport('csv')}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <Download className="w-4 h-4 inline mr-1" />
                CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <Download className="w-4 h-4 inline mr-1" />
                JSON
              </button>
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="mt-4">
            {children || (
              <div className="space-y-4">
                {/* Summary Stats */}
                {data.summary && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {Object.entries(data.summary).map(([key, value]: [string, any]) => (
                      <div key={key} className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <p className="text-xl font-bold text-gray-900 mt-1">
                          {typeof value === 'number' 
                            ? value.toLocaleString() 
                            : value}
                        </p>
                        {data.trends && data.trends[key] && (
                          <div className={cn(
                            'flex items-center gap-1 mt-2 text-sm',
                            data.trends[key] > 0 ? 'text-success-600' : 'text-danger-600'
                          )}>
                            {data.trends[key] > 0 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            <span>{Math.abs(data.trends[key])}%</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Detailed Table */}
                {Array.isArray(data.details) && data.details.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {Object.keys(data.details[0]).map((key) => (
                            <th
                              key={key}
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {data.details.map((row: any, index: number) => (
                          <tr key={index} className="hover:bg-gray-50">
                            {Object.values(row).map((value: any, cellIndex: number) => (
                              <td
                                key={cellIndex}
                                className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                              >
                                {typeof value === 'number' 
                                  ? value.toLocaleString() 
                                  : value}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Custom content */}
                {!data.summary && !data.details && (
                  <div className="text-center py-8 text-gray-500">
                    <pre className="text-left bg-gray-50 p-4 rounded-lg overflow-auto max-h-96">
                      {JSON.stringify(data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}