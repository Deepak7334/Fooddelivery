import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '../lib/api';
import { io } from 'socket.io-client';
import { messaging } from '../firebase';
import { getToken, onMessage } from 'firebase/messaging';
import toast from 'react-hot-toast';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);

  // Fetch initial notifications
  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Play notification sound
  const playSound = () => {
    const audio = new Audio('/notification.mp3'); // Optional: create this file in public/
    audio.play().catch(e => console.log('Audio play failed due to browser policy', e));
  };

  // Socket.IO Connection
  useEffect(() => {
    if (user) {
      const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
        withCredentials: true
      });

      newSocket.on('connect', () => {
        newSocket.emit('join_user_room', user._id || user.id);
      });

      newSocket.on('notification', (notification) => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        toast.success(notification.title + ': ' + notification.body, { duration: 4000 });
        playSound();
      });

      setSocket(newSocket);
      fetchNotifications();

      return () => {
        newSocket.disconnect();
      };
    }
  }, [user]);

  // Firebase Cloud Messaging Setup
  useEffect(() => {
    const setupFCM = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const token = await getToken(messaging, { 
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY 
          });
          if (token) {
            await api.post('/notifications/save-token', { token });
          }
        }
      } catch (error) {
        console.error('FCM Setup Error:', error);
      }
    };

    if (user) {
      setupFCM();
    }
  }, [user]);

  // Handle Foreground FCM Messages
  useEffect(() => {
    const unsubscribe = onMessage(messaging, (payload) => {
      // In foreground, we might receive Socket.IO events too.
      // To avoid duplicates, you might rely solely on Socket.IO when in foreground,
      // or check if it's already in the list. For now, we'll log it.
      console.log('Foreground FCM received:', payload);
      // Let Socket.IO handle the toast if it's running. 
      // If Socket.IO is down, we can fallback to toast here.
    });

    return () => unsubscribe();
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => 
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error(error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error(error);
    }
  };

  const deleteNotification = async (id) => {
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
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      deleteNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);
