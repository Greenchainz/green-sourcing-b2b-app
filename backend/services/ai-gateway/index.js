/**
 * AI Gateway - Central Export Hub
 * 
 * The Agent Gateway provides a unified interface to Azure AI Foundry
 * workflows with tier-based entitlements, quota management, caching,
 * and audit logging.
 * 
 * Features:
 * - Route calls to Azure Foundry agents/workflows by name/version
 * - Enforce tier entitlements (free, pro, enterprise, admin)
 * - Track and limit usage quotas
 * - Log all calls with redacted inputs for compliance
 * - Cache safe workflow results (compliance, alternatives)
 * - Intercom draft message generation with gated sending
 */

const agentGateway = require('./agentGateway');
const entitlements = require('./entitlements');
const callLogger = require('./callLogger');
const workflowCache = require('./workflowCache');
const workflowRegistry = require('./workflowRegistry');
const intercomSender = require('./intercomSender');

module.exports = {
    // Main gateway entry point
    gateway: agentGateway,
    
    // Execute a workflow (convenience export)
    execute: agentGateway.execute,
    
    // List workflows available to a user
    listWorkflows: agentGateway.listAvailableWorkflows,
    
    // Health check
    getHealth: agentGateway.getHealth,
    
    // Error class
    GatewayError: agentGateway.GatewayError,
    
    // Sub-modules for advanced usage
    entitlements,
    callLogger,
    workflowCache,
    workflowRegistry,
    intercomSender,
    
    /**
     * Initialize the AI Gateway
     * Called during app startup
     */
    async initialize() {
        console.log('🤖 Initializing AI Gateway...');
        
        try {
            // Refresh workflow registry cache
            const workflowCount = await workflowRegistry.refreshCache();
            console.log(`  ✅ Loaded ${workflowCount} workflows`);
            
            // Clean up expired cache entries
            const cleanedEntries = await workflowCache.cleanup();
            if (cleanedEntries > 0) {
                console.log(`  🧹 Cleaned ${cleanedEntries} expired cache entries`);
            }
            
            // Verify database tables exist
            const health = await agentGateway.getHealth();
            if (health.checks.database) {
                console.log('  ✅ Database connection verified');
            } else {
                console.warn('  ⚠️  Database check failed');
            }
            
            console.log('🤖 AI Gateway initialized');
            return true;
        } catch (error) {
            console.error('❌ AI Gateway initialization failed:', error.message);
            return false;
        }
    },
    
    /**
     * Quick execution helper with automatic context
     * @example
     * const result = await aiGateway.quick('compliance-checker', input, req);
     */
    async quick(workflowName, input, req) {
        if (!req.user?.id) {
            throw new agentGateway.GatewayError('UNAUTHORIZED', 'User authentication required');
        }
        
        return agentGateway.execute({
            workflowName,
            input,
            userId: req.user.id,
            context: {
                sessionId: req.session?.id,
                ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0],
                userAgent: req.headers['user-agent']
            }
        });
    }
};
