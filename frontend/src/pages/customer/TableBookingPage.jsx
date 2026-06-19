import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { FiX, FiUsers, FiClock, FiCalendar, FiCheckCircle } from 'react-icons/fi';

const TableBookingPage = () => {
  const { restaurantId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [availableTables, setAvailableTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [restaurant, setRestaurant] = useState(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);

  // Form state
  const [partySize, setPartySize] = useState(2);
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [notes, setNotes] = useState('');

  // Fetch restaurant info
  useEffect(() => {
    api.get(`/customer/restaurants/${restaurantId}`)
      .then(res => setRestaurant(res.data.restaurant))
      .catch(() => {});
  }, [restaurantId]);

  // Fetch availability when date changes
  useEffect(() => {
    const fetchAvailability = async () => {
      if (!date) return;
      try {
        setLoading(true);
        const { data } = await api.get(`/booking/availability/${restaurantId}/${date}`);
        setAvailableTables(data.tables || []);
      } catch (error) {
        toast.error('Failed to load table availability');
      } finally {
        setLoading(false);
      }
    };
    fetchAvailability();
  }, [date, restaurantId]);

  const openBookingModal = (table, slot) => {
    if (!user) { toast.error('Please sign in to book a table'); navigate('/login'); return; }
    setSelectedTable(table);
    setSelectedSlot(slot);
    setPartySize(Math.min(2, table.maxGuests));
    setCustomerName(user?.name || '');
    setPhone(user?.phone || '');
    setNotes('');
    setShowModal(true);
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!customerName.trim()) { toast.error('Name is required'); return; }
    if (!phone.trim()) { toast.error('Phone number is required'); return; }
    if (partySize < 1 || partySize > selectedTable.maxGuests) {
      toast.error(`Party size must be between 1 and ${selectedTable.maxGuests}`); return;
    }
    setSubmitting(true);
    try {
      const payload = {
        restaurantId,
        tableNumber: selectedTable.number,
        timeSlot: selectedSlot,
        partySize,
        customerName: customerName.trim(),
        phone: phone.trim(),
        notes: notes.trim(),
        date,
      };
      await api.post('/booking/customer/bookings', payload);
      setShowModal(false);
      setSuccessInfo({ table: selectedTable, slot: selectedSlot, date, partySize });
      // Refresh availability
      const { data } = await api.get(`/booking/availability/${restaurantId}/${date}`);
      setAvailableTables(data.tables || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to book table');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d) => {
    return new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  };

  return (
    <div className="page-wrapper">
      <div className="container" style={{ maxWidth: 860, paddingTop: 24 }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>
            🪑 Book a <span style={{ color: 'var(--primary)' }}>Table</span>
          </h1>
          {restaurant && (
            <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
              at <strong style={{ color: 'var(--text-primary)' }}>{restaurant.name}</strong> · {restaurant.city}
            </p>
          )}
        </div>

        {/* Date Picker */}
        <div className="card" style={{ padding: 20, marginBottom: 24 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 12, fontSize: 15 }}>
            <FiCalendar color="var(--primary)" /> Select Date
          </label>
          <input
            type="date"
            min={new Date().toISOString().split('T')[0]}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="form-input"
            style={{ maxWidth: 260 }}
          />
        </div>

        {/* Tables Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Loading availability...</p>
          </div>
        ) : availableTables.length === 0 ? (
          <div className="empty-state card" style={{ padding: '48px 24px' }}>
            <div className="empty-state-icon">🪑</div>
            <h3>No tables available</h3>
            <p>Try selecting a different date — tables might be free on another day.</p>
            <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ marginTop: 16 }}>
              ← Go Back
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              Showing <strong style={{ color: 'var(--text-primary)' }}>{availableTables.length}</strong> table{availableTables.length !== 1 ? 's' : ''} with available slots for <strong style={{ color: 'var(--primary)' }}>{formatDate(date)}</strong>
            </p>
            {availableTables.map(table => (
              <div key={table._id} className="card" style={{ padding: 20, overflow: 'visible' }}>
                {/* Table Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 12,
                      background: 'rgba(255,87,34,0.12)', border: '1px solid rgba(255,87,34,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, flexShrink: 0
                    }}>🪑</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 17 }}>Table {table.number}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                        <FiUsers size={13} /> Up to {table.maxGuests} guests
                      </div>
                    </div>
                  </div>
                  <span style={{
                    padding: '4px 12px', borderRadius: 20,
                    background: 'rgba(76,175,80,0.12)', color: 'var(--success)',
                    fontSize: 12, fontWeight: 700, border: '1px solid rgba(76,175,80,0.25)'
                  }}>
                    {table.availableSlots.length} slot{table.availableSlots.length !== 1 ? 's' : ''} free
                  </span>
                </div>

                {/* Slots */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {table.availableSlots.map(slot => (
                    <button
                      key={slot}
                      onClick={() => openBookingModal(table, slot)}
                      className="slot-chip slot-chip-available"
                    >
                      <FiClock size={12} /> {slot}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Back Button */}
        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <button onClick={() => navigate(-1)} className="btn btn-secondary">
            ← Back to Restaurant
          </button>
        </div>
      </div>

      {/* Booking Confirmation Modal */}
      {showModal && selectedTable && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal-box responsive-modal" style={{ maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <h2 className="modal-title" style={{ margin: 0 }}>Confirm Booking</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
                <FiX size={20} />
              </button>
            </div>

            {/* Summary Banner */}
            <div style={{
              background: 'rgba(255,87,34,0.08)', border: '1px solid rgba(255,87,34,0.2)',
              borderRadius: 10, padding: '12px 16px', marginBottom: 20, marginTop: 8
            }}>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 14 }}>
                <span>🪑 <strong>Table {selectedTable.number}</strong></span>
                <span>👥 Max {selectedTable.maxGuests} guests</span>
                <span>🕐 <strong>{selectedSlot}</strong></span>
                <span>📅 {formatDate(date)}</span>
              </div>
            </div>

            <form onSubmit={handleBooking} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Your Name *</label>
                <input
                  type="text" className="form-input" required
                  value={customerName} onChange={e => setCustomerName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Phone Number *</label>
                <input
                  type="tel" className="form-input" required
                  value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Number of Guests *</label>
                <input
                  type="number" className="form-input" required
                  min="1" max={selectedTable.maxGuests}
                  value={partySize} onChange={e => setPartySize(parseInt(e.target.value) || 1)}
                />
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Max {selectedTable.maxGuests} guests for this table</div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Special Requests (Optional)</label>
                <textarea
                  className="form-input" rows={3}
                  value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Birthday celebration, wheelchair access..."
                  style={{ resize: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 2 }}>
                  {submitting ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Booking...</> : '🪑 Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successInfo && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setSuccessInfo(null); }}>
          <div className="modal-box responsive-modal" style={{ maxWidth: 420, textAlign: 'center' }}>
            <div style={{ fontSize: 60, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: 'var(--success)' }}>
              Table Booked!
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 14 }}>
              Your table has been reserved. The restaurant will confirm your booking shortly.
            </p>
            <div style={{
              background: 'rgba(76,175,80,0.08)', border: '1px solid rgba(76,175,80,0.2)',
              borderRadius: 12, padding: '16px 20px', marginBottom: 24, textAlign: 'left'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
                <div>🪑 <strong>Table {successInfo.table.number}</strong></div>
                <div>📅 {formatDate(successInfo.date)}</div>
                <div>🕐 {successInfo.slot}</div>
                <div>👥 {successInfo.partySize} guest{successInfo.partySize !== 1 ? 's' : ''}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={() => setSuccessInfo(null)} className="btn btn-secondary" style={{ flex: 1, minWidth: 140 }}>
                Book Another
              </button>
              <button onClick={() => navigate('/orders?tab=bookings')} className="btn btn-primary" style={{ flex: 1, minWidth: 140 }}>
                <FiCheckCircle size={16} /> View My Bookings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableBookingPage;
