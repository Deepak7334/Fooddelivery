import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { FiPackage, FiCalendar, FiXCircle } from 'react-icons/fi';

const STATUS_STYLES = {
  pending:   { bg: 'rgba(255,152,0,0.12)',  color: '#FF9800',  label: '⏳ Pending' },
  confirmed: { bg: 'rgba(76,175,80,0.12)',  color: '#4CAF50',  label: '✅ Confirmed' },
  rejected:  { bg: 'rgba(244,67,54,0.12)',  color: '#F44336',  label: '❌ Rejected' },
  cancelled: { bg: 'rgba(96,96,112,0.15)',  color: '#9090A0',  label: '🚫 Cancelled' },
};

const ORDER_STATUS = {
  pending:          { bg: 'rgba(255,152,0,0.2)',  color: '#FF9800' },
  accepted:         { bg: 'rgba(0,188,212,0.2)',  color: '#00BCD4' },
  preparing:        { bg: 'rgba(156,39,176,0.2)', color: '#CE93D8' },
  out_for_delivery: { bg: 'rgba(33,150,243,0.2)', color: '#90CAF9' },
  delivered:        { bg: 'rgba(76,175,80,0.2)',  color: '#4CAF50' },
  cancelled:        { bg: 'rgba(244,67,54,0.2)',  color: '#F44336' },
};

export default function OrderHistoryPage() {
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
  const [ratingValue, setRatingValue] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  useEffect(() => {
    api.get('/customer/orders')
      .then(res => setOrders(res.data.orders || []))
      .catch(console.error)
      .finally(() => setLoadingOrders(false));
  }, []);

  useEffect(() => {
    api.get('/booking/customer/bookings/mine')
      .then(res => setBookings(Array.isArray(res.data) ? res.data : []))
      .catch(console.error)
      .finally(() => setLoadingBookings(false));
  }, []);

  // Sync tab with URL param
  useEffect(() => {
    const p = new URLSearchParams(locationObj.search);
    setTab(p.get('tab') === 'bookings' ? 'bookings' : 'orders');
  }, [locationObj.search]);

  const switchTab = (t) => {
    navigate(`/orders${t === 'bookings' ? '?tab=bookings' : ''}`, { replace: true });
    setTab(t);
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

  const submitRating = async () => {
    if (!ratingOrder) return;
    setSubmittingRating(true);
    try {
      const res = await api.post(`/customer/orders/${ratingOrder._id}/rate`, {
        rating: ratingValue,
        review: reviewText
      });
      toast.success(res.data.message || 'Thanks for your feedback!');
      setOrders(prev => prev.map(o => o._id === ratingOrder._id ? { ...o, rating: ratingValue, review: reviewText } : o));
      setRatingModalOpen(false);
      setRatingOrder(null);
      setRatingValue(5);
      setReviewText('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
  });

  return (
    <div className="page-wrapper">
      <div className="container">
        {/* Page Title */}
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 24 }}>
          My <span style={{ color: 'var(--primary)' }}>Activity</span>
        </h1>

        {/* Tab Bar */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 28,
          background: 'var(--bg-card)', borderRadius: 12,
          padding: 6, border: '1px solid var(--border)',
          width: 'fit-content'
        }}>
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

        {/* ORDERS TAB */}
        {tab === 'orders' && (
          loadingOrders ? (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto' }} />
            </div>
          ) : orders.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📦</div>
              <h3>No orders yet!</h3>
              <p>Start exploring restaurants/Stores and place your first order.</p>
              <Link to="/restaurants" className="btn btn-primary" style={{ marginTop: 24 }}>Browse Restaurants</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {orders.map(order => {
                const st = ORDER_STATUS[order.status] || ORDER_STATUS.pending;
                return (
                  <div key={order._id} className="card" style={{ padding: 20, cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => navigate(`/orders/${order._id}/track`)} onMouseEnter={e => e.currentTarget.style.transform='scale(1.01)'} onMouseLeave={e => e.currentTarget.style.transform='none'}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                          <div style={{ fontWeight: 700, fontSize: 16 }}>{order.restaurantName || order.restaurantId?.name || order.storeName || order.storeId?.name || 'JDkart Order'}</div>
                          <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', background: st.bg, color: st.color }}>
                            {order.status?.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                          {order.items?.map(i => `${i.name} ×${i.quantity}`).join(' · ')}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {new Date(order.createdAt).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--primary)', marginBottom: 10 }}>₹{order.finalAmount}</div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                          {order.status === 'delivered' && !order.rating ? (
                            <button className="btn btn-secondary btn-sm" onClick={(e) => {
                              e.stopPropagation();
                              setRatingOrder(order);
                              setRatingValue(5);
                              setReviewText('');
                              setRatingModalOpen(true);
                            }}>⭐ Rate</button>
                          ) : order.rating ? (
                            <span style={{ fontSize: 13, color: '#FF9800', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginRight: 4 }}>
                              ⭐ {order.rating}/5
                            </span>
                          ) : null}

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
              <div className="empty-state-icon">🪑</div>
              <h3>No table bookings yet!</h3>
              <p>Browse restaurants and book a table at your favourite spot.</p>
              <Link to="/restaurants" className="btn btn-primary" style={{ marginTop: 24 }}>Find a Restaurant</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {bookings.map(b => {
                const s = STATUS_STYLES[b.status] || STATUS_STYLES.pending;
                return (
                  <div key={b._id} className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
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
      </div>

      {/* Rating Modal */}
      {ratingModalOpen && ratingOrder && (
        <div className="modal-overlay" onClick={() => setRatingModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 400, padding: 24, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Rate your order</h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
              How was your experience with {ratingOrder.restaurantName || ratingOrder.storeName || 'JDkart'}?
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setRatingValue(star)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 32, padding: 0,
                    color: star <= ratingValue ? '#FF9800' : '#E0E0E0',
                    transition: 'transform 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                >
                  ★
                </button>
              ))}
            </div>

            <textarea
              placeholder="Leave a review (optional)..."
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              className="input-field"
              style={{ minHeight: 100, resize: 'vertical', marginBottom: 24, width: '100%' }}
            />

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-secondary" onClick={() => setRatingModalOpen(false)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary" onClick={submitRating} disabled={submittingRating} style={{ flex: 1 }}>
                {submittingRating ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
