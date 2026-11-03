// Centralized WebSocket URL — mirrors the production backend URL from api.js
// so all socket connections go to the correct server in production.
const PROD_BACKEND_URL = 'https://fooddelivery-ryjf.onrender.com';

export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.PROD ? PROD_BACKEND_URL : 'http://localhost:5000');
