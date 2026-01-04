/**
 * Revit Integration API Routes
 * 
 * Base path: /api/integrations/revit/v1
 * Auth: Azure Entra ID only
 * 
 * This API provides endpoints for the Revit add-in to:
 * - Register plugin instances
 * - Start/manage sync sessions
 * - Sync materials and projects
 * - Get sustainability scores
 * - Generate RFQs
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool } = require('../db');
const {
    authenticateRevitPlugin,
    requirePluginRegistration,
    requireActiveSession,
    revitRateLimit,
    createRevitRateLimiter
} = require('../middleware/revitAuth');
const { searchMaterials, getMaterialById } = require('../services/catalog/search');
const aiGateway = require('../services/ai-gateway');

// Custom rate limiter for sync operations (more restrictive: 10 req/min)
const syncRateLimiter = createRevitRateLimiter({ maxRequests: 10, windowSeconds: 60 });

// ============================================
// API VERSION & INFO
// ============================================

/**
 * GET /api/integrations/revit/v1
 * API info and health check (no auth required)
 */
router.get('/', (req, res) => {
    res.json({
        api: 'GreenChainz Revit Integration API',
        version: '1.1.0',
        status: 'operational',
        auth: 'Azure Entra ID',
        documentation: '/api/integrations/revit/v1/docs',
        rateLimit: {
            requests: 100,
            window: '1 minute',
            per: 'session'
        },
        endpoints: {
            register: 'POST /register',
            session: {
                start: 'POST /sessions',
                end: 'DELETE /sessions/:sessionToken',
                heartbeat: 'POST /sessions/:sessionToken/heartbeat'
            },
            projects: {
                list: 'GET /projects',
                sync: 'POST /projects/:projectId/sync',
                score: 'GET /projects/:projectId/score'
            },
            materials: {
                list: 'GET /projects/:projectId/materials',
                sync: 'POST /projects/:projectId/materials/sync',
                map: 'POST /materials/:mappingId/map',
                alternatives: 'POST /materials/:mappingId/alternatives',
                batchMatch: 'POST /materials/batch-match'
            },
            catalog: {
                search: 'GET /catalog/search'
            },
            products: {
                search: 'GET /products/search',
                match: 'POST /products/match'
            },
            rfq: {
                create: 'POST /rfq'
            }
        }
    });
});

/**
 * GET /api/integrations/revit/v1/contract
 * Returns the API contract/schema for the Revit plugin
 */
router.get('/contract', (req, res) => {
    res.json(require('../contracts/revit-v1.json'));
});

// ============================================
// PLUGIN REGISTRATION
// ============================================

/**
 * POST /api/integrations/revit/v1/register
 * Register a new Revit plugin instance
 */
router.post('/register', authenticateRevitPlugin, revitRateLimit, async (req, res) => {
    try {
        const { pluginInstanceId, revitVersion, pluginVersion, machineName } = req.body;

        if (!pluginInstanceId) {
            return res.status(400).json({
                error: 'INVALID_REQUEST',
                message: 'pluginInstanceId is required',
                code: 'REVIT_REG_400'
            });
        }

        const { azureObjectId, azureTenantId, user } = req.revitAuth;

        // Check if already registered
        const existing = await pool.query(
            `SELECT RegistrationID, IsActive FROM Revit_Plugin_Registrations 
             WHERE PluginInstanceID = $1`,
            [pluginInstanceId]
        );

        if (existing.rows.length > 0) {
            const reg = existing.rows[0];
            
            // Reactivate if deactivated
            if (!reg.isactive) {
                await pool.query(
                    `UPDATE Revit_Plugin_Registrations 
                     SET IsActive = TRUE, DeactivatedAt = NULL, 
                         RevitVersion = $2, PluginVersion = $3, MachineName = $4,
                         LastHeartbeatAt = NOW(), UpdatedAt = NOW()
                     WHERE RegistrationID = $1`,
                    [reg.registrationid, revitVersion, pluginVersion, machineName]
                );
            } else {
                // Update version info
                await pool.query(
                    `UPDATE Revit_Plugin_Registrations 
                     SET RevitVersion = $2, PluginVersion = $3, MachineName = $4,
                         LastHeartbeatAt = NOW(), UpdatedAt = NOW()
                     WHERE RegistrationID = $1`,
                    [reg.registrationid, revitVersion, pluginVersion, machineName]
                );
            }

            return res.json({
                success: true,
                registrationId: reg.registrationid,
                status: 'updated',
                message: 'Plugin registration updated'
            });
        }

        // Create new registration
        const result = await pool.query(
            `INSERT INTO Revit_Plugin_Registrations 
             (UserID, AzureEntraObjectID, AzureEntraTenantID, PluginInstanceID, 
              RevitVersion, PluginVersion, MachineName, LastHeartbeatAt)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
             RETURNING RegistrationID`,
            [user.id, azureObjectId, azureTenantId, pluginInstanceId, revitVersion, pluginVersion, machineName]
        );

        res.status(201).json({
            success: true,
            registrationId: result.rows[0].registrationid,
            status: 'created',
            message: 'Plugin registered successfully'
        });
    } catch (error) {
        console.error('[Revit API] Registration error:', error);
        res.status(500).json({
            error: 'REGISTRATION_FAILED',
            message: 'Failed to register plugin',
            code: 'REVIT_REG_500'
        });
    }
});

/**
 * DELETE /api/integrations/revit/v1/register/:pluginInstanceId
 * Deactivate a plugin registration
 */
router.delete('/register/:pluginInstanceId', authenticateRevitPlugin, revitRateLimit, async (req, res) => {
    try {
        const { pluginInstanceId } = req.params;
        const { azureObjectId } = req.revitAuth;

        const result = await pool.query(
            `UPDATE Revit_Plugin_Registrations 
             SET IsActive = FALSE, DeactivatedAt = NOW(), UpdatedAt = NOW()
             WHERE PluginInstanceID = $1 AND AzureEntraObjectID = $2
             RETURNING RegistrationID`,
            [pluginInstanceId, azureObjectId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'NOT_FOUND',
                message: 'Plugin registration not found',
                code: 'REVIT_REG_404'
            });
        }

        res.json({
            success: true,
            message: 'Plugin registration deactivated'
        });
    } catch (error) {
        console.error('[Revit API] Deregistration error:', error);
        res.status(500).json({
            error: 'DEREGISTRATION_FAILED',
            message: 'Failed to deactivate plugin registration',
            code: 'REVIT_DEREG_500'
        });
    }
});

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * POST /api/integrations/revit/v1/sessions
 * Start a new sync session
 */
