/**
 * AI Gateway API Routes
 * 
 * Provides REST API endpoints for the AI Agent Gateway.
 * All endpoints require authentication.
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const aiGateway = require('../services/ai-gateway');
const monitoring = require('../services/azure/monitoring');
const { ai: aiRateLimit, admin: adminRateLimit } = require('../middleware/rateLimit');

/**
 * GET /api/v1/ai-gateway/health
 * Health check for the AI Gateway
 */
router.get('/health', async (req, res) => {
    try {
        const health = await aiGateway.getHealth();
        res.json(health);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/v1/ai-gateway/workflows
 * List available workflows for the authenticated user
 */
router.get('/workflows', authenticateToken, async (req, res) => {
    try {
        const workflows = await aiGateway.listWorkflows(req.user.id);
        res.json({
            success: true,
            workflows,
            count: workflows.length
        });
    } catch (error) {
        console.error('Error listing workflows:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/v1/ai-gateway/entitlements
 * Get user's entitlements and quota
 */
router.get('/entitlements', authenticateToken, async (req, res) => {
    try {
        const entitlements = await aiGateway.entitlements.getEntitlements(req.user.id);
        res.json({
            success: true,
            ...entitlements
        });
    } catch (error) {
        console.error('Error getting entitlements:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/v1/ai-gateway/execute
 * Execute an AI workflow
 * 
 * Body:
 * - workflowName: string (required) - Name of the workflow
 * - version: string (optional) - Specific version
 * - input: object (required) - Input data for the workflow
 */
router.post('/execute', authenticateToken, aiRateLimit, async (req, res) => {
    try {
        const { workflowName, version, input } = req.body;

        if (!workflowName) {
            return res.status(400).json({ error: 'workflowName is required' });
        }

        if (!input) {
            return res.status(400).json({ error: 'input is required' });
        }

        const result = await aiGateway.execute({
            workflowName,
            version,
            input,
            userId: req.user.id,
            context: {
                sessionId: req.session?.id,
                ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0],
                userAgent: req.headers['user-agent']
            }
        });

        res.json(result);

    } catch (error) {
        console.error('Workflow execution error:', error);
        
        // Handle specific gateway errors
        if (error.name === 'GatewayError') {
            const statusCode = getErrorStatusCode(error.code);
            return res.status(statusCode).json({
                success: false,
                error: error.message,
                code: error.code,
                meta: error.meta
            });
        }

        res.status(500).json({ 
            success: false, 
            error: 'Workflow execution failed',
            message: error.message 
        });
    }
});

// ============================================
// WORKFLOW-SPECIFIC ENDPOINTS
// ============================================

/**
 * POST /api/v1/ai-gateway/material-alternatives
 * Get sustainable alternatives for a material
 * 
 * Input:
 * - materialId: string (optional) - ID of material in catalog
 * - materialName: string - Name of the material
 * - category: string (optional) - Material category
 * - specifications: object (optional) - Current material specs
 * - projectRequirements: object (optional) - Project-specific requirements
 * - region: string (optional) - Geographic region for availability
 * - quantity: string (optional) - Quantity needed
 * 
 * Output:
 * - alternatives: array of top 5 alternatives with sustainability comparison
 */
router.post('/material-alternatives', aiWorkflowLimiter, authenticateToken, async (req, res) => {
    try {
        const { 
            materialId, 
            materialName,
            category,
            specifications,
            projectRequirements,
            region,
            quantity
        } = req.body;

        // Validate input
        if (!materialId && !materialName) {
            return res.status(400).json({ 
                error: 'Either materialId or materialName is required' 
            });
        }

        // If materialId provided, look up material details
        let material = { name: materialName, category, specifications };
        if (materialId) {
            try {
                const { pool } = require('../db');
                const materialResult = await pool.query(`
                    SELECT m.MaterialID, m.Name, m.Category, m.Description,
                           m.Manufacturer, m.CarbonFootprint, m.RecycledContent,
                           m.SustainabilityScore, m.Certifications
                    FROM Materials m
                    WHERE m.MaterialID = $1
                `, [materialId]);

                if (materialResult.rows.length > 0) {
                    const mat = materialResult.rows[0];
                    material = {
                        id: mat.materialid,
                        name: mat.name || materialName,
                        category: mat.category || category,
                        description: mat.description,
                        manufacturer: mat.manufacturer,
                        currentSpecs: {
                            carbonFootprint: mat.carbonfootprint,
                            recycledContent: mat.recycledcontent,
                            sustainabilityScore: mat.sustainabilityscore,
                            certifications: mat.certifications
                        },
                        specifications
                    };
                }
            } catch (dbError) {
                console.warn('Could not fetch material details:', dbError.message);
                // Continue with provided data
            }
        }

        // Execute the material-alternative workflow
        const result = await aiGateway.execute({
            workflowName: 'material-alternative',
            input: {
                material: material.name,
                materialId: material.id,
                category: material.category,
                currentSpecs: material.currentSpecs,
                specifications: material.specifications,
                requirements: projectRequirements,
                region: region || 'Global',
                quantity
            },
            userId: req.user.id,
            context: {
                sessionId: req.session?.id,
                ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0],
                userAgent: req.headers['user-agent']
            }
        });

        // Format response with top 5 alternatives
        let alternatives = [];
        if (result.data?.alternatives) {
            alternatives = result.data.alternatives.slice(0, 5);
        } else if (Array.isArray(result.data)) {
            alternatives = result.data.slice(0, 5);
        }

        // Add comparison data if we have original material info
        if (material.currentSpecs?.carbonFootprint) {
            alternatives = alternatives.map(alt => ({
                ...alt,
                comparison: {
                    carbonReduction: alt.carbonFootprint 
                        ? ((material.currentSpecs.carbonFootprint - alt.carbonFootprint) / material.currentSpecs.carbonFootprint * 100).toFixed(1) + '%'
                        : null,
                    sustainabilityImprovement: alt.sustainabilityScore && material.currentSpecs.sustainabilityScore
                        ? alt.sustainabilityScore - material.currentSpecs.sustainabilityScore
                        : null
                }
            }));
        }

        res.json({
            success: true,
            originalMaterial: {
                id: material.id,
                name: material.name,
                category: material.category,
                currentSpecs: material.currentSpecs
            },
            alternatives,
            count: alternatives.length,
            meta: {
                workflowId: result.meta?.workflowId,
                cached: result.meta?.cached || false,
                latencyMs: result.meta?.latencyMs,
                quotaRemaining: result.meta?.quotaRemaining,
                fallback: result.data?.fallback || false
            }
        });

    } catch (error) {
        console.error('Material alternatives error:', error);
        
        if (error.name === 'GatewayError') {
            const statusCode = getErrorStatusCode(error.code);
            return res.status(statusCode).json({
                success: false,
                error: error.message,
                code: error.code,
                meta: error.meta
            });
        }

        res.status(500).json({ 
            success: false, 
            error: 'Failed to get material alternatives',
            message: error.message 
        });
    }
});

/**
 * POST /api/v1/ai-gateway/carbon-estimate
 * Estimate carbon footprint for a project or material list
 */
router.post('/carbon-estimate', authenticateToken, aiRateLimit, async (req, res) => {
    try {
        const { materials, projectDetails, transportDistance, region } = req.body;

        if (!materials && !projectDetails) {
            return res.status(400).json({ 
                error: 'Either materials array or projectDetails is required' 
            });
        }

        const result = await aiGateway.execute({
            workflowName: 'carbon-estimator',
            input: {
                materials,
                projectDetails,
                transportDistance,
                region
            },
            userId: req.user.id,
            context: {
                sessionId: req.session?.id,
                ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0],
                userAgent: req.headers['user-agent']
            }
        });

        res.json({
            success: true,
            ...result.data,
            meta: result.meta
        });

    } catch (error) {
        console.error('Carbon estimate error:', error);
        
        if (error.name === 'GatewayError') {
            const statusCode = getErrorStatusCode(error.code);
            return res.status(statusCode).json({
                success: false,
                error: error.message,
                code: error.code,
                meta: error.meta
            });
        }

        res.status(500).json({ 
            success: false, 
            error: 'Failed to estimate carbon footprint',
            message: error.message 
        });
    }
});

/**
 * POST /api/v1/ai-gateway/compliance-check
 * Check material/product compliance with sustainability standards
 */
router.post('/compliance-check', authenticateToken, aiRateLimit, async (req, res) => {
    try {
        const { materialId, materialName, certifications, standards, context } = req.body;

        if (!materialName && !materialId) {
            return res.status(400).json({ 
                error: 'Either materialId or materialName is required' 
            });
        }

        const result = await aiGateway.execute({
            workflowName: 'compliance-check',
            input: {
                materialId,
                material: materialName,
                certifications: certifications || [],
                standards: standards || ['LEED v4.1', 'BREEAM'],
                context
            },
            userId: req.user.id,
            context: {
                sessionId: req.session?.id,
                ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0],
                userAgent: req.headers['user-agent']
            }
        });

        res.json({
            success: true,
            ...result.data,
            meta: result.meta
        });

    } catch (error) {
        console.error('Compliance check error:', error);
        
        if (error.name === 'GatewayError') {
            const statusCode = getErrorStatusCode(error.code);
            return res.status(statusCode).json({
                success: false,
                error: error.message,
                code: error.code,
                meta: error.meta
            });
        }

        res.status(500).json({ 
            success: false, 
            error: 'Failed to check compliance',
            message: error.message 
        });
    }
});

/**
 * POST /api/v1/ai-gateway/rfq-score
 * Score and rank RFQ supplier matches
 * Requires: Standard tier (pro) or higher
 */
router.post('/rfq-score', authenticateToken, aiRateLimit, async (req, res) => {
    try {
        const { rfqId, requirements, suppliers, priorities } = req.body;

        if (!requirements && !rfqId) {
            return res.status(400).json({ 
                error: 'Either rfqId or requirements object is required' 
            });
        }

        // If rfqId provided, fetch RFQ details
        let rfqRequirements = requirements;
        if (rfqId && !requirements) {
            try {
                const { pool } = require('../db');
                const rfqResult = await pool.query(`
                    SELECT Title, Description, ProjectLocation, MaterialCategory,
                           QuantityNeeded, QualityRequirements, SustainabilityRequirements,
                           BudgetRange, Deadline
                    FROM RFQs WHERE RFQID = $1
                `, [rfqId]);

                if (rfqResult.rows.length > 0) {
                    rfqRequirements = rfqResult.rows[0];
                }
            } catch (dbError) {
                console.warn('Could not fetch RFQ details:', dbError.message);
            }
        }

        const result = await aiGateway.execute({
            workflowName: 'rfq-scorer',
            input: {
                rfqId,
                requirements: rfqRequirements,
                suppliers: suppliers || [],
                priorities: priorities || {
                    sustainability: 0.3,
                    price: 0.25,
                    quality: 0.25,
                    delivery: 0.2
                }
            },
            userId: req.user.id,
            context: {
                sessionId: req.session?.id,
                ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0],
                userAgent: req.headers['user-agent']
            }
        });

        res.json({
            success: true,
            rfqId,
            ...result.data,
            meta: result.meta
        });

    } catch (error) {
        console.error('RFQ score error:', error);
        
        if (error.name === 'GatewayError') {
            const statusCode = getErrorStatusCode(error.code);
            return res.status(statusCode).json({
                success: false,
                error: error.message,
                code: error.code,
                meta: error.meta
            });
        }

        res.status(500).json({ 
            success: false, 
            error: 'Failed to score RFQ matches',
            message: error.message 
        });
    }
});

/**
 * POST /api/v1/ai-gateway/draft-outreach
 * Draft an Intercom outreach message for a supplier
 * Requires: Premium tier (enterprise) for most templates
 */
router.post('/draft-outreach', authenticateToken, aiRateLimit, async (req, res) => {
    try {
        const { supplierId, rfqId, template, customData, scheduledAt, priority } = req.body;

        if (!supplierId) {
            return res.status(400).json({ error: 'supplierId is required' });
        }

        if (!template) {
            return res.status(400).json({ 
                error: 'template is required',
                availableTemplates: Object.keys(aiGateway.intercomSender.DRAFT_TEMPLATES)
            });
        }

        const result = await aiGateway.intercomSender.draftMessage(
            parseInt(supplierId),
            rfqId ? parseInt(rfqId) : null,
            template,
            {
                createdByUserId: req.user.id,
                customData,
                scheduledAt,
                priority
            }
        );

        if (!result.success) {
            const statusCode = result.error === 'TIER_INSUFFICIENT' ? 403 : 400;
            return res.status(statusCode).json(result);
        }

        res.status(201).json(result);

    } catch (error) {
        console.error('Draft outreach error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to draft outreach message',
            message: error.message 
        });
    }
});

/**
 * GET /api/v1/ai-gateway/templates
 * Get available message templates for user's tier
 */
router.get('/templates', authenticateToken, aiRateLimit, async (req, res) => {
    try {
        const userTier = await aiGateway.entitlements.getUserTier(req.user.id);
        const templates = aiGateway.intercomSender.getAvailableTemplates(userTier);

        res.json({
            success: true,
            tier: userTier,
            templates,
            count: templates.length
        });
    } catch (error) {
        console.error('Error getting templates:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// STANDARD ENDPOINTS
// ============================================

/**
 * GET /api/v1/ai-gateway/history
 * Get user's AI call history
 */
router.get('/history', authenticateToken, aiRateLimit, async (req, res) => {
    try {
        const { limit = 50, offset = 0, workflowId, status } = req.query;

        const history = await aiGateway.callLogger.getCallHistory(req.user.id, {
            limit: Math.min(parseInt(limit) || 50, 100),
            offset: parseInt(offset) || 0,
            workflowId: workflowId ? parseInt(workflowId) : undefined,
            status
        });

        res.json({
            success: true,
            history,
            count: history.length
        });
    } catch (error) {
        console.error('Error getting history:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/v1/ai-gateway/usage
 * Get user's usage statistics
 */
router.get('/usage', authenticateToken, aiRateLimit, async (req, res) => {
    try {
        const days = Math.min(parseInt(req.query.days) || 30, 90);
        const stats = await aiGateway.callLogger.getUsageStats(req.user.id, days);

        res.json({
            success: true,
            period: `${days} days`,
            stats
        });
    } catch (error) {
        console.error('Error getting usage stats:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// INTERCOM DRAFT ENDPOINTS
// ============================================

/**
 * POST /api/v1/ai-gateway/drafts
 * Create an Intercom draft message
 */
router.post('/drafts', authenticateToken, aiRateLimit, async (req, res) => {
    try {
        const {
            workflowId,
            targetUserId,
            messageType,
            subject,
            body,
            sequenceOrder,
            sequenceTotal,
            personalizationData,
            scheduledAt
        } = req.body;

        if (!targetUserId || !messageType || !body) {
            return res.status(400).json({ 
                error: 'targetUserId, messageType, and body are required' 
            });
        }

        const draft = await aiGateway.intercomSender.createDraft({
            workflowId,
            createdByUserId: req.user.id,
            targetUserId,
            messageType,
            subject,
            body,
            sequenceOrder,
            sequenceTotal,
            personalizationData,
            scheduledAt
        });

        res.status(201).json({
            success: true,
            draft
        });

    } catch (error) {
        console.error('Error creating draft:', error);
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /api/v1/ai-gateway/drafts/:draftId/submit
 * Submit a draft for Legal Guardian approval
 */
router.post('/drafts/:draftId/submit', authenticateToken, aiRateLimit, async (req, res) => {
    try {
        const draft = await aiGateway.intercomSender.submitForApproval(
            parseInt(req.params.draftId),
            req.user.id
        );

        res.json({
            success: true,
            draft
        });
    } catch (error) {
        console.error('Error submitting draft:', error);
        res.status(400).json({ error: error.message });
    }
});

/**
 * GET /api/v1/ai-gateway/drafts/pending
 * Get drafts pending approval (Legal Guardians only)
 */
router.get('/drafts/pending', authenticateToken, aiRateLimit, async (req, res) => {
    try {
        const drafts = await aiGateway.intercomSender.getPendingApprovals(req.user.id);

        res.json({
            success: true,
            drafts,
            count: drafts.length
        });
    } catch (error) {
        console.error('Error getting pending approvals:', error);
        res.status(403).json({ error: error.message });
    }
});

/**
 * POST /api/v1/ai-gateway/drafts/:draftId/approve
 * Approve a draft (Legal Guardians only)
 */
router.post('/drafts/:draftId/approve', authenticateToken, aiRateLimit, async (req, res) => {
    try {
        const { notes } = req.body;

        const draft = await aiGateway.intercomSender.approveDraft(
            parseInt(req.params.draftId),
            req.user.id,
            notes
        );

        res.json({
            success: true,
            draft
        });
    } catch (error) {
        console.error('Error approving draft:', error);
        res.status(403).json({ error: error.message });
    }
});

/**
 * POST /api/v1/ai-gateway/drafts/:draftId/reject
 * Reject a draft (Legal Guardians only)
 */
router.post('/drafts/:draftId/reject', authenticateToken, aiRateLimit, async (req, res) => {
    try {
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ error: 'Rejection reason is required' });
        }

        const draft = await aiGateway.intercomSender.rejectDraft(
            parseInt(req.params.draftId),
            req.user.id,
            reason
        );

        res.json({
            success: true,
            draft
        });
    } catch (error) {
        console.error('Error rejecting draft:', error);
        res.status(403).json({ error: error.message });
    }
});

/**
 * POST /api/v1/ai-gateway/drafts/:draftId/send
 * Send an approved draft (triggers Intercom API)
 */
router.post('/drafts/:draftId/send', authenticateToken, aiRateLimit, async (req, res) => {
    try {
        const result = await aiGateway.intercomSender.sendDraft(
            parseInt(req.params.draftId)
        );

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Error sending draft:', error);
        res.status(400).json({ error: error.message });
    }
});

/**
 * GET /api/v1/ai-gateway/drafts/history
 * Get user's draft history
 */
router.get('/drafts/history', authenticateToken, aiRateLimit, async (req, res) => {
    try {
        const { limit, offset, status } = req.query;

        const drafts = await aiGateway.intercomSender.getDraftHistory(req.user.id, {
            limit: parseInt(limit) || 50,
            offset: parseInt(offset) || 0,
            status
        });

        res.json({
            success: true,
            drafts,
            count: drafts.length
        });
    } catch (error) {
        console.error('Error getting draft history:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/v1/ai-gateway/opt-out
 * Register opt-out for AI messages
 */
router.post('/opt-out', authenticateToken, aiRateLimit, async (req, res) => {
    try {
        const { reason } = req.body;

        await aiGateway.intercomSender.registerOptOut(
            req.user.id,
            req.user.email,
            reason || 'User requested',
            'user_request'
        );

        res.json({
            success: true,
            message: 'You have been opted out of AI-generated messages'
        });
    } catch (error) {
        console.error('Error registering opt-out:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

/**
 * GET /api/v1/ai-gateway/admin/analytics
 * Get workflow analytics (Admin only)
 */
router.get('/admin/analytics', 
    authenticateToken, 
    authorizeRoles('Admin'),
    adminRateLimit,
    async (req, res) => {
        try {
            const days = parseInt(req.query.days) || 7;

            const [workflowAnalytics, cacheStats] = await Promise.all([
                aiGateway.callLogger.getWorkflowAnalytics(days),
                aiGateway.workflowCache.getStats()
            ]);

            res.json({
                success: true,
                period: `${days} days`,
                workflows: workflowAnalytics,
                cache: cacheStats
            });
        } catch (error) {
            console.error('Error getting analytics:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * POST /api/v1/ai-gateway/admin/workflows
 * Register a new workflow (Admin only)
 */
router.post('/admin/workflows',
    authenticateToken,
    authorizeRoles('Admin'),
    adminRateLimit,
    async (req, res) => {
        try {
            const workflow = await aiGateway.workflowRegistry.registerWorkflow(req.body);

            res.status(201).json({
                success: true,
                workflow
            });
        } catch (error) {
            console.error('Error registering workflow:', error);
            res.status(400).json({ error: error.message });
        }
    }
);

/**
 * PATCH /api/v1/ai-gateway/admin/workflows/:workflowId
 * Update a workflow (Admin only)
 */
router.patch('/admin/workflows/:workflowId',
    authenticateToken,
    authorizeRoles('Admin'),
    adminRateLimit,
    async (req, res) => {
        try {
            const workflow = await aiGateway.workflowRegistry.updateWorkflow(
                parseInt(req.params.workflowId),
                req.body
            );

            res.json({
                success: true,
                workflow
            });
        } catch (error) {
            console.error('Error updating workflow:', error);
            res.status(400).json({ error: error.message });
        }
    }
);

/**
 * POST /api/v1/ai-gateway/admin/cache/invalidate
 * Invalidate cache for a workflow (Admin only)
 */
router.post('/admin/cache/invalidate',
    authenticateToken,
    authorizeRoles('Admin'),
    adminRateLimit,
    async (req, res) => {
        try {
            const { workflowId, input } = req.body;

            if (!workflowId) {
                return res.status(400).json({ error: 'workflowId is required' });
            }

            const success = await aiGateway.workflowCache.invalidate(workflowId, input);

            res.json({
                success,
                message: input ? 'Cache entry invalidated' : 'All cache entries for workflow invalidated'
            });
        } catch (error) {
            console.error('Error invalidating cache:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * POST /api/v1/ai-gateway/admin/drafts/process-scheduled
 * Process scheduled drafts (Admin only, called by scheduler)
 */
router.post('/admin/drafts/process-scheduled',
    authenticateToken,
    authorizeRoles('Admin'),
    adminRateLimit,
    async (req, res) => {
        try {
            const results = await aiGateway.intercomSender.processScheduledDrafts();

            res.json({
                success: true,
                processed: results.length,
                results
            });
        } catch (error) {
            console.error('Error processing scheduled drafts:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * Map error codes to HTTP status codes
 */
function getErrorStatusCode(code) {
    const codeMap = {
        'WORKFLOW_NOT_FOUND': 404,
        'WORKFLOW_INACTIVE': 404,
        'WORKFLOW_NOT_AVAILABLE': 403,
        'TIER_INSUFFICIENT': 403,
        'QUOTA_EXCEEDED': 429,
        'UNAUTHORIZED': 401,
        'AI_DISABLED': 403,
        'CONFIG_ERROR': 500,
        'AI_SERVICE_ERROR': 502,
        'TIMEOUT': 504
    };
    return codeMap[code] || 500;
}

module.exports = router;
