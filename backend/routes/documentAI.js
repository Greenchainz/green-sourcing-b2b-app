/**
 * Document AI Routes
 * Uses Azure AI Document Intelligence for document analysis
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const documentIntelligence = require('../services/azure/documentIntelligence');
const defensibilityService = require('../services/azure/defensibilityService');
const storage = require('../services/azure/storage');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const monitoring = require('../services/azure/monitoring');
const rateLimit = require('express-rate-limit');
const { ai: aiRateLimit } = require('../middleware/rateLimit');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }
});

const documentRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // limit each IP to 50 document processing requests per 15 minutes
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Analyze a certification document
 * POST /api/v1/ai/analyze/certification
 */
router.post('/analyze/certification',
    aiRateLimit,
    authenticateToken,
    authorizeRoles('Supplier', 'Admin'),
    upload.single('document'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No document uploaded' });
            }

            const certificationType = req.body.type || 'general';
            const startTime = Date.now();

            const result = await documentIntelligence.parseCertificationDocument(
                req.file.buffer,
                certificationType
            );

            const duration = Date.now() - startTime;
            
            monitoring.trackEvent('CertificationAnalyzed', {
                certificationType,
                confidence: String(result.confidence),
                duration: String(duration),
                userId: String(req.user.userId)
            });

            monitoring.trackDependency(
                'DocumentIntelligence',
                'parseCertificationDocument',
                duration,
                true,
                'Azure AI'
            );

            res.json({
                message: 'Certification document analyzed',
                certificationType,
                ...result,
                analysisTimeMs: duration
            });
        } catch (e) {
            monitoring.trackException(e, { context: 'certification_analysis' });
            res.status(500).json({ error: e.message });
        }
    }
);

/**
 * Analyze an EPD document
 * POST /api/v1/ai/analyze/epd
 */
router.post('/analyze/epd',
    aiRateLimit,
    authenticateToken,
    authorizeRoles('Supplier', 'Admin'),
    upload.single('document'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No document uploaded' });
            }

            const startTime = Date.now();
            const result = await documentIntelligence.parseEPDDocument(req.file.buffer);
            const duration = Date.now() - startTime;

            monitoring.trackEvent('EPDAnalyzed', {
                hasEnvironmentalMetrics: String(!!result.environmentalMetrics?.gwp),
                duration: String(duration),
                userId: String(req.user.userId)
            });

            res.json({
                message: 'EPD document analyzed',
                ...result,
                analysisTimeMs: duration
            });
        } catch (e) {
            monitoring.trackException(e, { context: 'epd_analysis' });
            res.status(500).json({ error: e.message });
        }
    }
);

/**
 * Verify document authenticity
 * POST /api/v1/ai/verify
 */
router.post('/verify',
    aiRateLimit,
    authenticateToken,
    authorizeRoles('Admin'),
    upload.single('document'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No document uploaded' });
            }

            const startTime = Date.now();
            const result = await documentIntelligence.verifyDocumentAuthenticity(req.file.buffer);
            const duration = Date.now() - startTime;

            monitoring.trackEvent('DocumentVerified', {
                score: String(result.score),
                recommendation: result.recommendation,
                userId: String(req.user.userId)
            });

            res.json({
                message: 'Document verification complete',
                ...result,
                analysisTimeMs: duration
            });
        } catch (e) {
            monitoring.trackException(e, { context: 'document_verification' });
            res.status(500).json({ error: e.message });
        }
    }
);

    documentRateLimiter,
/**
 * Extract text content from any document
 * POST /api/v1/ai/extract
 */
router.post('/extract',
    aiRateLimit,
    authenticateToken,
    upload.single('document'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No document uploaded' });
            }

            const startTime = Date.now();
            const result = await documentIntelligence.extractDocumentContent(req.file.buffer);
            const duration = Date.now() - startTime;

            res.json({
                message: 'Document content extracted',
                pageCount: result.pages.length,
                tableCount: result.tables.length,
                keyValuePairCount: result.keyValuePairs.length,
                ...result,
                analysisTimeMs: duration
            });
        } catch (e) {
            monitoring.trackException(e, { context: 'document_extraction' });
            res.status(500).json({ error: e.message });
        }
    }
);

