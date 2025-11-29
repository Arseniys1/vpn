// Admin API Service
import { authenticatedApiCall } from './authService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
const APP_ENV = import.meta.env.VITE_APP_ENV || 'development';

// Stats API
export const getStats = async () => {
  return authenticatedApiCall('/admin/stats');
};

// Server Management API
export const getAllServers = async () => {
  return authenticatedApiCall('/admin/servers');
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
  return authenticatedApiCall('/admin/servers', {
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
  return authenticatedApiCall(`/admin/servers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteServer = async (id: string) => {
  return authenticatedApiCall(`/admin/servers/${id}`, {
    method: 'DELETE',
  });
};

export const getServerUsers = async (serverId: string) => {
  return authenticatedApiCall(`/admin/servers/${serverId}/users`);
};

// Xray Panel Management API
export const getAllXrayPanels = async () => {
  return authenticatedApiCall('/admin/xray-panels');
};

// User Management API
export const getAllUsers = async (params?: { page?: number; limit?: number; search?: string }) => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.search) queryParams.append('search', params.search);
  
  const query = queryParams.toString();
  return authenticatedApiCall(`/admin/users${query ? `?${query}` : ''}`);
};

export const updateUser = async (id: string, data: {
  balance?: number;
  is_active?: boolean;
  is_admin?: boolean;
}) => {
  return authenticatedApiCall(`/admin/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

// Plan Management API
export const getAllPlans = async () => {
  return authenticatedApiCall('/admin/plans');
};

export const createPlan = async (data: {
  name: string;
  duration_months: number;
  price_stars: number;
  discount?: string;
}) => {
  return authenticatedApiCall('/admin/plans', {
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
  return authenticatedApiCall(`/admin/plans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deletePlan = async (id: string) => {
  return authenticatedApiCall(`/admin/plans/${id}`, {
    method: 'DELETE',
  });
};

// Ticket Management API
export const getAllTickets = async (status?: string) => {
  const query = status ? `?status=${status}` : '';
  return authenticatedApiCall(`/admin/tickets${query}`);
};

export const replyToTicket = async (id: string, data: {
  reply: string;
  status?: string;
}) => {
  return authenticatedApiCall(`/admin/tickets/${id}/reply`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};