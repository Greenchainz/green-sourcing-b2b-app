/**
 * AI Gateway - Workflow Registry
 * 
 * Registry of Azure Foundry agents/workflows.
 * Routes calls by name/version and manages workflow metadata.
 */

const { pool } = require('../../db');
const monitoring = require('../azure/monitoring');

// In-memory cache for fast lookups (refreshed periodically)
let workflowCache = new Map();
let lastCacheRefresh = 0;
const CACHE_TTL_MS = 60000; // 1 minute

/**
 * Refresh workflow cache from database
 */
async function refreshCache() {
    try {
        const result = await pool.query(`
            SELECT * FROM AI_Workflows WHERE IsActive = TRUE
            ORDER BY Name, Version DESC
        `);

        workflowCache.clear();
        
        for (const workflow of result.rows) {
            // Store by name (latest version)
            const nameKey = workflow.name.toLowerCase();
            if (!workflowCache.has(nameKey)) {
                workflowCache.set(nameKey, workflow);
            }
            
            // Store by name:version
            const versionKey = `${nameKey}:${workflow.version}`;
            workflowCache.set(versionKey, workflow);
            
            // Store by ID
            workflowCache.set(`id:${workflow.workflowid}`, workflow);
        }

        lastCacheRefresh = Date.now();
        return result.rows.length;
    } catch (error) {
        console.error('Failed to refresh workflow cache:', error.message);
        return 0;
    }
}

/**
 * Get workflow from cache or database
 */
async function getWorkflow(nameOrId, version = null) {
    // Refresh cache if stale
    if (Date.now() - lastCacheRefresh > CACHE_TTL_MS) {
        await refreshCache();
    }

    // Try cache first
    let cacheKey;
    if (typeof nameOrId === 'number' || /^\d+$/.test(nameOrId)) {
        cacheKey = `id:${nameOrId}`;
    } else if (version) {
        cacheKey = `${nameOrId.toLowerCase()}:${version}`;
    } else {
        cacheKey = nameOrId.toLowerCase();
    }

    const cached = workflowCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    // Fall back to database
    try {
        let query, params;
        
        if (typeof nameOrId === 'number' || /^\d+$/.test(nameOrId)) {
            query = 'SELECT * FROM AI_Workflows WHERE WorkflowID = $1';
            params = [nameOrId];
        } else if (version) {
            query = 'SELECT * FROM AI_Workflows WHERE LOWER(Name) = LOWER($1) AND Version = $2';
            params = [nameOrId, version];
        } else {
            query = 'SELECT * FROM AI_Workflows WHERE LOWER(Name) = LOWER($1) ORDER BY Version DESC LIMIT 1';
            params = [nameOrId];
        }

        const result = await pool.query(query, params);
        return result.rows[0] || null;
    } catch (error) {
        console.error('Error getting workflow:', error.message);
        return null;
    }
}

/**
 * List all workflows (optionally filtered)
 */
async function listWorkflows({ type, tier, activeOnly = true } = {}) {
    try {
        let query = 'SELECT * FROM AI_Workflows WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        if (activeOnly) {
            query += ' AND IsActive = TRUE';
        }

        if (type) {
            query += ` AND WorkflowType = $${paramIndex++}`;
            params.push(type);
        }

        if (tier) {
            query += ` AND MinimumTier = $${paramIndex++}`;
            params.push(tier);
        }

        query += ' ORDER BY Name, Version DESC';

        const result = await pool.query(query, params);
        return result.rows;
    } catch (error) {
        console.error('Error listing workflows:', error.message);
        return [];
    }
}

/**
 * Register a new workflow
 */
