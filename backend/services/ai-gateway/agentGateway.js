/**
 * AI Agent Gateway
 * 
 * Central hub for routing calls to Azure Foundry agents/workflows.
 * Handles: routing, entitlements, quotas, caching, and logging.
 */

const { pool } = require('../../db');
const monitoring = require('../azure/monitoring');
const keyVault = require('../azure/keyVault');
const entitlements = require('./entitlements');
const callLogger = require('./callLogger');
const workflowCache = require('./workflowCache');
const workflowRegistry = require('./workflowRegistry');

// Azure AI Foundry configuration
const AZURE_AI_CONFIG = {
    endpoint: process.env.AZURE_AI_FOUNDRY_ENDPOINT,
    apiVersion: process.env.AZURE_AI_API_VERSION || '2024-02-15-preview',
    defaultTimeout: 30000 // 30 seconds
};

/**
 * Execute an AI workflow through the gateway
 * 
 * @param {Object} params - Execution parameters
 * @param {string} params.workflowName - Name of the workflow to execute
 * @param {string} params.version - Optional version (defaults to latest)
 * @param {Object} params.input - Input data for the workflow
 * @param {number} params.userId - User making the request
 * @param {Object} params.context - Additional context (session, IP, etc.)
 * @returns {Object} - Workflow result
 */
async function execute({ workflowName, version, input, userId, context = {} }) {
    const startTime = Date.now();
    let workflowId = null;
    let status = 'error';
    let result = null;
    let errorCode = null;
    let errorMessage = null;
    let tokensUsed = 0;
    let cacheHit = false;

    try {
        // 1. Get user tier and entitlements
        const userTier = await entitlements.getUserTier(userId);
        const features = entitlements.TIER_FEATURES[userTier];

        if (!features.canUseAI) {
            throw new GatewayError('AI_DISABLED', 'AI features are not enabled for your account');
        }

        // 2. Validate workflow exists and user can access it
        const validation = await workflowRegistry.validateWorkflow(workflowName, userTier, version);
        
        if (!validation.valid) {
            throw new GatewayError(validation.error, `Workflow access denied: ${validation.error}`, {
                requiredTier: validation.requiredTier
            });
        }

        const workflow = validation.workflow;
        workflowId = workflow.workflowid;

        // 3. Check workflow-specific rate limits
        const rateLimit = await entitlements.getWorkflowRateLimit(workflowId, userTier);
        if (rateLimit === 0) {
            throw new GatewayError('WORKFLOW_NOT_AVAILABLE', 
                `Workflow ${workflowName} is not available for ${userTier} tier`);
        }

        // 4. Check and update quota
        const quotaCheck = await entitlements.checkAndUpdateQuota(userId);
        
        if (!quotaCheck.allowed) {
            status = 'rate_limited';
            throw new GatewayError('QUOTA_EXCEEDED', 
                `Usage quota exceeded: ${quotaCheck.reason}`, {
                    resetAt: quotaCheck.resetAt,
                    remaining: quotaCheck.remaining
                });
        }

        // 5. Check cache for cacheable workflows
        if (workflow.iscacheable) {
            const cached = await workflowCache.get(workflowId, input);
            
            if (cached.hit) {
                cacheHit = true;
                status = 'cached';
                result = cached.data;

                // Log the cache hit
                await callLogger.logCall({
                    workflowId,
                    userId,
                    input,
                    output: result,
                    latencyMs: Date.now() - startTime,
                    tokensUsed: 0,
                    cacheHit: true,
                    status: 'cached',
                    sessionId: context.sessionId,
                    ipAddress: context.ipAddress,
                    userAgent: context.userAgent
                });

                return {
                    success: true,
                    data: result,
                    meta: {
                        workflowId,
                        workflowName: workflow.name,
                        version: workflow.version,
                        cached: true,
                        latencyMs: Date.now() - startTime,
                        quotaRemaining: quotaCheck.remaining
                    }
                };
            }
        }

        // 6. Execute the workflow via Azure AI Foundry
        result = await callAzureFoundry(workflow, input);
        tokensUsed = result.usage?.totalTokens || 0;
        status = 'success';

        // 7. Cache the result if cacheable
        if (workflow.iscacheable && result.data) {
            await workflowCache.set(workflowId, input, result.data);
        }

        // 8. Update token usage in quota
        if (tokensUsed > 0) {
            await pool.query(`
                UPDATE AI_User_Quotas 
                SET TokensUsed = TokensUsed + $1, UpdatedAt = NOW()
                WHERE UserID = $2
            `, [tokensUsed, userId]);
        }

        return {
            success: true,
            data: result.data,
            meta: {
                workflowId,
                workflowName: workflow.name,
                version: workflow.version,
                cached: false,
                latencyMs: Date.now() - startTime,
                tokensUsed,
                quotaRemaining: quotaCheck.remaining
            }
        };

    } catch (error) {
        errorCode = error.code || 'UNKNOWN_ERROR';
        errorMessage = error.message;

        if (status !== 'rate_limited') {
            status = 'error';
        }

        monitoring.trackException(error, {
            context: 'agentGateway.execute',
            workflowName,
            userId: String(userId)
        });

        throw error;

    } finally {
        // Log the call
        await callLogger.logCall({
            workflowId,
            userId,
            input,
            output: result?.data,
            latencyMs: Date.now() - startTime,
            tokensUsed,
            cacheHit,
            status,
            errorCode,
            errorMessage,
            sessionId: context.sessionId,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent
        });

        // Track in Application Insights
        monitoring.trackDependency(
            'AzureAIFoundry',
            workflowName,
            Date.now() - startTime,
            status === 'success' || status === 'cached',
            'AI'
        );
    }
}

