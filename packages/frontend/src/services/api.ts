/**
 * API client for VenueSync
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { params, ...requestOptions } = options;
    
    let url = `${this.baseUrl}${endpoint}`;
    
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        searchParams.append(key, String(value));
      });
      url += `?${searchParams.toString()}`;
    }

    const response = await fetch(url, {
      ...requestOptions,
      headers: {
        'Content-Type': 'application/json',
        ...requestOptions.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // GET request
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  // POST request
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT request
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Create and export the API client instance
export const api = new ApiClient(API_BASE_URL);

// Dashboard API
export const dashboardApi = {
  getDashboard: (params?: { startDate?: string; endDate?: string }) => 
    api.get<{
      success: boolean;
      snapshot?: any;
      kpis?: any;
      alerts?: any[];
    }>('/api/dashboard', { params }),
  
  getRealtimeMetrics: () =>
    api.get<{
      success: boolean;
      metrics: any;
    }>('/api/dashboard/realtime'),
};

// Alerts API
export const alertsApi = {
  getAlerts: () =>
    api.get<{
      success: boolean;
      alerts: any[];
      count: number;
    }>('/api/alerts'),
  
  resolveAlert: (alertId: string) =>
    api.post('/api/alerts', { action: 'resolve', alertId }),
};

// Chat/AI API
export const chatApi = {
  sendMessage: (message: string, conversationId?: string) => {
    // Always use chat-enhanced for now
    const endpoint = '/api/chat-enhanced';
    
    return api.post<{
      success: boolean;
      response: string;
      conversationId: string;
      messageId: string;
      actions?: any[];
    }>(endpoint, { message, conversationId });
  },
  
  getConversations: () =>
    api.get<{
      success: boolean;
      conversations: any[];
    }>('/api/ai/conversations'),
  
  getTemplates: () =>
    api.get<{
      success: boolean;
      templates: any[];
    }>('/api/ai/templates'),
};

// Actions API
export const actionsApi = {
  getPendingActions: () =>
    api.get<{
      success: boolean;
      actions: any[];
    }>('/api/actions/pending'),
  
  executeAction: (actionId: string) =>
    api.post('/api/actions/execute', { actionId }),
  
  confirmAction: (actionId: string, confirmed: boolean) =>
    api.post('/api/actions/confirm', { actionId, confirmed }),
};

// Health check
export const healthApi = {
  check: () => api.get<{ status: string }>('/api/health'),
};