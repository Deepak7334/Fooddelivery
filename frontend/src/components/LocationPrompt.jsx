import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FiMapPin, FiNavigation, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../lib/api';

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
    // 1. Instantly dismiss modal so the user never feels blocked or frozen
    setShow(false);

    // 2. If cached coordinates exist, activate them instantaneously in 0ms
    try {
      const cached = localStorage.getItem('jdkart_coords');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.lat && parsed?.lng) {
          window.dispatchEvent(new Event('locationUpdated'));
        }
      }
    } catch {}

    const toastId = toast.loading('📍 Acquiring accurate location…');

    // Helper: Smart reverse geocoding to resolve exact neighborhood and city
    const resolvePlaceName = (coords) => {
      // 1. Try OpenStreetMap Nominatim with English and zoom=16
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&zoom=16&addressdetails=1`, {
        headers: { 'Accept-Language': 'en' }
      })
        .then((r) => r.json())
        .then((data) => {
          if (data?.address) {
            const a = data.address;
            const loc = a.neighbourhood || a.suburb || a.quarter || a.residential || a.road || a.village || a.town;
            const city = a.city || a.town || a.county || a.state_district;
            let label = loc || city;
            if (loc && city && loc !== city) {
              label = `${loc}, ${city}`;
            }
            if (label) {
              localStorage.setItem('jdkart_loc_name', label);
              window.dispatchEvent(new Event('locationUpdated'));
              return;
            }
          }
          throw new Error('Fallback to secondary geocoder');
        })
        .catch(() => {
          // 2. Fallback to BigDataCloud client API (<100ms)
          fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.lat}&longitude=${coords.lng}&localityLanguage=en`)
            .then((r) => r.json())
            .then((data) => {
              const locality = data.locality || data.city;
              const city = data.city || data.principalSubdivision;
              let label = locality;
              if (locality && city && locality !== city) {
                label = `${locality}, ${city}`;
              }
              if (label) {
                localStorage.setItem('jdkart_loc_name', label);
                window.dispatchEvent(new Event('locationUpdated'));
              }
            })
            .catch(() => {});
        });
    };

    const applyLocation = (coords, placeName) => {
      localStorage.setItem('jdkart_coords', JSON.stringify(coords));
      if (placeName) {
        localStorage.setItem('jdkart_loc_name', placeName);
      } else {
        const prev = localStorage.getItem('jdkart_loc_name');
        localStorage.setItem('jdkart_loc_name', prev && !prev.includes('Current Location') ? prev : 'Current Location');
      }
      window.dispatchEvent(new Event('locationUpdated'));
      toast.success(placeName ? `📍 Location active near ${placeName}!` : '📍 Accurate live location detected!', { id: toastId, duration: 2500 });
      resolvePlaceName(coords);
    };

    // Stage 3 Fallback: IP-based location (used when GPS is unavailable/blocked)
    const fallbackToIP = async (isPermissionDenied = false) => {
      try {
        const res = await api.get('/customer/ip-location').catch(() => null);
        if (res?.data?.success && res.data.lat && res.data.lng) {
          const city = res.data.city || 'your area';
          applyLocation({ lat: res.data.lat, lng: res.data.lng }, city);
          if (isPermissionDenied) {
            toast.success(`📍 Showing items near ${city}. Enable device GPS for pinpoint accuracy.`, { id: toastId, duration: 4000 });
          }
          return true;
        }

        const ipRes = await fetch('https://ipwho.is/').then((r) => r.json()).catch(() => null);
        if (ipRes && ipRes.success && ipRes.latitude && ipRes.longitude) {
          const city = ipRes.city || ipRes.region || 'your area';
          applyLocation({ lat: ipRes.latitude, lng: ipRes.longitude }, city);
          if (isPermissionDenied) {
            toast.success(`📍 Showing items near ${city}. Enable device GPS for pinpoint accuracy.`, { id: toastId, duration: 4000 });
          }
          return true;
        }
      } catch (e) {
        console.warn('IP fallback failed:', e);
      }
      return false;
    };

    if (!navigator.geolocation) {
      fallbackToIP().then((ok) => {
        if (!ok) toast.error('Geolocation is not supported by your browser', { id: toastId });
      });
      return;
    }

    // STAGE 1: Try High Accuracy GPS first (gives pinpoint street-level accuracy on mobile!)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        applyLocation(coords);
      },
      (err) => {
        // If user explicitly denied permission, do not retry GPS; fallback to IP
        if (err.code === 1) {
          fallbackToIP(true).then((ok) => {
            if (!ok) toast.error('Location access was denied. Please allow it in browser settings.', { id: toastId });
          });
          return;
        }

        // STAGE 2: If High Accuracy timed out or failed (indoors/laptop), seamlessly try Network/Wi-Fi positioning
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            applyLocation(coords);
          },
          async () => {
            // STAGE 3: If network positioning also fails, fallback to IP
            const ok = await fallbackToIP(false);
            if (!ok) {
              toast.error('Could not detect location. Please select your city or try again.', { id: toastId, duration: 3500 });
            }
          },
          { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 }
        );
      },
      // Stage 1 config: enableHighAccuracy: true gives satellite/meter accuracy on mobile phones
      // 8-second timeout gives hardware time to lock; 60-second cache returns recent GPS fix in 0ms!
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
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
