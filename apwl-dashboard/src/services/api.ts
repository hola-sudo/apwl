import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://backend-production-5f9b.up.railway.app';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add API key
apiClient.interceptors.request.use((config) => {
  // Try to get from localStorage first, fallback to env variable
  const apiKey = localStorage.getItem('admin_api_key') || import.meta.env.VITE_API_KEY;
  if (apiKey) {
    config.headers['x-api-key'] = apiKey;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      // Clear invalid API key and redirect to login
      localStorage.removeItem('admin_api_key');
      window.location.reload();
    }
    
    if (error.response?.status === 500) {
      console.error('Server Error:', error.response.data);
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;