/**
 * Call Azure AI Foundry endpoint
 */
async function callAzureFoundry(workflow, input) {
    const endpoint = workflow.azureendpoint || AZURE_AI_CONFIG.endpoint;
    const deploymentName = workflow.azuredeploymentname;

    if (!endpoint) {
        throw new GatewayError('CONFIG_ERROR', 'Azure AI Foundry endpoint not configured');
    }

    try {
        // Get API key from Key Vault
        let apiKey = process.env.AZURE_AI_FOUNDRY_KEY;
        if (!apiKey && keyVault.isInitialized()) {
            apiKey = await keyVault.getSecret('azure-ai-foundry-key');
        }

        if (!apiKey) {
            throw new GatewayError('CONFIG_ERROR', 'Azure AI Foundry API key not available');
        }

        // Build the request based on workflow type
        const requestBody = buildAIRequest(workflow, input);

        const response = await fetch(`${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${AZURE_AI_CONFIG.apiVersion}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': apiKey
            },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(AZURE_AI_CONFIG.defaultTimeout)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new GatewayError('AI_SERVICE_ERROR', 
                `Azure AI returned ${response.status}: ${errorBody.substring(0, 200)}`);
        }

        const responseData = await response.json();

        return {
            data: parseAIResponse(workflow, responseData),
            usage: {
                promptTokens: responseData.usage?.prompt_tokens || 0,
                completionTokens: responseData.usage?.completion_tokens || 0,
                totalTokens: responseData.usage?.total_tokens || 0
            }
        };

    } catch (error) {
        if (error instanceof GatewayError) throw error;
        
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            throw new GatewayError('TIMEOUT', 'AI service request timed out');
        }

        throw new GatewayError('AI_SERVICE_ERROR', `Azure AI call failed: ${error.message}`);
    }
}

/**
 * Build AI request based on workflow type
 */
function buildAIRequest(workflow, input) {
    const systemPrompts = {
        compliance: `You are a sustainability compliance expert. Analyze materials and products for compliance with LEED, BREEAM, WELL, and other green building standards. Provide specific credit contributions and documentation requirements.`,
        
        alternatives: `You are a sustainable materials expert. When given a material or product, suggest eco-friendly alternatives with comparable performance. Include certification status, embodied carbon comparisons, and availability.`,
        
        carbon: `You are an embodied carbon calculator. Calculate the embodied carbon of construction materials using EC3 database standards. Provide kgCO2e/unit and benchmark comparisons.`,
        
        certifications: `You are a green building certification analyst. Analyze documents and extract certification information (FSC, EPD, LEED credits, etc.). Validate authenticity indicators.`,
        
        rfq_assist: `You are an RFQ optimization assistant for sustainable construction materials. Help buyers create effective RFQs and help suppliers respond with competitive, compliant quotes.`,
        
        document_analysis: `You are a document analysis expert for construction and sustainability documents. Extract structured data from EPDs, spec sheets, certifications, and technical documents.`,
        
        custom: `You are a helpful AI assistant for the GreenChainz sustainable procurement platform.`
    };

    const systemPrompt = systemPrompts[workflow.workflowtype] || systemPrompts.custom;

    // Handle different input formats
    let userMessage;
    if (typeof input === 'string') {
        userMessage = input;
    } else if (input.message) {
        userMessage = input.message;
    } else if (input.query) {
        userMessage = input.query;
    } else {
        userMessage = JSON.stringify(input);
    }

    return {
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
        ],
        temperature: workflow.workflowtype === 'compliance' ? 0.1 : 0.7,
        max_tokens: 2000,
        top_p: 0.95
    };
}

/**
 * Parse AI response based on workflow type
 */
function parseAIResponse(workflow, responseData) {
    const content = responseData.choices?.[0]?.message?.content || '';
    
    // For structured workflow types, try to parse JSON from response
    if (['compliance', 'carbon', 'certifications'].includes(workflow.workflowtype)) {
        try {
            // Look for JSON in the response
            const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || 
                              content.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
                return JSON.parse(jsonMatch[1] || jsonMatch[0]);
            }
        } catch (e) {
            // Fall through to return as text
        }
    }

    return {
        response: content,
        workflowType: workflow.workflowtype
    };
}

/**
 * Custom error class for gateway errors
 */
class GatewayError extends Error {
    constructor(code, message, meta = {}) {
        super(message);
        this.name = 'GatewayError';
        this.code = code;
        this.meta = meta;
    }
}

/**
 * List available workflows for a user (based on their tier)
 */
async function listAvailableWorkflows(userId) {
    const userTier = await entitlements.getUserTier(userId);
    const allWorkflows = await workflowRegistry.listWorkflows({ activeOnly: true });
    
    const tierLevel = entitlements.TIER_LEVELS[userTier] || 1;
    
    return allWorkflows.filter(w => {
        const requiredLevel = entitlements.TIER_LEVELS[w.minimumtier] || 1;
        return tierLevel >= requiredLevel;
    }).map(w => ({
        id: w.workflowid,
        name: w.name,
        version: w.version,
        description: w.description,
        type: w.workflowtype,
        cacheable: w.iscacheable,
        rateLimit: getRateLimitForTier(w, userTier)
    }));
}

function getRateLimitForTier(workflow, tier) {
    switch (tier) {
        case 'admin': return -1;
        case 'enterprise': return workflow.enterprisetierlimit;
        case 'pro': return workflow.protierlimit;
        default: return workflow.freetierlimit;
    }
}

/**
 * Get gateway health status
 */
async function getHealth() {
    const checks = {
        database: false,
        cache: false,
        azureAI: false
    };

    try {
        // Check database
        const dbResult = await pool.query('SELECT 1');
        checks.database = dbResult.rows.length > 0;
    } catch (e) {
        checks.database = false;
    }

    try {
        // Check cache stats
        const cacheStats = await workflowCache.getStats();
        checks.cache = cacheStats !== null;
    } catch (e) {
        checks.cache = false;
    }

    // Azure AI check (just verify config exists)
    checks.azureAI = !!(AZURE_AI_CONFIG.endpoint || process.env.AZURE_AI_FOUNDRY_ENDPOINT);

    return {
        healthy: checks.database && checks.azureAI,
        checks,
        timestamp: new Date().toISOString()
    };
}

module.exports = {
    execute,
    listAvailableWorkflows,
    getHealth,
    GatewayError,
    
    // Re-export sub-modules for direct access
    entitlements,
    callLogger,
    workflowCache,
    workflowRegistry
};