router.post('/sessions', authenticateRevitPlugin, requirePluginRegistration, revitRateLimit, async (req, res) => {
    try {
        const { projectFileHash, projectName, projectPath } = req.body;
        const { user, registration } = req.revitAuth;

        // Generate unique session token
        const sessionToken = crypto.randomBytes(32).toString('hex');

        // End any existing active sessions for this registration
        await pool.query(
            `UPDATE Revit_Sessions 
             SET Status = 'ended', EndedAt = NOW()
             WHERE RegistrationID = $1 AND Status = 'active'`,
            [registration.id]
        );

        // Create new session
        const result = await pool.query(
            `INSERT INTO Revit_Sessions 
             (RegistrationID, UserID, ProjectFileHash, ProjectName, ProjectPath, SessionToken)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING SessionID, SessionToken, StartedAt`,
            [registration.id, user.id, projectFileHash, projectName, projectPath, sessionToken]
        );

        const session = result.rows[0];

        // Log event
        await logRevitEvent({
            sessionId: session.sessionid,
            userId: user.id,
            eventType: 'SESSION_START',
            eventData: { projectName, projectPath },
            req
        });

        res.status(201).json({
            success: true,
            session: {
                id: session.sessionid,
                token: session.sessiontoken,
                startedAt: session.startedat
            },
            message: 'Session started'
        });
    } catch (error) {
        console.error('[Revit API] Session start error:', error);
        res.status(500).json({
            error: 'SESSION_START_FAILED',
            message: 'Failed to start session',
            code: 'REVIT_SESSION_500'
        });
    }
});

/**
 * DELETE /api/integrations/revit/v1/sessions/:sessionToken
 * End a session
 */
router.delete('/sessions/:sessionToken', authenticateRevitPlugin, requirePluginRegistration, revitRateLimit, async (req, res) => {
    try {
        const { sessionToken } = req.params;
        const { registration, user } = req.revitAuth;

        const result = await pool.query(
            `UPDATE Revit_Sessions 
             SET Status = 'ended', EndedAt = NOW()
             WHERE SessionToken = $1 AND RegistrationID = $2 AND Status = 'active'
             RETURNING SessionID`,
            [sessionToken, registration.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'SESSION_NOT_FOUND',
                message: 'Active session not found',
                code: 'REVIT_SESSION_404'
            });
        }

        // Log event
        await logRevitEvent({
            sessionId: result.rows[0].sessionid,
            userId: user.id,
            eventType: 'SESSION_END',
            eventData: {},
            req
        });

        res.json({
            success: true,
            message: 'Session ended'
        });
    } catch (error) {
        console.error('[Revit API] Session end error:', error);
        res.status(500).json({
            error: 'SESSION_END_FAILED',
            message: 'Failed to end session',
            code: 'REVIT_SESSION_500'
        });
    }
});

/**
 * POST /api/integrations/revit/v1/sessions/:sessionToken/heartbeat
 * Keep session alive
 */
