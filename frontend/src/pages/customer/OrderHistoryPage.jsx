import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/customer/orders').then(res => setOrders(res.data.orders || [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 80, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  return (
    <div className="page-wrapper">
      <div className="container">
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 32 }}>My <span style={{ color: 'var(--primary)' }}>Orders</span></h1>
        {orders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"></div>
            <h3>No orders yet!</h3>
            <p>Start exploring restaurants and place your first order.</p>
            <Link to="/restaurants" className="btn btn-primary btn-lg" style={{ marginTop: 24 }}>Browse Restaurants</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {orders.map(order => (
              <div key={order._id} className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{order.restaurantName || order.restaurantId?.name}</div>
                      <span className={`badge badge-${order.status}`}>{order.status?.replace(/_/g, ' ')}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                      {order.items?.map(i => `${i.name} × ${i.quantity}`).join(' · ')}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {new Date(order.createdAt).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--primary)', marginBottom: 12 }}>₹{order.finalAmount}</div>
                    {(order.status === 'pending' || order.status === 'accepted' || order.status === 'preparing' || order.status === 'out_for_delivery') && (
                      <Link to={`/orders/${order._id}/track`} className="btn btn-primary btn-sm">Track Order →</Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
