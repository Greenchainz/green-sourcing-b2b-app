/**
 * Payments Service Index
 * 
 * Unified export for all payment-related services
 */

const stripe = require('./stripe');
const linkedin = require('./linkedin');

module.exports = {
    stripe,
    linkedin
};
