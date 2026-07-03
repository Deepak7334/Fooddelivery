import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  pending: '#FF9800', accepted: '#2196F3', preparing: '#9C27B0',
  out_for_delivery: '#00BCD4', delivered: '#4CAF50', cancelled: '#F44336',
};

export default function StoreOwnerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = (status = 'all') => {
    setLoading(true);
    api.get('/store-owner/orders', { params: status !== 'all' ? { status } : {} })
      .then(res => setOrders(res.data.orders || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

   
  useEffect(() => {
    // eslint-disable-next-line
    load(filter);
  }, [filter]);

  const updateStatus = async (orderId, status, otp) => {
    try {
      const res = await api.patch(`/store-owner/orders/${orderId}/status`, { status, otp });
      setOrders(prev => prev.map(o => o._id === orderId ? res.data.order : o));
      toast.success(`Order marked as ${status}`);
      if (res.data.devOtp) toast(`Dev OTP: ${res.data.devOtp}`, { duration: 10000, icon: '🔐' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update status'); }
  };

  return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 20 }}>Orders</h1>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['all', 'pending', 'accepted', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '7px 16px', borderRadius: 100, fontWeight: 600, fontSize: 12, cursor: 'pointer',
            border: filter === s ? `2px solid ${STATUS_COLORS[s] || 'var(--primary)'}` : '2px solid transparent',
            background: filter === s ? `${STATUS_COLORS[s] || 'var(--primary)'}22` : 'rgba(255,255,255,0.05)',
            color: filter === s ? (STATUS_COLORS[s] || 'var(--primary)') : 'var(--text-secondary)',
          }}>
            {s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : orders.length === 0 ? (
        <div className="empty-state"><div style={{ fontSize: 48 }}>📦</div><h3>No orders {filter !== 'all' ? `with status "${filter}"` : 'yet'}</h3></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {orders.map(order => (
            <div key={order._id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                <div>
                  <div style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
                    #{order._id.slice(-8).toUpperCase()}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{order.customerId?.name || 'Customer'}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{order.customerId?.phone || order.customerId?.email}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ padding: '5px 14px', borderRadius: 100, fontWeight: 700, fontSize: 12, background: `${STATUS_COLORS[order.status] || '#999'}22`, color: STATUS_COLORS[order.status] || '#999' }}>
                    {order.status?.replace(/_/g, ' ')} {order.status === 'delivered' && order.otpVerified ? ' ✓' : ''}
                  </span>
                  <div style={{ fontWeight: 800, fontSize: 18, marginTop: 6 }}>₹{order.finalAmount}</div>
                </div>
              </div>

              {/* Items */}
              <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {order.items?.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span>{item.name} {item.unit ? `(${item.unit})` : ''}</span>
                    <span style={{ color: 'var(--text-muted)' }}>x{item.quantity} · ₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                📍 {order.deliveryAddress} · {new Date(order.createdAt).toLocaleString('en-IN')}
              </div>

              {/* Actions */}
              {order.status === 'pending' && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => updateStatus(order._id, 'accepted')} className="btn btn-primary btn-sm">Accept</button>
                  <button onClick={() => updateStatus(order._id, 'cancelled')} className="btn btn-sm" style={{ background: 'rgba(244,67,54,0.1)', color: 'var(--danger)', border: '1px solid rgba(244,67,54,0.2)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                </div>
              )}
              {order.status === 'accepted' && (
                <button onClick={() => updateStatus(order._id, 'preparing')} className="btn btn-primary btn-sm">Mark Preparing</button>
              )}
              {order.status === 'preparing' && (
                <button onClick={() => updateStatus(order._id, 'out_for_delivery')} className="btn btn-primary btn-sm">Mark Out for Delivery</button>
              )}
              {order.status === 'out_for_delivery' && (
                <button onClick={() => {
                  const otp = window.prompt('Enter 6-digit Delivery OTP provided by the customer:');
                  if (otp) {
                    updateStatus(order._id, 'delivered', otp);
                  }
                }} className="btn btn-primary btn-sm">Mark Delivered (Verify OTP)</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
