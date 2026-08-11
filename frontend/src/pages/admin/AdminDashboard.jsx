import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../lib/api';

import { FiShoppingBag, FiUsers, FiList, FiTrendingUp } from 'react-icons/fi';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [settings, setSettings] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);


  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/settings')
    ]).then(([statsRes, settingsRes]) => {
      setStats(statsRes.data.stats);
      setRecentOrders(statsRes.data.recentOrders || []);
      setSettings(settingsRes.data.settings || { platformCommissionRate: 15 });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);


  if (loading) return <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  const statCards = [
    { icon: '', label: 'Total Customers', value: stats?.totalUsers || 0, color: '#00BCD4', link: '/admin/users' },
    { icon: '', label: 'Restaurants', value: stats?.totalRestaurants || 0, color: '#FF5722', link: '/admin/restaurants' },
    { icon: '', label: 'Stores', value: stats?.totalStores || 0, color: '#4CAF50', link: '/admin/stores' },
    { icon: '', label: 'Total Orders', value: stats?.totalOrders || 0, color: '#9C27B0', link: '/admin/orders' },
    { icon: '', label: 'Table Bookings', value: stats?.totalBookings || 0, color: '#FF9800', link: '/admin/bookings' },
    { icon: '', label: 'Total Revenue', value: `₹${(stats?.totalRevenue || 0).toLocaleString('en-IN')}`, color: '#4CAF50', link: '/admin/orders' },
    { icon: '', label: 'Platform Earnings', value: `₹${(stats?.adminEarnings || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: '#009688', link: '/admin/orders' },
    { icon: '', label: 'Vendor Payouts', value: `₹${(stats?.vendorPayouts || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: '#E91E63', link: '/admin/payouts' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Admin <span style={{ color: 'var(--primary)' }}>Dashboard</span></h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>Welcome back, Admin</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        {statCards.map(card => (
          <Link to={card.link} key={card.label} style={{ textDecoration: 'none' }}>
            <div className="stat-card" style={{ cursor: 'pointer', transition: 'var(--transition)' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = card.color + '44'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
              <div className="stat-icon" style={{ background: card.color + '22', color: card.color }}>
                {card.icon}
              </div>
              <div className="stat-value" style={{ color: card.color }}>{card.value}</div>
              <div className="stat-label">{card.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>Quick Actions</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/admin/restaurants" className="btn btn-primary"><FiShoppingBag /> Add Restaurant</Link>
          <Link to="/admin/stores" className="btn btn-primary" style={{ background: '#4CAF50' }}>Add Store</Link>
          <Link to="/admin/bookings" className="btn btn-primary" style={{ background: '#FF9800' }}>Manage Bookings</Link>
          <Link to="/admin/categories" className="btn btn-secondary"><span></span> Manage Categories</Link>
          <Link to="/admin/orders" className="btn btn-secondary"><FiList /> View All Orders</Link>
          <Link to="/admin/items" className="btn btn-primary" style={{ background: '#9C27B0' }}>View All Items</Link>
        </div>
      </div>

      {/* Platform Settings */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>Platform Settings</h2>
        <div className="card" style={{ padding: 24, maxWidth: 500, display: 'flex', alignItems: 'flex-end', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Commission Rate (%)</label>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>This percentage is automatically deducted from all future orders as your platform fee.</p>
            <input 
              type="number" 
              className="input-field" 
              value={settings?.platformCommissionRate || 15}
              onChange={(e) => setSettings({ ...settings, platformCommissionRate: Number(e.target.value) })}
              min="0" max="100"
              style={{ width: '100%', maxWidth: 200 }}
            />
          </div>
          <button 
            className="btn btn-primary"
            disabled={savingSettings}
            onClick={async () => {
              setSavingSettings(true);
              try {
                await api.put('/admin/settings', settings);
                toast.success('Commission rate updated successfully!');
              } catch(e) { toast.error('Failed to update settings'); }
              setSavingSettings(false);
            }}
            style={{ padding: '12px 24px' }}
          >
            {savingSettings ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Recent Orders */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontWeight: 800, fontSize: 20 }}>Recent Orders</h2>
          <Link to="/admin/orders" style={{ fontSize: 14, color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>View All →</Link>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {recentOrders.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>No orders yet</h3>
            </div>
          ) : recentOrders.map(order => {
            const stColors = {
              pending: { bg: 'rgba(255,152,0,0.15)', color: '#FF9800' },
              accepted: { bg: 'rgba(0,188,212,0.15)', color: '#00BCD4' },
              out_for_delivery: { bg: 'rgba(33,150,243,0.15)', color: '#2196F3' },
              delivered: { bg: 'rgba(76,175,80,0.15)', color: '#4CAF50' },
              cancelled: { bg: 'rgba(244,67,54,0.15)', color: '#F44336' }
            };
            const st = stColors[order.status] || { bg: 'rgba(158,158,158,0.15)', color: '#9E9E9E' };
            const vendorName = order.restaurantName || order.restaurantId?.name || order.storeName || order.storeId?.name || 'JDkart';

            return (
              <div key={order._id} className="card" onClick={() => navigate('/admin/orders')} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, transition: 'transform 0.2s', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform='none'}>
                {/* Top Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 8, background: 'rgba(255,107,107,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                      🍽️
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>{vendorName}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Order #{order._id.slice(-8).toUpperCase()}</div>
                    </div>
                  </div>
                  <span style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', background: st.bg, color: st.color, letterSpacing: '0.5px' }}>
                    {order.status?.replace(/_/g, ' ')}
                  </span>
                </div>

                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

                {/* Middle Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    <div style={{ marginBottom: 4 }}><strong style={{ color: 'var(--text-primary)' }}>Customer:</strong> {order.customerId?.name || 'N/A'}</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span>{new Date(order.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      <span>·</span>
                      <span>{order.items?.length || 0} items</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginBottom: 4 }}>Total Paid</div>
                    <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--primary)' }}>₹{order.finalAmount}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
