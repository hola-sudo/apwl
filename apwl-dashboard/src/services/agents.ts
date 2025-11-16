import apiClient from './api';
import type { Agent } from '../types';

export const agentsAPI = {
  getAll: async (): Promise<Agent[]> => {
    const response = await apiClient.get('/admin/agents');
    return response.data.data || response.data;
  },

  getById: async (id: string): Promise<Agent> => {
    const response = await apiClient.get(`/admin/agents/${id}`);
    return response.data.data || response.data;
  },

  create: async (data: Omit<Agent, 'id' | 'apiKey' | 'createdAt' | 'updatedAt'>): Promise<Agent> => {
    const response = await apiClient.post('/admin/agents', data);
    return response.data.data || response.data;
  },

  update: async (id: string, data: Partial<Agent>): Promise<Agent> => {
    const response = await apiClient.put(`/admin/agents/${id}`, data);
    return response.data.data || response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/agents/${id}`);
  },

  regenerateApiKey: async (id: string): Promise<Agent> => {
    const response = await apiClient.post(`/admin/agents/${id}/regenerate-key`);
    return response.data.data || response.data;
  },
};