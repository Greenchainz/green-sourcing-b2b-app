/**
 * Catalog Service Index
 * 
 * Exports all catalog-related services for material search,
 * sustainability scoring, and product catalog management.
 */

const search = require('./search');
const scoring = require('./scoring');

module.exports = {
    // Search functions
    searchMaterials: search.searchMaterials,
    getMaterialById: search.getMaterialById,
    getCategoryTree: search.getCategoryTree,
    compareMaterials: search.compareMaterials,
    getAvailableCertifications: search.getAvailableCertifications,
    getFacets: search.getFacets,
    
    // Scoring functions
    calculateSustainabilityBreakdown: scoring.calculateSustainabilityBreakdown,
    calculateAndPersistBreakdown: scoring.calculateAndPersistBreakdown,
    getCachedBreakdown: scoring.getCachedBreakdown,
    
    // Component scoring (for testing/extension)
    calculateCertificationScore: scoring.calculateCertificationScore,
    calculateCarbonScore: scoring.calculateCarbonScore,
    calculateTransparencyScore: scoring.calculateTransparencyScore,
    calculateLEEDScore: scoring.calculateLEEDScore,
    
    // Constants
    SORT_OPTIONS: search.SORT_OPTIONS,
    DEFAULT_LIMIT: search.DEFAULT_LIMIT,
    MAX_LIMIT: search.MAX_LIMIT,
    WEIGHTS: scoring.WEIGHTS,
    CERT_TIERS: scoring.CERT_TIERS,
    GWP_THRESHOLDS: scoring.GWP_THRESHOLDS
};
