import { useState, useEffect } from 'react';
import apiClient from '../services/api';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiKey, setApiKey] = useState<string>('');

  useEffect(() => {
    const storedApiKey = localStorage.getItem('admin_api_key');
    if (storedApiKey) {
      setApiKey(storedApiKey);
      validateApiKey(storedApiKey);
    } else {
      setIsLoading(false);
    }
  }, []);

  const validateApiKey = async (key: string) => {
    try {
      setIsLoading(true);
      await apiClient.get('/admin/health', {
        headers: { 'x-api-key': key }
      });
      setIsAuthenticated(true);
      setApiKey(key);
      localStorage.setItem('admin_api_key', key);
    } catch (error) {
      setIsAuthenticated(false);
      setApiKey('');
      localStorage.removeItem('admin_api_key');
      throw new Error('Invalid API key');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (key: string) => {
    await validateApiKey(key);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setApiKey('');
    localStorage.removeItem('admin_api_key');
  };

  return {
    isAuthenticated,
    isLoading,
    apiKey,
    login,
    logout,
  };
};