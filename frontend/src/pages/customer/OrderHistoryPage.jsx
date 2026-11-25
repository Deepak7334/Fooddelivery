import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { FiPackage, FiCalendar, FiXCircle, FiClock, FiUsers, FiGrid, FiStar, FiCheckCircle, FiLock, FiX } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import './CustomerTransactions.css';
import ReviewOrderModal from './ReviewOrderModal';

const CANCELLATION_WINDOW_SECONDS = 150; // 2 minutes 30 seconds
const WHATSAPP_SUPPORT_NUMBER = '917762971182';

const getRemainingSeconds = (createdAt) => {
  if (!createdAt) return 0;
  const createdTime = new Date(createdAt).getTime();
  const now = Date.now();
  const elapsed = Math.floor((now - createdTime) / 1000);
  return Math.max(0, CANCELLATION_WINDOW_SECONDS - elapsed);
};

const formatCountdown = (totalSeconds) => {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const STATUS_STYLES = {
  pending:   { bg: '#FEF3C7', color: '#B45309', label: 'Pending' },
  confirmed: { bg: '#DCFCE7', color: '#15803D', label: 'Confirmed' },
  rejected:  { bg: '#FEE2E2', color: '#B91C1C', label: 'Rejected' },
  cancelled: { bg: '#F1F5F9', color: '#64748B', label: 'Cancelled' },
};

const ORDER_STATUS = {
  pending:          { bg: '#FEF3C7', color: '#B45309' },
  accepted:         { bg: '#FEF3C7', color: '#B45309' },
  preparing:        { bg: '#FEF3C7', color: '#B45309' },
  out_for_delivery: { bg: '#FEF3C7', color: '#B45309' },
  delivered:        { bg: '#DCFCE7', color: '#15803D' },
  cancelled:        { bg: '#FEE2E2', color: '#B91C1C' },
};

export default function OrderHistoryPage() {
  const { user } = useAuth();
  const locationObj = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(locationObj.search);
  const initialTab = params.get('tab') === 'bookings' ? 'bookings' : 'orders';

  const [tab, setTab] = useState(initialTab);
  const [orders, setOrders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);

  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [ratingOrder, setRatingOrder] = useState(null);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      setLoadingOrders(false);
      return;
    }
    setLoadingOrders(true);
    api.get('/customer/orders')
      .then(res => setOrders(res.data.orders || []))
      .catch(console.error)
      .finally(() => setLoadingOrders(false));
  }, [user]);

  useEffect(() => {
    if (!user) {
      setBookings([]);
      setLoadingBookings(false);
      return;
    }
    setLoadingBookings(true);
    api.get('/booking/customer/bookings/mine')
      .then(res => setBookings(Array.isArray(res.data) ? res.data : []))
      .catch(console.error)
      .finally(() => setLoadingBookings(false));
  }, [user]);

  // Sync tab with URL param
  useEffect(() => {
    const p = new URLSearchParams(locationObj.search);
    setTab(p.get('tab') === 'bookings' ? 'bookings' : 'orders');
  }, [locationObj.search]);

  const switchTab = (t) => {
    navigate(`/orders${t === 'bookings' ? '?tab=bookings' : ''}`, { replace: true });
    setTab(t);
  };

  // Live 1-second ticker for 2:30 min cancellation countdown
  const [, setTimerTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTimerTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCancelOrder = async (orderItem) => {
    const id = typeof orderItem === 'string' ? orderItem : orderItem._id;
    const createdAt = typeof orderItem === 'object' ? orderItem.createdAt : null;
    if (createdAt && getRemainingSeconds(createdAt) <= 0) {
      toast.error('After 2.30 minutes Apka order cancel nhi ho sakta..');
      return;
    }
    if (!confirm('Cancel this order? Free cancellation is only available within 2:30 minutes.')) return;
    setCancellingId(id);
    try {
      await api.patch(`/customer/orders/${id}/cancel`);
      setOrders(prev => prev.map(o => o._id === id ? { ...o, status: 'cancelled' } : o));
      toast.success('Order cancelled');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not cancel order');
    } finally {
      setCancellingId(null);
    }
  };

  const handleCancelBooking = async (id) => {
    if (!confirm('Cancel this booking?')) return;
    setCancellingId(id);
    try {
      await api.patch(`/booking/customer/bookings/${id}/cancel`);
      setBookings(prev => prev.map(b => b._id === id ? { ...b, status: 'cancelled' } : b));
      toast.success('Booking cancelled');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not cancel booking');
    } finally {
      setCancellingId(null);
    }
  };

  const handleRatingSuccess = () => {
    setOrders(prev => prev.map(o => o._id === ratingOrder._id ? { ...o, isReviewed: true } : o));
    setRatingModalOpen(false);
    setRatingOrder(null);
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
  });

  return (
    <div className="page-wrapper customer-transactions tx-orders tx-with-nav">
      <header className="tx-page-header">
        <div className="container tx-header-inner"><h1>My Orders</h1></div>
      </header>
      <div className="container">

        {/* Tab Bar */}
        <div className="tx-tabs">
          <button
            onClick={() => switchTab('orders')}
            className={tab === 'orders' ? 'tab-btn tab-btn-active' : 'tab-btn'}
          >
            <FiPackage size={15} />
            Orders {orders.length > 0 && <span className="tab-count">{orders.length}</span>}
          </button>
          <button
            onClick={() => switchTab('bookings')}
            className={tab === 'bookings' ? 'tab-btn tab-btn-active' : 'tab-btn'}
          >
            <FiCalendar size={15} />
            Table Bookings {bookings.length > 0 && <span className="tab-count">{bookings.length}</span>}
          </button>
        </div>

        {!user ? (
          <div className="card" style={{ maxWidth: 520, margin: '32px auto', padding: '40px 24px', textAlign: 'center', background: '#FFF' }}>
            <div style={{
              width: 76,
              height: 76,
              margin: '0 auto 18px',
              borderRadius: '50%',
              background: '#FFF7ED',
              color: '#F97316',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FiLock size={36} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px', color: '#0F172A' }}>
              {tab === 'bookings' ? 'Log in to see your reservations' : 'Log in to see your orders'}
            </h3>
            <p style={{ color: '#64748B', fontSize: 14, margin: '0 0 24px' }}>
              {tab === 'bookings'
                ? 'Sign in to view, manage or cancel your table bookings.'
                : 'Sign in to track your live food deliveries and order history.'}
            </p>
            <button
              onClick={() => navigate('/login', { state: { from: locationObj } })}
              className="btn btn-primary btn-lg"
              style={{
                width: '100%',
                maxWidth: 280,
                margin: '0 auto',
                height: 48,
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 700,
                background: '#F97316'
              }}
            >
              Log in / Sign up
            </button>
          </div>
        ) : (
          <>
            {/* ORDERS TAB */}
        {tab === 'orders' && (
          loadingOrders ? (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto' }} />
            </div>
          ) : orders.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><FiPackage size={52} /></div>
              <h3>No orders yet!</h3>
              <p>Start exploring restaurants/Stores and place your first order.</p>
              <Link to="/restaurants" className="btn btn-primary" style={{ marginTop: 24 }}>Browse Restaurants</Link>
            </div>
          ) : (
            <div className="tx-history-list">
              {orders.map(order => {
                const st = ORDER_STATUS[order.status] || ORDER_STATUS.pending;
                return (
                  <div key={order._id} className="card" style={{ padding: 20, cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => navigate(`/orders/${order._id}/track`)} onMouseEnter={e => e.currentTarget.style.transform='scale(1.01)'} onMouseLeave={e => e.currentTarget.style.transform='none'}>
                    <div className="tx-order-content">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                          <div style={{ fontWeight: 700, fontSize: 16 }}>{order.restaurantName || order.restaurantId?.name || order.storeName || order.storeId?.name || 'JDkart Order'}</div>
                          <span className="tx-status-badge" style={{ background: st.bg, color: st.color }}>
                            {order.status?.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="tx-order-items">
                          {order.items?.map(i => `${i.name} ×${i.quantity}`).join(' · ')}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {new Date(order.createdAt).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {['pending', 'accepted'].includes(order.status) && (
                          (() => {
                            const remaining = getRemainingSeconds(order.createdAt);
                            return (
                              <div style={{
                                fontSize: 11.5,
                                fontWeight: 600,
                                marginTop: 5,
                                color: remaining > 0 ? '#C2410C' : '#64748B'
                              }}>
                                {remaining > 0 ? (
                                  <>⏱️ Cancel window: <strong>{formatCountdown(remaining)}</strong> left (After 2.30 minutes Apka order cancel nhi ho sakta..)</>
                                ) : (
                                  <>🔒 Order Confirmed (After 2.30 minutes Apka order cancel nhi ho sakta..)</>
                                )}
                              </div>
                            );
                          })()
                        )}
                      </div>
                      <div className="tx-order-price-actions">
                        <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--primary)', marginBottom: 10, textAlign: 'right' }}>₹{order.finalAmount}</div>
                        <div className="tx-order-actions">
                          {order.status === 'delivered' && !order.isReviewed ? (
                            <button className="btn btn-secondary btn-sm" onClick={(e) => {
                              e.stopPropagation();
                              setRatingOrder(order);
                              setRatingModalOpen(true);
                            }}>⭐ Rate Order</button>
                          ) : order.isReviewed ? (
                            <span style={{ fontSize: 13, color: '#4CAF50', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginRight: 4 }}>
                              ✅ Reviewed
                            </span>
                          ) : null}

                          {['pending', 'accepted'].includes(order.status) && (
                            (() => {
                              const remaining = getRemainingSeconds(order.createdAt);
                              const whatsappMsg = encodeURIComponent(`Hi JDkart Support, I need help with my Order #${order._id?.slice(-8).toUpperCase()}`);
                              if (remaining > 0) {
                                return (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleCancelOrder(order); }}
                                    disabled={cancellingId === order._id}
                                    className="btn btn-sm btn-cancel-countdown"
                                    style={{ background: 'rgba(239,68,68,0.1)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.3)', fontWeight: 800, borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                                    title="Cancel order within 2:30 minutes"
                                  >
                                    <FiX size={13} />
                                    {cancellingId === order._id ? 'Cancelling...' : `Cancel (${formatCountdown(remaining)})`}
                                  </button>
                                );
                              }
                              return (
                                <a
                                  href={`https://wa.me/${WHATSAPP_SUPPORT_NUMBER}?text=${whatsappMsg}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="btn btn-sm btn-whatsapp-support"
                                  style={{ background: '#25D366', color: '#fff', border: 'none', fontWeight: 800, borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}
                                  title="Need help with this order? Chat on WhatsApp"
                                >
                                  <FaWhatsapp size={14} /> Help / WhatsApp
                                </a>
                              );
                            })()
                          )}
                          {order.status === 'delivered' || order.status === 'cancelled' ? (
                            <Link to={`/orders/${order._id}/track`} className="btn btn-primary btn-sm" onClick={e => e.stopPropagation()}>Details</Link>
                          ) : (
                            <Link to={`/orders/${order._id}/track`} className="btn btn-primary btn-sm" onClick={e => e.stopPropagation()}>Track →</Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* BOOKINGS TAB */}
        {tab === 'bookings' && (
          loadingBookings ? (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto' }} />
            </div>
          ) : bookings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><FiGrid size={52} /></div>
              <h3>No table bookings yet!</h3>
              <p>Browse restaurants and book a table at your favourite spot.</p>
              <Link to="/restaurants" className="btn btn-primary" style={{ marginTop: 24 }}>Find a Restaurant</Link>
            </div>
          ) : (
            <div className="tx-history-list">
              {bookings.map(b => {
                const s = STATUS_STYLES[b.status] || STATUS_STYLES.pending;
                return (
                  <div key={b._id} className="card" style={{ padding: 20 }}>
                    <div className="tx-order-content">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Restaurant name */}
                        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
                           {b.restaurantId?.name || 'Restaurant'}
                        </div>
                        {/* Booking details */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                          <span>🪑 Table {b.tableNumber}</span>
                          <span>📅 {formatDate(b.date)}</span>
                          <span>🕐 {b.timeSlot}</span>
                          <span>👥 {b.partySize} guest{b.partySize !== 1 ? 's' : ''}</span>
                        </div>
                        {b.notes && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            💬 {b.notes}
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                          Booked: {new Date(b.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
                        {/* Status badge */}
                        <span style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
                          {s.label}
                        </span>
                        {/* Cancel button for pending */}
                        {b.status === 'pending' && (
                          <button
                            onClick={() => handleCancelBooking(b._id)}
                            disabled={cancellingId === b._id}
                            className="btn btn-sm"
                            style={{ background: 'rgba(244,67,54,0.1)', color: 'var(--danger)', border: '1px solid rgba(244,67,54,0.2)' }}
                          >
                            <FiXCircle size={13} />
                            {cancellingId === b._id ? 'Cancelling...' : 'Cancel'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
          </>
        )}
      </div>

      {/* Rating Modal */}
      {ratingModalOpen && ratingOrder && (
        <ReviewOrderModal 
          order={ratingOrder}
          onClose={() => setRatingModalOpen(false)}
          onSuccess={handleRatingSuccess}
        />
      )}
    </div>
  );
}
