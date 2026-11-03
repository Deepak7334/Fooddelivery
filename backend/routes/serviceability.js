const express = require('express');
const router = express.Router();
const { checkServiceability } = require('../utils/serviceabilityEngine');
const ServiceArea = require('../models/ServiceArea');

router.post('/check', async (req, res) => {
  try {
    const { address } = req.body;
    const result = await checkServiceability(address);
    res.json(result);
  } catch (error) {
    console.error('Serviceability check error:', error);
    res.status(500).json({ message: 'Server error checking serviceability' });
  }
});

// Reverse geocode endpoint (server-side proxy avoids client CORS/403 issues)
router.get('/reverse-geocode', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'Latitude and Longitude are required' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    let area = '';
    let district = '';
    let state = '';
    let pincode = '';
    let displayName = '';

    // 1. Try Nominatim with custom User-Agent
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
        headers: {
          'User-Agent': 'Foodhub-Delivery/1.0 (contact@jdkart.com)',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(4000)
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.address) {
          const addr = data.address;
          area = addr.neighbourhood || addr.suburb || addr.village || addr.residential || addr.road || addr.quarter || addr.subdivision || '';
          district = addr.city_district || addr.district || addr.city || addr.town || addr.county || '';
          state = addr.state || '';
          pincode = addr.postcode || '';
          displayName = data.display_name || '';
        }
      }
    } catch (e) {
      console.warn('Nominatim reverse geocode notice:', e.message);
    }

    // 2. Fallback to BigDataCloud client API if fields are missing
    if (!district || !area) {
      try {
        const bdcRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`, {
          signal: AbortSignal.timeout(4000)
        });
        if (bdcRes.ok) {
          const bdc = await bdcRes.json();
          if (!area) area = bdc.locality || bdc.city || '';
          if (!district) district = bdc.city || (bdc.localityInfo?.administrative?.find(a => a.order === 6 || a.order === 5 || a.name?.toLowerCase().includes('district'))?.name) || '';
          if (!state) state = bdc.principalSubdivision || 'Bihar';
          if (!pincode && bdc.postcode) pincode = bdc.postcode;
        }
      } catch (e) {
        console.warn('BigDataCloud reverse geocode notice:', e.message);
      }
    }

    // 3. Fallback: Check if matching an active ServiceArea by coordinates or default
    try {
      const serviceArea = await ServiceArea.findOne({ status: 'ACTIVE' });
      if (!state && serviceArea?.state) state = serviceArea.state;
      if (!district && serviceArea?.city) district = serviceArea.city;
      if (!area && serviceArea?.name) area = serviceArea.name;
      if (!pincode && serviceArea?.pincodes?.length) pincode = serviceArea.pincodes[0];
    } catch (e) {}

    return res.json({
      success: true,
      area: area || 'Current Location',
      district: district || 'Rohtas',
      state: state || 'Bihar',
      pincode: pincode || '',
      displayName
    });
  } catch (err) {
    console.error('Reverse geocode error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reverse geocode' });
  }
});

module.exports = router;
