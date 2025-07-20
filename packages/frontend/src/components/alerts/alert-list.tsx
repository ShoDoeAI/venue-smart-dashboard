import React from 'react';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { alertsApi } from '../../services/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface AlertItem {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  message: string;
  value?: number;
  threshold?: number;
  context?: any;
  source: string;
  created_at: string;
  resolved_at?: string;
  group_id?: string;
  action_suggestions?: Array<{
    action: string;
    description: string;
    estimated_impact?: string;
  }>;
}

interface AlertListProps {
  alerts: AlertItem[];
  onActionClick?: (alert: AlertItem, action: any) => void;
}

export function AlertList({ alerts, onActionClick }: AlertListProps) {
  const queryClient = useQueryClient();
  
  const resolveMutation = useMutation({
    mutationFn: (alertId: string) => alertsApi.resolveAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-danger-50',
          border: 'border-danger-200',
          text: 'text-danger-700',
          icon: 'text-danger-600',
        };
      case 'high':
        return {
          bg: 'bg-warning-50',
          border: 'border-warning-200',
          text: 'text-warning-700',
          icon: 'text-warning-600',
        };
      case 'medium':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-700',
          icon: 'text-blue-600',
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-700',
          icon: 'text-gray-600',
        };
    }
  };

  const formatTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (alerts.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-12 h-12 text-success-500 mx-auto mb-4" />
        <p className="text-gray-500">No active alerts</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {alerts.map((alert) => {
        const colors = getSeverityColor(alert.severity);
        
        return (
          <div
            key={alert.id}
            className={cn(
              'rounded-lg border p-4 transition-all',
              colors.bg,
              colors.border
            )}
          >
            <div className="flex items-start gap-3">
              <AlertCircle className={cn('w-5 h-5 mt-0.5', colors.icon)} />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{alert.title}</h4>
                    <p className={cn('mt-1 text-sm', colors.text)}>
                      {alert.message}
                    </p>
                    
                    {alert.value !== undefined && alert.threshold !== undefined && (
                      <div className="mt-2 flex items-center gap-4 text-sm">
                        <span className="text-gray-600">
                          Current: <span className="font-medium">{alert.value}</span>
                        </span>
                        <span className="text-gray-600">
                          Threshold: <span className="font-medium">{alert.threshold}</span>
                        </span>
                      </div>
                    )}
                    
                    {alert.action_suggestions && alert.action_suggestions.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium text-gray-700">Suggested Actions:</p>
                        {alert.action_suggestions.map((action, idx) => (
                          <button
                            key={idx}
                            onClick={() => onActionClick?.(alert, action)}
                            className="block w-full text-left p-2 rounded-md bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                          >
                            <p className="text-sm font-medium text-gray-900">
                              {action.action}
                            </p>
                            <p className="text-xs text-gray-600 mt-0.5">
                              {action.description}
                            </p>
                            {action.estimated_impact && (
                              <p className="text-xs text-brand-600 mt-1">
                                {action.estimated_impact}
                              </p>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(alert.created_at)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {alert.source}
                      </p>
                    </div>
                    
                    {!alert.resolved_at && (
                      <button
                        onClick={() => resolveMutation.mutate(alert.id)}
                        disabled={resolveMutation.isPending}
                        className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-white transition-colors"
                        title="Resolve alert"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}