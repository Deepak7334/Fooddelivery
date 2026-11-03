import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FiMapPin, FiNavigation, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function LocationPrompt() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  // Always display the location pop-up when visiting or refreshing the home page
  useEffect(() => {
    if (location.pathname === '/') {
      const timer = setTimeout(() => {
        setShow(true);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  // Also listen for manual trigger requests from Navbar ("📍 Enter city or detect")
  useEffect(() => {
    const handleManualRequest = () => {
      setShow(true);
    };
    window.addEventListener('requestLocationPrompt', handleManualRequest);
    return () => window.removeEventListener('requestLocationPrompt', handleManualRequest);
  }, []);

  const handleDismiss = () => {
    setShow(false);
  };

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Detecting your live location…');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };

        // 1. Instantly save coordinates
        localStorage.setItem('jdkart_coords', JSON.stringify(coords));
        
        // 2. Set default location text immediately so UI updates without waiting for network
        const previousName = localStorage.getItem('jdkart_loc_name');
        const instantName = previousName && !previousName.includes('Current Location') ? previousName : 'Current Location';
        localStorage.setItem('jdkart_loc_name', instantName);

        // 3. Immediately dispatch event so HomePage updates nearby vendors instantly
        window.dispatchEvent(new Event('locationUpdated'));

        // 4. Instantly close modal and dismiss loader (happens in < 1 second!)
        setLoading(false);
        setShow(false);
        toast.success('📍 Live location detected! Showing nearby items.', { id: toastId });

        // 5. Asynchronously fetch detailed place name in background without blocking UI
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}`)
          .then((res) => res.json())
          .then((data) => {
            if (data && data.address) {
              const addr = data.address;
              const place = addr.suburb || addr.neighbourhood || addr.city_district || addr.village || addr.town || addr.city;
              if (place) {
                localStorage.setItem('jdkart_loc_name', place);
                window.dispatchEvent(new Event('locationUpdated'));
              }
            }
          })
          .catch(() => {
            // Background reverse geocode failed or timed out — coords are already active
          });
      },
      (err) => {
        setLoading(false);
        console.warn('Geolocation error:', err);
        let msg = 'Could not access GPS. Please enable location permissions.';
        if (err.code === 1) msg = 'Location access was denied. Please allow location in your browser settings.';
        if (err.code === 2) msg = 'Location unavailable. Ensure GPS/Location is enabled on your device.';
        if (err.code === 3) msg = 'Location request timed out. Please try again.';
        toast.error(msg, { id: toastId, duration: 4000 });
      },
      // Fast cellular/Wi-Fi triangulation with 5 min cache for instantaneous response
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  };

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '16px',
      animation: 'fadeIn 0.25s ease'
    }}>
      <div style={{
        background: 'var(--bg-card, #1A1D27)',
        borderRadius: 20,
        padding: 'clamp(24px, 5vw, 32px)',
        width: '100%',
        maxWidth: 380,
        position: 'relative',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.45)',
        border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
        color: 'var(--text-primary, #fff)',
        textAlign: 'center',
        boxSizing: 'border-box'
      }}>
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: 'var(--bg-card2, rgba(255,255,255,0.06))',
            border: 'none',
            color: 'var(--text-secondary, #94A3B8)',
            width: 34,
            height: 34,
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s'
          }}
        >
          <FiX size={18} />
        </button>

        {/* Location Icon Badge */}
        <div style={{
          width: 68,
          height: 68,
          background: 'linear-gradient(135deg, rgba(255,87,34,0.2), rgba(255,152,0,0.1))',
          border: '1.5px solid rgba(255,87,34,0.35)',
          borderRadius: 22,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 18px',
          color: 'var(--primary, #FF5722)',
          boxShadow: '0 8px 24px rgba(255,87,34,0.25)'
        }}>
          <FiMapPin size={34} />
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: 'clamp(20px, 4.5vw, 24px)',
          fontWeight: 800,
          margin: '0 0 10px',
          letterSpacing: '-0.3px',
          color: 'var(--text-primary, #fff)'
        }}>
          Turn On Your Location
        </h2>

        {/* Description */}
        <p style={{
          fontSize: 'clamp(13px, 3.5vw, 14px)',
          color: 'var(--text-secondary, #94A3B8)',
          lineHeight: 1.55,
          margin: '0 0 24px'
        }}>
          Please allow your location to see restaurants and stores delivering to your area.
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Allow / Turn On Location Button */}
          <button
            onClick={handleDetectGPS}
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, var(--primary, #FF5722), #E64A19)',
              color: '#fff',
              border: 'none',
              padding: '14px 18px',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.75 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 6px 18px rgba(255, 87, 34, 0.35)',
              transition: 'transform 0.15s ease'
            }}
          >
            <FiNavigation size={17} />
            {loading ? 'Detecting Location...' : 'Allow Location'}
          </button>

          {/* Not Now Button */}
          <button
            onClick={handleDismiss}
            style={{
              background: 'transparent',
              color: 'var(--text-secondary, #94A3B8)',
              border: '1px solid var(--border, rgba(255,255,255,0.12))',
              padding: '12px 18px',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.15s'
            }}
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
}