router.post('/sessions/:sessionToken/heartbeat', authenticateRevitPlugin, requirePluginRegistration, revitRateLimit, async (req, res) => {
    try {
        const { sessionToken } = req.params;
        const { registration } = req.revitAuth;

        const result = await pool.query(
            `UPDATE Revit_Sessions 
             SET LastActivityAt = NOW()
             WHERE SessionToken = $1 AND RegistrationID = $2 AND Status = 'active'
             RETURNING SessionID`,
            [sessionToken, registration.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'SESSION_NOT_FOUND',
                message: 'Active session not found',
                code: 'REVIT_SESSION_404'
            });
        }

        res.json({
            success: true,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[Revit API] Heartbeat error:', error);
        res.status(500).json({
            error: 'HEARTBEAT_FAILED',
            message: 'Failed to update session',
            code: 'REVIT_HB_500'
        });
    }
});

// ============================================
// PROJECT MANAGEMENT
// ============================================

/**
 * GET /api/integrations/revit/v1/projects
 * List user's Revit projects
 */
router.get('/projects', authenticateRevitPlugin, requirePluginRegistration, revitRateLimit, async (req, res) => {
    try {
        const { user } = req.revitAuth;
        const { limit = 50, offset = 0, status } = req.query;

        let query = `
            SELECT ProjectID, ProjectFileHash, ProjectName, ProjectNumber, ClientName,
                   Location, BuildingType, GrossArea, AreaUnit, TargetCertification,
                   SustainabilityScore, SyncStatus, LastSyncedAt, CreatedAt, UpdatedAt
            FROM Revit_Projects
            WHERE UserID = $1
        `;
        const params = [user.id];

        if (status) {
            query += ` AND SyncStatus = $${params.length + 1}`;
            params.push(status);
        }

        query += ` ORDER BY UpdatedAt DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);

        // Get total count
        const countResult = await pool.query(
            `SELECT COUNT(*) FROM Revit_Projects WHERE UserID = $1`,
            [user.id]
        );

        res.json({
            projects: result.rows.map(formatProject),
            pagination: {
                total: parseInt(countResult.rows[0].count),
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        console.error('[Revit API] Projects list error:', error);
        res.status(500).json({
            error: 'PROJECTS_FETCH_FAILED',
            message: 'Failed to fetch projects',
            code: 'REVIT_PROJ_500'
        });
    }
});

/**
 * POST /api/integrations/revit/v1/projects
 * Create or update a project from Revit
 */
router.post('/projects', authenticateRevitPlugin, requirePluginRegistration, requireActiveSession, revitRateLimit, async (req, res) => {
    try {
        const { user, session } = req.revitAuth;
        const {
            projectFileHash,
            projectName,
            projectNumber,
            clientName,
            location,
            buildingType,
            grossArea,
            areaUnit,
            targetCertification
        } = req.body;

        if (!projectFileHash || !projectName) {
            return res.status(400).json({
                error: 'INVALID_REQUEST',
                message: 'projectFileHash and projectName are required',
                code: 'REVIT_PROJ_400'
            });
        }

        // Upsert project
        const result = await pool.query(
            `INSERT INTO Revit_Projects 
             (UserID, ProjectFileHash, ProjectName, ProjectNumber, ClientName, 
              Location, BuildingType, GrossArea, AreaUnit, TargetCertification, LastSyncedAt)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
             ON CONFLICT (ProjectFileHash) DO UPDATE SET
                ProjectName = EXCLUDED.ProjectName,
                ProjectNumber = EXCLUDED.ProjectNumber,
                ClientName = EXCLUDED.ClientName,
                Location = EXCLUDED.Location,
                BuildingType = EXCLUDED.BuildingType,
                GrossArea = EXCLUDED.GrossArea,
                AreaUnit = EXCLUDED.AreaUnit,
                TargetCertification = EXCLUDED.TargetCertification,
                LastSyncedAt = NOW(),
                UpdatedAt = NOW()
             RETURNING *`,
            [user.id, projectFileHash, projectName, projectNumber, clientName,
             location, buildingType, grossArea, areaUnit || 'sqft', targetCertification]
        );

        const project = result.rows[0];

        // Update session with project ID
        await pool.query(
            `UPDATE Revit_Sessions SET ProjectID = $1 WHERE SessionID = $2`,
            [project.projectid, session.id]
        );

        res.status(201).json({
            success: true,
            project: formatProject(project)
        });
    } catch (error) {
        console.error('[Revit API] Project create error:', error);
        res.status(500).json({
            error: 'PROJECT_CREATE_FAILED',
            message: 'Failed to create/update project',
            code: 'REVIT_PROJ_500'
        });
    }
});

/**
 * GET /api/integrations/revit/v1/projects/:projectId/score
 * Get sustainability score for a project
 */
router.get('/projects/:projectId/score', authenticateRevitPlugin, requirePluginRegistration, revitRateLimit, async (req, res) => {
    try {
        const { projectId } = req.params;
        const { user } = req.revitAuth;

        // Verify project ownership
        const projectResult = await pool.query(
            `SELECT * FROM Revit_Projects WHERE ProjectID = $1 AND UserID = $2`,
            [projectId, user.id]
        );

        if (projectResult.rows.length === 0) {
            return res.status(404).json({
                error: 'PROJECT_NOT_FOUND',
                message: 'Project not found',
                code: 'REVIT_PROJ_404'
            });
        }

        // Get material stats
        const statsResult = await pool.query(
            `SELECT 
                COUNT(*) as total_materials,
                COUNT(*) FILTER (WHERE MappingStatus IN ('auto_mapped', 'manual_mapped', 'verified')) as mapped_materials,
                COUNT(*) FILTER (WHERE MappingStatus = 'verified') as verified_materials,
                COUNT(*) FILTER (WHERE FSCCertified = TRUE) as fsc_materials,
                COUNT(*) FILTER (WHERE EPDNumber IS NOT NULL) as epd_materials,
                COALESCE(SUM(EmbodiedCarbonKgCO2e * COALESCE(TotalArea, TotalVolume, TotalCount, 1)), 0) as total_carbon,
                COALESCE(SUM(LEEDPoints), 0) as total_leed_points
             FROM Revit_Material_Mappings
             WHERE ProjectID = $1`,
            [projectId]
        );

        const stats = statsResult.rows[0];
        const totalMaterials = parseInt(stats.total_materials) || 0;
        const mappedMaterials = parseInt(stats.mapped_materials) || 0;
        const verifiedMaterials = parseInt(stats.verified_materials) || 0;
        const fscMaterials = parseInt(stats.fsc_materials) || 0;
        const epdMaterials = parseInt(stats.epd_materials) || 0;

        // Calculate score
        let overallScore = 0;
        if (totalMaterials > 0) {
            overallScore = Math.round(
                (40 * mappedMaterials / totalMaterials) +
                (30 * verifiedMaterials / totalMaterials) +
                (15 * fscMaterials / totalMaterials) +
                (15 * epdMaterials / totalMaterials)
            );
        }

        const project = projectResult.rows[0];

        res.json({
            projectId: parseInt(projectId),
            projectName: project.projectname,
            score: {
                overall: overallScore,
                leedPointsTotal: parseFloat(stats.total_leed_points) || 0,
                totalEmbodiedCarbonKg: parseFloat(stats.total_carbon) || 0,
                carbonPerSqft: project.grossarea > 0 
                    ? parseFloat(stats.total_carbon) / parseFloat(project.grossarea) 
                    : 0
            },
            coverage: {
                totalMaterials,
                mappedMaterials,
                verifiedMaterials,
                mappingPercentage: totalMaterials > 0 ? Math.round(mappedMaterials / totalMaterials * 100) : 0,
                fscPercentage: totalMaterials > 0 ? Math.round(fscMaterials / totalMaterials * 100) : 0,
                epdPercentage: totalMaterials > 0 ? Math.round(epdMaterials / totalMaterials * 100) : 0
            },
            recommendations: generateRecommendations(stats, project),
            calculatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('[Revit API] Score calculation error:', error);
        res.status(500).json({
            error: 'SCORE_CALCULATION_FAILED',
            message: 'Failed to calculate sustainability score',
            code: 'REVIT_SCORE_500'
        });
    }
});

// ============================================
// MATERIALS MANAGEMENT
// ============================================

/**
 * GET /api/integrations/revit/v1/projects/:projectId/materials
 * Get materials for a project
 */
router.get('/projects/:projectId/materials', authenticateRevitPlugin, requirePluginRegistration, revitRateLimit, async (req, res) => {
    try {
        const { projectId } = req.params;
        const { user } = req.revitAuth;
        const { status, limit = 100, offset = 0 } = req.query;

        // Verify project ownership
        const projectCheck = await pool.query(
            `SELECT ProjectID FROM Revit_Projects WHERE ProjectID = $1 AND UserID = $2`,
            [projectId, user.id]
        );

        if (projectCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'PROJECT_NOT_FOUND',
                message: 'Project not found',
                code: 'REVIT_PROJ_404'
            });
        }

        let query = `
            SELECT m.*, 
                   p.ProductName as gc_product_name,
                   c.CategoryName as gc_category_name
            FROM Revit_Material_Mappings m
            LEFT JOIN Products p ON m.GCProductID = p.ProductID
            LEFT JOIN Product_Categories c ON m.GCCategoryID = c.CategoryID
            WHERE m.ProjectID = $1
        `;
        const params = [projectId];

        if (status) {
            query += ` AND m.MappingStatus = $${params.length + 1}`;
            params.push(status);
        }

        query += ` ORDER BY m.RevitMaterialName LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);

        // Get total count
        let countQuery = `SELECT COUNT(*) FROM Revit_Material_Mappings WHERE ProjectID = $1`;
        const countParams = [projectId];
        if (status) {
            countQuery += ` AND MappingStatus = $2`;
            countParams.push(status);
        }
        const countResult = await pool.query(countQuery, countParams);

        res.json({
            materials: result.rows.map(formatMaterial),
            pagination: {
                total: parseInt(countResult.rows[0].count),
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        console.error('[Revit API] Materials list error:', error);
        res.status(500).json({
            error: 'MATERIALS_FETCH_FAILED',
            message: 'Failed to fetch materials',
            code: 'REVIT_MAT_500'
        });
    }
});

/**
 * POST /api/integrations/revit/v1/projects/:projectId/materials/sync
 * Sync materials from Revit to GreenChainz
 */
router.post('/projects/:projectId/materials/sync', authenticateRevitPlugin, requirePluginRegistration, requireActiveSession, syncRateLimiter, async (req, res) => {
    try {
        const { projectId } = req.params;
        const { user, session } = req.revitAuth;
        const { materials } = req.body;

        if (!materials || !Array.isArray(materials)) {
            return res.status(400).json({
                error: 'INVALID_REQUEST',
                message: 'materials array is required',
                code: 'REVIT_MAT_400'
            });
        }

        // Verify project ownership
        const projectCheck = await pool.query(
            `SELECT ProjectID FROM Revit_Projects WHERE ProjectID = $1 AND UserID = $2`,
            [projectId, user.id]
        );

        if (projectCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'PROJECT_NOT_FOUND',
                message: 'Project not found',
                code: 'REVIT_PROJ_404'
            });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const results = {
                created: 0,
                updated: 0,
                failed: 0,
                errors: []
            };

            for (const material of materials) {
                try {
                    const upsertResult = await client.query(
                        `INSERT INTO Revit_Material_Mappings 
                         (ProjectID, RevitMaterialID, RevitMaterialName, RevitMaterialCategory,
                          TotalArea, TotalVolume, TotalCount, QuantityUnit)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                         ON CONFLICT (ProjectID, RevitMaterialID) DO UPDATE SET
                            RevitMaterialName = EXCLUDED.RevitMaterialName,
                            RevitMaterialCategory = EXCLUDED.RevitMaterialCategory,
                            TotalArea = EXCLUDED.TotalArea,
                            TotalVolume = EXCLUDED.TotalVolume,
                            TotalCount = EXCLUDED.TotalCount,
                            QuantityUnit = EXCLUDED.QuantityUnit,
                            UpdatedAt = NOW()
                         RETURNING MappingID, 
                                   (xmax = 0) as is_insert`,
                        [projectId, material.revitMaterialId, material.name, material.category,
                         material.totalArea, material.totalVolume, material.totalCount, material.quantityUnit]
                    );

                    if (upsertResult.rows[0].is_insert) {
                        results.created++;
                    } else {
                        results.updated++;
                    }
                } catch (materialError) {
                    results.failed++;
                    results.errors.push({
                        materialId: material.revitMaterialId,
                        error: materialError.message
                    });
                }
            }

            await client.query('COMMIT');

            // Update project sync status
            await pool.query(
                `UPDATE Revit_Projects SET SyncStatus = 'synced', LastSyncedAt = NOW(), UpdatedAt = NOW()
                 WHERE ProjectID = $1`,
                [projectId]
            );

            // Log event
            await logRevitEvent({
                sessionId: session.id,
                projectId: parseInt(projectId),
                userId: user.id,
                eventType: 'MATERIAL_EXTRACTED',
                eventData: { 
                    totalMaterials: materials.length,
                    created: results.created,
                    updated: results.updated,
                    failed: results.failed
                },
                req
            });

            res.json({
                success: true,
                results,
                message: `Synced ${results.created + results.updated} materials`
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('[Revit API] Material sync error:', error);
        res.status(500).json({
            error: 'MATERIAL_SYNC_FAILED',
            message: 'Failed to sync materials',
            code: 'REVIT_MAT_500'
        });
    }
});

/**
 * POST /api/integrations/revit/v1/materials/:mappingId/map
 * Map a Revit material to a GreenChainz product
 */
router.post('/materials/:mappingId/map', authenticateRevitPlugin, requirePluginRegistration, revitRateLimit, async (req, res) => {
    try {
        const { mappingId } = req.params;
        const { user } = req.revitAuth;
        const { productId, categoryId } = req.body;

        // Verify ownership through project
        const ownerCheck = await pool.query(
            `SELECT m.MappingID, p.UserID 
             FROM Revit_Material_Mappings m
             JOIN Revit_Projects p ON m.ProjectID = p.ProjectID
             WHERE m.MappingID = $1`,
            [mappingId]
        );

        if (ownerCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'MAPPING_NOT_FOUND',
                message: 'Material mapping not found',
                code: 'REVIT_MAP_404'
            });
        }

        if (ownerCheck.rows[0].userid !== user.id) {
            return res.status(403).json({
                error: 'FORBIDDEN',
                message: 'Not authorized to modify this mapping',
                code: 'REVIT_MAP_403'
            });
        }

        // Get product sustainability data if productId provided
        let sustainabilityData = {};
        if (productId) {
            const productResult = await pool.query(
                `SELECT p.ProductID, 
                        e.GlobalWarmingPotential as embodied_carbon,
                        e.EPDNumber,
                        EXISTS(SELECT 1 FROM FSC_Certifications f WHERE f.SupplierID = p.SupplierID AND f.CertificateStatus = 'Valid') as fsc_certified,
                        (SELECT SUM(ContributionValue) FROM LEED_Product_Credits WHERE ProductID = p.ProductID) as leed_points
                 FROM Products p
                 LEFT JOIN Product_EPDs e ON p.ProductID = e.ProductID
                 WHERE p.ProductID = $1`,
                [productId]
            );

            if (productResult.rows.length > 0) {
                const prod = productResult.rows[0];
                sustainabilityData = {
                    embodiedCarbonKgCO2e: prod.embodied_carbon,
                    epdNumber: prod.epdnumber,
                    fscCertified: prod.fsc_certified,
                    leedPoints: prod.leed_points
                };
            }
        }

        // Update mapping
        const result = await pool.query(
            `UPDATE Revit_Material_Mappings SET
                GCProductID = $2,
                GCCategoryID = $3,
                EmbodiedCarbonKgCO2e = $4,
                EPDNumber = $5,
                FSCCertified = $6,
                LEEDPoints = $7,
                MappingStatus = 'manual_mapped',
                MappedByUserID = $8,
                MappedAt = NOW(),
                UpdatedAt = NOW()
             WHERE MappingID = $1
             RETURNING *`,
            [mappingId, productId, categoryId, 
             sustainabilityData.embodiedCarbonKgCO2e,
             sustainabilityData.epdNumber,
             sustainabilityData.fscCertified || false,
             sustainabilityData.leedPoints,
             user.id]
        );

        res.json({
            success: true,
            material: formatMaterial(result.rows[0])
        });
    } catch (error) {
        console.error('[Revit API] Material map error:', error);
        res.status(500).json({
            error: 'MATERIAL_MAP_FAILED',
            message: 'Failed to map material',
            code: 'REVIT_MAP_500'
        });
    }
});

// ============================================
// PRODUCT SEARCH
// ============================================

/**
 * GET /api/integrations/revit/v1/products/search
 * Search GreenChainz products for material matching
 */
router.get('/products/search', authenticateRevitPlugin, requirePluginRegistration, revitRateLimit, async (req, res) => {
    try {
        const { q, category, limit = 20 } = req.query;

        if (!q || q.length < 2) {
            return res.status(400).json({
                error: 'INVALID_QUERY',
                message: 'Search query must be at least 2 characters',
                code: 'REVIT_SEARCH_400'
            });
        }

        let query = `
            SELECT p.ProductID, p.ProductName, p.Description, p.SKU,
                   c.CategoryName,
                   s.CompanyID,
                   co.CompanyName as supplier_name,
                   e.EPDNumber, e.GlobalWarmingPotential,
                   EXISTS(SELECT 1 FROM FSC_Certifications f WHERE f.SupplierID = p.SupplierID AND f.CertificateStatus = 'Valid') as fsc_certified
            FROM Products p
            LEFT JOIN Product_Categories c ON p.CategoryID = c.CategoryID
            LEFT JOIN Suppliers s ON p.SupplierID = s.SupplierID
            LEFT JOIN Companies co ON s.CompanyID = co.CompanyID
            LEFT JOIN Product_EPDs e ON p.ProductID = e.ProductID
            WHERE (p.ProductName ILIKE $1 OR p.Description ILIKE $1)
        `;
        const params = [`%${q}%`];

        if (category) {
            query += ` AND c.CategoryName ILIKE $${params.length + 1}`;
            params.push(`%${category}%`);
        }

        query += ` ORDER BY p.ProductName LIMIT $${params.length + 1}`;
        params.push(parseInt(limit));

        const result = await pool.query(query, params);

        res.json({
            products: result.rows.map(p => ({
                id: p.productid,
                name: p.productname,
                description: p.description,
                sku: p.sku,
                category: p.categoryname,
                supplier: p.supplier_name,
                sustainability: {
                    epdNumber: p.epdnumber,
                    embodiedCarbon: p.globalwarmingpotential,
                    fscCertified: p.fsc_certified
                }
            })),
            query: q
        });
    } catch (error) {
        console.error('[Revit API] Product search error:', error);
        res.status(500).json({
            error: 'SEARCH_FAILED',
            message: 'Failed to search products',
            code: 'REVIT_SEARCH_500'
        });
    }
});

/**
 * POST /api/integrations/revit/v1/products/match
 * Auto-match Revit materials to GreenChainz products
 */
router.post('/products/match', authenticateRevitPlugin, requirePluginRegistration, revitRateLimit, async (req, res) => {
    try {
        const { materialNames } = req.body;

        if (!materialNames || !Array.isArray(materialNames)) {
            return res.status(400).json({
                error: 'INVALID_REQUEST',
                message: 'materialNames array is required',
                code: 'REVIT_MATCH_400'
            });
        }

        const matches = [];

        for (const materialName of materialNames) {
            // Simple matching - search for products with similar names
            const result = await pool.query(
                `SELECT p.ProductID, p.ProductName, c.CategoryName,
                        similarity(p.ProductName, $1) as match_score
                 FROM Products p
                 LEFT JOIN Product_Categories c ON p.CategoryID = c.CategoryID
                 WHERE p.ProductName ILIKE $2
                 ORDER BY similarity(p.ProductName, $1) DESC
                 LIMIT 3`,
                [materialName, `%${materialName}%`]
            );

            matches.push({
                materialName,
                suggestions: result.rows.map(r => ({
                    productId: r.productid,
                    productName: r.productname,
                    category: r.categoryname,
                    confidence: parseFloat(r.match_score) || 0.5
                }))
            });
        }

        res.json({
            matches,
            matchedCount: matches.filter(m => m.suggestions.length > 0).length,
            totalCount: materialNames.length
        });
    } catch (error) {
        console.error('[Revit API] Product match error:', error);
        res.status(500).json({
            error: 'MATCH_FAILED',
            message: 'Failed to match products',
            code: 'REVIT_MATCH_500'
        });
    }
});

// ============================================
// CATALOG SEARCH (Optimized for Revit)
// ============================================

/**
 * GET /api/integrations/revit/v1/catalog/search
 * Search GreenChainz catalog with sustainability scores
 * Optimized for Revit plugin - lighter payload
 */
router.get('/catalog/search', authenticateRevitPlugin, requirePluginRegistration, revitRateLimit, async (req, res) => {
    try {
        const { 
            q, 
            category, 
            certifications, 
            minScore, 
            limit = 20, 
            offset = 0,
            sortBy = 'score'
        } = req.query;

        // Parse certifications if passed as comma-separated string
        let certArray = [];
        if (certifications) {
            certArray = typeof certifications === 'string' 
                ? certifications.split(',').map(c => c.trim()).filter(Boolean)
                : certifications;
        }

        // Use the catalog search service
        const searchResult = await searchMaterials({
            query: q || '',
            category,
            certifications: certArray,
            minScore: minScore ? parseInt(minScore) : null,
            limit: Math.min(parseInt(limit) || 20, 50), // Cap at 50 for Revit
            offset: parseInt(offset) || 0,
            sortBy: sortBy || 'score'
        });

        // Transform to lighter payload optimized for Revit plugin
        const materials = searchResult.materials.map(m => ({
            id: m.id,
            name: m.name,
            sku: m.sku,
            category: m.category?.name || null,
            supplier: m.supplier?.name || null,
            sustainabilityScore: m.sustainabilityScore || 0,
            certifications: m.certifications || [],
            certificationCount: m.certificationCount || 0,
            unitPrice: m.unitPrice,
            currency: m.currency,
            tier: m.recommendationTier || 'unscored'
        }));

        res.json({
            success: true,
            materials,
            total: searchResult.total,
            pagination: {
                limit: searchResult.pagination.limit,
                offset: searchResult.pagination.offset,
                hasMore: searchResult.pagination.hasMore,
                page: searchResult.pagination.page,
                totalPages: searchResult.pagination.totalPages
            },
            query: q || null
        });
    } catch (error) {
        console.error('[Revit API] Catalog search error:', error);
        res.status(500).json({
            error: 'CATALOG_SEARCH_FAILED',
            message: 'Failed to search catalog',
            code: 'REVIT_CATALOG_500'
        });
    }
});

/**
 * GET /api/integrations/revit/v1/catalog/:materialId
 * Get material details by ID (lightweight for Revit)
 */
router.get('/catalog/:materialId', authenticateRevitPlugin, requirePluginRegistration, revitRateLimit, async (req, res) => {
    try {
        const { materialId } = req.params;

        const material = await getMaterialById(materialId);

        if (!material) {
            return res.status(404).json({
                error: 'MATERIAL_NOT_FOUND',
                message: 'Material not found in catalog',
                code: 'REVIT_CATALOG_404'
            });
        }

        // Return lightweight version for Revit
        res.json({
            success: true,
            material: {
                id: material.id,
                name: material.name,
                description: material.description,
                sku: material.sku,
                category: material.category,
                supplier: {
                    id: material.supplier?.id,
                    name: material.supplier?.name
                },
                sustainability: {
                    score: material.sustainability?.score || 0,
                    tier: material.sustainability?.tier,
                    whyRecommended: material.sustainability?.whyRecommended
                },
                certifications: (material.certifications || []).map(c => ({
                    name: c.name,
                    certifyingBody: c.certifyingBody,
                    status: c.status
                })),
                epd: (material.epd || []).slice(0, 1).map(e => ({
                    epdNumber: e.epdNumber,
                    globalWarmingPotential: e.globalWarmingPotential,
                    declaredUnit: e.declaredUnit
                }))[0] || null,
                leedCredits: material.leedCredits?.length || 0,
                unitPrice: material.unitPrice,
                currency: material.currency
            }
        });
    } catch (error) {
        console.error('[Revit API] Catalog get error:', error);
        res.status(500).json({
            error: 'CATALOG_GET_FAILED',
            message: 'Failed to get material details',
            code: 'REVIT_CATALOG_500'
        });
    }
});

// ============================================
// MATERIAL ALTERNATIVES (AI-Powered)
// ============================================

/**
 * POST /api/integrations/revit/v1/materials/:mappingId/alternatives
 * Get AI-powered sustainable alternatives for a mapped material
 * Returns top 5 alternatives with score comparison
 */
router.post('/materials/:mappingId/alternatives', authenticateRevitPlugin, requirePluginRegistration, revitRateLimit, async (req, res) => {
    try {
        const { mappingId } = req.params;
        const { user } = req.revitAuth;
        const { 
            maxAlternatives = 5,
            prioritize = 'sustainability' // 'sustainability', 'carbon', 'cost', 'availability'
        } = req.body;

        // Get the material mapping details
        const mappingResult = await pool.query(
            `SELECT m.*, p.ProjectID, proj.UserID,
                    prod.ProductName, prod.CategoryID, prod.SupplierID,
                    pc.CategoryName
             FROM Revit_Material_Mappings m
             LEFT JOIN Revit_Projects proj ON m.ProjectID = proj.ProjectID
             LEFT JOIN Products prod ON m.GCProductID = prod.ProductID
             LEFT JOIN Product_Categories pc ON prod.CategoryID = pc.CategoryID
             WHERE m.MappingID = $1`,
            [mappingId]
        );

        if (mappingResult.rows.length === 0) {
            return res.status(404).json({
                error: 'MAPPING_NOT_FOUND',
                message: 'Material mapping not found',
                code: 'REVIT_ALT_404'
            });
        }

        const mapping = mappingResult.rows[0];

        // Verify ownership
        if (mapping.userid !== user.id) {
            return res.status(403).json({
                error: 'FORBIDDEN',
                message: 'Not authorized to access this material',
                code: 'REVIT_ALT_403'
            });
        }

        // Prepare context for AI Gateway
        const materialContext = {
            materialName: mapping.revitmaterialname,
            mappedProductName: mapping.productname,
            category: mapping.categoryname || mapping.revitmaterialcategory,
            currentScore: mapping.embodiedcarbonkgco2e,
            currentEPD: mapping.epdnumber,
            currentFSC: mapping.fsccertified,
            prioritize,
            maxAlternatives: Math.min(maxAlternatives, 5)
        };

        let aiAlternatives = [];
        let aiError = null;

        // Try to get AI-powered alternatives
        try {
            const aiResult = await aiGateway.execute({
                workflowName: 'sustainable-alternatives',
                input: {
                    query: `Find ${maxAlternatives} sustainable alternatives for: ${mapping.revitmaterialname}. 
                            Category: ${materialContext.category || 'Unknown'}. 
                            Current product: ${mapping.productname || 'Not mapped'}.
                            Prioritize: ${prioritize}.
                            Return JSON array with: name, category, estimatedCarbonReduction, certifications, reason.`,
                    context: materialContext
                },
                userId: user.id,
                context: {
                    source: 'revit-plugin',
                    mappingId
                }
            });

            if (aiResult.success && aiResult.data) {
                // Parse AI response
                if (Array.isArray(aiResult.data)) {
                    aiAlternatives = aiResult.data;
                } else if (aiResult.data.alternatives) {
                    aiAlternatives = aiResult.data.alternatives;
                } else if (aiResult.data.response) {
                    // Try to parse JSON from response text
                    try {
                        const parsed = JSON.parse(aiResult.data.response);
                        aiAlternatives = Array.isArray(parsed) ? parsed : (parsed.alternatives || []);
                    } catch (e) {
                        // AI returned text, not JSON
                    }
                }
            }
        } catch (aiErr) {
            console.warn('[Revit API] AI alternatives failed:', aiErr.message);
            aiError = aiErr.message;
        }

        // Also search catalog for alternatives in same category
        let catalogAlternatives = [];
        if (mapping.categoryid || mapping.categoryname) {
            try {
                const catalogResult = await searchMaterials({
                    category: mapping.categoryid || mapping.categoryname,
                    minScore: mapping.sustainabilityscore || 50,
                    limit: 10,
                    sortBy: 'score'
                });

                // Filter out the current product and format
                catalogAlternatives = catalogResult.materials
                    .filter(m => m.id !== mapping.gcproductid)
                    .slice(0, 5)
                    .map(m => ({
                        id: m.id,
                        name: m.name,
                        category: m.category?.name,
                        supplier: m.supplier?.name,
                        sustainabilityScore: m.sustainabilityScore,
                        certifications: m.certifications || [],
                        source: 'catalog'
                    }));
            } catch (catErr) {
                console.warn('[Revit API] Catalog alternatives search failed:', catErr.message);
            }
        }

        // Combine and rank alternatives
        const alternatives = [];
        
        // Add AI suggestions first
        aiAlternatives.slice(0, maxAlternatives).forEach((alt, idx) => {
            alternatives.push({
                rank: idx + 1,
                name: alt.name || alt.productName,
                category: alt.category,
                estimatedCarbonReduction: alt.estimatedCarbonReduction || alt.carbonReduction,
                certifications: alt.certifications || [],
                reason: alt.reason || alt.whyBetter,
                sustainabilityScore: alt.sustainabilityScore || alt.score,
                source: 'ai'
            });
        });

        // Fill remaining slots with catalog alternatives
        catalogAlternatives.forEach(alt => {
            if (alternatives.length < maxAlternatives) {
                const scoreImprovement = mapping.sustainabilityscore 
                    ? ((alt.sustainabilityScore - mapping.sustainabilityscore) / mapping.sustainabilityscore * 100).toFixed(1)
                    : null;
                
                alternatives.push({
                    rank: alternatives.length + 1,
                    id: alt.id,
                    name: alt.name,
                    category: alt.category,
                    supplier: alt.supplier,
                    sustainabilityScore: alt.sustainabilityScore,
                    scoreImprovement: scoreImprovement ? `+${scoreImprovement}%` : null,
                    certifications: alt.certifications,
                    source: 'catalog'
                });
            }
        });

        // Calculate comparison with current material
        const comparison = {
            currentMaterial: {
                name: mapping.revitmaterialname,
                mappedProduct: mapping.productname,
                sustainabilityScore: mapping.sustainabilityscore || null,
                embodiedCarbonKg: mapping.embodiedcarbonkgco2e ? parseFloat(mapping.embodiedcarbonkgco2e) : null,
                fscCertified: mapping.fsccertified,
                hasEPD: !!mapping.epdnumber
            },
            bestAlternative: alternatives[0] || null,
            totalAlternatives: alternatives.length,
            aiPowered: aiAlternatives.length > 0
        };

        res.json({
            success: true,
            mappingId: parseInt(mappingId),
            alternatives,
            comparison,
            aiStatus: aiError ? { error: aiError, fallback: 'catalog' } : 'ok'
        });

    } catch (error) {
        console.error('[Revit API] Alternatives error:', error);
        res.status(500).json({
            error: 'ALTERNATIVES_FAILED',
            message: 'Failed to get material alternatives',
            code: 'REVIT_ALT_500'
        });
    }
});

// ============================================
// BATCH MATERIAL MATCHING
// ============================================

/**
 * POST /api/integrations/revit/v1/materials/batch-match
 * Batch match Revit material names to catalog products
 * Returns best matches with confidence scores
 */
router.post('/materials/batch-match', authenticateRevitPlugin, requirePluginRegistration, revitRateLimit, async (req, res) => {
    try {
        const { materials } = req.body;

        if (!materials || !Array.isArray(materials) || materials.length === 0) {
            return res.status(400).json({
                error: 'INVALID_REQUEST',
                message: 'materials array is required and must not be empty',
                code: 'REVIT_BATCH_400'
            });
        }

        // Limit batch size to prevent abuse
        const MAX_BATCH_SIZE = 100;
        if (materials.length > MAX_BATCH_SIZE) {
            return res.status(400).json({
                error: 'BATCH_TOO_LARGE',
                message: `Maximum batch size is ${MAX_BATCH_SIZE} materials`,
                code: 'REVIT_BATCH_400'
            });
        }

        const matches = [];
        const stats = {
            total: materials.length,
            matched: 0,
            highConfidence: 0,
            lowConfidence: 0,
            noMatch: 0
        };

        // Process each material
        for (const material of materials) {
            const materialName = typeof material === 'string' ? material : material.name;
            const materialCategory = typeof material === 'object' ? material.category : null;
            const materialId = typeof material === 'object' ? material.revitMaterialId : null;

            if (!materialName) {
                matches.push({
                    input: material,
                    matched: false,
                    error: 'Missing material name'
                });
                stats.noMatch++;
                continue;
            }

            try {
                // Search for matches using similarity
                let query = `
                    SELECT p."ProductID", p."ProductName", p."Description", p."SKU",
                           pc."CategoryName",
                           cp."CompanyName" as supplier_name,
                           mss.total_score as sustainability_score,
                           mss.recommendation_tier,
                           similarity(p."ProductName", $1) as name_similarity,
                           similarity(COALESCE(p."Description", ''), $1) as desc_similarity,
                           -- Boost score for category match
                           CASE WHEN pc."CategoryName" ILIKE $2 THEN 0.2 ELSE 0 END as category_boost
                    FROM Products p
                    LEFT JOIN Product_Categories pc ON p."CategoryID" = pc."CategoryID"
                    LEFT JOIN Suppliers s ON p."SupplierID" = s."SupplierID"
                    LEFT JOIN Companies cp ON s."CompanyID" = cp."CompanyID"
                    LEFT JOIN material_sustainability_scores mss 
                        ON mss.entity_type = 'product' AND mss.entity_id = p."ProductID"::text
                    WHERE p."ProductName" ILIKE $3 
                       OR p."Description" ILIKE $3
                       OR similarity(p."ProductName", $1) > 0.2
                    ORDER BY (similarity(p."ProductName", $1) + 
                              similarity(COALESCE(p."Description", ''), $1) * 0.3 +
                              CASE WHEN pc."CategoryName" ILIKE $2 THEN 0.2 ELSE 0 END) DESC
                    LIMIT 3
                `;

                const searchTerm = `%${materialName}%`;
                const categoryTerm = materialCategory ? `%${materialCategory}%` : '%';

                const result = await pool.query(query, [materialName, categoryTerm, searchTerm]);

                if (result.rows.length === 0) {
                    matches.push({
                        input: { name: materialName, revitMaterialId: materialId },
                        matched: false,
                        suggestions: []
                    });
                    stats.noMatch++;
                } else {
                    const suggestions = result.rows.map((row, idx) => {
                        // Calculate confidence score (0-1)
                        const nameSim = parseFloat(row.name_similarity) || 0;
                        const descSim = parseFloat(row.desc_similarity) || 0;
                        const catBoost = parseFloat(row.category_boost) || 0;
                        const confidence = Math.min(1, nameSim + (descSim * 0.3) + catBoost);

                        return {
                            rank: idx + 1,
                            productId: row.ProductID,
                            productName: row.ProductName,
                            category: row.CategoryName,
                            supplier: row.supplier_name,
                            sustainabilityScore: parseInt(row.sustainability_score) || 0,
                            tier: row.recommendation_tier,
                            confidence: Math.round(confidence * 100) / 100,
                            confidenceLevel: confidence >= 0.7 ? 'high' : 
                                            confidence >= 0.4 ? 'medium' : 'low'
                        };
                    });

                    const bestMatch = suggestions[0];
                    const matched = bestMatch.confidence >= 0.3;

                    matches.push({
                        input: { name: materialName, revitMaterialId: materialId },
                        matched,
                        bestMatch: matched ? bestMatch : null,
                        suggestions: suggestions.slice(0, 3),
                        confidence: bestMatch.confidence,
                        confidenceLevel: bestMatch.confidenceLevel
                    });

                    if (matched) {
                        stats.matched++;
                        if (bestMatch.confidence >= 0.7) {
                            stats.highConfidence++;
                        } else {
                            stats.lowConfidence++;
                        }
                    } else {
                        stats.noMatch++;
                    }
                }
            } catch (matchError) {
                console.warn('[Revit API] Match error for:', materialName, matchError.message);
                matches.push({
                    input: { name: materialName, revitMaterialId: materialId },
                    matched: false,
                    error: 'Match failed'
                });
                stats.noMatch++;
            }
        }

        res.json({
            success: true,
            matches,
            stats,
            summary: {
                matchRate: `${Math.round(stats.matched / stats.total * 100)}%`,
                highConfidenceRate: stats.matched > 0 
                    ? `${Math.round(stats.highConfidence / stats.matched * 100)}%` 
                    : '0%'
            }
        });

    } catch (error) {
        console.error('[Revit API] Batch match error:', error);
        res.status(500).json({
            error: 'BATCH_MATCH_FAILED',
            message: 'Failed to batch match materials',
            code: 'REVIT_BATCH_500'
        });
    }
});

// ============================================
// RFQ GENERATION
// ============================================

/**
 * POST /api/integrations/revit/v1/rfq
 * Create RFQ from Revit project materials
 */
router.post('/rfq', authenticateRevitPlugin, requirePluginRegistration, revitRateLimit, async (req, res) => {
    try {
        const { user } = req.revitAuth;
        const { projectId, materialMappingIds, message, deadline } = req.body;

        if (!projectId || !materialMappingIds || !Array.isArray(materialMappingIds)) {
            return res.status(400).json({
                error: 'INVALID_REQUEST',
                message: 'projectId and materialMappingIds array are required',
                code: 'REVIT_RFQ_400'
            });
        }

        // Verify project ownership
        const projectResult = await pool.query(
            `SELECT * FROM Revit_Projects WHERE ProjectID = $1 AND UserID = $2`,
            [projectId, user.id]
        );

        if (projectResult.rows.length === 0) {
            return res.status(404).json({
                error: 'PROJECT_NOT_FOUND',
                message: 'Project not found',
                code: 'REVIT_PROJ_404'
            });
        }

        const project = projectResult.rows[0];

        // Get materials with mapped products
        const materialsResult = await pool.query(
            `SELECT m.*, p.SupplierID, p.ProductName
             FROM Revit_Material_Mappings m
             JOIN Products p ON m.GCProductID = p.ProductID
             WHERE m.MappingID = ANY($1) AND m.ProjectID = $2`,
            [materialMappingIds, projectId]
        );

        if (materialsResult.rows.length === 0) {
            return res.status(400).json({
                error: 'NO_MAPPED_MATERIALS',
                message: 'No materials with mapped products found',
                code: 'REVIT_RFQ_400'
            });
        }

        // Get or create buyer
        let buyerResult = await pool.query(
            `SELECT BuyerID FROM Buyers WHERE UserID = $1`,
            [user.id]
        );

        if (buyerResult.rows.length === 0) {
            buyerResult = await pool.query(
                `INSERT INTO Buyers (UserID) VALUES ($1) RETURNING BuyerID`,
                [user.id]
            );
        }

        const buyerId = buyerResult.rows[0].buyerid;

        // Create RFQs grouped by supplier
        const client = await pool.connect();
        const createdRfqs = [];

        try {
            await client.query('BEGIN');

            // Group materials by supplier
            const materialsBySupplier = {};
            for (const mat of materialsResult.rows) {
                if (!materialsBySupplier[mat.supplierid]) {
                    materialsBySupplier[mat.supplierid] = [];
                }
                materialsBySupplier[mat.supplierid].push(mat);
            }

            // Create RFQ for each supplier
            for (const [supplierId, materials] of Object.entries(materialsBySupplier)) {
                const materialList = materials.map(m => 
                    `- ${m.revitmaterialname} → ${m.productname} (Qty: ${m.totalarea || m.totalvolume || m.totalcount || 'TBD'})`
                ).join('\n');

                const rfqMessage = `
RFQ from Revit Project: ${project.projectname}
${project.clientname ? `Client: ${project.clientname}` : ''}
${project.location ? `Location: ${project.location}` : ''}
${project.targetcertification ? `Target Certification: ${project.targetcertification}` : ''}

Materials Requested:
${materialList}

${message || ''}
                `.trim();

                const rfqResult = await client.query(
                    `INSERT INTO RFQs (BuyerID, SupplierID, ProjectName, Message, DeadlineDate, Status)
                     VALUES ($1, $2, $3, $4, $5, 'Pending')
                     RETURNING RFQID`,
                    [buyerId, supplierId, project.projectname, rfqMessage, deadline]
                );

                createdRfqs.push({
                    rfqId: rfqResult.rows[0].rfqid,
                    supplierId: parseInt(supplierId),
                    materialCount: materials.length
                });
            }

            await client.query('COMMIT');

            // Log event
            await logRevitEvent({
                projectId: parseInt(projectId),
                userId: user.id,
                eventType: 'RFQ_INITIATED',
                eventData: { rfqCount: createdRfqs.length },
                req
            });

            res.status(201).json({
                success: true,
                rfqs: createdRfqs,
                message: `Created ${createdRfqs.length} RFQ(s) for ${materialsResult.rows.length} materials`
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('[Revit API] RFQ creation error:', error);
        res.status(500).json({
            error: 'RFQ_CREATION_FAILED',
            message: 'Failed to create RFQ',
            code: 'REVIT_RFQ_500'
        });
    }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Log a Revit sync event
 */
async function logRevitEvent({ sessionId, projectId, userId, eventType, eventData, req }) {
    try {
        await pool.query(
            `INSERT INTO Revit_Sync_Events (SessionID, ProjectID, UserID, EventType, EventData, IPAddress, UserAgent)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                sessionId,
                projectId,
                userId,
                eventType,
                JSON.stringify(eventData),
                req?.ip || req?.connection?.remoteAddress,
                req?.headers?.['user-agent']
            ]
        );
    } catch (error) {
        console.error('[Revit API] Event logging failed:', error.message);
    }
}

/**
 * Format project for API response
 */
function formatProject(row) {
    return {
        id: row.projectid,
        fileHash: row.projectfilehash,
        name: row.projectname,
        number: row.projectnumber,
        client: row.clientname,
        location: row.location,
        buildingType: row.buildingtype,
        grossArea: row.grossarea ? parseFloat(row.grossarea) : null,
        areaUnit: row.areaunit,
        targetCertification: row.targetcertification,
        sustainabilityScore: row.sustainabilityscore,
        syncStatus: row.syncstatus,
        lastSyncedAt: row.lastsyncedAt,
        createdAt: row.createdat,
        updatedAt: row.updatedat
    };
}

/**
 * Format material mapping for API response
 */
function formatMaterial(row) {
    return {
        id: row.mappingid,
        revitMaterialId: row.revitmaterialid,
        name: row.revitmaterialname,
        category: row.revitmaterialcategory,
        mappedProduct: row.gcproductid ? {
            id: row.gcproductid,
            name: row.gc_product_name
        } : null,
        mappedCategory: row.gccategoryid ? {
            id: row.gccategoryid,
            name: row.gc_category_name
        } : null,
        sustainability: {
            embodiedCarbonKgCO2e: row.embodiedcarbonkgco2e ? parseFloat(row.embodiedcarbonkgco2e) : null,
            epdNumber: row.epdnumber,
            fscCertified: row.fsccertified,
            leedPoints: row.leedpoints ? parseFloat(row.leedpoints) : null
        },
        quantity: {
            area: row.totalarea ? parseFloat(row.totalarea) : null,
            volume: row.totalvolume ? parseFloat(row.totalvolume) : null,
            count: row.totalcount,
            unit: row.quantityunit
        },
        status: row.mappingstatus,
        confidence: row.confidencescore ? parseFloat(row.confidencescore) : null,
        mappedAt: row.mappedat
    };
}

/**
 * Generate recommendations based on project stats
 */
function generateRecommendations(stats, project) {
    const recommendations = [];
    const totalMaterials = parseInt(stats.total_materials) || 0;
    const mappedMaterials = parseInt(stats.mapped_materials) || 0;
    const fscMaterials = parseInt(stats.fsc_materials) || 0;
    const epdMaterials = parseInt(stats.epd_materials) || 0;

    if (totalMaterials === 0) {
        recommendations.push({
            type: 'sync',
            priority: 'high',
            message: 'Sync materials from Revit to get started with sustainability analysis'
        });
        return recommendations;
    }

    const mappingPct = mappedMaterials / totalMaterials;
    const fscPct = fscMaterials / totalMaterials;
    const epdPct = epdMaterials / totalMaterials;

    if (mappingPct < 0.5) {
        recommendations.push({
            type: 'mapping',
            priority: 'high',
            message: `Only ${Math.round(mappingPct * 100)}% of materials are mapped. Map more materials to improve your score.`
        });
    }

    if (fscPct < 0.2) {
        recommendations.push({
            type: 'fsc',
            priority: 'medium',
            message: 'Consider specifying more FSC-certified wood products for LEED MR credits'
        });
    }

    if (epdPct < 0.3) {
        recommendations.push({
            type: 'epd',
            priority: 'medium',
            message: 'Increase EPD coverage for better carbon tracking and LEED MR credits'
        });
    }

    if (project.targetcertification && project.targetcertification.includes('LEED')) {
        const leedPoints = parseFloat(stats.total_leed_points) || 0;
        if (leedPoints < 5) {
            recommendations.push({
                type: 'leed',
                priority: 'high',
                message: `Current materials contribute ~${leedPoints.toFixed(1)} LEED points. Consider products with higher LEED contributions.`
            });
        }
    }

    return recommendations;
}

module.exports = router;
