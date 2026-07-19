import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://fixit-v2.onrender.com/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach authentication token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to map and standardize errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const mappedError = {
      message: 'An unexpected network error occurred.',
      status: error.response?.status || 500,
      validationErrors: null as any,
    };

    if (error.response) {
      const data = error.response.data;
      mappedError.message = data.error || data.message || mappedError.message;
      if (data.errors) {
        mappedError.validationErrors = data.errors;
      }
    } else if (error.request) {
      mappedError.message = 'No response received from the server. Please check your internet connection.';
    }

    console.error('[API Error Interceptor]:', mappedError);
    return Promise.reject(mappedError);
  }
);
