import React, { useState } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface Alert {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface AlertBannerProps {
  alert: Alert;
  onDismiss?: (id: string) => void;
}

export function AlertBanner({ alert, onDismiss }: AlertBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.(alert.id);
  };

  const icons = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    error: AlertCircle,
  };

  const styles = {
    info: {
      container: 'bg-blue-50 border-blue-200',
      icon: 'text-blue-600',
      title: 'text-blue-900',
      message: 'text-blue-700',
      button: 'text-blue-600 hover:text-blue-700',
    },
    success: {
      container: 'bg-success-50 border-success-200',
      icon: 'text-success-600',
      title: 'text-success-900',
      message: 'text-success-700',
      button: 'text-success-600 hover:text-success-700',
    },
    warning: {
      container: 'bg-warning-50 border-warning-200',
      icon: 'text-warning-600',
      title: 'text-warning-900',
      message: 'text-warning-700',
      button: 'text-warning-600 hover:text-warning-700',
    },
    error: {
      container: 'bg-danger-50 border-danger-200',
      icon: 'text-danger-600',
      title: 'text-danger-900',
      message: 'text-danger-700',
      button: 'text-danger-600 hover:text-danger-700',
    },
  };

  const Icon = icons[alert.type];
  const style = styles[alert.type];

  return (
    <div className={cn('border rounded-lg p-4', style.container)}>
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={cn('h-5 w-5', style.icon)} />
        </div>
        <div className="ml-3 flex-1">
          <h3 className={cn('text-sm font-medium', style.title)}>
            {alert.title}
          </h3>
          <div className={cn('mt-1 text-sm', style.message)}>
            <p>{alert.message}</p>
          </div>
          {alert.action && (
            <div className="mt-3">
              <button
                onClick={alert.action.onClick}
                className={cn(
                  'text-sm font-medium underline',
                  style.button
                )}
              >
                {alert.action.label}
              </button>
            </div>
          )}
        </div>
        {alert.dismissible !== false && (
          <div className="ml-auto pl-3">
            <button
              onClick={handleDismiss}
              className={cn(
                'inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2',
                style.button
              )}
            >
              <span className="sr-only">Dismiss</span>
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}