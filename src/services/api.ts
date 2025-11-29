// User API Service (non-admin)
import { authenticatedApiCall } from './authService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

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