/**
 * Safely format an address (which could be a String, Object, or null/undefined)
 * into a human-readable string. Prevents React crashes when MongoDB objects are rendered.
 */
export const formatAddress = (addr) => {
  if (!addr) return '—';
  if (typeof addr === 'string') return addr.trim() || '—';
  if (typeof addr === 'object') {
    const parts = [
      addr.addressLine1 || addr.address || addr.street,
      addr.addressLine2,
      addr.landmark ? `Near ${addr.landmark}` : null,
      addr.area,
      addr.city,
      addr.state,
      addr.pincode ? `PIN: ${addr.pincode}` : null,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '—';
  }
  return String(addr);
};

/**
 * Extract coordinates from an order's deliveryAddress or deliveryCoords.
 */
export const getDeliveryCoords = (order) => {
  if (!order) return null;
  if (order.deliveryCoords?.lat && order.deliveryCoords?.lng) {
    return { lat: order.deliveryCoords.lat, lng: order.deliveryCoords.lng };
  }
  if (typeof order.deliveryAddress === 'object' && order.deliveryAddress?.latitude && order.deliveryAddress?.longitude) {
    return { lat: order.deliveryAddress.latitude, lng: order.deliveryAddress.longitude };
  }
  return null;
};
