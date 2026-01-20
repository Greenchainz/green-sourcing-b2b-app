const express = require('express');
const router = express.Router();
const { general: generalRateLimit } = require('../middleware/rateLimit');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { findSuppliersNearby, geocodeAddress } = require('../services/geocoding');

/**
 * GET /api/v1/suppliers/nearby
 * Find suppliers near a location
 */
router.get('/nearby', generalRateLimit, authenticateToken, async (req, res) => {
  try {
    const { address, lat, lng, radius = 100 } = req.query;

    let latitude, longitude;

    if (address) {
      // Geocode address
      const geo = await geocodeAddress(address);
      if (!geo) {
        return res.status(400).json({
          success: false,
          error: 'Could not geocode address'
        });
      }
      latitude = geo.latitude;
      longitude = geo.longitude;
    } else if (lat && lng) {
      latitude = parseFloat(lat);
      longitude = parseFloat(lng);
      
      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid latitude or longitude'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'Provide either address or lat/lng'
      });
    }

    const suppliers = await findSuppliersNearby(
      latitude,
      longitude,
      parseInt(radius)
    );

    res.json({
      success: true,
      data: {
        suppliers,
        search_location: { latitude, longitude },
        radius_miles: parseInt(radius),
        count: suppliers.length
      }
    });

  } catch (error) {
    console.error('Nearby suppliers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to find nearby suppliers',
      message: error.message
    });
  }
});

module.exports = router;
