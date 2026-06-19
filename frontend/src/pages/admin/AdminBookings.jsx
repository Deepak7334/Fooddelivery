import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { FiRefreshCw, FiCalendar, FiCheck, FiX, FiSlash } from 'react-icons/fi';

const STATUS_STYLES = {
  pending:   { bg: 'rgba(255,152,0,0.15)',  color: '#FF9800',  label: 'Pending' },
  confirmed: { bg: 'rgba(76,175,80,0.15)',  color: '#4CAF50',  label: 'Confirmed' },
  rejected:  { bg: 'rgba(244,67,54,0.15)',  color: '#F44336',  label: 'Rejected' },
  cancelled: { bg: 'rgba(96,96,112,0.18)',  color: '#9090A0',  label: 'Cancelled' },
};

const FILTERS = ['all', 'pending', 'confirmed', 'rejected', 'cancelled'];
const LIMIT = 20;

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [restaurantFilter, setRestaurantFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionId, setActionId] = useState(null);

  // ---- Fetch bookings with plain-object params (NOT URLSearchParams) ----
  const fetchBookings = useCallback(() => {
    setLoading(true);

    // Build a plain object — axios serialises this correctly
    const params = { page, limit: LIMIT };
    if (filter !== 'all') params.status = filter;
    if (restaurantFilter) params.restaurantId = restaurantFilter;

    api.get('/admin/bookings', { params })
      .then(res => {
        setBookings(res.data.bookings || []);
        setTotal(res.data.total || 0);
      })
      .catch(err => {
        const status  = err?.response?.status;
        const message = err?.response?.data?.message || err.message || 'Network error';
        console.error(`Admin /bookings failed [${status}]:`, err?.response?.data || err);
        toast.error(`Error ${status || ''}: ${message}`, { duration: 6000 });
      })
      .finally(() => setLoading(false));
  }, [filter, restaurantFilter, page]);

  // Load restaurants list for filter dropdown
  useEffect(() => {
    api.get('/admin/restaurants')
      .then(res => setRestaurants(res.data.restaurants || []))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const totalPages = Math.ceil(total / LIMIT);

  // ---- Admin action: confirm / reject / cancel ----
  const handleAction = async (id, action) => {
    setActionId(id);
    try {
      await api.put(`/admin/bookings/${id}/${action}`);
      const label = action === 'confirm' ? 'confirmed' : action === 'reject' ? 'rejected' : 'cancelled';
      toast.success(`Booking ${label}!`);
      fetchBookings();
    } catch (err) {
      console.error('Action error:', err?.response?.data || err.message);
      toast.error(err?.response?.data?.message || `Failed to ${action} booking`);
    } finally {
      setActionId(null);
    }
  };

  const fmt = d => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const pending   = bookings.filter(b => b.status === 'pending').length;
  const confirmed = bookings.filter(b => b.status === 'confirmed').length;
  const rejected  = bookings.filter(b => b.status === 'rejected').length;

  return (
    <div style={{ padding: '0 0 40px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(20px,4vw,26px)', fontWeight: 800 }}>
             Table <span style={{ color: 'var(--primary)' }}>Bookings</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            All customer bookings across all restaurants — full admin control
          </p>
        </div>
        <button onClick={fetchBookings} disabled={loading} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <FiRefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total',     value: total,     color: 'var(--accent)' },
          { label: 'Pending',   value: pending,   color: '#FF9800' },
          { label: 'Confirmed', value: confirmed, color: 'var(--success)' },
          { label: 'Rejected',  value: rejected,  color: 'var(--danger)' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          className="form-input"
          value={restaurantFilter}
          onChange={e => { setRestaurantFilter(e.target.value); setPage(1); }}
          style={{ maxWidth: 240, padding: '8px 14px', fontSize: 13 }}
        >
          <option value="">All Restaurants</option>
          {restaurants.map(r => (
            <option key={r._id} value={r._id}>{r.name}</option>
          ))}
        </select>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={filter === f ? 'tab-btn tab-btn-active' : 'tab-btn'}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <div className="spinner" style={{ margin: '0 auto' }} />
          <p style={{ marginTop: 16, color: 'var(--text-secondary)', fontSize: 14 }}>Loading bookings...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><FiCalendar size={60} style={{ opacity: 0.3 }} /></div>
          <h3>No bookings found</h3>
          <p>Try changing the filter or restaurant selection.</p>
        </div>
      ) : (
        <>
          {/* Scrollable table wrapper */}
          <div className="table-wrapper" style={{ overflowX: 'auto' }}>
            <table style={{ minWidth: 800 }}>
              <thead>
                <tr>
                  <th>Restaurant</th>
                  <th>Customer</th>
                  <th>Table</th>
                  <th>Date &amp; Time</th>
                  <th>Guests</th>
                  <th>Status</th>
                  <th>Booked On</th>
                  <th style={{ minWidth: 160 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => {
                  const s = STATUS_STYLES[b.status] || STATUS_STYLES.pending;
                  const busy = actionId === b._id;
                  return (
                    <tr key={b._id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{b.restaurantId?.name || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.restaurantId?.city}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{b.customerName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {b.userId?.email || ''}<br />📞 {b.phone}
                        </div>
                      </td>
                      <td style={{ fontWeight: 700 }}>#{b.tableNumber}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{fmt(b.date)}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>🕐 {b.timeSlot}</div>
                      </td>
                      <td>{b.partySize} guest{b.partySize !== 1 ? 's' : ''}</td>
                      <td>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
                          {s.label}
                        </span>
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {new Date(b.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {b.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleAction(b._id, 'confirm')}
                                disabled={busy}
                                title="Confirm booking"
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 4,
                                  padding: '5px 10px', borderRadius: 6, cursor: busy ? 'not-allowed' : 'pointer',
                                  background: 'rgba(76,175,80,0.12)', color: '#4CAF50',
                                  border: '1px solid rgba(76,175,80,0.3)', fontWeight: 700, fontSize: 12,
                                  opacity: busy ? 0.6 : 1, transition: 'all 0.2s'
                                }}
                              >
                                <FiCheck size={13} /> Confirm
                              </button>
                              <button
                                onClick={() => handleAction(b._id, 'reject')}
                                disabled={busy}
                                title="Reject booking"
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 4,
                                  padding: '5px 10px', borderRadius: 6, cursor: busy ? 'not-allowed' : 'pointer',
                                  background: 'rgba(244,67,54,0.12)', color: '#F44336',
                                  border: '1px solid rgba(244,67,54,0.3)', fontWeight: 700, fontSize: 12,
                                  opacity: busy ? 0.6 : 1, transition: 'all 0.2s'
                                }}
                              >
                                <FiX size={13} /> Reject
                              </button>
                            </>
                          )}
                          {b.status === 'confirmed' && (
                            <button
                              onClick={() => handleAction(b._id, 'cancel')}
                              disabled={busy}
                              title="Cancel booking"
                              style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                padding: '5px 10px', borderRadius: 6, cursor: busy ? 'not-allowed' : 'pointer',
                                background: 'rgba(144,144,160,0.12)', color: '#9090A0',
                                border: '1px solid rgba(144,144,160,0.3)', fontWeight: 700, fontSize: 12,
                                opacity: busy ? 0.6 : 1, transition: 'all 0.2s'
                              }}
                            >
                              <FiSlash size={13} /> Cancel
                            </button>
                          )}
                          {(b.status === 'rejected' || b.status === 'cancelled') && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>No actions</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-secondary btn-sm">← Prev</button>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Page {page} of {totalPages} ({total} total)</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn btn-secondary btn-sm">Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
