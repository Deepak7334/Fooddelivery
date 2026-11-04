import { io } from 'socket.io-client';

const PROD_BACKEND_URL = 'https://fooddelivery-ryjf.onrender.com';

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL 
  || import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') 
  || (import.meta.env.PROD ? PROD_BACKEND_URL : 'http://localhost:5000');

export const createSocket = (options = {}) => {
  return io(SOCKET_URL, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
    ...options
  });
};

export default createSocket;
