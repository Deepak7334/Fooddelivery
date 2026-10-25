// Haversine formula — returns distance in km between two lat/lng points
export function calculateDistance(lat1, lng1, lat2, lng2) {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null;
  const numLat1 = parseFloat(lat1);
  const numLng1 = parseFloat(lng1);
  const numLat2 = parseFloat(lat2);
  const numLng2 = parseFloat(lng2);
  if (isNaN(numLat1) || isNaN(numLng1) || isNaN(numLat2) || isNaN(numLng2)) return null;

  const R = 6371; // Earth radius in km
  const dLat = ((numLat2 - numLat1) * Math.PI) / 180;
  const dLng = ((numLng2 - numLng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((numLat1 * Math.PI) / 180) *
      Math.cos((numLat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Extracts valid lat & lng from vendor (supports GeoJSON Point [lng, lat] and flat { lat, lng })
export function getVendorCoords(vendor) {
  if (!vendor) return null;
  const loc = vendor.location;
  if (!loc) return null;

  if (Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
    const lng = parseFloat(loc.coordinates[0]);
    const lat = parseFloat(loc.coordinates[1]);
    if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
      return { lat, lng };
    }
  }
  if (loc.lat != null && loc.lng != null) {
    const lat = parseFloat(loc.lat);
    const lng = parseFloat(loc.lng);
    if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
      return { lat, lng };
    }
  }
  return null;
}

// Computes distance from userCoords { lat, lng } to vendor in km (or null)
export function getVendorDistance(vendor, userCoords) {
  if (!userCoords || userCoords.lat == null || userCoords.lng == null) return null;
  const vCoords = getVendorCoords(vendor);
  if (!vCoords) return null;
  return calculateDistance(userCoords.lat, userCoords.lng, vCoords.lat, vCoords.lng);
}

// Formats distance into clean human-readable string (e.g. "650 m", "1.8 km", "12 km")
export function formatDistance(km) {
  if (km == null || isNaN(km)) return null;
  if (km < 1.0) {
    const meters = Math.round(km * 1000);
    return `${meters} m`;
  } else if (km < 10) {
    return `${km.toFixed(1)} km`;
  } else {
    return `${Math.round(km)} km`;
  }
}
