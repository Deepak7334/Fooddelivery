import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { FiPackage, FiShoppingBag, FiClock, FiTrendingUp } from 'react-icons/fi';

export default function StoreOwnerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/store-owner/dashboard')
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;
  if (!data?.store) return (
    <div className="empty-state">
      <div style={{ fontSize: 64, marginBottom: 16 }}>🏪</div>
      <h3>No store linked</h3>
      <p>Contact admin to link a store to your account.</p>
    </div>
  );

  const { store, stats } = data;
  const cards = [
    { icon: <FiPackage size={22} />, label: 'Products', value: stats.totalProducts, color: '#9C27B0', link: '/store-owner/products' },
    { icon: <FiShoppingBag size={22} />, label: 'Total Orders', value: stats.totalOrders, color: '#2196F3', link: '/store-owner/orders' },
    { icon: <FiClock size={22} />, label: 'Pending Orders', value: stats.pendingOrders, color: '#FF9800', link: '/store-owner/orders?status=pending' },
    { icon: <FiTrendingUp size={22} />, label: 'Revenue', value: `₹${stats.totalRevenue?.toLocaleString('en-IN')}`, color: '#4CAF50', link: '/store-owner/orders' },
  ];

  return (
    <div>
      {/* Store info */}
      <div style={{ marginBottom: 28, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        {store.image && <img loading="lazy" src={store.image} alt={store.name} style={{ width: 64, height: 64, borderRadius: 14, objectFit: 'cover', border: '2px solid var(--border)' }} />}
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800 }}>{store.name}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            <span style={{ background: 'rgba(255,87,34,0.12)', color: 'var(--primary)', padding: '2px 10px', borderRadius: 100, fontWeight: 700, fontSize: 12 }}>
              {store.storeType?.toUpperCase()}
            </span>
            &nbsp; {store.city}
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <span style={{ padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 700, background: store.isOpen ? 'rgba(76,175,80,0.15)' : 'rgba(244,67,54,0.15)', color: store.isOpen ? 'var(--success)' : 'var(--danger)' }}>
            {store.isOpen ? '● Open' : '● Closed'}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        {cards.map(c => (
          <Link to={c.link} key={c.label} style={{ textDecoration: 'none' }}>
            <div className="stat-card" style={{ cursor: 'pointer', transition: 'var(--transition)' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = c.color + '44'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
              <div className="stat-icon" style={{ background: c.color + '22', color: c.color }}>{c.icon}</div>
              <div className="stat-value" style={{ color: c.color }}>{c.value}</div>
              <div className="stat-label">{c.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 14 }}>Quick Actions</h2>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link to="/store-owner/products" className="btn btn-primary"><FiPackage /> Add Products</Link>
        <Link to="/store-owner/orders" className="btn btn-secondary"><FiShoppingBag /> View Orders</Link>
      </div>
    </div>
  );
}
