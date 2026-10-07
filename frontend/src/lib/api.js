import axios from 'axios';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

NProgress.configure({ showSpinner: false, speed: 400, minimum: 0.1 });

const PROD_BACKEND_URL = 'https://fooddelivery-ryjf.onrender.com';
const baseURL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? PROD_BACKEND_URL : '');

const api = axios.create({
  baseURL: baseURL + '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

// Request interceptor
let activeRequests = 0;

api.interceptors.request.use((config) => {
  if (activeRequests === 0) {
    NProgress.start();
  }
  activeRequests++;
  
  const token = localStorage.getItem('foodhub_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (res) => {
    activeRequests--;
    if (activeRequests === 0) {
      NProgress.done();
    }
    return res;
  },
  (err) => {
    activeRequests--;
    if (activeRequests === 0) {
      NProgress.done();
    }
    
    if (err.response?.status === 401) {
      localStorage.removeItem('foodhub_token');
      localStorage.removeItem('foodhub_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;