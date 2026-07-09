import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { FiBell, FiUser, FiLock, FiLogOut, FiPackage, FiMail, FiPhone, FiEye, FiEyeOff } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import './ProfilePage.css';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { requestFCMPermission } = useNotification();
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState('unknown');

  const [isToggling, setIsToggling] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      // If the browser permission is granted but the user doesn't have an fcmToken in the DB, 
      // they effectively have notifications "off". 
      // Since `user` state has their data, we can check if `user.fcmToken` exists.
      // But the context doesn't expose it directly, so let's rely on Notification.permission and assume 
      // if it's granted they are on, unless they manually toggle off.
    }
  }, []);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (formData.password && formData.password !== formData.confirmPassword) {
      return toast.error("Passwords don't match");
    }
    
    setLoading(true);
    try {
      // The backend route handles updating the profile
      await api.put('/auth/profile', {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        ...(formData.password ? { password: formData.password } : {})
      });
      toast.success('Profile updated successfully');
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
      window.location.reload();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleNotification = async (e) => {
    const isChecked = e.target.checked;
    setIsToggling(true);
    
    try {
      if (isChecked) {
        // Turn ON
        const success = await requestFCMPermission();
        if (success) {
          setPermission('granted');
          toast.success('Notifications enabled!');
        } else {
          // Revert toggle visually if failed
          if (Notification.permission === 'denied') {
            toast.error('Please unblock notifications in your browser settings.');
          }
          setPermission(Notification.permission);
        }
      } else {
        // Turn OFF
        await api.post('/notifications/remove-token');
        // We set permission to a custom 'disabled' state just for UI, 
        // since we can't change the browser's Notification.permission.
        setPermission('disabled'); 
        toast.success('Notifications disabled');
      }
    } catch (error) {
      toast.error('Failed to update notification settings');
    } finally {
      setIsToggling(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return <div style={{ padding: 60, textAlign: 'center' }}>Please login first</div>;

  // Determine if the toggle should be visually ON
  // It is ON if permission is granted AND they haven't manually disabled it in this session.
  // Ideally this would check `user.fcmToken`, but we'll use local state 'permission'.
  const isNotificationActive = permission === 'granted';

  return (
    <div className="profile-page-container">
      <div className="profile-header-bg"></div>
      
      <div className="profile-layout">
        {/* Left Sidebar */}
        <div className="profile-sidebar">
          <div className="profile-card">
            <div className="profile-user-info">
              <div className="profile-avatar">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="profile-user-details">
                <h2>{user?.name}</h2>
                <p>{user?.email}</p>
              </div>
            </div>
            
            <div className="profile-nav-links">
              {user.role === 'customer' && (
                <Link to="/orders" className="profile-nav-btn">
                  <FiPackage size={18} /> Order History
                </Link>
              )}
              {user.role === 'admin' && (
                <Link to="/admin" className="profile-nav-btn">
                  <FiPackage size={18} /> Admin Dashboard
                </Link>
              )}
              {user.role === 'restaurant' && (
                <Link to="/restaurant" className="profile-nav-btn">
                  <FiPackage size={18} /> Restaurant Dashboard
                </Link>
              )}
              {user.role === 'store_owner' && (
                <Link to="/store-owner" className="profile-nav-btn">
                  <FiPackage size={18} /> Store Dashboard
                </Link>
              )}
              {user.role === 'delivery' && (
                <Link to="/delivery" className="profile-nav-btn">
                  <FiPackage size={18} /> Delivery Dashboard
                </Link>
              )}
              <button onClick={handleLogout} className="profile-nav-btn danger">
                <FiLogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Right Content */}
        <div className="profile-content">
          <h1 className="profile-page-title">Settings & Profile</h1>
          
          <div className="profile-form-card">
            <h3>Personal Information</h3>
            <p className="profile-subtitle">Update your name or change your password.</p>
            
            <form onSubmit={handleUpdateProfile} className="profile-form">
              <div className="form-group">
                <label>Full Name</label>
                <div className="input-with-icon">
                  <FiUser className="input-icon" />
                  <input type="text" name="name" value={formData.name} onChange={handleChange} required />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Email <span className="readonly-badge">Read Only</span></label>
                  <div className="input-with-icon readonly">
                    <FiMail className="input-icon" />
                    <input type="email" value={user?.email || ''} readOnly disabled />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Mobile Number</label>
                  <div className="input-with-icon">
                    <FiPhone className="input-icon" />
                    <input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="Enter your mobile number" />
                  </div>
                </div>
              </div>
              
              <div className="form-group" style={{ marginTop: '20px' }}>
                <label>Primary Address</label>
                <div className="input-with-icon">
                  <span className="input-icon">📍</span>
                  <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="Enter your primary delivery address" />
                </div>
              </div>
              
              <h3 style={{ marginTop: '24px' }}>Change Password</h3>
              <p className="profile-subtitle" style={{ marginBottom: '16px' }}>Leave blank if you don't want to change your password.</p>
              
              <div className="form-row">
                <div className="form-group">
                  <label>New Password</label>
                  <div className="input-with-icon">
                    <FiLock className="input-icon" />
                    <input style={{ paddingRight: '40px' }} type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                      {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Confirm Password</label>
                  <div className="input-with-icon">
                    <FiLock className="input-icon" />
                    <input style={{ paddingRight: '40px' }} type={showConfirmPassword ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                      {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>
                </div>
              </div>
              
              <button type="submit" className="profile-save-btn" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
          
          <div className="profile-form-card">
            <h3>Push Notifications</h3>
            <p className="profile-subtitle">Receive instant lock-screen alerts for important updates.</p>
            
            <div className="notification-status-box">
              <div className="notification-icon-wrapper">
                <FiBell size={24} color={isNotificationActive ? 'var(--success)' : 'var(--text-muted)'} />
              </div>
              <div className="notification-status-text">
                <h4>Mobile Alerts</h4>
                <p>
                  {isNotificationActive ? 'You are receiving notifications on this device.'
                  : permission === 'denied' ? 'Notifications are blocked in your browser settings.'
                  : 'Turn on notifications to never miss an update.'}
                </p>
              </div>
              
              {permission === 'denied' ? (
                <span className="notification-active-badge" style={{ background: 'rgba(244, 67, 54, 0.15)', color: 'var(--danger)' }}>
                  Blocked
                </span>
              ) : (
                <label className="notification-toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={isNotificationActive} 
                    onChange={handleToggleNotification}
                    disabled={isToggling}
                  />
                  <span className="notification-toggle-slider"></span>
                </label>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
