/**
 * Azure Services Integration Hub
 * Central export for all Azure service integrations
 */

const redis = require('./redis');
const monitoring = require('./monitoring');
const keyVault = require('./keyVault');
const storage = require('./storage');
const documentIntelligence = require('./documentIntelligence');

module.exports = {
    redis,
    monitoring,
    keyVault,
    storage,
    documentIntelligence,
    
    /**
     * Initialize all Azure services
     * Call this during app startup
     */
    async initializeAll() {
        const results = {
            redis: false,
            monitoring: false,
            keyVault: false,
            storage: false,
            documentIntelligence: false
        };

        console.log('🔷 Initializing Azure services...');

        // Initialize Application Insights first for monitoring
        try {
            await monitoring.initialize();
            results.monitoring = true;
            console.log('  ✅ Application Insights initialized');
        } catch (e) {
            console.warn('  ⚠️  Application Insights failed:', e.message);
        }

        // Initialize Redis for caching
        if (process.env.FEATURE_REDIS_CACHING === 'true') {
            try {
                await redis.connect();
                results.redis = true;
                console.log('  ✅ Azure Redis Cache connected');
            } catch (e) {
                console.warn('  ⚠️  Redis connection failed:', e.message);
            }
        }

        // Initialize Key Vault for secrets
        try {
            await keyVault.initialize();
            results.keyVault = true;
            console.log('  ✅ Azure Key Vault initialized');
        } catch (e) {
            console.warn('  ⚠️  Key Vault failed:', e.message);
        }

        // Initialize Storage
        try {
            await storage.initialize();
            results.storage = true;
            console.log('  ✅ Azure Storage initialized');
        } catch (e) {
            console.warn('  ⚠️  Storage failed:', e.message);
        }

        // Initialize Document Intelligence
        if (process.env.FEATURE_AI_DOCUMENT_ANALYSIS === 'true') {
            try {
                await documentIntelligence.initialize();
                results.documentIntelligence = true;
                console.log('  ✅ Azure Document Intelligence initialized');
            } catch (e) {
                console.warn('  ⚠️  Document Intelligence failed:', e.message);
            }
        }

        console.log('🔷 Azure services initialization complete');
        return results;
    },

    /**
     * Graceful shutdown of all Azure services
     */
    async shutdownAll() {
        console.log('🔷 Shutting down Azure services...');
        
        try {
            await redis.disconnect();
        } catch (e) {
            console.warn('Redis disconnect error:', e.message);
        }

        monitoring.flush();
        console.log('🔷 Azure services shutdown complete');
    }
};
