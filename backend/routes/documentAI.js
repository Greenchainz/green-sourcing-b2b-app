/**
 * Document AI Routes
 * Uses Azure AI Document Intelligence for document analysis
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const documentIntelligence = require('../services/azure/documentIntelligence');
const storage = require('../services/azure/storage');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const monitoring = require('../services/azure/monitoring');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }
});

/**
 * Analyze a certification document
 * POST /api/v1/ai/analyze/certification
 */
router.post('/analyze/certification',
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

/**
 * Extract text content from any document
 * POST /api/v1/ai/extract
 */
router.post('/extract',
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
 * Analyze a document from Azure Storage URL
 * POST /api/v1/ai/analyze/url
 */
router.post('/analyze/url',
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

module.exports = router;
