/**
 * File Upload Routes
 * Uses Azure Blob Storage for file storage
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const storage = require('../services/azure/storage');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { upload: uploadRateLimit } = require('../middleware/rateLimit');
const monitoring = require('../services/azure/monitoring');

// Configure multer for memory storage (we'll stream to Azure)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
        files: 5 // Max 5 files at once
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`File type not allowed: ${file.mimetype}`), false);
        }
    }
});

/**
 * Upload product image
 * POST /api/v1/uploads/product/:productId/image
 */
router.post('/product/:productId/image',
    authenticateToken,
    authorizeRoles('Supplier', 'Admin'),
    uploadRateLimit,
    upload.single('image'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            const result = await storage.uploadProductImage(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype,
                req.params.productId
            );

            monitoring.trackEvent('ProductImageUploaded', {
                productId: req.params.productId,
                userId: String(req.user.userId),
                fileSize: String(req.file.size)
            });

            res.status(201).json({
                message: 'Product image uploaded successfully',
                ...result
            });
        } catch (e) {
            monitoring.trackException(e, { context: 'product_image_upload' });
            res.status(500).json({ error: e.message });
        }
    }
);

/**
 * Upload certification document
 * POST /api/v1/uploads/certification/:supplierId
 */
router.post('/certification/:supplierId',
    authenticateToken,
    authorizeRoles('Supplier', 'Admin'),
    uploadRateLimit,
    upload.single('document'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            const certType = req.body.certificationType || 'general';

            const result = await storage.uploadCertificationDoc(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype,
                req.params.supplierId,
                certType
            );

            monitoring.trackEvent('CertificationUploaded', {
                supplierId: req.params.supplierId,
                certificationType: certType,
                userId: String(req.user.userId)
            });

            res.status(201).json({
                message: 'Certification document uploaded successfully',
                certificationType: certType,
                ...result
            });
        } catch (e) {
            monitoring.trackException(e, { context: 'certification_upload' });
            res.status(500).json({ error: e.message });
        }
    }
);

/**
 * Upload EPD document
 * POST /api/v1/uploads/epd/:productId
 */
router.post('/epd/:productId',
    authenticateToken,
    authorizeRoles('Supplier', 'Admin'),
    uploadRateLimit,
    upload.single('document'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            const result = await storage.uploadEPDDocument(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype,
                req.params.productId
            );

            monitoring.trackEvent('EPDDocumentUploaded', {
                productId: req.params.productId,
                userId: String(req.user.userId)
            });

            res.status(201).json({
                message: 'EPD document uploaded successfully',
                ...result
            });
        } catch (e) {
            monitoring.trackException(e, { context: 'epd_upload' });
            res.status(500).json({ error: e.message });
        }
    }
);

/**
 * Upload RFQ attachment
 * POST /api/v1/uploads/rfq/:rfqId/attachment
 */
router.post('/rfq/:rfqId/attachment',
    authenticateToken,
    uploadRateLimit,
    upload.array('attachments', 5),
    async (req, res) => {
        try {
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ error: 'No files uploaded' });
            }

            const results = await Promise.all(
                req.files.map(file => 
                    storage.uploadRFQAttachment(
                        file.buffer,
                        file.originalname,
                        file.mimetype,
                        req.params.rfqId
                    )
                )
            );

            monitoring.trackEvent('RFQAttachmentsUploaded', {
                rfqId: req.params.rfqId,
                fileCount: String(req.files.length),
                userId: String(req.user.userId)
            });

            res.status(201).json({
                message: `${results.length} attachment(s) uploaded successfully`,
                attachments: results
            });
        } catch (e) {
            monitoring.trackException(e, { context: 'rfq_attachment_upload' });
            res.status(500).json({ error: e.message });
        }
    }
);

/**
 * List files for a supplier
 * GET /api/v1/uploads/supplier/:supplierId/files
 */
router.get('/supplier/:supplierId/files',
    authenticateToken,
    async (req, res) => {
        try {
            const [certifications, products] = await Promise.all([
                storage.listFiles(`certifications/${req.params.supplierId}`),
                storage.listFiles(`products/${req.params.supplierId}`)
            ]);

            res.json({
                supplierId: req.params.supplierId,
                certifications,
                products,
                totalFiles: certifications.length + products.length
            });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }
);

/**
 * Delete a file
 * DELETE /api/v1/uploads/:blobName
 */
router.delete('/:blobName(*)',
    authenticateToken,
    authorizeRoles('Supplier', 'Admin'),
    async (req, res) => {
        try {
            await storage.deleteFile(req.params.blobName);
            
            monitoring.trackEvent('FileDeleted', {
                blobName: req.params.blobName,
                userId: String(req.user.userId)
            });

            res.json({ message: 'File deleted successfully' });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }
);

/**
 * Get a temporary signed URL for a file
 * GET /api/v1/uploads/sas/:blobName
 */
router.get('/sas/:blobName(*)',
    authenticateToken,
    uploadRateLimit,
    async (req, res) => {
        try {
            let expiresInMinutes = 60;
            const expiresParam = req.query.expires;

            // Ensure expires is a single string value and a valid positive integer
            if (typeof expiresParam === 'string' && !Array.isArray(expiresParam)) {
                const parsed = Number.parseInt(expiresParam, 10);
                if (Number.isFinite(parsed) && parsed > 0 && parsed <= 1440) {
                    expiresInMinutes = parsed;
                }
            }

            const sasUrl = await storage.getSasUrl(req.params.blobName, expiresInMinutes);
            
            if (!sasUrl) {
                return res.status(404).json({ error: 'File not found' });
            }

            res.json({
                url: sasUrl,
                expiresIn: `${expiresInMinutes} minutes`
            });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }
);

module.exports = router;
