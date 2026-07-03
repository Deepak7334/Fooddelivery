import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const STATUS_FLOW = { pending: 'accepted', accepted: 'preparing' };
const STATUS_LABELS = { pending: 'Order Placed', accepted: 'Accepted', preparing: 'Preparing', out_for_delivery: 'Out for Delivery', delivered: 'Delivered', cancelled: 'Cancelled' };
const STATUS_ICONS = { pending: '', accepted: '', preparing: '', out_for_delivery: '', delivered: '', cancelled: '' };

export default function RestaurantOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [updating, setUpdating] = useState({});
  const { user } = useAuth();
  const socketRef = useRef(null);

  const fetchOrders = () => {
    const q = statusFilter ? `?status=${statusFilter}` : '';
    api.get(`/restaurant/orders${q}`).then(res => setOrders(res.data.orders || [])).catch(console.error).finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchOrders(); }, [statusFilter]);

  useEffect(() => {
    if (!user?.restaurantId) return;
    socketRef.current = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');
    socketRef.current.emit('join_restaurant_room', user.restaurantId);
    socketRef.current.on('order:new', (order) => {
      toast('🔔 New order received!', { icon: '📦', duration: 5000 });
      setOrders(prev => [order, ...prev]);
    });
    socketRef.current.on('order:cancelled', ({ orderId }) => {
      toast('Order cancelled by customer', { icon: '❌' });
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: 'cancelled' } : o));
    });
    socketRef.current.on('order:updated', (order) => {
      setOrders(prev => prev.map(o => o._id === order._id ? { ...o, ...order } : o));
    });
    socketRef.current.on('order:agent_assigned', ({ orderId, agent }) => {
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, deliveryAgentName: agent.name } : o));
      toast(` Agent ${agent.name} assigned to order #${orderId.slice(-4)}`, { icon: '🚴' });
    });
    return () => socketRef.current?.disconnect();
  }, [user?.restaurantId]);

  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdating(p => ({ ...p, [orderId]: true }));
    try {
      const res = await api.patch(`/restaurant/orders/${orderId}/status`, { status: newStatus });
      setOrders(prev => prev.map(o => o._id === orderId ? res.data.order : o));
      toast.success(`Order marked as ${STATUS_LABELS[newStatus]}`);
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setUpdating(p => ({ ...p, [orderId]: false })); }
  };

  // eslint-disable-next-line no-unused-vars
  const handleSendOTP = async (orderId) => {
    setUpdating(p => ({ ...p, [`otp_${orderId}`]: true }));
    try {
      const res = await api.post(`/restaurant/orders/${orderId}/send-otp`);
      toast.success('OTP sent to customer! ');
      if (res.data.otp) toast(`Dev OTP: ${res.data.otp}`, { duration: 10000, icon: '🔐' });
    } catch (err) { toast.error(err.response?.data?.message || 'Error sending OTP'); }
    finally { setUpdating(p => ({ ...p, [`otp_${orderId}`]: false })); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}> <span style={{ color: 'var(--primary)' }}>Orders</span></h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['', 'pending', 'accepted', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 12 }}>
              {s ? `${STATUS_ICONS[s]} ${STATUS_LABELS[s]}` : 'All'}
            </button>
          ))}
          <button onClick={fetchOrders} className="btn btn-secondary btn-sm"> Refresh</button>
        </div>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        : orders.length === 0 ? <div className="empty-state"><div className="empty-state-icon">📋</div><h3>No orders</h3><p>New orders will appear here in real-time.</p></div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {orders.map(order => (
              <div key={order._id} className="card" style={{ padding: 20, borderLeft: `4px solid ${order.status === 'pending' ? 'var(--warning)' : order.status === 'cancelled' ? 'var(--danger)' : order.status === 'delivered' ? 'var(--success)' : 'var(--primary)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-secondary)' }}>#{order._id.slice(-8).toUpperCase()}</span>
                      <span className={`badge badge-${order.status}`}>{STATUS_ICONS[order.status]} {STATUS_LABELS[order.status]}</span>
                      <span className={`badge badge-${order.paymentStatus}`}>{order.paymentStatus}</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{order.customerId?.name || 'Customer'}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}> {order.customerId?.phone || order.customerPhone || '—'} · {order.customerId?.email || '—'}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}> {order.deliveryAddress}</div>
                    {order.specialInstructions && <div style={{ fontSize: 12, color: 'var(--warning)', marginTop: 4 }}>{order.specialInstructions}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>₹{order.finalAmount}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                  {order.items?.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', padding: '4px 0', borderBottom: i < order.items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                      <span>{item.name} × {item.quantity}</span>
                      <span>₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                {order.status !== 'delivered' && order.status !== 'cancelled' && order.status !== 'out_for_delivery' && (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {STATUS_FLOW[order.status] && (
                      <button onClick={() => handleStatusUpdate(order._id, STATUS_FLOW[order.status])} disabled={updating[order._id]} className="btn btn-primary btn-sm">
                        {updating[order._id] ? '...' : `Move to: ${STATUS_LABELS[STATUS_FLOW[order.status]]} ${STATUS_ICONS[STATUS_FLOW[order.status]]}`}
                      </button>
                    )}
                    {order.status === 'pending' && (
                      <button onClick={() => handleStatusUpdate(order._id, 'cancelled')} disabled={updating[order._id]} className="btn btn-danger btn-sm">
                        ❌ Cancel
                      </button>
                    )}
                  </div>
                )}
                {/* Admin handoff note — restaurant's job ends at preparing */}
                {order.status === 'preparing' && (
                  <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8, fontSize: 12, color: '#A78BFA', fontWeight: 600 }}>
                    ✅ Food ready. Admin will assign a delivery agent and dispatch the order.
                  </div>
                )}
                {order.status === 'out_for_delivery' && (
                  <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 8, fontSize: 12, color: '#06B6D4', fontWeight: 600 }}>
                    🚴 Out for delivery — Agent: {order.deliveryAgentId?.name || order.deliveryAgentName || '—'}
                  </div>
                )}
                {order.status === 'delivered' && order.otpVerified && (
                  <div style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>✅ OTP verified · Delivery confirmed</div>
                )}
              </div>
            ))}
          </div>}
    </div>
  );
}
