import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FiMapPin, FiNavigation, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';

// Client-side reverse geocoder — resolves clean locality and city from real GPS coordinates
async function getCleanPlaceName(lat, lng) {
  // 1. Try BigDataCloud client API (<100ms, accurate, no auth)
  try {
    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
    const data = await res.json();
    if (data) {
      const locality = data.locality || data.city;
      const city = data.city || data.principalSubdivision;
      const state = data.principalSubdivision;

      let label = locality || city;
      if (locality && city && locality.toLowerCase() !== city.toLowerCase()) {
        label = `${locality}, ${city}`;
      } else if (label && state && label.toLowerCase() !== state.toLowerCase()) {
        label = `${label}, ${state}`;
      }
      if (label) return label;
    }
  } catch (e) {}

  // 2. Try Photon (OpenStreetMap reverse geocode)
  try {
    const res = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`);
    const data = await res.json();
    const p = data.features?.[0]?.properties;
    if (p) {
      const name = p.name || p.city || p.town || p.district;
      const state = p.state;
      let label = name;
      if (name && state && name.toLowerCase() !== state.toLowerCase()) {
        label = `${name}, ${state}`;
      }
      if (label) return label;
    }
  } catch (e) {}

  return 'Current Location';
}

export default function LocationPrompt() {
  const [show, setShow] = useState(false);
  const location = useLocation();

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

  const handleDismiss = () => {
    setShow(false);
  };

  const handleDetectGPS = () => {
    // 1. Instantly dismiss modal so the user is never blocked
    setShow(false);

    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    const toastId = toast.loading('📍 Detecting your real GPS location…');

    // ONLY use genuine hardware GPS — NEVER guess random locations from mobile IP or data
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };

        // Save real verified GPS coordinates
        localStorage.setItem('jdkart_coords', JSON.stringify(coords));
        
        // Immediately notify app so nearby vendors update
        window.dispatchEvent(new Event('locationUpdated'));

        // Resolve exact place name from real GPS coordinates
        const placeName = await getCleanPlaceName(coords.lat, coords.lng);
        const finalName = placeName && placeName !== 'Current Location' ? placeName : 'Current Location';

        localStorage.setItem('jdkart_loc_name', finalName);
        window.dispatchEvent(new Event('locationUpdated'));
        toast.success(`📍 Location: ${finalName}`, { id: toastId, duration: 3000 });
      },
      (err) => {
        console.warn('GPS detection error:', err);
        // Do NOT guess random locations. Accurately inform the user what happened:
        if (err.code === 1) {
          toast.error('Location permission was denied. Please allow location in your browser settings (lock icon).', { id: toastId, duration: 5000 });
        } else if (err.code === 2) {
          toast.error('Device GPS is turned off. Please turn on Location in your phone settings.', { id: toastId, duration: 5000 });
        } else if (err.code === 3) {
          toast.error('GPS request timed out. Please ensure Location is enabled on your device and try again.', { id: toastId, duration: 5000 });
        } else {
          toast.error('Could not detect GPS. Please enter your city in the search bar.', { id: toastId, duration: 4000 });
        }
      },
      // Real GPS hardware settings:
      // enableHighAccuracy: true forces satellite/hardware GPS (not cell tower or IP guesses!)
      // timeout: 12000 gives the GPS hardware enough time to lock onto satellites
      // maximumAge: 0 forces fresh real-time coordinates, never stale cache
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
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
      animation: 'fadeIn 0.2s ease'
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
            style={{
              background: 'linear-gradient(135deg, var(--primary, #FF5722), #E64A19)',
              color: '#fff',
              border: 'none',
              padding: '14px 18px',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 6px 18px rgba(255, 87, 34, 0.35)',
              transition: 'transform 0.15s ease'
            }}
          >
            <FiNavigation size={17} />
            Allow Location
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
