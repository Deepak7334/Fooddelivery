import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { 
  FiX, FiUsers, FiClock, FiCalendar, FiCheckCircle, FiGrid, 
  FiMapPin, FiStar, FiRefreshCw, FiChevronDown, FiLock, 
  FiArrowRight, FiPhone, FiUser, FiFileText, FiCheck
} from 'react-icons/fi';
import { MdOutlineTableRestaurant, MdOutlineStorefront } from 'react-icons/md';
import './CustomerTransactions.css';

/**
 * Format slot "18:00-20:00" -> "6:00 PM – 8:00 PM"
 */
const formatSlot = (slot) => {
  if (!slot) return '';
  const parts = slot.split('-');
  if (parts.length !== 2) return slot;
  const to12Hour = (hhmm) => {
    const bits = hhmm.trim().split(':');
    const hour = parseInt(bits[0], 10);
    const min = bits[1] || '00';
    if (isNaN(hour)) return hhmm;
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const dispHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${dispHour}:${min} ${suffix}`;
  };
  return `${to12Hour(parts[0])} – ${to12Hour(parts[1])}`;
};

/**
 * Format date to human friendly string
 */
const formatDateLabel = (dStr) => {
  if (!dStr) return '';
  const d = new Date(dStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const getLocalDateStr = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const TableBookingPage = () => {
  const { restaurantId: paramRestId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Search params support (e.g. /booking?restaurantId=xyz)
  const searchParams = new URLSearchParams(location.search);
  const queryRestId = searchParams.get('restaurantId') || searchParams.get('restaurant');

  // Active dates
  const todayStr = useMemo(() => getLocalDateStr(new Date()), []);
  const tomorrowStr = useMemo(() => {
    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    return getLocalDateStr(tom);
  }, []);
  const dayAfterStr = useMemo(() => {
    const da = new Date();
    da.setDate(da.getDate() + 2);
    return getLocalDateStr(da);
  }, []);

  // Form State
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [showRestaurantPicker, setShowRestaurantPicker] = useState(false);

  const [date, setDate] = useState(todayStr);
  const [partySize, setPartySize] = useState(2);
  const [availableTables, setAvailableTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [selectedTableNumber, setSelectedTableNumber] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState('');

  // Contact info
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [notes, setNotes] = useState('');

  // Modals & submission state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successBooking, setSuccessBooking] = useState(null);

  // Sync auth details when user logs in or loads
  useEffect(() => {
    if (user) {
      if (!customerName) setCustomerName(user.name || '');
      if (!phone) setPhone(user.phone || '');
    }
  }, [user]);

  // Fetch all bookable restaurants
  useEffect(() => {
    let isMounted = true;
    setLoadingRestaurants(true);
    api.get('/customer/restaurants?limit=50')
      .then(res => {
        if (!isMounted) return;
        const list = (res.data?.restaurants || []).filter(r => r.bookingEnabled !== false && r.isActive !== false);
        setRestaurants(list);

        // Target restaurant id from param or query
        const targetId = paramRestId || queryRestId;
        if (targetId) {
          const match = list.find(r => r._id === targetId || r.id === targetId);
          if (match) {
            setSelectedRestaurant(match);
          } else {
            // Fetch individual restaurant if not in the top list
            api.get(`/customer/restaurants/${targetId}`)
              .then(rRes => {
                if (isMounted && rRes.data?.restaurant) {
                  setSelectedRestaurant(rRes.data.restaurant);
                }
              })
              .catch(() => {
                if (list.length > 0) setSelectedRestaurant(list[0]);
              });
          }
        } else if (list.length > 0) {
          setSelectedRestaurant(list[0]);
        }
      })
      .catch(err => {
        console.error('Failed to load restaurants', err);
        toast.error('Could not load restaurants taking bookings');
      })
      .finally(() => {
        if (isMounted) setLoadingRestaurants(false);
      });

    return () => { isMounted = false; };
  }, [paramRestId, queryRestId]);

  // Fetch live table availability whenever restaurant or date changes
  const fetchAvailability = async () => {
    const restId = selectedRestaurant?._id || selectedRestaurant?.id;
    if (!restId || !date) return;

    setLoadingTables(true);
    try {
      const { data } = await api.get(`/booking/availability/${restId}/${date}`);
      const tables = data.tables || [];
      setAvailableTables(tables);

      // Auto-sync table selection with party size
      const fittingTables = tables.filter(t => t.maxGuests >= partySize);
      if (fittingTables.length > 0) {
        // Keep current if still valid, otherwise pick first
        const stillValid = fittingTables.find(t => t.number === selectedTableNumber);
        const activeTable = stillValid || fittingTables[0];
        setSelectedTableNumber(activeTable.number);
        const slots = activeTable.availableSlots || [];
        if (!slots.includes(selectedSlot)) {
          setSelectedSlot(slots.length > 0 ? slots[0] : '');
        }
      } else {
        setSelectedTableNumber(null);
        setSelectedSlot('');
      }
    } catch (err) {
      console.error(err);
      toast.error('Could not check table availability');
    } finally {
      setLoadingTables(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, [selectedRestaurant?._id, selectedRestaurant?.id, date]);

  // When party size changes, re-evaluate selected table
  useEffect(() => {
    const fittingTables = availableTables.filter(t => t.maxGuests >= partySize);
    if (fittingTables.length > 0) {
      const stillValid = fittingTables.find(t => t.number === selectedTableNumber);
      const activeTable = stillValid || fittingTables[0];
      setSelectedTableNumber(activeTable.number);
      const slots = activeTable.availableSlots || [];
      if (!slots.includes(selectedSlot)) {
        setSelectedSlot(slots.length > 0 ? slots[0] : '');
      }
    } else {
      setSelectedTableNumber(null);
      setSelectedSlot('');
    }
  }, [partySize, availableTables]);

  const fittingTables = useMemo(() => {
    return availableTables.filter(t => t.maxGuests >= partySize);
  }, [availableTables, partySize]);

  const selectedTable = useMemo(() => {
    if (!selectedTableNumber) return null;
    return availableTables.find(t => t.number === selectedTableNumber) || null;
  }, [availableTables, selectedTableNumber]);

  const selectedTableSlots = useMemo(() => {
    return selectedTable?.availableSlots || [];
  }, [selectedTable]);

  // Handle guest size chip selection
  const handleSelectPartySize = (size) => {
    setPartySize(size);
  };

  // Switch restaurant
  const handleSelectRestaurant = (rest) => {
    setSelectedRestaurant(rest);
    setShowRestaurantPicker(false);
    setSelectedTableNumber(null);
    setSelectedSlot('');
  };

  // Open review modal
  const handleOpenReview = (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please log in to confirm your reservation');
      navigate('/login', { state: { from: { pathname: location.pathname } } });
      return;
    }
    if (!customerName.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!phone.trim()) {
      toast.error('Please enter your contact phone number');
      return;
    }
    if (!selectedTable || !selectedSlot) {
      toast.error('Please select an available table and time slot');
      return;
    }
    setShowReviewModal(true);
  };

  // Submit confirmed reservation
  const handleConfirmReservation = async () => {
    const restId = selectedRestaurant?._id || selectedRestaurant?.id;
    if (!restId || !selectedTable || !selectedSlot) return;

    setSubmitting(true);
    try {
      const payload = {
        restaurantId: restId,
        tableNumber: selectedTable.number,
        timeSlot: selectedSlot,
        partySize,
        customerName: customerName.trim(),
        phone: phone.trim(),
        notes: notes.trim(),
        date,
      };

      const { data } = await api.post('/booking/customer/bookings', payload);
      setShowReviewModal(false);
      setSuccessBooking({
        ...(data.booking || {}),
        restaurantName: selectedRestaurant.name,
        restaurantAddress: selectedRestaurant.address || selectedRestaurant.city,
        tableNumber: selectedTable.number,
        timeSlot: selectedSlot,
        partySize,
        date,
      });
      toast.success('Table reserved successfully!');
      // Refresh available tables
      fetchAvailability();
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to book table. Please try again.';
      toast.error(msg);
      if (msg.toLowerCase().includes('slot') || msg.toLowerCase().includes('already')) {
        fetchAvailability();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForAnother = () => {
    setSuccessBooking(null);
    setNotes('');
    fetchAvailability();
  };

  // ── SUCCESS CONFIRMATION VIEW (Matching App's BookingConfirmationScreen) ──
  if (successBooking) {
    const bookingCode = successBooking._id || successBooking.id || 'CONFIRMED';
    const displayCode = bookingCode.length > 8 ? bookingCode.slice(-8).toUpperCase() : bookingCode.toUpperCase();

    return (
      <div className="page-wrapper customer-transactions tx-booking">
        <div className="container" style={{ maxWidth: 640, paddingTop: 32, paddingBottom: 60 }}>
          <div className="card tx-confirmation-card" style={{
            padding: '36px 28px',
            borderRadius: 20,
            textAlign: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.06)'
          }}>
            <div className="tx-booking-success" style={{
              margin: '0 auto 20px',
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: '#DCFCE7',
              color: '#16A34A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FiCheck size={44} strokeWidth={3} />
            </div>

            <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1E293B', marginBottom: 8 }}>
              Reservation Request Sent!
            </h1>
            <p style={{ color: '#64748B', fontSize: 14.5, marginBottom: 28, maxWidth: 440, marginInline: 'auto' }}>
              Your reservation has been received. The restaurant will review and confirm your table shortly.
            </p>

            {/* Booking Details Card */}
            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 16,
              padding: '20px 24px',
              textAlign: 'left',
              marginBottom: 28
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, borderBottom: '1px solid #E2E8F0', marginBottom: 14 }}>
                <div>
                  <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>Booking ID</span>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#1E293B' }}>#{displayCode}</div>
                </div>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  background: '#FFFBEB',
                  color: '#B45309',
                  border: '1px solid #FDE68A'
                }}>
                  Awaiting Confirmation
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <MdOutlineTableRestaurant size={18} color="#F97316" />
                  <span style={{ color: '#64748B', width: 90 }}>Restaurant</span>
                  <strong style={{ color: '#1E293B' }}>{successBooking.restaurantName}</strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FiCalendar size={18} color="#F97316" />
                  <span style={{ color: '#64748B', width: 90 }}>Date</span>
                  <strong style={{ color: '#1E293B' }}>{formatDateLabel(successBooking.date)}</strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FiClock size={18} color="#F97316" />
                  <span style={{ color: '#64748B', width: 90 }}>Time</span>
                  <strong style={{ color: '#1E293B' }}>{formatSlot(successBooking.timeSlot)}</strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FiGrid size={18} color="#F97316" />
                  <span style={{ color: '#64748B', width: 90 }}>Table</span>
                  <strong style={{ color: '#1E293B' }}>Table {successBooking.tableNumber}</strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FiUsers size={18} color="#F97316" />
                  <span style={{ color: '#64748B', width: 90 }}>Guests</span>
                  <strong style={{ color: '#1E293B' }}>{successBooking.partySize} {successBooking.partySize === 1 ? 'person' : 'people'}</strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FiUser size={18} color="#F97316" />
                  <span style={{ color: '#64748B', width: 90 }}>Guest Name</span>
                  <strong style={{ color: '#1E293B' }}>{customerName} ({phone})</strong>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleResetForAnother}
                className="btn btn-secondary"
                style={{ flex: 1, minHeight: 46 }}
              >
                Book Another Table
              </button>
              <button
                type="button"
                onClick={() => navigate('/orders?tab=bookings')}
                className="btn btn-primary"
                style={{ flex: 1, minHeight: 46, background: '#F97316', borderColor: '#F97316' }}
              >
                <FiCheckCircle size={17} style={{ marginRight: 6 }} /> View My Bookings
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN TABLE BOOKING SCREEN (Matching Flutter TableBookingScreen) ──
  return (
    <div className="page-wrapper customer-transactions tx-booking" style={{ background: '#F8FAFC', minHeight: '85vh' }}>
      {/* Top Header */}
      <header className="tx-page-header" style={{ background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', padding: '16px 0', marginBottom: 24 }}>
        <div className="container tx-header-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 840 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <MdOutlineTableRestaurant size={26} color="#F97316" /> Book a Table
            </h1>
            <p style={{ margin: '2px 0 0', color: '#64748B', fontSize: 13 }}>
              Reserve your table with instant confirmation
            </p>
          </div>
          <Link
            to="/orders?tab=bookings"
            className="btn btn-secondary"
            style={{ fontSize: 13, padding: '7px 14px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
          >
            <FiCalendar size={15} color="#F97316" /> My Reservations
          </Link>
        </div>
      </header>

      <div className="container" style={{ maxWidth: 840, paddingBottom: 60 }}>
        {/* Guest Authentication Prompt Banner */}
        {!user && (
          <div style={{
            background: '#FFF7ED',
            border: '1px solid #FED7AA',
            borderRadius: 14,
            padding: '12px 18px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#9A3412', fontSize: 14, fontWeight: 600 }}>
              <FiLock size={18} color="#EA580C" />
              <span>Log in to save and track your table reservations.</span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/login', { state: { from: { pathname: location.pathname } } })}
              className="btn btn-primary"
              style={{
                fontSize: 12.5,
                padding: '6px 14px',
                background: '#EA580C',
                borderColor: '#EA580C',
                borderRadius: 8,
                fontWeight: 700,
                whiteSpace: 'nowrap'
              }}
            >
              Log in
            </button>
          </div>
        )}

        {/* 1. RESTAURANT CARD & SELECTOR */}
        <div className="card" style={{
          padding: 18,
          borderRadius: 16,
          marginBottom: 20,
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          {loadingRestaurants && !selectedRestaurant ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div className="spinner" style={{ width: 24, height: 24 }} />
              <span style={{ color: '#64748B', fontSize: 14 }}>Finding available restaurants...</span>
            </div>
          ) : selectedRestaurant ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: '#FFF7ED',
                  border: '1px solid #FFEDD5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#F97316',
                  overflow: 'hidden'
                }}>
                  {selectedRestaurant.image ? (
                    <img
                      src={selectedRestaurant.image}
                      alt={selectedRestaurant.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <MdOutlineTableRestaurant size={28} />
                  )}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      {selectedRestaurant.name}
                    </h2>
                    {selectedRestaurant.rating && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        padding: '2px 7px',
                        background: '#15803D',
                        color: '#FFF',
                        borderRadius: 6,
                        fontSize: 11.5,
                        fontWeight: 800
                      }}>
                        <FiStar size={11} fill="#FFF" /> {Number(selectedRestaurant.rating).toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748B', fontSize: 13, marginTop: 3 }}>
                    <FiMapPin size={13} color="#F97316" />
                    <span>{selectedRestaurant.address || selectedRestaurant.city || 'Nearby'}</span>
                  </div>
                </div>
              </div>

              {restaurants.length > 1 && (
                <button
                  type="button"
                  onClick={() => setShowRestaurantPicker(true)}
                  className="btn btn-secondary"
                  style={{ fontSize: 12.5, fontWeight: 700, padding: '6px 14px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <MdOutlineStorefront size={15} /> Change Restaurant <FiChevronDown size={14} />
                </button>
              )}
            </div>
          ) : (
            <div style={{ color: '#64748B', fontSize: 14, textAlign: 'center', padding: '12px 0' }}>
              No restaurant selected. Please browse restaurants taking bookings.
            </div>
          )}
        </div>

        {/* 2. RESERVATION DATE */}
        <div className="card" style={{
          padding: 18,
          borderRadius: 16,
          marginBottom: 20,
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <label style={{ fontSize: 15, fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <FiCalendar size={18} color="#F97316" /> Reservation Date
            </label>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#F97316' }}>
              {formatDateLabel(date)}
            </span>
          </div>

          {/* Quick Date Chips */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setDate(todayStr)}
              className="tx-chip-btn"
              style={{
                padding: '8px 16px',
                borderRadius: 12,
                fontSize: 13.5,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                border: date === todayStr ? '1.5px solid #F97316' : '1px solid #E2E8F0',
                background: date === todayStr ? '#F97316' : '#FFFFFF',
                color: date === todayStr ? '#FFFFFF' : '#334155'
              }}
            >
              Today
            </button>

            <button
              type="button"
              onClick={() => setDate(tomorrowStr)}
              className="tx-chip-btn"
              style={{
                padding: '8px 16px',
                borderRadius: 12,
                fontSize: 13.5,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                border: date === tomorrowStr ? '1.5px solid #F97316' : '1px solid #E2E8F0',
                background: date === tomorrowStr ? '#F97316' : '#FFFFFF',
                color: date === tomorrowStr ? '#FFFFFF' : '#334155'
              }}
            >
              Tomorrow
            </button>

            <button
              type="button"
              onClick={() => setDate(dayAfterStr)}
              className="tx-chip-btn"
              style={{
                padding: '8px 16px',
                borderRadius: 12,
                fontSize: 13.5,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                border: date === dayAfterStr ? '1.5px solid #F97316' : '1px solid #E2E8F0',
                background: date === dayAfterStr ? '#F97316' : '#FFFFFF',
                color: date === dayAfterStr ? '#FFFFFF' : '#334155'
              }}
            >
              Day After
            </button>

            {/* Custom Date Input */}
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <input
                type="date"
                min={todayStr}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  padding: '7px 12px',
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 600,
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#334155',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        </div>

        {/* 3. NUMBER OF GUESTS */}
        <div className="card" style={{
          padding: 18,
          borderRadius: 16,
          marginBottom: 20,
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <label style={{ fontSize: 15, fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <FiUsers size={18} color="#F97316" /> Number of Guests
          </label>

          <div style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 4,
            scrollbarWidth: 'thin',
            WebkitOverflowScrolling: 'touch'
          }}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(count => {
              const isSelected = partySize === count;
              return (
                <button
                  key={count}
                  type="button"
                  onClick={() => handleSelectPartySize(count)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: isSelected ? 800 : 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    border: isSelected ? '1.5px solid #F97316' : '1px solid #E2E8F0',
                    background: isSelected ? '#F97316' : '#FFFFFF',
                    color: isSelected ? '#FFFFFF' : '#334155',
                    boxShadow: isSelected ? '0 2px 6px rgba(249,115,22,0.3)' : 'none',
                    transition: 'all 0.15s ease',
                    flexShrink: 0
                  }}
                >
                  {count} {count === 1 ? 'Person' : 'People'}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. AVAILABLE TABLES */}
        <div className="card" style={{
          padding: 18,
          borderRadius: 16,
          marginBottom: 20,
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <label style={{ fontSize: 15, fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <FiGrid size={18} color="#F97316" /> Available Tables
            </label>
            <button
              type="button"
              onClick={fetchAvailability}
              disabled={loadingTables}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#F97316',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              <FiRefreshCw size={13} className={loadingTables ? 'spin' : ''} /> Refresh
            </button>
          </div>

          {loadingTables ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748B' }}>
              <div className="spinner" style={{ margin: '0 auto 10px', width: 22, height: 22 }} />
              <p style={{ fontSize: 13.5, margin: 0 }}>Checking live table availability…</p>
            </div>
          ) : fittingTables.length === 0 ? (
            <div style={{
              background: '#F8FAFC',
              border: '1px dashed #CBD5E1',
              borderRadius: 12,
              padding: '20px',
              textAlign: 'center',
              color: '#64748B'
            }}>
              <p style={{ fontSize: 14, margin: 0, fontWeight: 600, color: '#475569' }}>
                No table fits {partySize} guests on this date.
              </p>
              <p style={{ fontSize: 12.5, margin: '4px 0 0', color: '#94A3B8' }}>
                Try selecting fewer guests, another date, or another restaurant.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {fittingTables.map(t => {
                const isSelected = selectedTableNumber === t.number;
                return (
                  <button
                    key={t.number}
                    type="button"
                    onClick={() => {
                      setSelectedTableNumber(t.number);
                      const slots = t.availableSlots || [];
                      if (!slots.includes(selectedSlot)) {
                        setSelectedSlot(slots.length > 0 ? slots[0] : '');
                      }
                    }}
                    style={{
                      padding: '10px 18px',
                      borderRadius: 12,
                      fontSize: 13.5,
                      fontWeight: isSelected ? 800 : 700,
                      cursor: 'pointer',
                      border: isSelected ? '1.5px solid #F97316' : '1px solid #E2E8F0',
                      background: isSelected ? '#F97316' : '#FFFFFF',
                      color: isSelected ? '#FFFFFF' : '#334155',
                      boxShadow: isSelected ? '0 2px 8px rgba(249,115,22,0.25)' : 'none',
                      transition: 'all 0.15s ease',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    <span>Table {t.number} • up to {t.maxGuests}</span>
                    <span style={{
                      padding: '2px 7px',
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 800,
                      background: isSelected ? 'rgba(255,255,255,0.25)' : '#F1F5F9',
                      color: isSelected ? '#FFFFFF' : '#64748B'
                    }}>
                      {t.availableSlots.length} free
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 5. SELECT TIME SLOT */}
        {selectedTable && (
          <div className="card" style={{
            padding: 18,
            borderRadius: 16,
            marginBottom: 20,
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <label style={{ fontSize: 15, fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <FiClock size={18} color="#F97316" /> Select Time Slot
            </label>

            {selectedTableSlots.length === 0 ? (
              <div style={{
                background: '#F8FAFC',
                border: '1px dashed #CBD5E1',
                borderRadius: 12,
                padding: '16px',
                textAlign: 'center',
                color: '#64748B',
                fontSize: 13.5
              }}>
                This table is fully booked for the selected date. Please pick another table or date.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {selectedTableSlots.map(slot => {
                  const isSelected = selectedSlot === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      style={{
                        padding: '9px 16px',
                        borderRadius: 12,
                        fontSize: 13,
                        fontWeight: isSelected ? 800 : 700,
                        cursor: 'pointer',
                        border: isSelected ? '1.5px solid #F97316' : '1px solid #CBD5E1',
                        background: isSelected ? '#F97316' : '#FFFFFF',
                        color: isSelected ? '#FFFFFF' : '#334155',
                        boxShadow: isSelected ? '0 2px 6px rgba(249,115,22,0.25)' : 'none',
                        transition: 'all 0.15s ease',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <FiClock size={13} color={isSelected ? '#FFFFFF' : '#F97316'} />
                      <span>{formatSlot(slot)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 6. CONTACT INFORMATION */}
        <div className="card" style={{
          padding: 18,
          borderRadius: 16,
          marginBottom: 24,
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <label style={{ fontSize: 15, fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <FiUser size={18} color="#F97316" /> Contact Information
          </label>

          <form onSubmit={handleOpenReview} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  Your Name *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter your full name"
                    className="form-input"
                    style={{ borderRadius: 12, border: '1px solid #CBD5E1', padding: '10px 14px', width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  Phone Number *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="form-input"
                    style={{ borderRadius: 12, border: '1px solid #CBD5E1', padding: '10px 14px', width: '100%' }}
                  />
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                Special Requests / Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Window table, anniversary, quiet corner..."
                className="form-input"
                style={{ borderRadius: 12, border: '1px solid #CBD5E1', padding: '10px 14px', width: '100%', resize: 'none' }}
              />
            </div>

            {/* Submit Action */}
            <div style={{ marginTop: 8 }}>
              <button
                type="submit"
                disabled={!selectedTable || !selectedSlot || submitting}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: 14,
                  fontSize: 16,
                  fontWeight: 800,
                  background: '#F97316',
                  borderColor: '#F97316',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 4px 14px rgba(249,115,22,0.35)',
                  cursor: (!selectedTable || !selectedSlot) ? 'not-allowed' : 'pointer',
                  opacity: (!selectedTable || !selectedSlot) ? 0.6 : 1
                }}
              >
                <MdOutlineTableRestaurant size={20} />
                <span>Review & Reserve</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── RESTAURANT PICKER MODAL ── */}
      {showRestaurantPicker && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowRestaurantPicker(false); }}>
          <div className="modal-box" style={{ maxWidth: 520, borderRadius: 18, maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Select Restaurant
              </h2>
              <button
                type="button"
                onClick={() => setShowRestaurantPicker(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B', padding: 4 }}
              >
                <FiX size={20} />
              </button>
            </div>

            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
              {restaurants.map(r => {
                const isCurrent = (selectedRestaurant?._id || selectedRestaurant?.id) === (r._id || r.id);
                return (
                  <div
                    key={r._id || r.id}
                    onClick={() => handleSelectRestaurant(r)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: 12,
                      border: isCurrent ? '1.5px solid #F97316' : '1px solid #E2E8F0',
                      background: isCurrent ? '#FFF7ED' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        background: '#FFF7ED',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#F97316'
                      }}>
                        {r.image ? (
                          <img src={r.image} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <MdOutlineTableRestaurant size={22} />
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14.5, color: '#1E293B' }}>{r.name}</div>
                        <div style={{ fontSize: 12.5, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <FiMapPin size={11} /> {r.address || r.city}
                        </div>
                      </div>
                    </div>
                    {isCurrent && <FiCheckCircle size={20} color="#F97316" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── REVIEW RESERVATION SHEET / MODAL (Matching App's _showReviewSheet) ── */}
      {showReviewModal && selectedTable && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowReviewModal(false); }}>
          <div className="modal-box responsive-modal" style={{ maxWidth: 480, borderRadius: 20, padding: '24px 22px', maxHeight: '85vh', overflowY: 'auto' }}>
            {/* Modal drag bar indicator */}
            <div style={{ width: 40, height: 4, background: '#CBD5E1', borderRadius: 2, margin: '0 auto 16px' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', margin: 0 }}>
                Review your reservation
              </h2>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B', padding: 4 }}
              >
                <FiX size={20} />
              </button>
            </div>
            <p style={{ color: '#64748B', fontSize: 13, marginBottom: 18 }}>
              Check the details before sending the request.
            </p>

            {/* Review Items List */}
            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 14,
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              marginBottom: 20
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <MdOutlineTableRestaurant size={16} color="#F97316" style={{ marginTop: 2 }} />
                <span style={{ fontSize: 13, color: '#64748B', width: 85 }}>Restaurant</span>
                <strong style={{ fontSize: 13.5, color: '#0F172A', flex: 1 }}>{selectedRestaurant?.name}</strong>
              </div>

              {(selectedRestaurant?.address || selectedRestaurant?.city) && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <FiMapPin size={16} color="#F97316" style={{ marginTop: 2 }} />
                  <span style={{ fontSize: 13, color: '#64748B', width: 85 }}>Location</span>
                  <span style={{ fontSize: 13, color: '#334155', flex: 1 }}>
                    {selectedRestaurant.address || selectedRestaurant.city}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <FiCalendar size={16} color="#F97316" style={{ marginTop: 2 }} />
                <span style={{ fontSize: 13, color: '#64748B', width: 85 }}>Date</span>
                <strong style={{ fontSize: 13.5, color: '#0F172A', flex: 1 }}>{formatDateLabel(date)}</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <FiClock size={16} color="#F97316" style={{ marginTop: 2 }} />
                <span style={{ fontSize: 13, color: '#64748B', width: 85 }}>Time</span>
                <strong style={{ fontSize: 13.5, color: '#0F172A', flex: 1 }}>{formatSlot(selectedSlot)}</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <FiUsers size={16} color="#F97316" style={{ marginTop: 2 }} />
                <span style={{ fontSize: 13, color: '#64748B', width: 85 }}>Guests</span>
                <strong style={{ fontSize: 13.5, color: '#0F172A', flex: 1 }}>{partySize} people</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <FiGrid size={16} color="#F97316" style={{ marginTop: 2 }} />
                <span style={{ fontSize: 13, color: '#64748B', width: 85 }}>Table</span>
                <strong style={{ fontSize: 13.5, color: '#0F172A', flex: 1 }}>
                  Table {selectedTable.number} (up to {selectedTable.maxGuests} guests)
                </strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <FiUser size={16} color="#F97316" style={{ marginTop: 2 }} />
                <span style={{ fontSize: 13, color: '#64748B', width: 85 }}>Name</span>
                <strong style={{ fontSize: 13.5, color: '#0F172A', flex: 1 }}>{customerName}</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <FiPhone size={16} color="#F97316" style={{ marginTop: 2 }} />
                <span style={{ fontSize: 13, color: '#64748B', width: 85 }}>Phone</span>
                <strong style={{ fontSize: 13.5, color: '#0F172A', flex: 1 }}>{phone}</strong>
              </div>

              {notes.trim() && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <FiFileText size={16} color="#F97316" style={{ marginTop: 2 }} />
                  <span style={{ fontSize: 13, color: '#64748B', width: 85 }}>Notes</span>
                  <span style={{ fontSize: 13, color: '#334155', flex: 1 }}>{notes.trim()}</span>
                </div>
              )}
            </div>

            {/* Confirm & Cancel Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                onClick={handleConfirmReservation}
                disabled={submitting}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 800,
                  background: '#F97316',
                  borderColor: '#F97316',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                {submitting ? (
                  <>
                    <span className="spinner" style={{ width: 18, height: 18 }} />
                    <span>Reserving Table...</span>
                  </>
                ) : (
                  <span>Confirm Reservation</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                disabled={submitting}
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  padding: '11px',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#475569'
                }}
              >
                Go back and edit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableBookingPage;
