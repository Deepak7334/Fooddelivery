import React, { useState, useEffect } from 'react';
import { FiBell, FiX } from 'react-icons/fi';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

export default function PostLoginPrompt() {
  const { user } = useAuth();
  const { requestFCMPermission } = useNotification();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Only show if user is logged in
    if (!user) return;

    // Check if browser supports notifications
    if (!('Notification' in window)) return;

    // Wait a brief moment after login to not be jarring
    const timer = setTimeout(() => {
      // Check if permission is default (neither granted nor denied)
      // and we haven't prompted them yet in this session
      const hasPrompted = sessionStorage.getItem('hasPromptedNotifications');
      if (Notification.permission === 'default' && !hasPrompted) {
        setShow(true);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [user]);

  const handleEnable = async () => {
    setLoading(true);
    try {
      await requestFCMPermission();
    } finally {
      setLoading(false);
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('hasPromptedNotifications', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius)',
        padding: '32px',
        width: '100%',
        maxWidth: '420px',
        position: 'relative',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--glass-border)'
      }}>
        <button 
          onClick={handleDismiss}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'var(--glass)', border: 'none',
            color: 'var(--text-secondary)', padding: '8px',
            borderRadius: '50%', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <FiX size={18} />
        </button>

        <div style={{
          width: '64px', height: '64px',
          background: 'linear-gradient(135deg, rgba(255,87,34,0.2), rgba(255,87,34,0.05))',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          color: 'var(--primary)'
        }}>
          <FiBell size={32} />
        </div>

        <h2 style={{ textAlign: 'center', fontSize: '24px', fontWeight: 800, marginBottom: '12px' }}>
          Enable Notifications
        </h2>
        
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '15px', lineHeight: 1.5, marginBottom: '28px' }}>
          Get instant lock-screen alerts for new orders, delivery updates, and important announcements even when your browser is closed.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button 
            onClick={handleEnable}
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
              color: '#fff',
              border: 'none',
              padding: '14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '16px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'var(--transition)',
              boxShadow: 'var(--shadow-card)'
            }}
          >
            {loading ? 'Enabling...' : 'Allow Notifications'}
          </button>
          
          <button 
            onClick={handleDismiss}
            style={{
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              padding: '14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'var(--transition)'
            }}
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
