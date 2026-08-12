import axios from 'axios';

// Dynamically resolve backend API base URL from Vite environment variable
// In development with Vite proxy, empty string uses relative paths (e.g. /api/...)
// In production (Vercel), VITE_API_BASE_URL points to deployed backend URL (e.g. https://cds-backend.onrender.com)
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Returns full URL endpoint given a relative path like '/api/reports'
 */
export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

export default apiClient;
