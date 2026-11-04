import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import api from '../lib/api';
import { createSocket } from '../lib/socket';
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

  // Play notification chime using Web Audio API (zero network latency, no missing MP3 404s)
  const playSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
        return;
      }
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
        if (!isMounted) return;
        activeSocket = createSocket();

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
