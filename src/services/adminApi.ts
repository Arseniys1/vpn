// Admin API Service
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
const APP_ENV = import.meta.env.VITE_APP_ENV || 'development';

// Helper function to get Telegram init data
const getTelegramInitData = (): string => {
  if (window.Telegram?.WebApp?.initData) {
    return window.Telegram.WebApp.initData;
  }
  return '';
};

// Helper function for API calls with retry logic
const apiCall = async (endpoint: string, options: RequestInit = {}, retries = 3) => {
  const headers = {
    'Content-Type': 'application/json',
    'X-Telegram-Init-Data': getTelegramInitData(),
    ...options.headers,
  };

  let lastError: Error | null = null;
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return response.json();
    } catch (error) {
      lastError = error as Error;
      if (i < retries - 1) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError || new Error('Request failed after retries');
};

// Stats API
export const getStats = async () => {
  return apiCall('/admin/stats');
};

// Server Management API
export const getAllServers = async () => {
  return apiCall('/admin/servers');
};

export const createServer = async (data: {
  name: string;
  country: string;
  flag: string;
  protocol: string;
  status?: string;
  admin_message?: string;
  max_connections?: number;
  host: string;
  xray_panel_id: string;
  inbound_id?: number;
  is_user_specific?: boolean;
  user_ids?: string[];
}) => {
  return apiCall('/admin/servers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateServer = async (id: string, data: {
  name: string;
  country: string;
  flag: string;
  protocol: string;
  status: string;
  admin_message?: string;
  max_connections?: number;
  host: string;
  xray_panel_id?: string;
  inbound_id?: number;
  is_user_specific?: boolean;
  user_ids?: string[];
}) => {
  return apiCall(`/admin/servers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const getServerUsers = async (serverId: string) => {
  return apiCall(`/admin/servers/${serverId}/users`);
};

export const deleteServer = async (id: string) => {
  return apiCall(`/admin/servers/${id}`, {
    method: 'DELETE',
  });
};

// User Management API
export const getAllUsers = async (params?: { page?: number; limit?: number; search?: string }) => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.search) queryParams.append('search', params.search);
  
  const query = queryParams.toString();
  return apiCall(`/admin/users${query ? `?${query}` : ''}`);
};

export const updateUser = async (id: string, data: {
  balance?: number;
  is_active?: boolean;
  is_admin?: boolean;
}) => {
  return apiCall(`/admin/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

// Plan Management API
export const getAllPlans = async () => {
  return apiCall('/admin/plans');
};

export const createPlan = async (data: {
  name: string;
  duration_months: number;
  price_stars: number;
  discount?: string;
}) => {
  return apiCall('/admin/plans', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updatePlan = async (id: string, data: {
  name: string;
  duration_months: number;
  price_stars: number;
  discount?: string;
}) => {
  return apiCall(`/admin/plans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deletePlan = async (id: string) => {
  return apiCall(`/admin/plans/${id}`, {
    method: 'DELETE',
  });
};

// Xray Panel Management API
export const getAllXrayPanels = async () => {
  return apiCall('/admin/xray-panels');
};

// Ticket Management API
export const getAllTickets = async (status?: string) => {
  const query = status ? `?status=${status}` : '';
  return apiCall(`/admin/tickets${query}`);
};

export const replyToTicket = async (id: string, data: {
  reply: string;
  status?: string;
}) => {
  return apiCall(`/admin/tickets/${id}/reply`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};