/**
    documentRateLimiter,
 * Extract document content with decision logic analysis
 * POST /api/v1/ai/extract-with-decision-logic
 */
router.post('/extract-with-decision-logic',
    aiRateLimit,
    authenticateToken,
    authorizeRoles('Supplier', 'Admin'),
    upload.single('document'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No document uploaded' });
            }

            const startTime = Date.now();
            const result = await documentIntelligence.parseWithDecisionLogic(req.file.buffer);
            const duration = Date.now() - startTime;

            monitoring.trackEvent('DecisionLogicExtracted', {
                materialCategory: result.decisionLogic.materialCategory,
                relevanceScore: result.decisionLogic.relevanceScore,
                duration: String(duration),
                userId: String(req.user.userId)
            });

            res.json({
                message: 'Document analyzed with decision logic',
                pageCount: result.pages.length,
                ...result,
                analysisTimeMs: duration
            });
        } catch (e) {
            monitoring.trackException(e, { context: 'decision_logic_extraction' });
            res.status(500).json({ error: e.message });
        }
    }
);

/**
 * Analyze a document from Azure Storage URL
 * POST /api/v1/ai/analyze/url
 */
router.post('/analyze/url',
    aiRateLimit,
    authenticateToken,
    authorizeRoles('Admin'),
    async (req, res) => {
        try {
            const { url, type } = req.body;
            
            if (!url) {
                return res.status(400).json({ error: 'Document URL required' });
            }

            const startTime = Date.now();
            let result;

            switch (type) {
                case 'certification':
                    result = await documentIntelligence.parseCertificationDocument(url, req.body.certType || 'general');
                    break;
                case 'epd':
                    result = await documentIntelligence.parseEPDDocument(url);
                    break;
                default:
                    result = await documentIntelligence.extractDocumentContent(url);
            }

            const duration = Date.now() - startTime;

            res.json({
                message: 'Document analyzed from URL',
                url,
                type: type || 'general',
                ...result,
                analysisTimeMs: duration
            });
        } catch (e) {
            monitoring.trackException(e, { context: 'url_document_analysis' });
            res.status(500).json({ error: e.message });
        }
    }
);

/**
 * Batch analyze multiple documents (Admin only)
 * POST /api/v1/ai/batch
 */
router.post('/batch',
    aiRateLimit,
    authenticateToken,
    authorizeRoles('Admin'),
    async (req, res) => {
        try {
            const { documents } = req.body;
            
            if (!documents || !Array.isArray(documents)) {
                return res.status(400).json({ error: 'Documents array required' });
            }

            if (documents.length > 10) {
                return res.status(400).json({ error: 'Maximum 10 documents per batch' });
            }

            const startTime = Date.now();
            const results = await documentIntelligence.batchProcess(documents);
            const duration = Date.now() - startTime;

            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;

            monitoring.trackEvent('BatchAnalysisCompleted', {
                totalDocuments: String(documents.length),
                successful: String(successful),
                failed: String(failed),
                duration: String(duration)
            });

            res.json({
                message: 'Batch analysis complete',
                totalDocuments: documents.length,
                successful,
                failed,
                results,
                analysisTimeMs: duration
            });
        } catch (e) {
            monitoring.trackException(e, { context: 'batch_analysis' });
            res.status(500).json({ error: e.message });
        }
    }
);

/**
 * Check AI service status
 * GET /api/v1/ai/status
 */
router.get('/status',
    aiRateLimit,
    authenticateToken,
    authorizeRoles('Admin'),
    async (req, res) => {
        res.json({
            documentIntelligence: {
                initialized: documentIntelligence.isInitialized(),
                endpoint: process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT ? 'configured' : 'not configured'
            },
            featureFlag: process.env.FEATURE_AI_DOCUMENT_ANALYSIS === 'true'
        });
    }
);

/**
 * Check product defensibility (Anti-Value Engineering)
 * POST /api/v1/ai/check-defensibility
 */
