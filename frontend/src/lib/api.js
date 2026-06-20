import axios from 'axios';

const PROD_BACKEND_URL = 'https://fooddelivery-ryjf.onrender.com';
const baseURL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? PROD_BACKEND_URL : '');

const api = axios.create({
  baseURL: baseURL + '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('foodhub_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('foodhub_token');
      localStorage.removeItem('foodhub_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
