/**
 * Azure AI Document Intelligence Integration
 * Resource: greenchainz-content-intel (greenchainz-ai)
 * 
 * Used for:
 * - Extracting data from certification PDFs
 * - Processing EPD documents
 * - Reading FSC/LEED/BREEAM certificates
 * - Automated verification of supplier documents
 */

const { DocumentAnalysisClient, AzureKeyCredential } = require('@azure/ai-form-recognizer');

let client = null;
let isInitialized = false;

/**
 * Initialize Document Intelligence client
 */
async function initialize() {
    if (isInitialized) return;

    const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
    const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;

    if (!endpoint || !key) {
        console.warn('Azure Document Intelligence not configured (AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT / AZURE_DOCUMENT_INTELLIGENCE_KEY)');
        return;
    }

    try {
        client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(key));
        isInitialized = true;
    } catch (e) {
        console.warn('Failed to initialize Document Intelligence:', e.message);
    }
}

/**
 * Analyze a document using a prebuilt model
 * @param {Buffer|string} source - Document buffer or URL
 * @param {string} modelId - Model to use (e.g., 'prebuilt-document', 'prebuilt-invoice')
 */
async function analyzeDocument(source, modelId = 'prebuilt-document') {
    if (!client) {
        throw new Error('Document Intelligence not initialized');
    }

    const poller = typeof source === 'string'
        ? await client.beginAnalyzeDocumentFromUrl(modelId, source)
        : await client.beginAnalyzeDocument(modelId, source);

    const result = await poller.pollUntilDone();
    return result;
}

/**
 * Extract text and structure from a general document
 */
async function extractDocumentContent(source) {
    const result = await analyzeDocument(source, 'prebuilt-document');
    
    return {
        content: result.content,
        pages: result.pages?.map(page => ({
            pageNumber: page.pageNumber,
            width: page.width,
            height: page.height,
            lines: page.lines?.map(line => line.content) || []
        })) || [],
        tables: result.tables?.map(table => ({
            rowCount: table.rowCount,
            columnCount: table.columnCount,
            cells: table.cells?.map(cell => ({
                rowIndex: cell.rowIndex,
                columnIndex: cell.columnIndex,
                content: cell.content
            })) || []
        })) || [],
        keyValuePairs: result.keyValuePairs?.map(kvp => ({
            key: kvp.key?.content,
            value: kvp.value?.content,
            confidence: kvp.confidence
        })) || []
    };
}

/**
 * Parse a certification document (FSC, LEED, BREEAM, etc.)
 * Returns extracted certification details
 */
