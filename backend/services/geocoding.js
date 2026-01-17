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
    // Join users and companies to get location info
    // Schema assumption: companies table has lat/long, users linked to companies
    // Fallback: Check if users table has lat/long directly (as in legacy schema)

    // Attempt 1: Try using companies table (Standard Schema)
    try {
      const result = await pool.query(`
        SELECT
          u.user_id as id,
          u.email,
          u.first_name,
          u.last_name,
          c.company_name,
          c.latitude,
          c.longitude
        FROM users u
        JOIN companies c ON u.company_id = c.company_id
        WHERE u.role = 'supplier' OR u.role = 'Supplier'
          AND c.latitude IS NOT NULL
          AND c.longitude IS NOT NULL
      `);

      if (result.rows.length > 0) {
        return processResults(result.rows, latitude, longitude, radiusMiles);
      }
    } catch (err) {
      // Ignore error and try fallback
    }

    // Attempt 2: Fallback to users table (Legacy Schema)
    // Note: Assuming column names might be lowercase based on schema.sql,
    // but code previously used 'Users' and 'UserID'. Using lowercase 'users' and 'user_id' per target schema.
    const result = await pool.query(`
      SELECT 
        user_id as id,
        email,
        first_name,
        last_name,
        latitude, 
        longitude
      FROM users
      WHERE (role = 'supplier' OR role = 'Supplier')
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
    `);

    return processResults(result.rows, latitude, longitude, radiusMiles);

  } catch (error) {
    console.error('Find nearby suppliers error:', error);
    return [];
  }
}

function processResults(rows, lat, lon, radius) {
    return rows
      .map(supplier => {
        const distance = calculateDistance(
          lat,
          lon,
          supplier.latitude,
          supplier.longitude
        );

        return {
          ...supplier,
          name: supplier.company_name || `${supplier.first_name || ''} ${supplier.last_name || ''}`.trim(),
          distance: distance,
          distance_miles: distance
        };
      })
      .filter(supplier => supplier.distance !== null && supplier.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
}

module.exports = {
  geocodeAddress,
  calculateDistance,
  findSuppliersNearby
};
