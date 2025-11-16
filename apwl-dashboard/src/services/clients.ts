import apiClient from './api';
import type { Client } from '../types';

export const clientsAPI = {
  getAll: async (): Promise<Client[]> => {
    const response = await apiClient.get('/admin/clients');
    return response.data.data || response.data; // Handle both response formats
  },

  getById: async (id: string): Promise<Client> => {
    const response = await apiClient.get(`/admin/clients/${id}`);
    return response.data.data || response.data;
  },

  create: async (data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> => {
    const response = await apiClient.post('/admin/clients', data);
    return response.data.data || response.data;
  },

  update: async (id: string, data: Partial<Client>): Promise<Client> => {
    const response = await apiClient.put(`/admin/clients/${id}`, data);
    return response.data.data || response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/clients/${id}`);
  },
};