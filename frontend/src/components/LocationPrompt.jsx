import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { FiMapPin, FiNavigation, FiX, FiSearch, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../lib/api';

// Verified local hubs with exact coordinates
const POPULAR_HUBS = [
  { name: 'Akbarpur', lat: 24.6345432, lng: 83.9597401, label: 'Akbarpur, Rohtas' },
  { name: 'Rohtas', lat: 24.636653, lng: 83.963676, label: 'Rohtas Town, Rohtas' },
  { name: 'Paruka', lat: 24.52527, lng: 83.734352, label: 'Paruka, Nauhatta' },
  { name: 'Nauhatta', lat: 24.6357714, lng: 83.8062436, label: 'Nauhatta, Rohtas' },
  { name: 'Sasaram', lat: 24.9526, lng: 84.0163, label: 'Sasaram, Rohtas' },
  { name: 'Dehri', lat: 24.9192, lng: 84.1867, label: 'Dehri-on-Sone, Rohtas' }
];

export default function LocationPrompt() {
  const [show, setShow] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const location = useLocation();
  const searchTimer = useRef(null);

  // Always display the location pop-up when visiting or refreshing the home page
  useEffect(() => {
    if (location.pathname === '/') {
      const timer = setTimeout(() => {
        setShow(true);
      }, 400);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [location.pathname]);

  // Listen for manual trigger requests (e.g. Navbar or search bar 📍 button)
  useEffect(() => {
    const handleManualRequest = () => {
      setShow(true);
    };
    window.addEventListener('requestLocationPrompt', handleManualRequest);
    return () => window.removeEventListener('requestLocationPrompt', handleManualRequest);
  }, []);

  // Debounced search for exact colony/village/street
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    if (searchTimer.current) clearTimeout(searchTimer.current);

    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        // Try backend location search endpoint first
        const res = await api.get(`/customer/search-location?q=${encodeURIComponent(searchQuery)}`).catch(() => null);
        if (res?.data?.success && res.data.results?.length > 0) {
          setSuggestions(res.data.results);
          setSearching(false);
          return;
        }

        // Direct client fallback via Nominatim
        const clientRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=in&limit=5&addressdetails=1`)
          .then(r => r.json())
          .catch(() => []);

        if (Array.isArray(clientRes) && clientRes.length > 0) {
          const mapped = clientRes.map(item => ({
            name: item.display_name.split(',').slice(0, 3).join(', '),
            fullAddress: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon)
          }));
          setSuggestions(mapped);
        } else {
          setSuggestions([]);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchQuery]);

  const handleDismiss = () => {
    setShow(false);
  };

  const applyLocation = (coords, labelName) => {
    localStorage.setItem('jdkart_coords', JSON.stringify(coords));
    if (labelName) {
      localStorage.setItem('jdkart_loc_name', labelName);
    }
    window.dispatchEvent(new Event('locationUpdated'));
    setShow(false);
  };

  // 1-Tap Hub Selection
  const handleSelectHub = (hub) => {
    applyLocation({ lat: hub.lat, lng: hub.lng }, hub.label);
    toast.success(`📍 Location set: ${hub.label}`, { duration: 2500 });
  };

  // Select from Search Suggestions
  const handleSelectSuggestion = (item) => {
    applyLocation({ lat: item.lat, lng: item.lng }, item.name);
    toast.success(`📍 Location set: ${item.name}`, { duration: 2500 });
  };

  // Live GPS Acquisition with High Accuracy
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setLocating(true);
    const toastId = toast.loading('📍 Acquiring exact GPS satellites…');

    let watchId = null;
    let settled = false;

    const onFinish = (coords) => {
      if (settled) return;
      settled = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      setLocating(false);

      // Save initial coordinates immediately
      localStorage.setItem('jdkart_coords', JSON.stringify(coords));
      window.dispatchEvent(new Event('locationUpdated'));
      setShow(false);

      // Reverse geocode to exact street, colony, and town
      api.get(`/customer/reverse-geocode?lat=${coords.lat}&lng=${coords.lng}`)
        .then(res => {
          if (res?.data?.success && res.data.placeName && res.data.placeName !== 'Current Location') {
            localStorage.setItem('jdkart_loc_name', res.data.placeName);
            window.dispatchEvent(new Event('locationUpdated'));
            toast.success(`📍 Exact Location: ${res.data.placeName}`, { id: toastId, duration: 3000 });
          } else {
            throw new Error('Fallback to direct client');
          }
        })
        .catch(() => {
          // Direct client fallback
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&zoom=18&addressdetails=1`)
            .then(r => r.json())
            .then(d => {
              if (d?.display_name) {
                const parts = d.display_name.split(',').map(s => s.trim()).filter(Boolean);
                if (parts[parts.length - 1] === 'India') parts.pop();
                const exactName = parts.slice(0, 3).join(', ');
                localStorage.setItem('jdkart_loc_name', exactName);
                window.dispatchEvent(new Event('locationUpdated'));
                toast.success(`📍 Exact Location: ${exactName}`, { id: toastId, duration: 3000 });
              } else {
                toast.success('📍 Live GPS coordinates active!', { id: toastId, duration: 2500 });
              }
            })
            .catch(() => {
              toast.success('📍 Live GPS coordinates active!', { id: toastId, duration: 2500 });
            });
        });
    };

    // Watch position gives real satellite lock (accuracy < 50m)
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const accuracy = pos.coords.accuracy || 100;
        
        // If accuracy is high (< 50 meters), lock in immediately!
        if (accuracy <= 50) {
          onFinish(coords);
        } else {
          // Keep best coordinate while waiting
          setTimeout(() => {
            if (!settled) onFinish(coords);
          }, 4000);
        }
      },
      (err) => {
        setLocating(false);
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        
        if (err.code === 1) {
          toast.error('Location permission was denied. Please select your area below or allow location in browser settings.', { id: toastId, duration: 4500 });
        } else {
          // Fallback to single shot network position
          navigator.geolocation.getCurrentPosition(
            (pos) => onFinish({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => toast.error('Could not get GPS fix. Please select your area below.', { id: toastId, duration: 4000 }),
            { enableHighAccuracy: false, timeout: 6000, maximumAge: 0 }
          );
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    // Hard safety timeout: max 8 seconds before settling on best fix
    setTimeout(() => {
      if (!settled && locating) {
        navigator.geolocation.getCurrentPosition(
          (pos) => onFinish({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => setLocating(false),
          { enableHighAccuracy: false, timeout: 3000, maximumAge: 0 }
        );
      }
    }, 8000);
  };

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.72)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '16px',
      animation: 'fadeIn 0.2s ease'
    }}>
      <div style={{
        background: 'var(--bg-card, #1A1D27)',
        borderRadius: 22,
        padding: '24px 22px',
        width: '100%',
        maxWidth: 420,
        position: 'relative',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.55)',
        border: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
        color: 'var(--text-primary, #fff)',
        textAlign: 'center',
        boxSizing: 'border-box',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: 'var(--bg-card2, rgba(255,255,255,0.08))',
            border: 'none',
            color: 'var(--text-secondary, #94A3B8)',
            width: 32,
            height: 32,
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <FiX size={17} />
        </button>

        {/* Location Icon Badge */}
        <div style={{
          width: 58,
          height: 58,
          background: 'linear-gradient(135deg, rgba(255,87,34,0.22), rgba(255,152,0,0.12))',
          border: '1.5px solid rgba(255,87,34,0.35)',
          borderRadius: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 14px',
          color: 'var(--primary, #FF5722)',
          boxShadow: '0 8px 24px rgba(255,87,34,0.25)'
        }}>
          <FiMapPin size={28} />
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: 'clamp(19px, 4.2vw, 22px)',
          fontWeight: 800,
          margin: '0 0 6px',
          letterSpacing: '-0.3px',
          color: 'var(--text-primary, #fff)'
        }}>
          Set Your Delivery Location
        </h2>

        {/* Description */}
        <p style={{
          fontSize: 13,
          color: 'var(--text-secondary, #94A3B8)',
          lineHeight: 1.45,
          margin: '0 0 18px'
        }}>
          Allow exact live GPS or select your area to see food & groceries delivering to your doorstep.
        </p>

        {/* Action Button 1: Live GPS */}
        <button
          onClick={handleDetectGPS}
          disabled={locating}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, var(--primary, #FF5722), #E64A19)',
            color: '#fff',
            border: 'none',
            padding: '13px 18px',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
            cursor: locating ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: '0 6px 18px rgba(255, 87, 34, 0.35)',
            marginBottom: 16
          }}
        >
          <FiNavigation size={16} />
          {locating ? 'Acquiring Pinpoint GPS…' : 'Use Exact Live GPS'}
        </button>

        {/* Search Bar for Exact Colony/Village/Street */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-card2, rgba(255,255,255,0.06))',
            borderRadius: 12,
            border: '1px solid var(--border, rgba(255,255,255,0.12))',
            padding: '0 12px'
          }}>
            <FiSearch size={15} style={{ color: 'var(--text-secondary, #94A3B8)', marginRight: 8 }} />
            <input
              type="text"
              placeholder="Search colony, village, street or city…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#fff',
                fontSize: 13,
                padding: '11px 0'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
              >
                <FiX size={14} />
              </button>
            )}
          </div>

          {/* Autocomplete Results Dropdown */}
          {suggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: 6,
              background: 'var(--bg-card, #1A1D27)',
              border: '1px solid var(--border, rgba(255,255,255,0.15))',
              borderRadius: 12,
              maxHeight: 180,
              overflowY: 'auto',
              zIndex: 100000,
              boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
              textAlign: 'left'
            }}>
              {suggestions.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectSuggestion(item)}
                  style={{
                    padding: '10px 14px',
                    borderBottom: idx < suggestions.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    cursor: 'pointer',
                    fontSize: 12,
                    color: '#E2E8F0',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,87,34,0.15)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ fontWeight: 700, color: '#fff', marginBottom: 2 }}>{item.name}</div>
                  <div style={{ color: '#94A3B8', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.fullAddress}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick 1-Tap Area Chips */}
        <div style={{ textAlign: 'left', marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary, #94A3B8)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Popular Delivery Areas:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {POPULAR_HUBS.map((hub) => (
              <button
                key={hub.name}
                onClick={() => handleSelectHub(hub)}
                style={{
                  background: 'var(--bg-card2, rgba(255,255,255,0.06))',
                  border: '1px solid var(--border, rgba(255,255,255,0.1))',
                  color: '#E2E8F0',
                  padding: '6px 11px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary, #FF5722)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border, rgba(255,255,255,0.1))';
                  e.currentTarget.style.color = '#E2E8F0';
                }}
              >
                <FiMapPin size={11} color="var(--primary, #FF5722)" />
                {hub.name}
              </button>
            ))}
          </div>
        </div>

        {/* Not Now / Dismiss */}
        <button
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            color: 'var(--text-secondary, #94A3B8)',
            border: 'none',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            padding: '6px 12px'
          }}
        >
          Not Now
        </button>
      </div>
    </div>
  );
}
