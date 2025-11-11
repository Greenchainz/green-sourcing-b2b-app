// FILE: backend/eventLogger.js
// PURPOSE: Event Sourcing Architecture - Blockchain-Ready Immutable Event Logger
// This creates an append-only log that will migrate to Hyperledger Fabric in Phase 2

const crypto = require('crypto');

/**
 * Generate SHA-256 hash for event integrity
 * @param {Object} eventData - Event data to hash
 * @returns {String} - Hex hash
 */
function generateEventHash(eventData) {
    const dataString = JSON.stringify(eventData);
    return crypto.createHash('sha256').update(dataString).digest('hex');
}

/**
 * Log a product event (immutable audit trail)
 * @param {Object} client - PostgreSQL client
 * @param {Number} productId - Product ID
 * @param {String} eventType - Event type (CREATED, UPDATED, CERTIFIED, etc.)
 * @param {Object} eventData - Event payload (JSONB)
 * @param {Number} userId - User who triggered the event
 * @param {String} ipAddress - IP address
 * @returns {Object} - Event record
 */
async function logProductEvent(client, productId, eventType, eventData, userId = null, ipAddress = null) {
    try {
        // Get previous event hash for chain integrity
        const prevEventResult = await client.query(
            'SELECT EventHash FROM Product_Events WHERE ProductID = $1 ORDER BY Timestamp DESC LIMIT 1',
            [productId]
        );
        const previousEventHash = prevEventResult.rowCount > 0 ? prevEventResult.rows[0].eventhash : null;

        // Generate hash for this event
        const eventPayload = {
            productId,
            eventType,
            eventData,
            timestamp: new Date().toISOString(),
            previousEventHash
        };
        const eventHash = generateEventHash(eventPayload);

        // Insert event (immutable - never update)
        const result = await client.query(
            `INSERT INTO Product_Events (ProductID, EventType, EventData, EventHash, PreviousEventHash, UserID, IPAddress)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING EventID, Timestamp`,
            [productId, eventType, JSON.stringify(eventData), eventHash, previousEventHash, userId, ipAddress]
        );

        return {
            eventId: result.rows[0].eventid,
            timestamp: result.rows[0].timestamp,
            eventHash,
            previousEventHash
        };
    } catch (err) {
        console.error('Error logging product event:', err);
        throw err;
    }
}

/**
 * Log a certification event (chain of custody for certifications)
 * @param {Object} client - PostgreSQL client
 * @param {Number} certificationId - Certification ID
 * @param {Number} supplierId - Supplier ID
 * @param {String} eventType - Event type (ISSUED, API_VERIFIED, EXPIRED, etc.)
 * @param {Object} eventData - Event payload (JSONB)
 * @param {String} verificationSource - API source (FSC_API, B_CORP_API, etc.)
 * @param {Number} userId - User who triggered the event
 * @param {String} ipAddress - IP address
 * @returns {Object} - Event record
 */
async function logCertificationEvent(client, certificationId, supplierId, eventType, eventData, verificationSource = null, userId = null, ipAddress = null) {
    try {
        // Get previous event hash for chain integrity
        const prevEventResult = await client.query(
            'SELECT EventHash FROM Certification_Events WHERE CertificationID = $1 ORDER BY Timestamp DESC LIMIT 1',
            [certificationId]
        );
        const previousEventHash = prevEventResult.rowCount > 0 ? prevEventResult.rows[0].eventhash : null;

        // Generate hash for this event
        const eventPayload = {
            certificationId,
            supplierId,
            eventType,
            eventData,
            verificationSource,
            timestamp: new Date().toISOString(),
            previousEventHash
        };
        const eventHash = generateEventHash(eventPayload);

        // Insert event (immutable)
        const result = await client.query(
            `INSERT INTO Certification_Events (CertificationID, SupplierID, EventType, EventData, EventHash, PreviousEventHash, VerificationSource, UserID, IPAddress)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING EventID, Timestamp`,
            [certificationId, supplierId, eventType, JSON.stringify(eventData), eventHash, previousEventHash, verificationSource, userId, ipAddress]
        );

        return {
            eventId: result.rows[0].eventid,
            timestamp: result.rows[0].timestamp,
            eventHash,
            previousEventHash
        };
    } catch (err) {
        console.error('Error logging certification event:', err);
        throw err;
    }
}

/**
 * Log a supply chain event (provenance tracking - Phase 2)
 * @param {Object} client - PostgreSQL client
 * @param {Number} productId - Product ID
 * @param {Number} supplierId - Supplier ID
 * @param {String} eventType - Event type (HARVESTED, SHIPPED, RECEIVED, etc.)
 * @param {Object} eventData - Event payload (JSONB)
 * @param {String} batchNumber - Batch/lot number
 * @param {Object} geolocation - {lat, lon} coordinates
 * @param {Number} userId - User who triggered the event
 * @param {String} ipAddress - IP address
 * @returns {Object} - Event record
 */
