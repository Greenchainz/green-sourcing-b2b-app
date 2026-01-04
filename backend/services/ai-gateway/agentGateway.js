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

// ============================================
// AZURE AI FOUNDRY CLIENT CONFIGURATION
// ============================================

// Azure AI Foundry configuration
const AZURE_AI_CONFIG = {
    endpoint: process.env.AZURE_AI_FOUNDRY_ENDPOINT,
    apiVersion: process.env.AZURE_AI_API_VERSION || '2024-02-15-preview',
    defaultTimeout: parseInt(process.env.AZURE_AI_TIMEOUT) || 30000, // 30 seconds
    maxRetries: parseInt(process.env.AZURE_AI_MAX_RETRIES) || 2,
    retryDelay: parseInt(process.env.AZURE_AI_RETRY_DELAY) || 1000 // 1 second
};

// Cached API key (refreshed periodically)
let cachedApiKey = null;
let apiKeyLastFetched = 0;
const API_KEY_CACHE_TTL = 300000; // 5 minutes

/**
 * Initialize Azure AI Foundry client
 * Validates configuration and caches API key
 */
async function initializeFoundryClient() {
    try {
        // Validate required configuration
        if (!AZURE_AI_CONFIG.endpoint && !process.env.AZURE_AI_FOUNDRY_ENDPOINT) {
            console.warn('⚠️  Azure AI Foundry endpoint not configured - fallback mode enabled');
            return { initialized: false, fallbackEnabled: true };
        }

        // Pre-fetch API key
        await getApiKey();
        
        console.log('✅ Azure AI Foundry client initialized');
        return { initialized: true, fallbackEnabled: false };
    } catch (error) {
        console.error('❌ Azure AI Foundry initialization failed:', error.message);
        return { initialized: false, fallbackEnabled: true, error: error.message };
    }
}

/**
 * Get API key with caching (from Key Vault or environment)
 */
async function getApiKey() {
    // Return cached key if still valid
    if (cachedApiKey && (Date.now() - apiKeyLastFetched) < API_KEY_CACHE_TTL) {
        return cachedApiKey;
    }

    // Try environment variable first
    if (process.env.AZURE_AI_FOUNDRY_KEY) {
        cachedApiKey = process.env.AZURE_AI_FOUNDRY_KEY;
        apiKeyLastFetched = Date.now();
        return cachedApiKey;
    }

    // Try Key Vault
    if (keyVault.isInitialized && keyVault.isInitialized()) {
        try {
            cachedApiKey = await keyVault.getSecret('azure-ai-foundry-key');
            apiKeyLastFetched = Date.now();
            return cachedApiKey;
        } catch (error) {
            console.warn('Failed to fetch API key from Key Vault:', error.message);
        }
    }

    return null;
}

// ============================================
// FALLBACK RESPONSES
// ============================================
// Used when Azure AI Foundry is unavailable

const FALLBACK_RESPONSES = {
    'material-alternative': {
        data: {
            alternatives: [
                {
                    name: 'Service Temporarily Unavailable',
                    reason: 'AI service is currently unavailable. Please try again later.',
                    sustainabilityScore: null,
                    certifications: []
                }
            ],
            fallback: true,
            message: 'Unable to generate AI alternatives at this time. The service will retry automatically.'
        },
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
    },
    'rfq-scorer': {
        data: {
            scores: [],
            fallback: true,
            message: 'RFQ scoring service temporarily unavailable. Manual review recommended.'
        },
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
    },
    'outreach-draft': {
        data: {
            draft: null,
            fallback: true,
            message: 'Draft generation service temporarily unavailable. Please compose manually or try again later.'
        },
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
    },
    'compliance-check': {
        data: {
            compliant: null,
            checks: [],
            fallback: true,
            message: 'Compliance verification service temporarily unavailable. Manual verification required.'
        },
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
    },
    'carbon-estimator': {
        data: {
            carbonFootprint: null,
            breakdown: [],
            fallback: true,
            message: 'Carbon estimation service temporarily unavailable. Using placeholder data.'
        },
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
    },
    'default': {
        data: {
            response: null,
            fallback: true,
            message: 'AI service temporarily unavailable. Please try again later.'
        },
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
    }
};

/**
 * Get fallback response for a workflow when AI service is unavailable
 */
function getFallbackResponse(workflowName) {
    return FALLBACK_RESPONSES[workflowName] || FALLBACK_RESPONSES['default'];
}

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
 * Call Azure AI Foundry endpoint with retry and fallback support
 */
