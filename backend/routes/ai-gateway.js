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
router.post('/execute', authenticateToken, async (req, res) => {
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

/**
 * GET /api/v1/ai-gateway/history
 * Get user's AI call history
 */
router.get('/history', authenticateToken, async (req, res) => {
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
router.get('/usage', authenticateToken, async (req, res) => {
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
router.post('/drafts', authenticateToken, async (req, res) => {
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
router.post('/drafts/:draftId/submit', authenticateToken, async (req, res) => {
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
router.get('/drafts/pending', authenticateToken, async (req, res) => {
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
router.post('/drafts/:draftId/approve', authenticateToken, async (req, res) => {
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
router.post('/drafts/:draftId/reject', authenticateToken, async (req, res) => {
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
router.post('/drafts/:draftId/send', authenticateToken, async (req, res) => {
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
router.get('/drafts/history', authenticateToken, async (req, res) => {
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
router.post('/opt-out', authenticateToken, async (req, res) => {
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
