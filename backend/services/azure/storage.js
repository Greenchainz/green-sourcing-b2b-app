/**
 * Azure Blob Storage Integration
 * Resource: revitfiles (rg-greenchainz)
 * 
 * Used for:
 * - Certification document uploads
 * - Product images
 * - EPD/LCA PDF storage
 * - RFQ attachments
 */

const { BlobServiceClient } = require('@azure/storage-blob');
const { DefaultAzureCredential } = require('@azure/identity');
const path = require('path');
const crypto = require('crypto');

let blobServiceClient = null;
let containerClient = null;
let isInitialized = false;

const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || 'greenchainz-uploads';
const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv'
];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Initialize Azure Storage
 */
async function initialize() {
    if (isInitialized) return;

    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;

    try {
        if (connectionString) {
            blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        } else if (accountName) {
            // Use Managed Identity
            const credential = new DefaultAzureCredential();
            blobServiceClient = new BlobServiceClient(
                `https://${accountName}.blob.core.windows.net`,
                credential
            );
        } else {
            console.warn('Azure Storage not configured');
            return;
        }

        containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
        
        // Create container if it doesn't exist
        await containerClient.createIfNotExists({
            access: 'blob' // Public read access for blobs
        });

        isInitialized = true;
    } catch (e) {
        console.warn('Failed to initialize Azure Storage:', e.message);
    }
}

/**
 * Generate a unique blob name
 */
function generateBlobName(originalName, folder = 'general') {
    const ext = path.extname(originalName);
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `${folder}/${timestamp}-${random}${ext}`;
}

/**
 * Upload a file to blob storage
 */
async function uploadFile(buffer, originalName, mimeType, folder = 'general', metadata = {}) {
    if (!containerClient) {
        throw new Error('Azure Storage not initialized');
    }

    // Validate file
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        throw new Error(`File type not allowed: ${mimeType}`);
    }
    
    if (buffer.length > MAX_FILE_SIZE) {
        throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    const blobName = generateBlobName(originalName, folder);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(buffer, {
        blobHTTPHeaders: {
            blobContentType: mimeType
        },
        metadata: {
            originalName,
            uploadedAt: new Date().toISOString(),
            ...metadata
        }
    });

    return {
        blobName,
        url: blockBlobClient.url,
        size: buffer.length
    };
}

/**
 * Upload a product image
 */
async function uploadProductImage(buffer, originalName, mimeType, productId) {
    return uploadFile(buffer, originalName, mimeType, `products/${productId}`, {
        productId: String(productId)
    });
}

/**
 * Upload a certification document
 */
async function uploadCertificationDoc(buffer, originalName, mimeType, supplierId, certType) {
    return uploadFile(buffer, originalName, mimeType, `certifications/${supplierId}`, {
        supplierId: String(supplierId),
        certificationType: certType
    });
}

/**
 * Upload an EPD or LCA document
 */
async function uploadEPDDocument(buffer, originalName, mimeType, productId) {
    return uploadFile(buffer, originalName, mimeType, `epds/${productId}`, {
        productId: String(productId),
        documentType: 'EPD'
    });
}

/**
 * Upload an RFQ attachment
 */
async function uploadRFQAttachment(buffer, originalName, mimeType, rfqId) {
    return uploadFile(buffer, originalName, mimeType, `rfqs/${rfqId}`, {
        rfqId: String(rfqId)
    });
}

/**
 * Get a blob URL (public)
 */
function getBlobUrl(blobName) {
    if (!containerClient) return null;
    return containerClient.getBlockBlobClient(blobName).url;
}

/**
 * Get a SAS URL for temporary access
 */
async function getSasUrl(blobName, expiresInMinutes = 60) {
    if (!containerClient) return null;

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    const expiresOn = new Date();
    expiresOn.setMinutes(expiresOn.getMinutes() + expiresInMinutes);

    const sasUrl = await blockBlobClient.generateSasUrl({
        permissions: 'r', // Read only
        expiresOn
    });

    return sasUrl;
}

/**
 * Delete a blob
 */
async function deleteFile(blobName) {
    if (!containerClient) {
        throw new Error('Azure Storage not initialized');
    }

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.deleteIfExists();
    return true;
}

/**
 * List blobs in a folder
 */
async function listFiles(folder) {
    if (!containerClient) return [];

    const blobs = [];
    
    for await (const blob of containerClient.listBlobsFlat({ prefix: folder })) {
        blobs.push({
            name: blob.name,
            size: blob.properties.contentLength,
            contentType: blob.properties.contentType,
            lastModified: blob.properties.lastModified,
            url: getBlobUrl(blob.name)
        });
    }

    return blobs;
}

/**
 * Check if a blob exists
 */
async function exists(blobName) {
    if (!containerClient) return false;
    
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    return await blockBlobClient.exists();
}

/**
 * Get blob metadata
 */
async function getMetadata(blobName) {
    if (!containerClient) return null;
    
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const properties = await blockBlobClient.getProperties();
    
    return {
        contentType: properties.contentType,
        contentLength: properties.contentLength,
        lastModified: properties.lastModified,
        metadata: properties.metadata
    };
}

module.exports = {
    initialize,
    uploadFile,
    uploadProductImage,
    uploadCertificationDoc,
    uploadEPDDocument,
    uploadRFQAttachment,
    getBlobUrl,
    getSasUrl,
    deleteFile,
    listFiles,
    exists,
    getMetadata,
    isInitialized: () => isInitialized
};
