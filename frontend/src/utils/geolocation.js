import api from '../lib/api';

/**
 * Robust device coordinate detection with two-tier fallback:
 * 1. Fast network/cellular/Wi-Fi triangulation (low accuracy, works indoors, cache up to 5 min)
 * 2. High accuracy GPS retry if the fast lookup times out or fails (unless permission denied)
 */
export const getCurrentCoordinates = () => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      return reject(new Error('Geolocation is not supported by your browser.'));
    }

    // Step 1: Fast network / cellular triangulation
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
      },
      (err) => {
        // If permission is explicitly denied, do not retry
        if (err.code === 1) {
          return reject(err);
        }

        // Step 2: Retry with high accuracy satellite GPS
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
            });
          },
          (err2) => {
            reject(err2);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  });
};

/**
 * Reverse geocodes lat/lng into address components (area, district, state, pincode)
 * Uses backend proxy first to avoid client CORS/403 issues, and BigDataCloud as client fallback.
 */
export const reverseGeocodeCoords = async (lat, lng) => {
  if (lat == null || lng == null) {
    return { area: '', district: '', state: 'Bihar', pincode: '', displayName: '' };
  }

  // Tier 1: Backend serviceability proxy (uses Nominatim with server user-agent)
  try {
    const res = await api.get(`/serviceability/reverse-geocode?lat=${lat}&lng=${lng}`);
    if (res.data?.success) {
      return {
        area: res.data.area || '',
        district: res.data.district || '',
        state: res.data.state || 'Bihar',
        pincode: res.data.pincode || '',
        displayName: res.data.displayName || ''
      };
    }
  } catch (e) {
    console.warn('Backend reverse-geocode failed, using client fallback:', e.message);
  }

  // Tier 2: BigDataCloud client reverse geocode (CORS-friendly for browser web apps)
  try {
    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
    if (res.ok) {
      const data = await res.json();
      const area = data.locality || data.city || '';
      const district = data.city || (data.localityInfo?.administrative?.find(a => a.order === 6 || a.order === 5 || a.name?.toLowerCase().includes('district'))?.name) || '';
      const state = data.principalSubdivision || 'Bihar';
      const pincode = data.postcode || '';
      return {
        area,
        district,
        state,
        pincode,
        displayName: [area, district, state].filter(Boolean).join(', ')
      };
    }
  } catch (e) {
    console.warn('Client BigDataCloud reverse geocode failed:', e.message);
  }

  return {
    area: '',
    district: '',
    state: 'Bihar',
    pincode: '',
    displayName: ''
  };
};
