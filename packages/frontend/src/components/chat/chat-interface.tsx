import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, RefreshCw } from 'lucide-react';
import { ChatMessage } from './chat-message';
import { chatApi } from '../../services/api';
import { useMutation, useQuery } from '@tanstack/react-query';
import { cn } from '../../lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: any[];
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch templates
  const { data: templatesData } = useQuery({
    queryKey: ['chat-templates'],
    queryFn: chatApi.getTemplates,
  });

  const templates = templatesData?.templates || [];

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      // Add user message immediately
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);

      // Send to API
      return chatApi.sendMessage(message, conversationId);
    },
    onSuccess: (data) => {
      // Add AI response
      const aiMessage: Message = {
        id: data.messageId,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        actions: data.actions,
      };
      setMessages(prev => [...prev, aiMessage]);
      
      // Update conversation ID
      if (!conversationId && data.conversationId) {
        setConversationId(data.conversationId);
      }
    },
    onError: (error) => {
      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    },
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(input.trim());
      setInput('');
    }
  };

  const handleTemplateClick = (template: any) => {
    setInput(template.prompt);
    inputRef.current?.focus();
  };

  const handleActionClick = (action: any) => {
    // Handle action execution
    console.log('Action clicked:', action);
    // TODO: Implement action confirmation and execution
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
            <p className="text-sm text-gray-500">
              Ask questions about your venue performance and get insights
            </p>
          </div>
          {conversationId && (
            <button
              onClick={() => {
                setMessages([]);
                setConversationId(undefined);
              }}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <RefreshCw className="w-4 h-4" />
              New conversation
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 text-brand-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              How can I help you today?
            </h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              I can analyze your venue data, suggest optimizations, and help you understand trends.
            </p>
            
            {templates.length > 0 && (
              <div className="space-y-3 max-w-2xl mx-auto">
                <p className="text-sm font-medium text-gray-700">
                  Try one of these questions:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {templates.slice(0, 4).map((template: any) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateClick(template)}
                      className="text-left p-4 rounded-lg border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition-colors"
                    >
                      <p className="text-sm font-medium text-gray-900">
                        {template.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {template.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onActionClick={handleActionClick}
              />
            ))}
            {sendMessageMutation.isPending && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-gray-100">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
                </div>
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-75" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-gray-200 bg-white p-4">
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about your venue..."
            rows={1}
            className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            style={{
              minHeight: '40px',
              maxHeight: '120px',
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || sendMessageMutation.isPending}
            className={cn(
              'rounded-lg px-4 py-2 font-medium transition-colors',
              input.trim() && !sendMessageMutation.isPending
                ? 'bg-brand-600 text-white hover:bg-brand-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            )}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}