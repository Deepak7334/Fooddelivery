import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const TableBookingPage = () => {
  const { restaurantId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [availableTables, setAvailableTables] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Selection state
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState('');
  
  // Form state
  const [partySize, setPartySize] = useState(2);
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [notes, setNotes] = useState('');

  // Fetch availability when date changes
  useEffect(() => {
    const fetchAvailability = async () => {
      if (!date) return;
      try {
        setLoading(true);
        const { data } = await api.get(`/api/booking/availability/${restaurantId}/${date}`);
        setAvailableTables(data.tables || []);
        setSelectedTable(null);
        setSelectedSlot('');
      } catch (error) {
        toast.error('Failed to load table availability');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchAvailability();
  }, [date, restaurantId]);

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!selectedTable || !selectedSlot) {
      toast.error('Please select a table and time slot');
      return;
    }
    
    try {
      const payload = {
        restaurantId,
        tableNumber: selectedTable.number,
        timeSlot: selectedSlot,
        partySize,
        customerName,
        phone,
        notes,
        date
      };
      await api.post('/api/booking/customer/bookings', payload);
      toast.success('Table booked successfully!');
      navigate('/orders'); // Or a specific bookings page if it exists
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to book table');
    }
  };

  return (
    <div className="container" style={{ padding: '40px 20px', minHeight: '60vh', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '20px', color: 'var(--text-primary)' }}>Book a Table</h2>
      
      <div className="card" style={{ padding: '24px', background: 'var(--card-bg)', borderRadius: '12px', marginBottom: '24px' }}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Select Date</label>
          <input 
            type="date" 
            required
            min={new Date().toISOString().split('T')[0]}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }}
          />
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading availability...</p>
        ) : availableTables.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No tables available for this date.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ color: 'var(--text-primary)', marginTop: '12px' }}>Available Tables & Slots</h3>
            {availableTables.map(table => (
              <div key={table._id} style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <h4 style={{ color: 'var(--text-primary)', marginBottom: '12px' }}>
                  Table {table.number} (Up to {table.maxGuests} guests)
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {table.availableSlots.map(slot => {
                    // Just simple selection for now
                    const isSelected = selectedTable?._id === table._id && selectedSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => { setSelectedTable(table); setSelectedSlot(slot); }}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '20px',
                          border: `1px solid ${isSelected ? 'var(--primary-color)' : 'var(--border-color)'}`,
                          background: isSelected ? 'var(--primary-color)' : 'transparent',
                          color: isSelected ? 'white' : 'var(--text-secondary)',
                          cursor: 'pointer'
                        }}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedTable && selectedSlot && (
        <div className="card" style={{ padding: '24px', background: 'var(--card-bg)', borderRadius: '12px' }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>Booking Details</h3>
          <form onSubmit={handleBooking} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Number of Guests</label>
              <input 
                type="number" 
                min="1" 
                max={selectedTable.maxGuests}
                required
                value={partySize}
                onChange={(e) => setPartySize(parseInt(e.target.value))}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Your Name</label>
              <input 
                type="text" 
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Phone Number</label>
              <input 
                type="tel" 
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Special Requests (Optional)</label>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows="3"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '16px', padding: '14px', width: '100%' }}>
              Confirm Booking (Table {selectedTable.number} at {selectedSlot})
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default TableBookingPage;