async function logSupplyChainEvent(client, productId, supplierId, eventType, eventData, batchNumber = null, geolocation = null, userId = null, ipAddress = null) {
    try {
        // Get previous event hash for chain integrity
        const prevEventResult = await client.query(
            'SELECT EventHash FROM Supply_Chain_Events WHERE ProductID = $1 AND BatchNumber = $2 ORDER BY Timestamp DESC LIMIT 1',
            [productId, batchNumber]
        );
        const previousEventHash = prevEventResult.rowCount > 0 ? prevEventResult.rows[0].eventhash : null;

        // Generate hash for this event
        const eventPayload = {
            productId,
            supplierId,
            batchNumber,
            eventType,
            eventData,
            geolocation,
            timestamp: new Date().toISOString(),
            previousEventHash
        };
        const eventHash = generateEventHash(eventPayload);

        // Insert event (immutable)
        const result = await client.query(
            `INSERT INTO Supply_Chain_Events (ProductID, SupplierID, BatchNumber, EventType, EventData, EventHash, PreviousEventHash, GeolocationLat, GeolocationLon, UserID, IPAddress)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING EventID, Timestamp`,
            [
                productId,
                supplierId,
                batchNumber,
                eventType,
                JSON.stringify(eventData),
                eventHash,
                previousEventHash,
                geolocation?.lat || null,
                geolocation?.lon || null,
                userId,
                ipAddress
            ]
        );

        return {
            eventId: result.rows[0].eventid,
            timestamp: result.rows[0].timestamp,
            eventHash,
            previousEventHash
        };
    } catch (err) {
        console.error('Error logging supply chain event:', err);
        throw err;
    }
}

/**
 * Log API verification (external data source integration)
 * @param {Object} client - PostgreSQL client
 * @param {String} entityType - 'Certification', 'Supplier', or 'Product'
 * @param {Number} entityId - Entity ID
 * @param {String} apiProvider - API provider name (FSC_API, B_CORP_API, etc.)
 * @param {String} apiEndpoint - API endpoint called
 * @param {Object} requestPayload - Request sent to API
 * @param {Object} responsePayload - Response from API
 * @param {String} verificationStatus - VERIFIED, FAILED, PENDING, ERROR
 * @returns {Object} - Verification record
 */
async function logAPIVerification(client, entityType, entityId, apiProvider, apiEndpoint, requestPayload, responsePayload, verificationStatus) {
    try {
        const eventPayload = {
            entityType,
            entityId,
            apiProvider,
            verificationStatus,
            timestamp: new Date().toISOString()
        };
        const eventHash = generateEventHash(eventPayload);

        const result = await client.query(
            `INSERT INTO API_Verification_Log (EntityType, EntityID, APIProvider, APIEndpoint, RequestPayload, ResponsePayload, VerificationStatus, EventHash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING VerificationID, Timestamp`,
            [
                entityType,
                entityId,
                apiProvider,
                apiEndpoint,
                JSON.stringify(requestPayload),
                JSON.stringify(responsePayload),
                verificationStatus,
                eventHash
            ]
        );

        return {
            verificationId: result.rows[0].verificationid,
            timestamp: result.rows[0].timestamp,
            eventHash
        };
    } catch (err) {
        console.error('Error logging API verification:', err);
        throw err;
    }
}

/**
 * Verify event chain integrity (detect tampering)
 * @param {Object} client - PostgreSQL client
 * @param {Number} productId - Product ID to verify
 * @returns {Boolean} - True if chain is valid
 */
async function verifyProductEventChain(client, productId) {
    try {
        const result = await client.query(
            'SELECT EventID, EventHash, PreviousEventHash, ProductID, EventType, EventData, Timestamp FROM Product_Events WHERE ProductID = $1 ORDER BY Timestamp ASC',
            [productId]
        );

        const events = result.rows;
        let previousHash = null;

        for (const event of events) {
            // Verify previous hash matches
            if (event.previouseventhash !== previousHash) {
                console.error(`Chain integrity violation at EventID ${event.eventid}`);
                return false;
            }

            // Recalculate hash and verify
            const eventPayload = {
                productId: event.productid,
                eventType: event.eventtype,
                eventData: event.eventdata,
                timestamp: event.timestamp.toISOString(),
                previousEventHash: event.previouseventhash
            };
            const calculatedHash = generateEventHash(eventPayload);

            if (calculatedHash !== event.eventhash) {
                console.error(`Hash mismatch at EventID ${event.eventid}: expected ${event.eventhash}, got ${calculatedHash}`);
                return false;
            }

            previousHash = event.eventhash;
        }

        return true;
    } catch (err) {
        console.error('Error verifying event chain:', err);
        return false;
    }
}

module.exports = {
    logProductEvent,
    logCertificationEvent,
    logSupplyChainEvent,
    logAPIVerification,
    verifyProductEventChain
};
