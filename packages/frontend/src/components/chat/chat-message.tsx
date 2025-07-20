import React from 'react';
import { Bot, User } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ChatMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    actions?: Array<{
      id: string;
      type: string;
      description: string;
      status?: 'pending' | 'confirmed' | 'executed' | 'rejected';
    }>;
  };
  onActionClick?: (action: any) => void;
}

export function ChatMessage({ message, onActionClick }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full',
          isUser
            ? 'bg-brand-600 text-white'
            : 'bg-gray-100 text-gray-600'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>
      
      <div
        className={cn(
          'flex flex-col gap-2',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        <div
          className={cn(
            'rounded-lg px-4 py-2 max-w-md',
            isUser
              ? 'bg-brand-600 text-white'
              : 'bg-gray-100 text-gray-900'
          )}
        >
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        </div>
        
        {message.actions && message.actions.length > 0 && (
          <div className="space-y-2 max-w-md w-full">
            <p className="text-xs text-gray-500 font-medium">Suggested Actions:</p>
            {message.actions.map((action) => (
              <button
                key={action.id}
                onClick={() => onActionClick?.(action)}
                disabled={action.status !== 'pending'}
                className={cn(
                  'w-full text-left p-3 rounded-lg border transition-colors',
                  action.status === 'pending'
                    ? 'border-brand-200 bg-brand-50 hover:bg-brand-100 cursor-pointer'
                    : action.status === 'executed'
                    ? 'border-success-200 bg-success-50 cursor-not-allowed'
                    : action.status === 'rejected'
                    ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                    : 'border-gray-200 bg-gray-50'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {action.type}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {action.description}
                    </p>
                  </div>
                  {action.status && action.status !== 'pending' && (
                    <span
                      className={cn(
                        'text-xs px-2 py-1 rounded-full',
                        action.status === 'executed'
                          ? 'bg-success-100 text-success-700'
                          : action.status === 'rejected'
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-brand-100 text-brand-700'
                      )}
                    >
                      {action.status}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
        
        <p className="text-xs text-gray-400">
          {message.timestamp.toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}