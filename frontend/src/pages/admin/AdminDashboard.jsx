import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { FiShoppingBag, FiUsers, FiList, FiTrendingUp } from 'react-icons/fi';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats').then(res => {
      setStats(res.data.stats);
      setRecentOrders(res.data.recentOrders || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  const statCards = [
    { icon: '', label: 'Total Customers', value: stats?.totalUsers || 0, color: '#00BCD4', link: '/admin/users' },
    { icon: '', label: 'Restaurants', value: stats?.totalRestaurants || 0, color: '#FF5722', link: '/admin/restaurants' },
    { icon: '', label: 'Total Orders', value: stats?.totalOrders || 0, color: '#9C27B0', link: '/admin/orders' },
    { icon: '', label: 'Table Bookings', value: stats?.totalBookings || 0, color: '#FF9800', link: '/admin/bookings' },
    { icon: '', label: 'Total Revenue', value: `₹${(stats?.totalRevenue || 0).toLocaleString('en-IN')}`, color: '#4CAF50', link: '/admin/orders' },
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
          <Link to="/admin/bookings" className="btn btn-primary" style={{ background: '#FF9800' }}>Manage Bookings</Link>
          <Link to="/admin/categories" className="btn btn-secondary"><span></span> Manage Categories</Link>
          <Link to="/admin/orders" className="btn btn-secondary"><FiList /> View All Orders</Link>
        </div>
      </div>

      {/* Recent Orders */}
      <div>
        <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>Recent Orders</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Order ID</th><th>Customer</th><th>Restaurant</th><th>Amount</th><th>Status</th><th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No orders yet</td></tr>
              ) : recentOrders.map(order => (
                <tr key={order._id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>#{order._id.slice(-8).toUpperCase()}</td>
                  <td>{order.customerId?.name || 'N/A'}</td>
                  <td>{order.restaurantId?.name || order.restaurantName}</td>
                  <td style={{ fontWeight: 700, color: 'var(--primary)' }}>₹{order.finalAmount}</td>
                  <td><span className={`badge badge-${order.status}`}>{order.status?.replace(/_/g, ' ')}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(order.createdAt).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
