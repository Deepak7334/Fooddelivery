import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import api from '../lib/api';
import { messaging } from '../firebase';
import { getToken, onMessage } from 'firebase/messaging';
import toast from 'react-hot-toast';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [, setSocket] = useState(null);
  const audioRef = useRef(null);

  // Fetch initial notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, []);

  // Play notification sound safely without memory leaks
  const playSound = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('/notification.mp3');
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } catch {}
  }, []);

  // Socket.IO Connection (code-split with dynamic import)
  const userId = user?._id || user?.id;
  useEffect(() => {
    if (!userId) return;

    let activeSocket = null;
    let isMounted = true;

    (async () => {
      try {
        const { io } = await import('socket.io-client');
        if (!isMounted) return;
        const apiBase = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:5000';
        activeSocket = io(apiBase, { withCredentials: true });

        activeSocket.on('connect', () => {
          activeSocket.emit('join_user_room', userId);
        });

        activeSocket.on('notification', (notification) => {
          setNotifications(prev => [notification, ...prev]);
          setUnreadCount(prev => prev + 1);
          toast.success((notification.title || 'Notification') + ': ' + (notification.body || ''), { duration: 4000 });
          playSound();
        });

        setSocket(activeSocket);
        fetchNotifications();
      } catch (err) {
        console.error('Socket init error:', err);
      }
    })();

    return () => {
      isMounted = false;
      if (activeSocket) activeSocket.disconnect();
    };
  }, [userId, playSound, fetchNotifications]);

  const requestFCMPermission = useCallback(async () => {
    if (!user) return false;
    try {
      if (!('Notification' in window)) return false;
      const permission = await Notification.requestPermission();
      if (permission === 'granted' && messaging) {
        const token = await getToken(messaging, { 
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY 
        });
        if (token) {
          await api.post('/notifications/save-token', { token });
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('FCM Setup Error:', error);
      return false;
    }
  }, [user]);

  // Handle Foreground FCM Messages
  useEffect(() => {
    if (!messaging) return;
    try {
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('Foreground FCM received:', payload);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('FCM onMessage registration skipped:', e);
    }
  }, []);

  const markAsRead = useCallback(async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => 
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error(error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const deleteNotification = useCallback(async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => {
        const item = prev.find(n => n._id === id);
        if (item && !item.isRead) {
          setUnreadCount(c => Math.max(0, c - 1));
        }
        return prev.filter(n => n._id !== id);
      });
    } catch (error) {
      console.error(error);
    }
  }, []);

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    requestFCMPermission
  }), [notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, requestFCMPermission]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);