async function callAzureFoundry(workflow, input, options = {}) {
    const endpoint = workflow.azureendpoint || AZURE_AI_CONFIG.endpoint;
    const deploymentName = workflow.azuredeploymentname;
    const useFallback = options.useFallback !== false;

    if (!endpoint) {
        if (useFallback) {
            console.warn(`[AI Gateway] No endpoint configured for ${workflow.name}, using fallback`);
            return getFallbackResponse(workflow.name);
        }
        throw new GatewayError('CONFIG_ERROR', 'Azure AI Foundry endpoint not configured');
    }

    // Get API key
    const apiKey = await getApiKey();
    if (!apiKey) {
        if (useFallback) {
            console.warn(`[AI Gateway] No API key available for ${workflow.name}, using fallback`);
            return getFallbackResponse(workflow.name);
        }
        throw new GatewayError('CONFIG_ERROR', 'Azure AI Foundry API key not available');
    }

    // Build the request based on workflow type
    const requestBody = buildAIRequest(workflow, input);
    const url = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${AZURE_AI_CONFIG.apiVersion}`;

    // Retry logic
    let lastError = null;
    for (let attempt = 0; attempt <= AZURE_AI_CONFIG.maxRetries; attempt++) {
        try {
            if (attempt > 0) {
                // Wait before retry (exponential backoff)
                const delay = AZURE_AI_CONFIG.retryDelay * Math.pow(2, attempt - 1);
                await new Promise(resolve => setTimeout(resolve, delay));
                
                monitoring.trackEvent('AIGateway_Retry', {
                    workflowName: workflow.name,
                    attempt: String(attempt)
                });
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': apiKey
                },
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout(AZURE_AI_CONFIG.defaultTimeout)
            });

            // Check for rate limiting - should retry
            if (response.status === 429 && attempt < AZURE_AI_CONFIG.maxRetries) {
                const retryAfter = parseInt(response.headers.get('Retry-After')) || 5;
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                continue;
            }

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
            lastError = error;
            
            // Don't retry on certain errors
            if (error instanceof GatewayError && 
                ['CONFIG_ERROR', 'UNAUTHORIZED'].includes(error.code)) {
                break;
            }
            
            // Timeout or network errors - retry
            if (error.name === 'AbortError' || error.name === 'TimeoutError' || 
                error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
                if (attempt < AZURE_AI_CONFIG.maxRetries) {
                    continue;
                }
            }
            
            // Other GatewayErrors - don't retry
            if (error instanceof GatewayError) {
                break;
            }
        }
    }

    // All retries failed - use fallback if enabled
    if (useFallback) {
        console.warn(`[AI Gateway] All retries failed for ${workflow.name}, using fallback`);
        monitoring.trackEvent('AIGateway_FallbackUsed', {
            workflowName: workflow.name,
            lastError: lastError?.message || 'Unknown error'
        });
        return getFallbackResponse(workflow.name);
    }

    // No fallback - throw the error
    if (lastError instanceof GatewayError) {
        throw lastError;
    }
    
    if (lastError?.name === 'AbortError' || lastError?.name === 'TimeoutError') {
        throw new GatewayError('TIMEOUT', 'AI service request timed out after retries');
    }

    throw new GatewayError('AI_SERVICE_ERROR', `Azure AI call failed: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Execute workflow with explicit entitlements check
 * This is a simplified version for specific workflow types
 */
async function executeWorkflow(workflowName, input, userId, options = {}) {
    // Validate user has entitlement for this workflow
    const userTier = await entitlements.getUserTier(userId);
    const validation = await workflowRegistry.validateWorkflow(workflowName, userTier);
    
    if (!validation.valid) {
        throw new GatewayError(validation.error, `Workflow access denied: ${validation.error}`, {
            requiredTier: validation.requiredTier
        });
    }

    // Check quota
    const quotaCheck = await entitlements.checkAndUpdateQuota(userId);
    if (!quotaCheck.allowed) {
        throw new GatewayError('QUOTA_EXCEEDED', `Usage quota exceeded: ${quotaCheck.reason}`, {
            resetAt: quotaCheck.resetAt
        });
    }

    // Execute the workflow
    return execute({
        workflowName,
        input,
        userId,
        context: options.context || {}
    });
}

/**
 * Build AI request based on workflow type
 */
function buildAIRequest(workflow, input) {
    const systemPrompts = {
        compliance: `You are a sustainability compliance expert for the GreenChainz platform. Analyze materials and products for compliance with LEED v4.1, BREEAM, WELL, Living Building Challenge, and other green building standards. 

For each material, provide:
1. Certification status and validity
2. Specific credit contributions (e.g., "MR Credit 2.1 - 1 point")
3. Required documentation
4. Expiration warnings if applicable
5. Recommendations for improved compliance

Always respond in valid JSON format with structured data.`,
        
        alternatives: `You are a sustainable materials expert for the GreenChainz platform. When given a material or product, suggest eco-friendly alternatives with comparable or better performance.

For each alternative, provide:
1. Product name and manufacturer
2. Sustainability score (0-100)
3. Certifications (EPD, FSC, Cradle to Cradle, etc.)
4. Embodied carbon (kgCO2e/unit) and comparison to original
5. Regional availability
6. Price range estimate
7. Why it's a good alternative

Return as JSON array with structured alternative objects. Prioritize alternatives with verified third-party certifications.`,
        
        carbon: `You are an embodied carbon calculator for the GreenChainz platform using EC3 database methodology. Calculate the embodied carbon of construction materials and assemblies.

Provide:
1. Total carbon footprint (kgCO2e)
2. Breakdown by material/component
3. Transportation impact based on distance
4. Benchmark comparison (industry average vs. this project)
5. Reduction recommendations
6. Regional grid factor adjustments if applicable

Use EC3 Global Warming Potential (GWP) factors. Return structured JSON with carbon metrics.`,
        
        certifications: `You are a green building certification analyst for the GreenChainz platform. Analyze documents and extract certification information.

Identify and validate:
1. Certification type (FSC, PEFC, EPD, HPD, Declare, Cradle to Cradle, etc.)
2. Certification number and issuing body
3. Validity period and expiration date
4. Product scope covered
5. Authenticity indicators
6. LEED/BREEAM credit applicability

Flag any concerns about validity or authenticity. Return structured JSON.`,
        
        rfq_assist: `You are an RFQ optimization assistant for the GreenChainz sustainable procurement platform. Help score and rank RFQ matches.

For each supplier match, evaluate:
1. Sustainability credentials (certifications, EPDs, carbon data)
2. Geographic proximity and delivery capability
3. Pricing competitiveness (when available)
4. Past performance and reliability
5. Capacity to meet quantity requirements
6. Overall match score (0-100)

Return JSON array of scored matches with detailed reasoning.`,
        
        outreach: `You are a professional B2B communication specialist for the GreenChainz platform. Draft personalized outreach messages for supplier engagement.

Guidelines:
1. Professional but warm tone
2. Clear value proposition
3. Specific call-to-action
4. Reference relevant sustainability context
5. Keep under 200 words for emails, 100 for messages
6. Include personalization placeholders where appropriate

Return JSON with subject line and message body.`,
        
        document_analysis: `You are a document analysis expert for construction and sustainability documents. Extract structured data from EPDs, spec sheets, certifications, and technical documents.

Extract:
1. Product identification (name, manufacturer, model)
2. Technical specifications
3. Environmental data (GWP, recycled content, VOCs, etc.)
4. Certifications referenced
5. Compliance claims
6. Key sustainability metrics

Return structured JSON matching the document type schema.`,
        
        custom: `You are a helpful AI assistant for the GreenChainz sustainable procurement platform. Help users with questions about sustainable construction materials, certifications, and procurement best practices.`
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
        // For structured input, create a formatted message
        userMessage = formatStructuredInput(workflow.workflowtype, input);
    }

    // Adjust temperature based on workflow type
    let temperature = 0.7;
    if (['compliance', 'carbon', 'certifications'].includes(workflow.workflowtype)) {
        temperature = 0.1; // More deterministic for factual tasks
    } else if (workflow.workflowtype === 'outreach') {
        temperature = 0.8; // More creative for writing tasks
    }

    return {
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
        ],
        temperature,
        max_tokens: 2000,
        top_p: 0.95,
        response_format: { type: 'json_object' } // Request JSON responses
    };
}

