// User API Service (non-admin)
import {
  authenticatedApiCall,
} from './authService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export const apiCall = async (endpoint: string, options: RequestInit = {}, retries = 3) => {
  // Prepare headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Copy any existing headers
  if (options.headers) {
    Object.assign(headers, options.headers);
  }

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
  return authenticatedApiCall('/users/me');
};

export const topUp = async (amount: number) => {
  return authenticatedApiCall('/users/topup', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
};

// Servers API
export const getServers = async () => {
  return authenticatedApiCall('/servers');
};

// Subscriptions API
export const getPlans = async () => {
  return authenticatedApiCall('/subscriptions/plans');
};

export const purchasePlan = async (planId: string) => {
  return authenticatedApiCall('/subscriptions/purchase', {
    method: 'POST',
    body: JSON.stringify({ plan_id: planId }),
  });
};

export const getMySubscription = async () => {
  return authenticatedApiCall('/subscriptions/me');
};

// Connections API
export const getMyConnections = async () => {
  return authenticatedApiCall('/connections');
};

export const createConnection = async (serverId: string) => {
  return authenticatedApiCall('/connections', {
    method: 'POST',
    body: JSON.stringify({ server_id: serverId }),
  });
};

export const deleteConnection = async (connectionId: string) => {
  return authenticatedApiCall(`/connections/${connectionId}`, {
    method: 'DELETE',
  });
};

// Support API
export const createTicket = async (data: {
  subject: string;
  message: string;
  category: string;
}) => {
  return authenticatedApiCall('/support/tickets', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getMyTickets = async () => {
  return authenticatedApiCall('/support/tickets');
};

export const getTicket = async (ticketId: string) => {
  return authenticatedApiCall(`/support/tickets/${ticketId}`);
};

export const addTicketMessage = async (ticketId: string, message: string) => {
  return authenticatedApiCall(`/support/tickets/${ticketId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
};

// Referral API
export const getReferralStats = async () => {
  return authenticatedApiCall('/users/referral-stats');
};