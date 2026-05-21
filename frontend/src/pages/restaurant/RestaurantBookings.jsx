import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function RestaurantBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = () => {
    api.get('/api/booking/restaurant/bookings')
      .then(res => setBookings(res.data || []))
      .catch(err => toast.error('Failed to load bookings'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleAction = async (id, action) => {
    try {
      await api.put(`/api/booking/restaurant/bookings/${id}/${action}`);
      toast.success(`Booking ${action}ed successfully`);
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || `Error trying to ${action} booking`);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { bg: '#FFF3E0', color: '#FF9800' },
      confirmed: { bg: '#E8F5E9', color: '#4CAF50' },
      rejected: { bg: '#FFEBEE', color: '#F44336' },
      cancelled: { bg: '#ECEFF1', color: '#78909C' }
    };
    const s = styles[status] || styles.pending;
    return (
      <span style={{ background: s.bg, color: s.color, padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>
        {status}
      </span>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>Table <span style={{ color: 'var(--primary)' }}>Bookings</span></h1>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : bookings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"></div>
          <h3>No bookings yet!</h3>
          <p>When customers book a table, it will appear here.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Customer Details</th>
                <th>Table info</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b._id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{new Date(b.date).toLocaleDateString()}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{b.timeSlot}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{b.customerName}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{b.phone}</div>
                    {b.notes && <div style={{ fontSize: 12, marginTop: 4, fontStyle: 'italic', color: '#FFA000' }}>Note: {b.notes}</div>}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>Table {b.tableNumber}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{b.partySize} Guests</div>
                  </td>
                  <td>
                    {getStatusBadge(b.status)}
                  </td>
                  <td>
                    {b.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleAction(b._id, 'confirm')} className="btn btn-sm" style={{ background: '#4CAF50', color: '#fff', border: 'none' }}>
                          Confirm
                        </button>
                        <button onClick={() => handleAction(b._id, 'reject')} className="btn btn-danger btn-sm">
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
