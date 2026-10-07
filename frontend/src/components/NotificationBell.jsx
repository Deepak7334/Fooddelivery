import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import { FiBell, FiCheck, FiTrash2 } from 'react-icons/fi';
import './NotificationBell.css'; // Optional: if you prefer external CSS, but inline/utility works

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotification();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 60000); // minutes
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="notification-icon-btn"
      >
        <FiBell size={24} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 0,
            background: 'var(--danger)', color: 'white', borderRadius: '50%',
            padding: '2px 6px', fontSize: '10px', fontWeight: 'bold'
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #333', paddingBottom: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={() => { markAllAsRead(); setIsOpen(false); }}
                style={{ background: 'none', border: 'none', color: '#22ff90', cursor: 'pointer', fontSize: '12px' }}
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
              No notifications yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {notifications.map((notif) => (
                <div 
                  key={notif._id} 
                  className="notification-item"
                  style={{
                    background: notif.isRead ? 'var(--bg-card)' : 'var(--bg-card2)',
                    padding: '12px', borderRadius: '8px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
                  }}
                >
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => {
                    if (!notif.isRead) markAsRead(notif._id);
                    setIsOpen(false);
                    navigate('/orders');
                  }}>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: notif.isRead ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{notif.title}</h4>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{notif.body}</p>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px', display: 'block' }}>{formatTime(notif.createdAt)}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '12px' }}>
                    {!notif.isRead && (
                      <button onClick={(e) => { e.stopPropagation(); markAsRead(notif._id); }} title="Mark as read" style={{ background: 'none', border: 'none', color: '#22ff90', cursor: 'pointer' }}>
                        <FiCheck size={16} />
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); deleteNotification(notif._id); }} title="Delete" style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer' }}>
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
