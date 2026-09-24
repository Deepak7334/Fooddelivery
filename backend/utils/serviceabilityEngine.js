const ServiceArea = require('../models/ServiceArea');
const Restaurant = require('../models/Restaurant');
const Store = require('../models/Store');

const checkServiceability = async (address) => {
  if (!address || (!address.pincode && !address.latitude && !address.longitude)) {
    return {
      serviceable: false,
      message: "Location is required to check serviceability."
    };
  }

  // Find matching service area by pincode primarily
  let serviceArea = null;
  if (address.pincode) {
    serviceArea = await ServiceArea.findOne({
      pincodes: address.pincode,
      status: 'ACTIVE'
    });
  }

  // Fallback to geometric check if we have lat/lng but no pincode match? 
  // For now, prompt specified pincode based approach: "1. Is the pincode supported?"
  // If no service area is found, it's not serviceable.
  if (!serviceArea) {
    return {
      serviceable: false,
      message: "JDkart is not available at this address yet."
    };
  }

  return {
    serviceable: true,
    serviceAreaId: serviceArea._id.toString(),
    serviceAreaName: serviceArea.name,
    deliveryFee: serviceArea.deliveryFee,
    minimumOrderValue: serviceArea.minimumOrderValue,
    estimatedDeliveryTime: serviceArea.estimatedDeliveryTime
  };
};

const checkVendorServiceability = async (vendorType, vendorId, serviceAreaId) => {
  let vendor = null;
  if (vendorType === 'restaurant') {
    vendor = await Restaurant.findById(vendorId);
  } else if (vendorType === 'store') {
    vendor = await Store.findById(vendorId);
  }

  if (!vendor) return false;
  
  if (!vendor.isActive || !vendor.isOpen) return false;

  // If the vendor has serviceAreaIds defined, check if it includes the target area
  if (vendor.serviceAreaIds && vendor.serviceAreaIds.length > 0) {
    return vendor.serviceAreaIds.map(id => id.toString()).includes(serviceAreaId.toString());
  }

  // Strictly enforce service areas. If a restaurant has no service area assigned, it cannot deliver.
  return false; 
};

module.exports = {
  checkServiceability,
  checkVendorServiceability
};
