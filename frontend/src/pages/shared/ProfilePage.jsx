import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  FiBell, FiUser, FiLock, FiLogOut, FiPackage, FiMail, FiPhone, 
  FiEye, FiEyeOff, FiCamera, FiCalendar, FiMapPin, FiChevronRight, 
  FiTag, FiHelpCircle, FiSettings, FiFileText, FiShield, FiArrowLeft,
  FiCreditCard, FiInfo, FiEdit2, FiCheckCircle
} from 'react-icons/fi';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import ImageCropperModal from '../../components/ImageCropperModal';
import './ProfilePage.css';

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { requestFCMPermission } = useNotification();
  
  const currentTab = searchParams.get('tab');
  const [isDesktop, setIsDesktop] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 768 : true));

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    password: '',
    confirmPassword: '',
    profileImage: user?.profileImage || ''
  });
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState('unknown');

  const [isToggling, setIsToggling] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const fileInputRef = useRef(null);
  const [showCropper, setShowCropper] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || '',
        profileImage: user.profileImage || ''
      }));
    }
  }, [user]);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
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
      const res = await api.put('/auth/profile', {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        profileImage: formData.profileImage,
        ...(formData.password ? { password: formData.password } : {})
      });
      if (res.data?.user) {
        updateUser(res.data.user);
      }
      toast.success('Profile updated successfully');
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageToCrop(reader.result);
        setShowCropper(true);
      });
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleCropDone = (croppedFile) => {
    setShowCropper(false);
    setImageToCrop(null);
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setFormData(prev => ({ ...prev, profileImage: reader.result }));
    });
    reader.readAsDataURL(croppedFile);
  };

  const handleToggleNotification = async (e) => {
    const isChecked = e.target.checked;
    setIsToggling(true);
    
    try {
      if (isChecked) {
        const success = await requestFCMPermission();
        if (success) {
          setPermission('granted');
          toast.success('Notifications enabled!');
        } else {
          if (Notification.permission === 'denied') {
            toast.error('Please unblock notifications in your browser settings.');
          }
          setPermission(Notification.permission);
        }
      } else {
        await api.post('/notifications/remove-token');
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

  // Guest view when not logged in
  if (!user) {
    return (
      <div className="profile-page-container customer-profile">
        <h1 className="customer-profile-title">My Profile</h1>
        <div className="profile-layout customer-guest-profile" style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Welcome Card */}
          <div className="zomato-profile-header" style={{ padding: 22 }}>
            <div className="profile-avatar-wrapper">
              <div className="profile-avatar" style={{ background: '#F1F5F9', color: '#F97316' }}>
                <FiUser size={32} />
              </div>
            </div>
            <div className="profile-header-info" style={{ flex: 1 }}>
              <div className="profile-name-row">
                <h2 style={{ fontSize: 20 }}>Welcome to JDKart</h2>
                <span className="profile-badge-chip">Guest</span>
              </div>
              <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: 13 }}>
                Log in to view your orders, saved addresses and table reservations.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/login')}
            className="btn btn-primary btn-full"
            style={{
              height: 48,
              borderRadius: 14,
              fontSize: 15,
              fontWeight: 800,
              background: '#F97316',
              color: '#FFF',
              border: 'none',
              boxShadow: '0 3px 12px rgba(249, 115, 22, 0.25)',
              cursor: 'pointer'
            }}
          >
            Log in / Sign up
          </button>

          {/* Group 1: Food & Dining */}
          <div className="zomato-section-title">Food & Dining</div>
          <div className="zomato-section-card">
            <Link to="/orders" className="zomato-menu-row">
              <div className="zomato-row-left">
                <div className="zomato-icon-badge">
                  <FiPackage size={18} />
                </div>
                <div className="zomato-menu-content">
                  <span className="zomato-menu-title">My Orders</span>
                  <span className="zomato-menu-subtitle">View and track your orders</span>
                </div>
              </div>
              <FiChevronRight size={18} className="zomato-chevron" />
            </Link>

            <Link to="/orders?tab=bookings" className="zomato-menu-row">
              <div className="zomato-row-left">
                <div className="zomato-icon-badge">
                  <FiCalendar size={18} />
                </div>
                <div className="zomato-menu-content">
                  <span className="zomato-menu-title">Table Reservations</span>
                  <span className="zomato-menu-subtitle">Manage restaurant dining bookings</span>
                </div>
              </div>
              <FiChevronRight size={18} className="zomato-chevron" />
            </Link>

            <Link to="/offers" className="zomato-menu-row">
              <div className="zomato-row-left">
                <div className="zomato-icon-badge">
                  <FiTag size={18} />
                </div>
                <div className="zomato-menu-content">
                  <span className="zomato-menu-title">Offers & Promos</span>
                  <span className="zomato-menu-subtitle">Explore coupons & festival discounts</span>
                </div>
              </div>
              <FiChevronRight size={18} className="zomato-chevron" />
            </Link>
          </div>

          {/* Group 2: Support & Legal */}
          <div className="zomato-section-title">Support & Legal</div>
          <div className="zomato-section-card">
            <a href="mailto:supportjdkart@gmail.com" className="zomato-menu-row">
              <div className="zomato-row-left">
                <div className="zomato-icon-badge">
                  <FiMail size={18} />
                </div>
                <div className="zomato-menu-content">
                  <span className="zomato-menu-title">Customer Support</span>
                  <span className="zomato-menu-subtitle">supportjdkart@gmail.com</span>
                </div>
              </div>
              <FiChevronRight size={18} className="zomato-chevron" />
            </a>

            <Link to="/about" className="zomato-menu-row">
              <div className="zomato-row-left">
                <div className="zomato-icon-badge">
                  <FiInfo size={18} />
                </div>
                <div className="zomato-menu-content">
                  <span className="zomato-menu-title">About JDKart</span>
                  <span className="zomato-menu-subtitle">Our mission & delivery network</span>
                </div>
              </div>
              <FiChevronRight size={18} className="zomato-chevron" />
            </Link>

            <Link to="/terms" className="zomato-menu-row">
              <div className="zomato-row-left">
                <div className="zomato-icon-badge">
                  <FiFileText size={18} />
                </div>
                <div className="zomato-menu-content">
                  <span className="zomato-menu-title">Terms & Conditions</span>
                  <span className="zomato-menu-subtitle">Platform policies & guidelines</span>
                </div>
              </div>
              <FiChevronRight size={18} className="zomato-chevron" />
            </Link>

            <Link to="/privacy" className="zomato-menu-row">
              <div className="zomato-row-left">
                <div className="zomato-icon-badge">
                  <FiShield size={18} />
                </div>
                <div className="zomato-menu-content">
                  <span className="zomato-menu-title">Privacy Policy</span>
                  <span className="zomato-menu-subtitle">Data security & privacy</span>
                </div>
              </div>
              <FiChevronRight size={18} className="zomato-chevron" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isNotificationActive = permission === 'granted';
  const isCustomer = user.role === 'customer';

  // For customer: on desktop, default to 'settings' tab if no tab in URL; on mobile, default to null (show menu list)
  const activeTab = currentTab || (isCustomer && isDesktop ? 'settings' : null);
  const hasActiveTabOnMobile = Boolean(currentTab);

  const selectTab = (tab) => {
    setSearchParams({ tab });
  };

  const backToMenu = () => {
    setSearchParams({});
  };

  const userName = user?.name || user?.email?.split('@')[0] || 'Customer';
  const initialLetter = userName.charAt(0).toUpperCase();

  return (
    <div className={`profile-page-container${isCustomer ? ' customer-profile' : ''}${hasActiveTabOnMobile ? ' has-active-tab' : ''}`}>
      <div className="profile-header-bg"></div>
      {isCustomer && !hasActiveTabOnMobile && <h1 className="customer-profile-title">My Profile</h1>}
      
      <div className="profile-layout">
        {/* Profile Sidebar / Main Menu */}
        <div className="profile-sidebar">
          {/* User Header Profile Card */}
          <div className="zomato-profile-header">
            <div className="profile-avatar-wrapper">
              <div className="profile-avatar">
                {formData.profileImage ? (
                  <img loading="lazy" src={formData.profileImage} alt="Profile" />
                ) : (
                  initialLetter
                )}
              </div>
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()} 
                className="avatar-edit-badge"
                title="Change photo"
                aria-label="Change photo"
              >
                <FiCamera size={13} />
              </button>
              <input 
                type="file" 
                accept="image/jpeg, image/png, image/webp" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleFileChange} 
              />
            </div>

            <div className="profile-header-info">
              <div className="profile-name-row">
                <h2>{userName}</h2>
                <span className="profile-badge-chip">Verified By JDKart </span>
              </div>
              {user?.phone && (
                <p className="profile-header-phone">
                  <FiPhone size={12} /> {user.phone}
                </p>
              )}
              {user?.email && (
                <p className="profile-header-email">
                  <FiMail size={12} /> {user.email}
                </p>
              )}
            </div>

            {isCustomer && (
              <button 
                type="button" 
                onClick={() => selectTab('settings')} 
                className="profile-quick-edit-btn"
                title="Edit profile"
                aria-label="Edit profile"
              >
                <FiEdit2 size={16} />
              </button>
            )}
          </div>
          
          {/* Menu Sections (Zomato-Style Grouped Cards) */}
          <div className="profile-nav-links">
            {isCustomer ? (
              <>
                {/* Group 1: Food Orders & Dining */}
                <div className="zomato-section-title">Food Orders & Dining</div>
                <div className="zomato-section-card">
                  <Link to="/orders" className="zomato-menu-row">
                    <div className="zomato-row-left">
                      <div className="zomato-icon-badge">
                        <FiPackage size={18} />
                      </div>
                      <div className="zomato-menu-content">
                        <span className="zomato-menu-title">My Orders</span>
                        <span className="zomato-menu-subtitle">Live tracking & past orders</span>
                      </div>
                    </div>
                    <FiChevronRight size={18} className="zomato-chevron" />
                  </Link>

                  <Link to="/orders?tab=bookings" className="zomato-menu-row">
                    <div className="zomato-row-left">
                      <div className="zomato-icon-badge">
                        <FiCalendar size={18} />
                      </div>
                      <div className="zomato-menu-content">
                        <span className="zomato-menu-title">Table Reservations</span>
                        <span className="zomato-menu-subtitle">Manage restaurant bookings</span>
                      </div>
                    </div>
                    <FiChevronRight size={18} className="zomato-chevron" />
                  </Link>

                  <Link to="/offers" className="zomato-menu-row">
                    <div className="zomato-row-left">
                      <div className="zomato-icon-badge">
                        <FiTag size={18} />
                      </div>
                      <div className="zomato-menu-content">
                        <span className="zomato-menu-title">Offers & Promos</span>
                        <span className="zomato-menu-subtitle">Explore discount coupons</span>
                      </div>
                    </div>
                    <FiChevronRight size={18} className="zomato-chevron" />
                  </Link>

                  <button 
                    type="button" 
                    onClick={() => selectTab('addresses')} 
                    className={`zomato-menu-row ${activeTab === 'addresses' ? 'active' : ''}`}
                  >
                    <div className="zomato-row-left">
                      <div className="zomato-icon-badge">
                        <FiMapPin size={18} />
                      </div>
                      <div className="zomato-menu-content">
                        <span className="zomato-menu-title">Saved Addresses</span>
                        <span className="zomato-menu-subtitle">Manage delivery locations</span>
                      </div>
                    </div>
                    <FiChevronRight size={18} className="zomato-chevron" />
                  </button>
                </div>

                {/* Group 2: Account & Preferences */}
                <div className="zomato-section-title">Account & Preferences</div>
                <div className="zomato-section-card">
                  <button 
                    type="button" 
                    onClick={() => selectTab('settings')} 
                    className={`zomato-menu-row ${activeTab === 'settings' ? 'active' : ''}`}
                  >
                    <div className="zomato-row-left">
                      <div className="zomato-icon-badge">
                        <FiSettings size={18} />
                      </div>
                      <div className="zomato-menu-content">
                        <span className="zomato-menu-title">Account Settings</span>
                        <span className="zomato-menu-subtitle">Name, phone & password</span>
                      </div>
                    </div>
                    <FiChevronRight size={18} className="zomato-chevron" />
                  </button>

                  <button 
                    type="button" 
                    onClick={() => selectTab('notifications')} 
                    className={`zomato-menu-row ${activeTab === 'notifications' ? 'active' : ''}`}
                  >
                    <div className="zomato-row-left">
                      <div className="zomato-icon-badge">
                        <FiBell size={18} />
                      </div>
                      <div className="zomato-menu-content">
                        <span className="zomato-menu-title">Notifications & Alerts</span>
                        <span className="zomato-menu-subtitle">Live order updates & promos</span>
                      </div>
                    </div>
                    <FiChevronRight size={18} className="zomato-chevron" />
                  </button>

                  <button 
                    type="button" 
                    onClick={() => selectTab('payments')} 
                    className={`zomato-menu-row ${activeTab === 'payments' ? 'active' : ''}`}
                  >
                    <div className="zomato-row-left">
                      <div className="zomato-icon-badge">
                        <FiCreditCard size={18} />
                      </div>
                      <div className="zomato-menu-content">
                        <span className="zomato-menu-title">Payments & Wallet</span>
                        <span className="zomato-menu-subtitle">Cash on delivery & payment notice</span>
                      </div>
                    </div>
                    <FiChevronRight size={18} className="zomato-chevron" />
                  </button>
                </div>

                {/* Group 3: Support & Legal */}
                <div className="zomato-section-title">Support & Legal</div>
                <div className="zomato-section-card">
                  <button 
                    type="button" 
                    onClick={() => selectTab('support')} 
                    className={`zomato-menu-row ${activeTab === 'support' ? 'active' : ''}`}
                  >
                    <div className="zomato-row-left">
                      <div className="zomato-icon-badge">
                        <FiHelpCircle size={18} />
                      </div>
                      <div className="zomato-menu-content">
                        <span className="zomato-menu-title">Help & Customer Support</span>
                        <span className="zomato-menu-subtitle">FAQs & order assistance</span>
                      </div>
                    </div>
                    <FiChevronRight size={18} className="zomato-chevron" />
                  </button>

                  <Link to="/terms" className="zomato-menu-row">
                    <div className="zomato-row-left">
                      <div className="zomato-icon-badge">
                        <FiFileText size={18} />
                      </div>
                      <div className="zomato-menu-content">
                        <span className="zomato-menu-title">Terms & Conditions</span>
                        <span className="zomato-menu-subtitle">Platform terms & policies</span>
                      </div>
                    </div>
                    <FiChevronRight size={18} className="zomato-chevron" />
                  </Link>

                  <Link to="/privacy" className="zomato-menu-row">
                    <div className="zomato-row-left">
                      <div className="zomato-icon-badge">
                        <FiShield size={18} />
                      </div>
                      <div className="zomato-menu-content">
                        <span className="zomato-menu-title">Privacy Policy</span>
                        <span className="zomato-menu-subtitle">Data protection guidelines</span>
                      </div>
                    </div>
                    <FiChevronRight size={18} className="zomato-chevron" />
                  </Link>

                  <button 
                    type="button" 
                    onClick={() => selectTab('about')} 
                    className={`zomato-menu-row ${activeTab === 'about' ? 'active' : ''}`}
                  >
                    <div className="zomato-row-left">
                      <div className="zomato-icon-badge">
                        <FiInfo size={18} />
                      </div>
                      <div className="zomato-menu-content">
                        <span className="zomato-menu-title">About JDKart</span>
                        <span className="zomato-menu-subtitle">v1.0.0 (Fast Delivery Network)</span>
                      </div>
                    </div>
                    <FiChevronRight size={18} className="zomato-chevron" />
                  </button>
                </div>
              </>
            ) : (
              <div className="zomato-section-card">
                {user.role === 'admin' && (
                  <Link to="/admin" className="zomato-menu-row">
                    <div className="zomato-row-left">
                      <div className="zomato-icon-badge"><FiPackage size={18} /></div>
                      <div className="zomato-menu-content"><span className="zomato-menu-title">Admin Dashboard</span></div>
                    </div>
                    <FiChevronRight size={18} className="zomato-chevron" />
                  </Link>
                )}
                {user.role === 'restaurant' && (
                  <Link to="/restaurant" className="zomato-menu-row">
                    <div className="zomato-row-left">
                      <div className="zomato-icon-badge"><FiPackage size={18} /></div>
                      <div className="zomato-menu-content"><span className="zomato-menu-title">Restaurant Dashboard</span></div>
                    </div>
                    <FiChevronRight size={18} className="zomato-chevron" />
                  </Link>
                )}
                {user.role === 'store_owner' && (
                  <Link to="/store-owner" className="zomato-menu-row">
                    <div className="zomato-row-left">
                      <div className="zomato-icon-badge"><FiPackage size={18} /></div>
                      <div className="zomato-menu-content"><span className="zomato-menu-title">Store Dashboard</span></div>
                    </div>
                    <FiChevronRight size={18} className="zomato-chevron" />
                  </Link>
                )}
                {user.role === 'delivery' && (
                  <Link to="/delivery" className="zomato-menu-row">
                    <div className="zomato-row-left">
                      <div className="zomato-icon-badge"><FiPackage size={18} /></div>
                      <div className="zomato-menu-content"><span className="zomato-menu-title">Delivery Dashboard</span></div>
                    </div>
                    <FiChevronRight size={18} className="zomato-chevron" />
                  </Link>
                )}
              </div>
            )}

            {/* Logout Button */}
            <div style={{ marginTop: 8 }}>
              <button onClick={handleLogout} className="zomato-logout-btn">
                <FiLogOut size={17} />
                <span>Log Out of JDKart</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Area - Displays selected section one by one */}
        <div className="profile-content">
          {/* Section 1: Account Settings (Personal Information & Password) */}
          {activeTab === 'settings' && (
            <div className="profile-subview">
              <button type="button" onClick={backToMenu} className="zomato-back-pill">
                <FiArrowLeft size={16} />
                <span>Back to Profile</span>
              </button>
              
              <h1 className="profile-page-title">Account Settings</h1>
              
              <div className="profile-form-card">
                <h3>Personal Information</h3>
                <p className="profile-subtitle">Update your profile name, phone number or change password.</p>
                
                <form onSubmit={handleUpdateProfile} className="profile-form">
                  <div className="form-group">
                    <label>Full Name</label>
                    <div className="input-with-icon">
                      <FiUser className="input-icon" />
                      <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="Your full name" />
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Email <span className="readonly-badge">Verified</span></label>
                      <div className="input-with-icon readonly">
                        <FiMail className="input-icon" />
                        <input type="email" value={user?.email || ''} readOnly disabled />
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label>Mobile Number</label>
                      <div className="input-with-icon">
                        <FiPhone className="input-icon" />
                        <input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="10-digit mobile number" maxLength={15} />
                      </div>
                    </div>
                  </div>
                  
                  <h3 style={{ marginTop: '24px' }}>Change Password</h3>
                  <p className="profile-subtitle" style={{ marginBottom: '16px' }}>Leave blank if you don't wish to change your password.</p>
                  
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
            </div>
          )}

          {/* Section 2: Notifications */}
          {activeTab === 'notifications' && (
            <div className="profile-subview">
              <button type="button" onClick={backToMenu} className="zomato-back-pill">
                <FiArrowLeft size={16} />
                <span>Back to Profile</span>
              </button>

              <h1 className="profile-page-title">Notifications & Alerts</h1>
              
              <div className="profile-form-card">
                <h3>Live Order Tracking Alerts</h3>
                <p className="profile-subtitle">Receive instant real-time alerts for your orders, table bookings and promos.</p>
                
                <div className="notification-status-box">
                  <div className="notification-icon-wrapper">
                    <FiBell size={24} color={isNotificationActive ? '#16A34A' : '#94A3B8'} />
                  </div>
                  <div className="notification-status-text">
                    <h4>Device Push Notifications</h4>
                    <p>
                      {isNotificationActive ? 'You are receiving real-time order alerts on this device.'
                      : permission === 'denied' ? 'Notifications are blocked in your browser settings. Please allow notifications in browser permissions to receive live status.'
                      : 'Enable notifications to get instant status updates on food preparation and delivery.'}
                    </p>
                  </div>
                  
                  {permission === 'denied' ? (
                    <span className="notification-active-badge" style={{ background: '#FEE2E2', color: '#DC2626' }}>
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

                <div style={{ marginTop: 20, padding: '16px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Notification Highlights</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#475569' }}>
                      <FiCheckCircle color="#16A34A" size={16} /> Live delivery partner location & arrival updates
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#475569' }}>
                      <FiCheckCircle color="#16A34A" size={16} /> Instant dining table booking approvals
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#475569' }}>
                      <FiCheckCircle color="#16A34A" size={16} /> Exclusive coupon codes & festival price drops
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Saved Addresses */}
          {activeTab === 'addresses' && (
            <div className="profile-subview">
              <button type="button" onClick={backToMenu} className="zomato-back-pill">
                <FiArrowLeft size={16} />
                <span>Back to Profile</span>
              </button>

              <h1 className="profile-page-title">Saved Addresses</h1>

              <div className="profile-form-card">
                <h3>Primary Delivery Address</h3>
                <p className="profile-subtitle">Set your primary delivery address for faster one-tap checkout.</p>

                <form onSubmit={handleUpdateProfile} className="profile-form">
                  <div className="form-group">
                    <label>Default Address</label>
                    <div className="input-with-icon">
                      <span className="input-icon">📍</span>
                      <input 
                        type="text" 
                        name="address" 
                        value={formData.address} 
                        onChange={handleChange} 
                        placeholder="House/flat no., street, landmark, area, pincode" 
                      />
                    </div>
                  </div>
                  <button type="submit" className="profile-save-btn" style={{ alignSelf: 'flex-start', padding: '10px 20px', minWidth: 160 }} disabled={loading}>
                    {loading ? 'Saving...' : 'Update Primary Address'}
                  </button>
                </form>

                <div style={{ marginTop: '24px', padding: '16px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Address Book</h4>
                  {user?.addresses && user.addresses.length > 0 ? (
                    <ul style={{ paddingLeft: '20px', fontSize: '14px', color: '#475569', margin: 0 }}>
                      {user.addresses.map((addr, idx) => (
                        <li key={idx} style={{ marginBottom: '8px' }}>
                          <strong>{addr.label || 'Home'}:</strong> {addr.address || addr.addressLine1}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>No extra addresses saved yet.</p>
                  )}
                  <p style={{ fontSize: '12px', color: '#F97316', marginTop: '10px', marginBottom: 0, fontWeight: 600 }}>
                    * You can also add or pinpoint locations on the map anytime during cart checkout.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Payments & Wallet */}
          {activeTab === 'payments' && (
            <div className="profile-subview">
              <button type="button" onClick={backToMenu} className="zomato-back-pill">
                <FiArrowLeft size={16} />
                <span>Back to Profile</span>
              </button>

              <h1 className="profile-page-title">Payments & Wallet</h1>

              <div className="profile-form-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: 18, background: '#F0FDF4', borderRadius: 14, border: '1px solid #BBF7D0' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FiCreditCard size={22} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#14532D' }}>Cash on Delivery (COD)</h4>
                      <span style={{ background: '#16A34A', color: '#FFF', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6 }}>ACTIVE</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: '#166534', lineHeight: 1.5 }}>
                      Pay with cash upon food delivery. Available for all restaurants and grocery stores with zero extra fees.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: 18, background: '#FFF7ED', borderRadius: 14, border: '1px solid #FFEDD5' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: '#FFEDD5', color: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FiInfo size={22} />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#9A3412' }}>Online Payment Notice</h4>
                    <p style={{ margin: 0, fontSize: 13, color: '#C2410C', lineHeight: 1.5 }}>
                      Online UPI and gateway processing is undergoing scheduled security upgrades. Please choose <strong>Cash on Delivery</strong> at checkout.
                    </p>
                  </div>
                </div>

                <div style={{ padding: 16, background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                  <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: '#0F172A' }}>100% JDKart Buyer Protection</h4>
                  <p style={{ margin: 0, fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>
                    If you encounter any order discrepancies, spoiled food, or missing items, our customer care team resolves or refunds immediately.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Help & Customer Support */}
          {activeTab === 'support' && (
            <div className="profile-subview">
              <button type="button" onClick={backToMenu} className="zomato-back-pill">
                <FiArrowLeft size={16} />
                <span>Back to Profile</span>
              </button>

              <h1 className="profile-page-title">Help & Customer Support</h1>

              <div className="profile-form-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h3>Customer Support Hub</h3>
                <p className="profile-subtitle">Have queries about an order or booking? We're here to help.</p>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: 16, background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: '#FFF7ED', color: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FiMail size={22} />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Email Support</h4>
                    <p style={{ margin: '0 0 8px', fontSize: 13, color: '#64748B' }}>Reach our customer care team directly for order disputes or refunds.</p>
                    <a href="mailto:supportjdkart@gmail.com" style={{ color: '#F97316', fontWeight: 800, fontSize: 14, textDecoration: 'none' }}>
                      supportjdkart@gmail.com
                    </a>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: 16, background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: '#FFF7ED', color: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FiMapPin size={22} />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Service & Operational Hub</h4>
                    <p style={{ margin: '0 0 4px', fontSize: 13, color: '#64748B' }}>Akbarpur, Rohtas, Bihar - 821311</p>
                    <small style={{ color: '#94A3B8', fontSize: 12 }}>Delivering daily from 9:00 AM to 10:00 PM</small>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: 16, background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: '#FFF7ED', color: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FiHelpCircle size={22} />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Quick Links</h4>
                    <p style={{ margin: '0 0 8px', fontSize: 13, color: '#64748B' }}>Instant navigation to tracking, legal policies, and platform details.</p>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <Link to="/orders" style={{ padding: '7px 14px', borderRadius: 8, background: '#F97316', color: '#FFF', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                        Track Orders
                      </Link>
                      <Link to="/terms" style={{ padding: '7px 14px', borderRadius: 8, background: '#F1F5F9', color: '#0F172A', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                        Terms & Conditions
                      </Link>
                      <Link to="/privacy" style={{ padding: '7px 14px', borderRadius: 8, background: '#F1F5F9', color: '#0F172A', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                        Privacy Policy
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 6: About JDKart */}
          {activeTab === 'about' && (
            <div className="profile-subview">
              <button type="button" onClick={backToMenu} className="zomato-back-pill">
                <FiArrowLeft size={16} />
                <span>Back to Profile</span>
              </button>

              <h1 className="profile-page-title">About JDKart</h1>

              <div className="profile-form-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%', background: '#FFF7ED',
                    color: '#F97316', display: 'inline-flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 28, fontWeight: 900, marginBottom: 12
                  }}>
                    JD
                  </div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>JDKart Food & Essentials</h3>
                  <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: 13 }}>Version 1.0.0 (Fast Delivery Network)</p>
                </div>

                <div style={{ padding: 16, background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0', lineHeight: 1.6, fontSize: 14, color: '#334155' }}>
                  <p style={{ margin: '0 0 10px' }}>
                    JDKart is your premier food and grocery delivery partner headquartered in <strong>Akbarpur, Rohtas, Bihar</strong>.
                  </p>
                  <p style={{ margin: 0 }}>
                    We connect hungry customers with the finest local restaurants and neighborhood stores, offering swift doorstep deliveries, transparent pricing, and trusted customer care.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 8 }}>
                  <Link to="/terms" style={{ color: '#F97316', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Terms of Service</Link>
                  <span style={{ color: '#CBD5E1' }}>•</span>
                  <Link to="/privacy" style={{ color: '#F97316', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Privacy Policy</Link>
                  <span style={{ color: '#CBD5E1' }}>•</span>
                  <Link to="/about" style={{ color: '#F97316', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Full Story</Link>
                </div>
              </div>
            </div>
          )}

          {/* Non-customer fallback */}
          {!isCustomer && (
            <div className="profile-subview">
              <h1 className="profile-page-title">Settings & Profile</h1>
              <div className="profile-form-card">
                <h3>Personal Information</h3>
                <p className="profile-subtitle">Update your personal details and password.</p>
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
                        <input type="text" name="phone" value={formData.phone} onChange={handleChange} />
                      </div>
                    </div>
                  </div>
                  <button type="submit" className="profile-save-btn" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCropper && imageToCrop && (
        <ImageCropperModal
          imageSrc={imageToCrop}
          aspect={1}
          onCancel={() => { setShowCropper(false); setImageToCrop(null); }}
          onCropDone={handleCropDone}
        />
      )}
    </div>
  );
}


