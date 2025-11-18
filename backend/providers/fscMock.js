/**
 * FSC Mock Provider
 * 
 * Simulates integration with FSC (Forest Stewardship Council) certification database.
 * In production, this would call FSC's API. For MVP, reads from local JSON file.
 * 
 * Data Source: fsc_sample_data.json (mock data representing FSC certificate database)
 * Target Table: FSC_Certifications
 * 
 * Transformation Logic:
 * - Maps FSC certificate structure to GreenChainz schema
 * - Links certificates to existing suppliers by company name matching
 * - Validates certificate numbers, dates, and status
 */

const BaseProvider = require('./baseProvider');
const fs = require('fs').promises;
const path = require('path');

class FSCMockProvider extends BaseProvider {
    constructor() {
        super('FSC International (Mock)', 'certification');
        this.dataFilePath = path.join(__dirname, 'fsc_sample_data.json');
    }

    /**
     * Fetch FSC certificate data from local JSON file
     * (In production: call FSC API with authentication)
     */
    async fetch(options = {}) {
        try {
            const fileContent = await fs.readFile(this.dataFilePath, 'utf8');
            const data = JSON.parse(fileContent);

            // Apply filters if provided
            let filtered = data;
            if (options.status) {
                filtered = filtered.filter(cert => cert.status === options.status);
            }
            if (options.country) {
                filtered = filtered.filter(cert => cert.contact?.country === options.country);
            }

            return filtered;
        } catch (error) {
            throw new Error(`Failed to fetch FSC data: ${error.message}`);
        }
    }

    /**
     * Transform FSC certificate format to GreenChainz FSC_Certifications schema
     */
    async transform(rawData) {
        return rawData.map(cert => ({
            certificateNumber: cert.certificate_code,
            certificateHolder: cert.certificate_holder,
            certificateType: cert.certificate_type,
            status: cert.status,
            issueDate: cert.issue_date,
            expiryDate: cert.expiry_date,
            standard: cert.standard,
            scope: cert.scope,
            products: cert.products, // PostgreSQL TEXT[] array
            certifiedAreaHectares: cert.certified_area_hectares,
            contactAddress: cert.contact?.address,
            contactCountry: cert.contact?.country,
            contactPhone: cert.contact?.phone,
            contactEmail: cert.contact?.email,
            // Will be linked to SupplierID during insertion
            supplierCompanyName: cert.certificate_holder
        }));
    }

    /**
     * Validate FSC certificate record
     */
    validateRecord(record) {
        const errors = [];

        if (!record.certificateNumber || !record.certificateNumber.startsWith('FSC-C')) {
            errors.push('Invalid FSC certificate number format (must start with FSC-C)');
        }

        if (!record.certificateHolder) {
            errors.push('Certificate holder name is required');
        }

        if (!['Valid', 'Expired', 'Suspended', 'Withdrawn'].includes(record.status)) {
            errors.push(`Invalid status: ${record.status}`);
        }

        if (!record.issueDate || !record.expiryDate) {
            errors.push('Issue date and expiry date are required');
        }

        // Check if expiry date is after issue date
        if (record.issueDate && record.expiryDate) {
            const issue = new Date(record.issueDate);
            const expiry = new Date(record.expiryDate);
            if (expiry <= issue) {
                errors.push('Expiry date must be after issue date');
            }
        }

        if (!['Forest Management', 'Chain of Custody', 'Controlled Wood'].includes(record.certificateType)) {
            errors.push(`Invalid certificate type: ${record.certificateType}`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Insert validated FSC certificates into database
     * Links to Suppliers table by matching company names
     * Optimized: Uses batch lookups and parallel processing
     */
    async insertRecords(validRecords, dbPool) {
        let inserted = 0;
        let updated = 0;
        const errors = [];

        if (validRecords.length === 0) {
            return { inserted, updated, errors };
        }

        // Optimized: Batch fetch all suppliers upfront to avoid N lookups
        const companyNames = [...new Set(validRecords.map(r => r.supplierCompanyName))];
        const supplierLookup = new Map();

        if (companyNames.length > 0) {
            const placeholders = companyNames.map((_, i) => `$${i + 1}`).join(',');
            const supplierQuery = await dbPool.query(
                `SELECT s.SupplierID, c.CompanyName 
                 FROM Suppliers s 
                 JOIN Companies c ON s.CompanyID = c.CompanyID 
                 WHERE LOWER(c.CompanyName) IN (${placeholders})`,
                companyNames.map(name => name.toLowerCase())
            );

            for (const row of supplierQuery.rows) {
                supplierLookup.set(row.companyname.toLowerCase(), row.supplierid);
            }
        }

        // Optimized: Process records in parallel batches (with concurrency limit)
        const BATCH_SIZE = 10; // Process 10 records concurrently
        const batches = [];
        for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
            batches.push(validRecords.slice(i, i + BATCH_SIZE));
        }

        for (const batch of batches) {
            const promises = batch.map(async (record) => {
                try {
                    const supplierId = supplierLookup.get(record.supplierCompanyName.toLowerCase());
                    
                    if (!supplierId) {
                        console.warn(`[FSC] No supplier found for: ${record.supplierCompanyName}`);
                        return { type: 'skipped', certificate: record.certificateNumber };
                    }

                    // Map certificate type to schema (optional)
                    const mappedCertType = record.certificateType === 'Chain of Custody' ? 'FSC CoC' : null;

                    // Insert or update FSC certification
                    const result = await dbPool.query(
                        `INSERT INTO FSC_Certifications (
                            SupplierID, CertificateNumber, CertificateType, CertificateStatus,
                            IssueDate, ExpiryDate, CertifiedArea, AreaUnit, CertifyingBody,
                            LastVerifiedAt, RawAPIResponse
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'hectares', $8, CURRENT_TIMESTAMP, $9::jsonb)
                        ON CONFLICT (CertificateNumber) DO UPDATE SET
                            CertificateStatus = EXCLUDED.CertificateStatus,
                            ExpiryDate = EXCLUDED.ExpiryDate,
                            CertifiedArea = EXCLUDED.CertifiedArea,
                            LastVerifiedAt = CURRENT_TIMESTAMP,
                            UpdatedAt = CURRENT_TIMESTAMP,
                            RawAPIResponse = EXCLUDED.RawAPIResponse
                        RETURNING (xmax = 0) AS inserted`,
                        [
                            supplierId,
                            record.certificateNumber,
                            mappedCertType,
                            record.status,
                            record.issueDate,
                            record.expiryDate,
                            record.certifiedAreaHectares,
                            'FSC International',
                            JSON.stringify(record)
                        ]
                    );

                    return {
                        type: result.rows[0].inserted ? 'inserted' : 'updated',
                        certificate: record.certificateNumber
                    };

                } catch (error) {
                    return {
                        type: 'error',
                        certificate: record.certificateNumber,
                        error: error.message
                    };
                }
            });

            const results = await Promise.all(promises);
            
            // Aggregate results
            for (const result of results) {
                if (result.type === 'inserted') inserted++;
                else if (result.type === 'updated') updated++;
                else if (result.type === 'error') {
                    errors.push({ certificate: result.certificate, error: result.error });
                    console.error(`[FSC] Failed to insert ${result.certificate}:`, result.error);
                }
            }
        }

        if (errors.length > 0) {
            console.warn(`[FSC] Encountered ${errors.length} insertion errors:`, errors);
        }

        return { inserted, updated, errors };
    }
}

module.exports = FSCMockProvider;
