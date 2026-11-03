const ServiceArea = require('../models/ServiceArea');
const Restaurant = require('../models/Restaurant');
const Store = require('../models/Store');

const checkServiceability = async (address) => {
  if (!address || (!address.pincode && !address.latitude && !address.longitude && !address.addressLine1 && !address.city)) {
    return {
      serviceable: false,
      message: "Location is required to check serviceability."
    };
  }

  // 1. Find matching service area by pincode primarily
  let serviceArea = null;
  if (address.pincode) {
    serviceArea = await ServiceArea.findOne({
      pincodes: address.pincode,
      status: 'ACTIVE'
    });
  }

  // 2. Fallback: match by city or area name if pincode didn't match
  if (!serviceArea && (address.city || address.area)) {
    const searchName = (address.city || address.area || '').trim();
    if (searchName) {
      serviceArea = await ServiceArea.findOne({
        city: new RegExp(searchName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
        status: 'ACTIVE'
      });
    }
  }

  // 3. Fallback: For manual address entries or GPS orders, fallback to any active service area
  if (!serviceArea) {
    serviceArea = await ServiceArea.findOne({ status: 'ACTIVE' });
  }

  if (!serviceArea && !(address.latitude && address.longitude)) {
    return {
      serviceable: false,
      message: "JDkart is not available at this address yet."
    };
  }

  return {
    serviceable: true,
    serviceAreaId: serviceArea ? serviceArea._id.toString() : null,
    serviceAreaName: serviceArea ? serviceArea.name : 'GPS Location',
    deliveryFee: serviceArea ? serviceArea.deliveryFee : 0,
    minimumOrderValue: serviceArea ? serviceArea.minimumOrderValue : 0,
    estimatedDeliveryTime: serviceArea ? serviceArea.estimatedDeliveryTime : 45
  };
};

const checkVendorServiceability = async (vendorType, vendorId, serviceAreaId, deliveryAddress) => {
  let vendor = null;
  if (vendorType === 'restaurant') {
    vendor = await Restaurant.findById(vendorId);
  } else if (vendorType === 'store') {
    vendor = await Store.findById(vendorId);
  }

  if (!vendor) return false;
  
  if (!vendor.isActive || !vendor.isOpen) return false;

  // STRICT 5KM RADIUS RESTRICTION (If GPS coordinates are available)
  if (deliveryAddress && deliveryAddress.latitude && deliveryAddress.longitude && vendor.location && vendor.location.coordinates) {
    const vLon = vendor.location.coordinates[0];
    const vLat = vendor.location.coordinates[1];
    
    // Only enforce if the vendor actually set their coordinates!
    if (vLon !== 0 && vLat !== 0) {
      function deg2rad(deg) { return deg * (Math.PI/180); }
      const R = 6371;
      const dLat = deg2rad(deliveryAddress.latitude - vLat);
      const dLon = deg2rad(deliveryAddress.longitude - vLon);
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(deg2rad(vLat)) * Math.cos(deg2rad(deliveryAddress.latitude)) * Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      if (distance > 5) {
        return false; // Blocks delivery if > 5km
      } else {
        return true;  // ALLOW delivery if <= 5km, ignoring Pincode mismatch
      }
    }
  }

  // If the vendor has serviceAreaIds defined, check if it includes the target area
  if (vendor.serviceAreaIds && vendor.serviceAreaIds.length > 0 && serviceAreaId) {
    return vendor.serviceAreaIds.map(id => id.toString()).includes(serviceAreaId.toString());
  }

  // If it's a manual text address without GPS coordinates, allow delivery from active & open vendor
  if (!deliveryAddress?.latitude && !deliveryAddress?.longitude) {
    return true;
  }

  return false; 
};

module.exports = {
  checkServiceability,
  checkVendorServiceability
};
