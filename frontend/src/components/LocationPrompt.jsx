import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FiMapPin, FiNavigation, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../lib/api';

// Resolve clean locality from real GPS coords using the backend proxy (avoids CORS + rate-limits)
async function resolveExactPlaceName(lat, lng) {
  // 1. Backend Nominatim proxy — street/neighbourhood/city level accuracy
  try {
    const res = await api.get(`/customer/reverse-geocode?lat=${lat}&lng=${lng}`);
    if (res.data?.success && res.data.placeName && res.data.placeName !== 'Current Location') {
      return res.data.placeName;
    }
  } catch (e) {}

  // 2. BigDataCloud direct (fast, no auth, no CORS issue)
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );
    const data = await res.json();
    if (data) {
      const locality = data.locality || data.city;
      const city = data.city || data.principalSubdivision;
      if (locality && city && locality.toLowerCase() !== city.toLowerCase()) {
        return `${locality}, ${city}`;
      }
      return locality || city || null;
    }
  } catch (e) {}

  return null;
}

export default function LocationPrompt() {
  const [show, setShow] = useState(false);
  const location = useLocation();

  // Show on every home page visit / refresh
  useEffect(() => {
    if (location.pathname === '/') {
      const timer = setTimeout(() => setShow(true), 400);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [location.pathname]);

  // Manual trigger from Navbar 📍 button
  useEffect(() => {
    const handleRequest = () => setShow(true);
    window.addEventListener('requestLocationPrompt', handleRequest);
    return () => window.removeEventListener('requestLocationPrompt', handleRequest);
  }, []);

  const handleDismiss = () => setShow(false);

  const handleDetectGPS = () => {
    // Close modal immediately — no freeze, no wait
    setShow(false);

    // If we have cached GPS coords, notify app instantly while we refresh in background
    try {
      const cached = JSON.parse(localStorage.getItem('jdkart_coords') || 'null');
      if (cached?.lat && cached?.lng) {
        window.dispatchEvent(new Event('locationUpdated'));
      }
    } catch {}

    const toastId = toast.loading('📍 Getting your exact location…');

    // Saves GPS + resolves a human-readable place name from real coordinates
    const applyGPSCoords = async (coords) => {
      // Save coords immediately so the app reacts
      localStorage.setItem('jdkart_coords', JSON.stringify(coords));
      localStorage.setItem('jdkart_loc_name', 'Current Location');
      window.dispatchEvent(new Event('locationUpdated'));
      toast.success('📍 Location detected! Showing nearby items.', { id: toastId, duration: 2500 });

      // Resolve exact human-readable name in background (no UI blocking)
      const name = await resolveExactPlaceName(coords.lat, coords.lng);
      if (name) {
        localStorage.setItem('jdkart_loc_name', name);
        window.dispatchEvent(new Event('locationUpdated'));
      }
    };

    // IP fallback — only used if GPS is explicitly denied (code 1) or device has no GPS
    const fallbackToIP = async () => {
      try {
        // Use backend proxy so we get the server-side client IP (more accurate than browser IP)
        const res = await api.get('/customer/ip-location');
        const data = res.data;
        if (data?.success && data.lat && data.lng) {
          localStorage.setItem('jdkart_coords', JSON.stringify({ lat: data.lat, lng: data.lng }));
          localStorage.setItem('jdkart_loc_name', data.city || 'Current Location');
          window.dispatchEvent(new Event('locationUpdated'));
          toast.success(`📍 Location set to ${data.city || 'your city'}.`, { id: toastId, duration: 2500 });
          return;
        }
      } catch {}

      // Direct client IP as last resort
      try {
        const res = await fetch('https://ipwho.is/');
        const data = await res.json();
        if (data?.latitude && data?.longitude) {
          const city = data.city || data.region || 'Current Location';
          localStorage.setItem('jdkart_coords', JSON.stringify({ lat: data.latitude, lng: data.longitude }));
          localStorage.setItem('jdkart_loc_name', city);
          window.dispatchEvent(new Event('locationUpdated'));
          toast.success(`📍 Location set to ${city}.`, { id: toastId, duration: 2500 });
          return;
        }
      } catch {}

      toast.error('Location unavailable. Please type your city in the search bar.', { id: toastId, duration: 4000 });
    };

    if (!navigator.geolocation) {
      fallbackToIP();
      return;
    }

    // Strategy: Two-phase GPS
    // Phase 1 — fast network-assisted location (Wi-Fi/cell tower), no satellite wait, ~1s
    // Phase 2 — if Phase 1 fails, try high-accuracy GPS (satellite), longer timeout
    // If BOTH fail (GPS denied), silently fall back to IP

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Got a network-assisted fix
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        applyGPSCoords(coords);

        // Silently try to refine with high-accuracy GPS in background (no UI impact)
        navigator.geolocation.getCurrentPosition(
          (refinedPos) => {
            const refined = { lat: refinedPos.coords.latitude, lng: refinedPos.coords.longitude };
            // Only update if meaningfully different (>50m away)
            const latDiff = Math.abs(refined.lat - coords.lat);
            const lngDiff = Math.abs(refined.lng - coords.lng);
            if (latDiff > 0.0005 || lngDiff > 0.0005) {
              localStorage.setItem('jdkart_coords', JSON.stringify(refined));
              window.dispatchEvent(new Event('locationUpdated'));
              resolveExactPlaceName(refined.lat, refined.lng).then(name => {
                if (name) {
                  localStorage.setItem('jdkart_loc_name', name);
                  window.dispatchEvent(new Event('locationUpdated'));
                }
              });
            }
          },
          () => {}, // Silent — network fix is already applied
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );
      },
      (err) => {
        if (err.code === 1) {
          // Permission denied — IP fallback
          toast.error('Location permission denied. Falling back to your approximate city.', { id: toastId, duration: 3000 });
          fallbackToIP();
        } else {
          // Timeout or GPS unavailable — try high-accuracy GPS one more time
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              applyGPSCoords(coords);
            },
            () => {
              // Both GPS attempts failed — use IP
              fallbackToIP();
            },
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
          );
        }
      },
      // Phase 1: fast, network-assisted, no satellite wait
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
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
            top: 14, right: 14,
            background: 'var(--bg-card2, rgba(255,255,255,0.06))',
            border: 'none',
            color: 'var(--text-secondary, #94A3B8)',
            width: 34, height: 34,
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s'
          }}
        >
          <FiX size={18} />
        </button>

        {/* Icon */}
        <div style={{
          width: 68, height: 68,
          background: 'linear-gradient(135deg, rgba(255,87,34,0.2), rgba(255,152,0,0.1))',
          border: '1.5px solid rgba(255,87,34,0.35)',
          borderRadius: 22,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 18px',
          color: 'var(--primary, #FF5722)',
          boxShadow: '0 8px 24px rgba(255,87,34,0.25)'
        }}>
          <FiMapPin size={34} />
        </div>

        <h2 style={{
          fontSize: 'clamp(20px, 4.5vw, 24px)',
          fontWeight: 800,
          margin: '0 0 10px',
          letterSpacing: '-0.3px',
          color: 'var(--text-primary, #fff)'
        }}>
          Turn On Your Location
        </h2>

        <p style={{
          fontSize: 'clamp(13px, 3.5vw, 14px)',
          color: 'var(--text-secondary, #94A3B8)',
          lineHeight: 1.55,
          margin: '0 0 24px'
        }}>
          Allow location access to see restaurants and stores near you.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8,
              boxShadow: '0 6px 18px rgba(255, 87, 34, 0.35)',
              transition: 'transform 0.15s ease'
            }}
          >
            <FiNavigation size={17} />
            Allow Location
          </button>

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
