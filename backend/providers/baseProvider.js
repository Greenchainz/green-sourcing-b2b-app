/**
 * Base Provider Interface
 * 
 * Abstract class for external data provider integrations (FSC, MBDC, Building Transparency, etc.)
 * All provider adapters must extend this class and implement its methods.
 * 
 * Workflow:
 * 1. fetch() - Retrieve data from external API or file
 * 2. transform() - Convert to GreenChainz internal schema
 * 3. validate() - Check data integrity and completeness
 * 4. sync() - Orchestrate fetch → transform → validate → insert
 */

class BaseProvider {
    /**
     * @param {string} providerName - Human-readable name (e.g., "FSC International")
     * @param {string} providerType - Category: "certification", "environmental-data", "rating"
     */
    constructor(providerName, providerType) {
        if (this.constructor === BaseProvider) {
            throw new Error("Cannot instantiate abstract class BaseProvider directly");
        }
        this.providerName = providerName;
        this.providerType = providerType;
        this.lastSyncTimestamp = null;
        this.syncStatus = 'idle'; // idle, syncing, success, error
    }

    /**
     * Fetch raw data from external source
     * @abstract
     * @param {Object} options - Provider-specific options (API key, filters, date range)
     * @returns {Promise<Object>} Raw data from provider
     * @throws {Error} If fetch fails
     */
    async fetch(options = {}) {
        throw new Error("Method 'fetch()' must be implemented by provider subclass");
    }

    /**
     * Transform raw provider data to GreenChainz internal format
     * @abstract
     * @param {Object} rawData - Data returned from fetch()
     * @returns {Promise<Array>} Array of objects matching GreenChainz schema
     * @throws {Error} If transformation fails
     */
    async transform(rawData) {
        throw new Error("Method 'transform()' must be implemented by provider subclass");
    }

    /**
     * Validate transformed data before database insertion
     * @param {Array} transformedData - Output from transform()
     * @returns {Promise<Object>} { valid: Array, invalid: Array, errors: Array }
     */
    async validate(transformedData) {
        const results = {
            valid: [],
            invalid: [],
            errors: []
        };

        for (const record of transformedData) {
            try {
                const validation = this.validateRecord(record);
                if (validation.isValid) {
                    results.valid.push(record);
                } else {
                    results.invalid.push(record);
                    results.errors.push({
                        record,
                        errors: validation.errors
                    });
                }
            } catch (e) {
                results.invalid.push(record);
                results.errors.push({
                    record,
                    errors: [e.message]
                });
            }
        }

        return results;
    }

    /**
     * Validate a single record (override in subclass for custom rules)
     * @param {Object} record - Single transformed record
     * @returns {Object} { isValid: boolean, errors: Array }
     */
    validateRecord(record) {
        const errors = [];

        // Basic validation - subclasses should override with specific rules
        if (!record) {
            errors.push("Record is null or undefined");
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Orchestrate full sync workflow: fetch → transform → validate → insert
     * @param {Object} options - Provider-specific options
     * @param {Object} dbPool - PostgreSQL connection pool
     * @returns {Promise<Object>} Sync statistics
     */
    async sync(options = {}, dbPool) {
        this.syncStatus = 'syncing';
        const startTime = Date.now();

        try {
            console.log(`[${this.providerName}] Starting sync...`);

            // Step 1: Fetch raw data
            console.log(`[${this.providerName}] Fetching data...`);
            const rawData = await this.fetch(options);
            console.log(`[${this.providerName}] Fetched ${rawData.length || 0} raw records`);

            // Step 2: Transform to internal format
            console.log(`[${this.providerName}] Transforming data...`);
            const transformedData = await this.transform(rawData);
            console.log(`[${this.providerName}] Transformed ${transformedData.length} records`);

            // Step 3: Validate
            console.log(`[${this.providerName}] Validating data...`);
            const validation = await this.validate(transformedData);
            console.log(`[${this.providerName}] Valid: ${validation.valid.length}, Invalid: ${validation.invalid.length}`);

            // Step 4: Insert valid records (subclass implements insertRecords)
            console.log(`[${this.providerName}] Inserting valid records...`);
            const insertResults = await this.insertRecords(validation.valid, dbPool);

            const endTime = Date.now();
            this.lastSyncTimestamp = new Date().toISOString();
            this.syncStatus = 'success';

            const stats = {
                provider: this.providerName,
                status: 'success',
                duration: endTime - startTime,
                fetched: rawData.length || 0,
                transformed: transformedData.length,
                valid: validation.valid.length,
                invalid: validation.invalid.length,
                inserted: insertResults.inserted,
                updated: insertResults.updated,
                errors: validation.errors,
                timestamp: this.lastSyncTimestamp
            };

            console.log(`[${this.providerName}] Sync completed successfully:`, stats);
            return stats;

        } catch (error) {
            this.syncStatus = 'error';
            console.error(`[${this.providerName}] Sync failed:`, error);
            throw error;
        }
    }

    /**
     * Insert or update validated records in database
     * @abstract
     * @param {Array} validRecords - Records that passed validation
     * @param {Object} dbPool - PostgreSQL connection pool
     * @returns {Promise<Object>} { inserted: number, updated: number }
     */
    async insertRecords(validRecords, dbPool) {
        throw new Error("Method 'insertRecords()' must be implemented by provider subclass");
    }

    /**
     * Get provider status and metadata
     * @returns {Object} Provider info
     */
    getStatus() {
        return {
            name: this.providerName,
            type: this.providerType,
            status: this.syncStatus,
            lastSync: this.lastSyncTimestamp
        };
    }
}

module.exports = BaseProvider;
