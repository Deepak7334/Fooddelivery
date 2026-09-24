const Restaurant = require('../models/Restaurant');
const Store = require('../models/Store');
const ServiceArea = require('../models/ServiceArea');
const Category = require('../models/Category');

const getHomeFeed = async (req, res) => {
  try {
    const { serviceAreaId } = req.query;

    let restaurantQuery = { isActive: true, isOpen: true };
    let storeQuery = { isActive: true, isOpen: true };

    let serviceAreaDetails = null;

    if (serviceAreaId) {
      // Validate serviceAreaId
      const area = await ServiceArea.findById(serviceAreaId);
      if (area && area.status === 'ACTIVE') {
        serviceAreaDetails = area;
        // If an area is selected, only fetch businesses that explicitly serve this area,
        // or have no assigned areas (legacy support).
        restaurantQuery.$or = [
          { serviceAreaIds: serviceAreaId },
          { serviceAreaIds: { $size: 0 } },
          { serviceAreaIds: { $exists: false } }
        ];
        storeQuery.$or = [
          { serviceAreaIds: serviceAreaId },
          { serviceAreaIds: { $size: 0 } },
          { serviceAreaIds: { $exists: false } }
        ];
      }
    }
    // If no serviceAreaId, we are in Browse Mode. Return popular/all available businesses.

    // Using limit for optimization. In a real scenario, this would have pagination or more complex curation.
    const restaurants = await Restaurant.find(restaurantQuery).limit(10).lean();
    const groceryStores = await Store.find(storeQuery).limit(10).lean();
    
    // In browse mode, fetch categories for food and grocery
    const foodCategories = await Category.find({ type: 'food' }).limit(6).lean();
    
    res.json({
      serviceArea: serviceAreaDetails,
      categories: foodCategories,
      restaurants,
      groceryStores,
      // Dummy data for now, would be fetched from Food/Product models based on popularity
      popularItems: [],
      popularProducts: [],
      offers: []
    });

  } catch (error) {
    console.error('Home feed error:', error);
    res.status(500).json({ message: 'Server error fetching home feed' });
  }
};

module.exports = {
  getHomeFeed
};