router.post('/check-defensibility',
    aiRateLimit,
    authenticateToken,
    authorizeRoles('Supplier', 'Admin'),
    upload.single('document'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No document uploaded' });
            }

            const { productName, manufacturer } = req.body;
            if (!productName || !manufacturer) {
                return res.status(400).json({ error: 'Product name and manufacturer required' });
            }

            const startTime = Date.now();

            // Extract document content first
            const extracted = await documentIntelligence.extractDocumentContent(req.file.buffer);
            
            // Perform defensibility check
            const result = defensibilityService.performDefensibilityCheck(
                extracted.content,
                productName,
                manufacturer
            );

            const duration = Date.now() - startTime;

            monitoring.trackEvent('DefensibilityCheckCompleted', {
                isDefensible: String(result.isDefensible),
                score: String(result.defensibilityScore),
                hasCDPH: String(result.productData.certificates.hasCDPHv12),
                hasEPD: String(result.productData.certificates.hasVerifiedEPD),
                duration: String(duration),
                userId: String(req.user.userId)
            });

            res.json({
                message: 'Defensibility check complete',
                ...result,
                analysisTimeMs: duration
            });
        } catch (e) {
            monitoring.trackException(e, { context: 'defensibility_check' });
            res.status(500).json({ error: e.message });
        }
    }
);

/**
 * Compare products for "Or Equal" evaluation
 * POST /api/v1/ai/compare-products
 */
router.post('/compare-products',
    aiRateLimit,
    authenticateToken,
    authorizeRoles('Admin', 'Buyer'),
    upload.fields([
        { name: 'originalDocument', maxCount: 1 },
        { name: 'substituteDocument', maxCount: 1 }
    ]),
    async (req, res) => {
        try {
            if (!req.files || !req.files.originalDocument || !req.files.substituteDocument) {
                return res.status(400).json({ error: 'Both original and substitute documents required' });
            }

            const {
                originalName,
                originalManufacturer,
                substituteName,
                substituteManufacturer,
                projectName,
                specSection,
                architect
            } = req.body;

            if (!originalName || !originalManufacturer || !substituteName || !substituteManufacturer) {
                return res.status(400).json({ error: 'Product names and manufacturers required' });
            }

            const startTime = Date.now();

            // Extract content from both documents
            const originalExtracted = await documentIntelligence.extractDocumentContent(
                req.files.originalDocument[0].buffer
            );
            const substituteExtracted = await documentIntelligence.extractDocumentContent(
                req.files.substituteDocument[0].buffer
            );

            // Build product data objects
            const originalData = {
                productName: originalName,
                manufacturer: originalManufacturer,
                certificates: defensibilityService.extractCertificates(originalExtracted.content),
                epdMetrics: defensibilityService.extractEPDMetrics(originalExtracted.content),
                healthMetrics: defensibilityService.extractHealthMetrics(originalExtracted.content)
            };

            const substituteData = {
                productName: substituteName,
                manufacturer: substituteManufacturer,
                certificates: defensibilityService.extractCertificates(substituteExtracted.content),
                epdMetrics: defensibilityService.extractEPDMetrics(substituteExtracted.content),
                healthMetrics: defensibilityService.extractHealthMetrics(substituteExtracted.content)
            };

            const projectContext = projectName ? {
                projectName,
                specSection,
                architect
            } : null;

            // Perform comparison
            const result = await defensibilityService.performOrEqualComparison(
                originalData,
                substituteData,
                projectContext
            );

            const duration = Date.now() - startTime;

            monitoring.trackEvent('OrEqualComparisonCompleted', {
                verdict: result.verdict,
                hasRejectionMemo: String(!!result.rejectionMemo),
                duration: String(duration),
                userId: String(req.user.userId)
            });

            res.json({
                message: '"Or Equal" comparison complete',
                ...result,
                analysisTimeMs: duration
            });
        } catch (e) {
            monitoring.trackException(e, { context: 'or_equal_comparison' });
            res.status(500).json({ error: e.message });
        }
    }
);

module.exports = router;
