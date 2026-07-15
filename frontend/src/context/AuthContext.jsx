/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem('foodhub_user');
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('foodhub_token');
    if (token) {
      api.get('/auth/me')
        .then(res => {
          setUser(res.data.user);
          localStorage.setItem('foodhub_user', JSON.stringify(res.data.user));
        })
        .catch(() => {
          localStorage.removeItem('foodhub_token');
          localStorage.removeItem('foodhub_user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      // eslint-disable-next-line
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      localStorage.setItem('foodhub_token', res.data.token);
      localStorage.setItem('foodhub_user', JSON.stringify(res.data.user));
      setUser(res.data.user);
    }
    return res.data;
  };

  const register = async (data) => {
    const res = await api.post('/auth/register', data);
    if (res.data.success) {
      localStorage.setItem('foodhub_token', res.data.token);
      localStorage.setItem('foodhub_user', JSON.stringify(res.data.user));
      setUser(res.data.user);
    }
    return res.data;
  };

  const firebaseLogin = async (idToken, name, loginProvider = 'phone') => {
    const res = await api.post('/auth/firebase-login', { idToken, name, loginProvider });
    if (res.data.success) {
      localStorage.setItem('foodhub_token', res.data.token);
      localStorage.setItem('foodhub_user', JSON.stringify(res.data.user));
      setUser(res.data.user);
    }
    return res.data;
  };

  const sendEmailOtp = async (email) => {
    const res = await api.post('/auth/send-email-otp', { email });
    return res.data;
  };

  const verifyEmailOtp = async (email, otp, name) => {
    const res = await api.post('/auth/verify-email-otp', { email, otp, name });
    if (res.data.success) {
      localStorage.setItem('foodhub_token', res.data.token);
      localStorage.setItem('foodhub_user', JSON.stringify(res.data.user));
      setUser(res.data.user);
    }
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('foodhub_token');
    localStorage.removeItem('foodhub_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, firebaseLogin, sendEmailOtp, verifyEmailOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