async function registerWorkflow(workflowConfig) {
    const {
        name,
        version = '1.0.0',
        description,
        workflowType,
        azureEndpoint,
        azureDeploymentName,
        isCacheable = false,
        cacheTTLSeconds = 3600,
        safetyLevel = 'standard',
        minimumTier = 'free',
        freeTierLimit = 10,
        proTierLimit = 100,
        enterpriseTierLimit = 1000
    } = workflowConfig;

    try {
        const result = await pool.query(`
            INSERT INTO AI_Workflows (
                Name, Version, Description, WorkflowType,
                AzureEndpoint, AzureDeploymentName,
                IsCacheable, CacheTTLSeconds, SafetyLevel, MinimumTier,
                FreeTierLimit, ProTierLimit, EnterpriseTierLimit
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
        `, [
            name, version, description, workflowType,
            azureEndpoint, azureDeploymentName,
            isCacheable, cacheTTLSeconds, safetyLevel, minimumTier,
            freeTierLimit, proTierLimit, enterpriseTierLimit
        ]);

        // Refresh cache
        await refreshCache();

        monitoring.trackEvent('AIGateway_WorkflowRegistered', {
            workflowName: name,
            version,
            workflowType
        });

        return result.rows[0];
    } catch (error) {
        console.error('Error registering workflow:', error.message);
        throw error;
    }
}

/**
 * Update workflow configuration
 */
async function updateWorkflow(workflowId, updates) {
    const allowedFields = [
        'Description', 'AzureEndpoint', 'AzureDeploymentName',
        'IsCacheable', 'CacheTTLSeconds', 'SafetyLevel', 'MinimumTier',
        'FreeTierLimit', 'ProTierLimit', 'EnterpriseTierLimit', 'IsActive'
    ];

    const setClauses = [];
    const params = [workflowId];
    let paramIndex = 2;

    for (const [key, value] of Object.entries(updates)) {
        const normalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
        if (allowedFields.includes(normalizedKey)) {
            setClauses.push(`${normalizedKey} = $${paramIndex++}`);
            params.push(value);
        }
    }

    if (setClauses.length === 0) {
        throw new Error('No valid fields to update');
    }

    setClauses.push('UpdatedAt = NOW()');

    try {
        const result = await pool.query(`
            UPDATE AI_Workflows 
            SET ${setClauses.join(', ')}
            WHERE WorkflowID = $1
            RETURNING *
        `, params);

        // Refresh cache
        await refreshCache();

        return result.rows[0];
    } catch (error) {
        console.error('Error updating workflow:', error.message);
        throw error;
    }
}

/**
 * Deactivate a workflow (soft delete)
 */
async function deactivateWorkflow(workflowId) {
    return updateWorkflow(workflowId, { isActive: false });
}

/**
 * Get workflow types with their counts
 */
async function getWorkflowTypes() {
    try {
        const result = await pool.query(`
            SELECT WorkflowType, COUNT(*) as count, 
                   SUM(CASE WHEN IsActive THEN 1 ELSE 0 END) as active_count
            FROM AI_Workflows
            GROUP BY WorkflowType
            ORDER BY count DESC
        `);
        return result.rows;
    } catch (error) {
        console.error('Error getting workflow types:', error.message);
        return [];
    }
}

/**
 * Validate workflow exists and meets requirements
 */
async function validateWorkflow(nameOrId, userTier, version = null) {
    const workflow = await getWorkflow(nameOrId, version);
    
    if (!workflow) {
        return { valid: false, error: 'workflow_not_found' };
    }

    if (!workflow.isactive) {
        return { valid: false, error: 'workflow_inactive' };
    }

    // Check tier requirements
    const TIER_LEVELS = { free: 1, pro: 2, enterprise: 3, admin: 4 };
    const userLevel = TIER_LEVELS[userTier] || 1;
    const requiredLevel = TIER_LEVELS[workflow.minimumtier] || 1;

    if (userLevel < requiredLevel) {
        return { 
            valid: false, 
            error: 'tier_insufficient',
            requiredTier: workflow.minimumtier
        };
    }

    return { valid: true, workflow };
}

// Initialize cache on module load
refreshCache().catch(console.error);

module.exports = {
    getWorkflow,
    listWorkflows,
    registerWorkflow,
    updateWorkflow,
    deactivateWorkflow,
    getWorkflowTypes,
    validateWorkflow,
    refreshCache
};
