import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { FiRefreshCw } from 'react-icons/fi';

const STATUS_STYLES = {
  pending:   { bg: 'rgba(255,152,0,0.12)',  color: '#FF9800',  label: 'Pending' },
  confirmed: { bg: 'rgba(76,175,80,0.12)',  color: '#4CAF50',  label: 'Confirmed' },
  rejected:  { bg: 'rgba(244,67,54,0.12)',  color: '#F44336',  label: 'Rejected' },
  cancelled: { bg: 'rgba(96,96,112,0.15)',  color: '#9090A0',  label: 'Cancelled' },
};

const FILTERS = ['all', 'pending', 'confirmed', 'rejected', 'cancelled'];

export default function RestaurantBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [actionId, setActionId] = useState(null);

  const fetchBookings = () => {
    setLoading(true);
    api.get('/booking/restaurant/bookings')
      .then(res => setBookings(Array.isArray(res.data) ? res.data : []))
      .catch(() => toast.error('Failed to load bookings'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBookings(); }, []);

  const handleAction = async (id, action) => {
    setActionId(id);
    try {
      await api.put(`/booking/restaurant/bookings/${id}/${action}`);
      toast.success(`Booking ${action === 'confirm' ? 'confirmed' : 'rejected'}!`);
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} booking`);
    } finally {
      setActionId(null);
    }
  };

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);

  // Stats
  const pending = bookings.filter(b => b.status === 'pending').length;
  const confirmed = bookings.filter(b => b.status === 'confirmed').length;
  const today = new Date().toDateString();
  const todayCount = bookings.filter(b => new Date(b.date).toDateString() === today).length;

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800 }}>
            Table <span style={{ color: 'var(--primary)' }}>Bookings</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Manage customer table reservations
          </p>
        </div>
        <button onClick={fetchBookings} className="btn btn-secondary btn-sm">
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total', value: bookings.length, color: 'var(--accent)' },
          { label: 'Pending', value: pending, color: '#FF9800' },
          { label: 'Confirmed', value: confirmed, color: 'var(--success)' },
          { label: "Today's", value: todayCount, color: 'var(--primary)' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{s.label} Bookings</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={filter === f ? 'tab-btn tab-btn-active' : 'tab-btn'}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'all' && (
              <span className="tab-count" style={{ background: filter === f ? 'rgba(255,255,255,0.2)' : 'var(--border)' }}>
                {bookings.filter(b => b.status === f).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div className="spinner" style={{ margin: '0 auto' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🪑</div>
          <h3>{filter === 'all' ? 'No bookings yet!' : `No ${filter} bookings`}</h3>
          <p>When customers book a table, it will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map(b => {
            const s = STATUS_STYLES[b.status] || STATUS_STYLES.pending;
            return (
              <div key={b._id} className="card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                  {/* Left: info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: 'rgba(255,87,34,0.12)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0
                      }}>🪑</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>Table {b.tableNumber}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {b.partySize} guest{b.partySize !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                      <span>📅 {formatDate(b.date)}</span>
                      <span>🕐 {b.timeSlot}</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{b.customerName}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>📞 {b.phone}</div>
                    {b.notes && (
                      <div style={{ fontSize: 12, marginTop: 6, fontStyle: 'italic', color: '#FFA000', background: 'rgba(255,160,0,0.08)', borderRadius: 6, padding: '4px 8px', display: 'inline-block' }}>
                        💬 {b.notes}
                      </div>
                    )}
                  </div>

                  {/* Right: status + actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
                    <span style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: s.bg, color: s.color }}>
                      {s.label}
                    </span>
                    {b.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handleAction(b._id, 'confirm')}
                          disabled={actionId === b._id}
                          className="btn btn-sm"
                          style={{ background: 'rgba(76,175,80,0.1)', color: 'var(--success)', border: '1px solid rgba(76,175,80,0.25)' }}
                        >
                          {actionId === b._id ? '...' : '✓ Confirm'}
                        </button>
                        <button
                          onClick={() => handleAction(b._id, 'reject')}
                          disabled={actionId === b._id}
                          className="btn btn-danger btn-sm"
                        >
                          {actionId === b._id ? '...' : '✗ Reject'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
