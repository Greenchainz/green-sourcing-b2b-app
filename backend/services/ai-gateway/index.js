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
 * 
 * Predefined Workflows:
 * - material-alternative: Suggest sustainable alternatives (Free tier)
 * - rfq-scorer: Score RFQ matches (Standard/Pro tier)
 * - outreach-draft: Draft Intercom messages (Premium/Enterprise tier)
 * - compliance-check: Verify certification validity (Standard/Pro tier)
 * - carbon-estimator: Estimate project carbon footprint (Free tier)
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
    
    // Execute workflow with explicit entitlements check
    executeWorkflow: agentGateway.executeWorkflow,
    
    // List workflows available to a user
    listWorkflows: agentGateway.listAvailableWorkflows,
    
    // Health check
    getHealth: agentGateway.getHealth,
    
    // Error class
    GatewayError: agentGateway.GatewayError,
    
    // Azure AI Foundry client management
    initializeFoundryClient: agentGateway.initializeFoundryClient,
    getFallbackResponse: agentGateway.getFallbackResponse,
    
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
            // 1. Initialize Azure AI Foundry client
            const foundryStatus = await agentGateway.initializeFoundryClient();
            if (foundryStatus.initialized) {
                console.log('  ✅ Azure AI Foundry client ready');
            } else if (foundryStatus.fallbackEnabled) {
                console.log('  ⚠️  Azure AI Foundry unavailable - fallback mode enabled');
            }
            
            // 2. Seed predefined workflows if needed
            const seededCount = await workflowRegistry.seedPredefinedWorkflows();
            if (seededCount > 0) {
                console.log(`  ✅ Seeded ${seededCount} new workflow(s)`);
            }
            
            // 3. Refresh workflow registry cache
            const workflowCount = await workflowRegistry.refreshCache();
            console.log(`  ✅ Loaded ${workflowCount} workflows into cache`);
            
            // 4. Clean up expired cache entries
            const cleanedEntries = await workflowCache.cleanup();
            if (cleanedEntries > 0) {
                console.log(`  🧹 Cleaned ${cleanedEntries} expired cache entries`);
            }
            
            // 5. Verify database connection
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
     * const result = await aiGateway.quick('compliance-check', input, req);
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
    },
    
    /**
     * Check if user can access a specific workflow
     * @example
     * const canAccess = await aiGateway.canAccessWorkflow(userId, 'rfq-scorer');
     */
    async canAccessWorkflow(userId, workflowName) {
        const userTier = await entitlements.getUserTier(userId);
        const validation = await workflowRegistry.validateWorkflow(workflowName, userTier);
        return {
            allowed: validation.valid,
            userTier,
            requiredTier: validation.requiredTier,
            error: validation.error
        };
    },
    
    /**
     * Get user's remaining quota
     * @example
     * const quota = await aiGateway.getRemainingQuota(userId);
     */
    async getRemainingQuota(userId) {
        const ent = await entitlements.getEntitlements(userId);
        return {
            tier: ent.tier,
            callsRemaining: ent.quota.remaining,
            callsUsed: ent.quota.callsUsed,
            callsLimit: ent.quota.callsLimit,
            tokensUsed: ent.quota.tokensUsed,
            tokensLimit: ent.quota.tokensLimit,
            periodEndsAt: ent.quota.periodEndsAt
        };
    }
};
