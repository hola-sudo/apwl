import apiClient from './api';
import type { Session, DashboardStats } from '../types';

export const sessionsAPI = {
  getAll: async (): Promise<Session[]> => {
    const response = await apiClient.get('/admin/sessions');
    return response.data.data || response.data;
  },

  getById: async (id: number): Promise<Session> => {
    const response = await apiClient.get(`/admin/sessions/${id}`);
    return response.data.data || response.data;
  },

  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get('/admin/sessions/stats');
    return response.data.data || response.data;
  },

  getRecentSessions: async (limit: number = 10): Promise<Session[]> => {
    const response = await apiClient.get(`/admin/sessions?limit=${limit}&orderBy=createdAt&order=desc`);
    return response.data.data || response.data;
  },
};