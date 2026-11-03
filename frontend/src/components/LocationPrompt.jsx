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

    const toastId = toast.loading('📍 Acquiring your live location…');

    // Helper: Reverse-geocode coordinates using our backend proxy (bypasses browser CORS & User-Agent limits)
    const resolvePlaceName = async (coords) => {
      try {
        const res = await api.get(`/customer/reverse-geocode?lat=${coords.lat}&lng=${coords.lng}`).catch(() => null);
        if (res?.data?.success && res.data.placeName && res.data.placeName !== 'Current Location') {
          localStorage.setItem('jdkart_loc_name', res.data.placeName);
          window.dispatchEvent(new Event('locationUpdated'));
          toast.success(`📍 Location: ${res.data.placeName}`, { id: toastId, duration: 3000 });
          return;
        }

        // Secondary client fallback: BigDataCloud
        const bdc = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.lat}&longitude=${coords.lng}&localityLanguage=en`)
          .then(r => r.json())
          .catch(() => null);
        if (bdc) {
          const loc = bdc.locality || bdc.city;
          const city = bdc.city || bdc.principalSubdivision;
          let label = loc;
          if (loc && city && loc !== city) label = `${loc}, ${city}`;
          if (label) {
            localStorage.setItem('jdkart_loc_name', label);
            window.dispatchEvent(new Event('locationUpdated'));
            toast.success(`📍 Location: ${label}`, { id: toastId, duration: 3000 });
          }
        }
      } catch (e) {
        console.warn('Reverse geocode warning:', e);
      }
    };

    const applyLocation = (coords) => {
      localStorage.setItem('jdkart_coords', JSON.stringify(coords));
      // Set initial placeholder while reverse-geocoding runs
      const currentName = localStorage.getItem('jdkart_loc_name');
      if (!currentName) {
        localStorage.setItem('jdkart_loc_name', 'Detecting address…');
      }
      window.dispatchEvent(new Event('locationUpdated'));
      resolvePlaceName(coords);
    };

    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser', { id: toastId });
      return;
    }

    // STAGE 1: Real GPS hardware acquisition (maximumAccuracy: true, maximumAge: 0 forces FRESH GPS fix, not stale cache!)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        applyLocation(coords);
      },
      (err) => {
        // If user explicitly blocked/denied permission in browser
        if (err.code === 1) {
          toast.error('Location permission was denied. Please allow location in your browser settings (lock icon).', { id: toastId, duration: 4500 });
          return;
        }

        // STAGE 2: If satellite GPS hardware is unavailable (e.g. indoors or laptop), retry with network Wi-Fi positioning
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            applyLocation(coords);
          },
          (stage2Err) => {
            console.warn('Network location also failed:', stage2Err);
            toast.error('Could not get GPS fix. Please ensure location is enabled on your device.', { id: toastId, duration: 4000 });
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 }
        );
      },
      // 10s timeout gives the mobile GPS chip time to lock onto satellites
      // maximumAge: 0 forces browser to query real hardware rather than returning stale cached tower data
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
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