async function parseCertificationDocument(source, certificationType) {
    const extracted = await extractDocumentContent(source);
    
    // Common fields to look for
    const patterns = {
        certificateNumber: /certificate\s*(?:number|no|#)[\s:]*([A-Z0-9-]+)/i,
        issueDate: /(?:issue|issued)\s*(?:date)?[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        expiryDate: /(?:expiry|expires|expiration|valid\s*until)[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        companyName: /(?:company|organization|certificate\s*holder)[\s:]*([A-Za-z0-9\s&.,]+)/i,
        certifyingBody: /(?:issued\s*by|certifying\s*body|certification\s*body)[\s:]*([A-Za-z0-9\s&.,]+)/i
    };

    const content = extracted.content.toLowerCase();
    const result = {
        certificationType,
        rawContent: extracted.content,
        extractedData: {},
        confidence: 0
    };

    // Extract known patterns
    for (const [field, pattern] of Object.entries(patterns)) {
        const match = extracted.content.match(pattern);
        if (match) {
            result.extractedData[field] = match[1].trim();
        }
    }

    // Type-specific parsing
    if (certificationType === 'FSC') {
        result.extractedData.fscType = content.includes('chain of custody') ? 'CoC' 
            : content.includes('forest management') ? 'FM' : 'Unknown';
    } else if (certificationType === 'LEED') {
        const levelMatch = content.match(/leed\s*(platinum|gold|silver|certified)/i);
        if (levelMatch) {
            result.extractedData.leedLevel = levelMatch[1];
        }
    } else if (certificationType === 'BREEAM') {
        const ratingMatch = content.match(/breeam\s*(outstanding|excellent|very\s*good|good|pass)/i);
        if (ratingMatch) {
            result.extractedData.breeamRating = ratingMatch[1];
        }
    }

    // Calculate confidence based on fields found
    const fieldsFound = Object.keys(result.extractedData).length;
    result.confidence = Math.min(fieldsFound * 20, 100);

    return result;
}

/**
 * Parse an EPD (Environmental Product Declaration) document
 */
async function parseEPDDocument(source) {
    const extracted = await extractDocumentContent(source);
    
    const result = {
        documentType: 'EPD',
        rawContent: extracted.content,
        extractedData: {},
        environmentalMetrics: {}
    };

    // EPD-specific patterns
    const patterns = {
        declarationNumber: /declaration\s*(?:number|no)[\s:]*([A-Z0-9-]+)/i,
        productName: /product\s*(?:name)?[\s:]*([^\n]+)/i,
        manufacturer: /manufacturer[\s:]*([^\n]+)/i,
        validFrom: /valid\s*from[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        validTo: /valid\s*(?:to|until)[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        programOperator: /program\s*operator[\s:]*([^\n]+)/i
    };

    for (const [field, pattern] of Object.entries(patterns)) {
        const match = extracted.content.match(pattern);
        if (match) {
            result.extractedData[field] = match[1].trim();
        }
    }

    // Try to extract environmental metrics (GWP, etc.)
    const gwpMatch = extracted.content.match(/(?:gwp|global\s*warming\s*potential)[\s:]*([0-9.]+)\s*(?:kg\s*co2|kgco2)/i);
    if (gwpMatch) {
        result.environmentalMetrics.gwp = parseFloat(gwpMatch[1]);
        result.environmentalMetrics.gwpUnit = 'kg CO2 eq';
    }

    // Extract from tables if available
    if (extracted.tables.length > 0) {
        result.tables = extracted.tables;
    }

    return result;
}

/**
 * Verify a document's authenticity indicators
 * Returns a verification score and flags
 */
async function verifyDocumentAuthenticity(source) {
    const extracted = await extractDocumentContent(source);
    
    const checks = {
        hasQRCode: false,
        hasDigitalSignature: false,
        hasOfficialLogo: false,
        hasValidDates: false,
        hasIssuerInfo: false,
        textQuality: 'unknown'
    };

    const content = extracted.content.toLowerCase();

    // Check for authenticity indicators
    checks.hasValidDates = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(content);
    checks.hasIssuerInfo = /(?:issued\s*by|certifying\s*body|authorized)/i.test(content);
    
    // Text quality assessment
    const avgConfidence = extracted.keyValuePairs.reduce((sum, kvp) => sum + (kvp.confidence || 0), 0) 
        / (extracted.keyValuePairs.length || 1);
    checks.textQuality = avgConfidence > 0.9 ? 'high' : avgConfidence > 0.7 ? 'medium' : 'low';

    // Calculate overall score
    let score = 0;
    if (checks.hasValidDates) score += 25;
    if (checks.hasIssuerInfo) score += 25;
    if (checks.textQuality === 'high') score += 30;
    else if (checks.textQuality === 'medium') score += 15;

    return {
        score,
        checks,
        recommendation: score >= 70 ? 'Document appears legitimate' 
            : score >= 40 ? 'Manual review recommended'
            : 'Document may require verification'
    };
}

/**
 * Batch process multiple documents
 */
async function batchProcess(documents, processFn = extractDocumentContent) {
    const results = await Promise.allSettled(
        documents.map(async (doc) => {
            try {
                return await processFn(doc.source);
            } catch (e) {
                return { error: e.message };
            }
        })
    );

    return results.map((result, index) => ({
        documentId: documents[index].id,
        status: result.status,
        data: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason?.message : null
    }));
}

module.exports = {
    initialize,
    analyzeDocument,
    extractDocumentContent,
    parseCertificationDocument,
    parseEPDDocument,
    verifyDocumentAuthenticity,
    batchProcess,
    isInitialized: () => isInitialized
};