/**
 * Format structured input for specific workflow types
 */
function formatStructuredInput(workflowType, input) {
    switch (workflowType) {
        case 'alternatives':
            return `Find sustainable alternatives for this material:
Material: ${input.materialName || input.material || 'Unknown'}
Category: ${input.category || 'Not specified'}
Current specifications: ${JSON.stringify(input.specifications || {})}
Project requirements: ${JSON.stringify(input.requirements || {})}
Region: ${input.region || 'Global'}
Quantity needed: ${input.quantity || 'Not specified'}`;

        case 'carbon':
            return `Calculate carbon footprint for this project/material:
${JSON.stringify(input, null, 2)}`;

        case 'compliance':
            return `Check compliance for:
Material: ${input.materialName || input.material || 'Unknown'}
Certifications claimed: ${JSON.stringify(input.certifications || [])}
Target standards: ${JSON.stringify(input.standards || ['LEED v4.1', 'BREEAM'])}
Additional context: ${input.context || 'None'}`;

        case 'rfq_assist':
            return `Score these RFQ matches:
RFQ Requirements: ${JSON.stringify(input.requirements || {})}
Suppliers to evaluate: ${JSON.stringify(input.suppliers || [])}
Priority factors: ${JSON.stringify(input.priorities || {})}`;

        case 'outreach':
            return `Draft an outreach message:
Template type: ${input.template || 'general'}
Recipient context: ${JSON.stringify(input.recipientContext || {})}
Key points to cover: ${JSON.stringify(input.keyPoints || [])}
Call to action: ${input.callToAction || 'Request a meeting'}`;

        default:
            return JSON.stringify(input, null, 2);
    }
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
    executeWorkflow, // New: Simplified workflow execution with built-in entitlements
    listAvailableWorkflows,
    getHealth,
    GatewayError,
    
    // Azure AI Foundry client
    initializeFoundryClient,
    getApiKey,
    callAzureFoundry,
    getFallbackResponse,
    
    // Re-export sub-modules for direct access
    entitlements,
    callLogger,
    workflowCache,
    workflowRegistry
};
