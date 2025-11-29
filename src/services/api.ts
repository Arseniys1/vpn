// User API Service (non-admin)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

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

// User API
export const getMe = async () => {
  return apiCall('/users/me');
};

export const topUp = async (amount: number) => {
  return apiCall('/users/topup', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
};

// Servers API
export const getServers = async () => {
  return apiCall('/servers');
};

// Subscriptions API
export const getPlans = async () => {
  return apiCall('/subscriptions/plans');
};

export const purchasePlan = async (planId: string) => {
  return apiCall('/subscriptions/purchase', {
    method: 'POST',
    body: JSON.stringify({ plan_id: planId }),
  });
};

export const getMySubscription = async () => {
  return apiCall('/subscriptions/me');
};

// Connections API
export const getMyConnections = async () => {
  return apiCall('/connections');
};

export const createConnection = async (serverId: string) => {
  return apiCall('/connections', {
    method: 'POST',
    body: JSON.stringify({ server_id: serverId }),
  });
};

export const deleteConnection = async (connectionId: string) => {
  return apiCall(`/connections/${connectionId}`, {
    method: 'DELETE',
  });
};

// Support API
export const createTicket = async (data: {
  subject: string;
  message: string;
  category: string;
}) => {
  return apiCall('/support/tickets', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getMyTickets = async () => {
  return apiCall('/support/tickets');
};

export const getTicket = async (ticketId: string) => {
  return apiCall(`/support/tickets/${ticketId}`);
};

export const addTicketMessage = async (ticketId: string, message: string) => {
  return apiCall(`/support/tickets/${ticketId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
};

// Referral API
export const getReferralStats = async () => {
  return apiCall('/users/referral-stats');
};
