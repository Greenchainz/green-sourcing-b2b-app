/**
 * Geolocation Service
 * 
 * Handles geocoding addresses to coordinates and distance calculations
 * for supplier matching based on location proximity.
 */

const axios = require('axios');

// Azure Maps API endpoint
const AZURE_MAPS_API_KEY = process.env.AZURE_MAPS_KEY;
const AZURE_MAPS_ENDPOINT = 'https://atlas.microsoft.com';

/**
 * Geocode address to lat/lng using Azure Maps Search API
 * @param {string} address - Address string to geocode
 * @returns {Object|null} - {latitude, longitude, formattedAddress, city, state, zipCode} or null
 */
async function geocodeAddress(address) {
  if (!AZURE_MAPS_API_KEY) {
    console.warn('⚠️  Azure Maps API key not configured - geocoding disabled');
    return null;
  }

  try {
    const response = await axios.get(`${AZURE_MAPS_ENDPOINT}/search/address/json`, {
      params: {
        'api-version': '1.0',
        'query': address,
        'subscription-key': AZURE_MAPS_API_KEY,
        'countrySet': 'US'
      }
    });

    if (response.data && response.data.results && response.data.results.length > 0) {
      const result = response.data.results[0];
      const position = result.position;
      const addr = result.address;

      return {
        latitude: position.lat,
        longitude: position.lon,
        formattedAddress: addr.freeformAddress || address,
        city: addr.municipality || addr.municipalitySubdivision,
        state: addr.countrySubdivision,
        zipCode: addr.postalCode,
        country: addr.countryCode || 'US'
      };
    }

    console.warn(`⚠️  No geocoding results for address: ${address}`);
    return null;
  } catch (error) {
    console.error('Geocoding error:', error.message);
    if (error.response) {
      console.error('Azure Maps API error:', error.response.status, error.response.data);
    }
    return null;
  }
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in miles
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} - Distance in miles (rounded to 1 decimal)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    return null;
  }

  const R = 3959; // Earth radius in miles
  const toRad = (value) => (value * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal
}

/**
 * Find suppliers within radius of a location
 * @param {number} latitude - Target latitude
 * @param {number} longitude - Target longitude
 * @param {number} radiusMiles - Search radius in miles (default: 100)
 * @returns {Promise<Array>} - Array of suppliers with distance calculated
 */
async function findSuppliersNearby(latitude, longitude, radiusMiles = 100) {
  const { pool } = require('../db');

  if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
    console.warn('⚠️  Invalid coordinates provided for findSuppliersNearby');
    return [];
  }

  try {
    // Get all suppliers with locations
    const result = await pool.query(`
      SELECT 
        UserID as id, 
        Email as email,
        FirstName,
        LastName,
        city, 
        state, 
        latitude, 
        longitude, 
        service_radius
      FROM Users
      WHERE role = 'supplier'
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
    `);

    // Calculate distance for each supplier and filter by radius
    const nearby = result.rows
      .map(supplier => {
        const distance = calculateDistance(
          latitude,
          longitude,
          supplier.latitude,
          supplier.longitude
        );

        return {
          ...supplier,
          name: `${supplier.FirstName || ''} ${supplier.LastName || ''}`.trim(),
          distance: distance,
          distance_miles: distance
        };
      })
      .filter(supplier => supplier.distance !== null && supplier.distance <= radiusMiles)
      .sort((a, b) => a.distance - b.distance);

    return nearby;
  } catch (error) {
    console.error('Find nearby suppliers error:', error);
    return [];
  }
}

module.exports = {
  geocodeAddress,
  calculateDistance,
  findSuppliersNearby
};
