/**
 * Verification Scoring Service
 *
 * Computes a trust/verification score for suppliers based on:
 *  - Distinct certification bodies represented (weight 5 each)
 *  - Non-expired certifications (weight 3 each)
 *  - Expired certifications (penalty -2 each)
 *  - Base score of 10
 *  - Cap range 0 - 100
 *
 * Future extensibility:
 *  - External API verified certifications bonus (+4)
 *  - High-impact certifications bonus (e.g., FSC FM vs CoC)
 *  - ESG metrics integration
 */

const MAX_SCORE = 100;
const BASE_SCORE = 10;
const UPSERT_SQL = `INSERT INTO Supplier_Verification_Scores
    (SupplierID, Score, DistinctBodies, NonExpired, Expired, TotalCerts, CalculatedAt)
    VALUES ($1,$2,$3,$4,$5,$6, CURRENT_TIMESTAMP)
    ON CONFLICT (SupplierID) DO UPDATE SET
        Score = EXCLUDED.Score,
        DistinctBodies = EXCLUDED.DistinctBodies,
        NonExpired = EXCLUDED.NonExpired,
        Expired = EXCLUDED.Expired,
        TotalCerts = EXCLUDED.TotalCerts,
        CalculatedAt = CURRENT_TIMESTAMP`;

/**
 * Compute score components for a single supplier.
 * @param {Pool} pool - pg Pool
 * @param {number} supplierId
 * @returns {Promise<{supplierId:number, score:number, components:Object}>}
 */
async function computeSupplierScore(pool, supplierId) {
    // Fetch certification data across internal + FSC tables
    const query = `
    WITH all_certs AS (
      SELECT sc.SupplierID,
             c.CertifyingBody AS body,
             sc.ExpiryDate,
             sc.Status
      FROM Supplier_Certifications sc
      JOIN Certifications c ON sc.CertificationID = c.CertificationID
      WHERE sc.SupplierID = $1

      UNION ALL

      SELECT f.SupplierID,
             f.CertifyingBody AS body,
             f.ExpiryDate,
             f.CertificateStatus AS Status
      FROM FSC_Certifications f
      WHERE f.SupplierID = $1
    )
    SELECT 
      COUNT(*) FILTER (WHERE Status IS NOT NULL) AS total_certs,
      COUNT(DISTINCT body) AS distinct_bodies,
      COUNT(*) FILTER (WHERE (ExpiryDate IS NULL OR ExpiryDate > CURRENT_DATE) AND Status IN ('Valid','Verified')) AS non_expired,
      COUNT(*) FILTER (WHERE ExpiryDate IS NOT NULL AND ExpiryDate <= CURRENT_DATE) AS expired
    FROM all_certs;`;

    const result = await pool.query(query, [supplierId]);
    const row = result.rows[0];

    if (!row) {
        return { supplierId, score: BASE_SCORE, components: { distinctBodies: 0, nonExpired: 0, expired: 0, totalCerts: 0 } };
    }

    const distinctBodies = Number(row.distinct_bodies) || 0;
    const nonExpired = Number(row.non_expired) || 0;
    const expired = Number(row.expired) || 0;
    const totalCerts = Number(row.total_certs) || 0;

    let score = BASE_SCORE + distinctBodies * 5 + nonExpired * 3 - expired * 2;
    if (score < 0) score = 0;
    if (score > MAX_SCORE) score = MAX_SCORE;

    return {
        supplierId,
        score,
        components: {
            distinctBodies,
            nonExpired,
            expired,
            totalCerts,
            base: BASE_SCORE,
            weights: { distinctBody: 5, nonExpired: 3, expired: -2 }
        }
    };
}

/**
 * Compute scores for all suppliers efficiently (single query).
 * @param {Pool} pool
 * @returns {Promise<Array>}
 */
async function computeAllSupplierScores(pool) {
    // Optimized: compute all scores in a single query instead of N+1 queries
    const query = `
    WITH all_certs AS (
      SELECT sc.SupplierID,
             c.CertifyingBody AS body,
             sc.ExpiryDate,
             sc.Status
      FROM Supplier_Certifications sc
      JOIN Certifications c ON sc.CertificationID = c.CertificationID

      UNION ALL

      SELECT f.SupplierID,
             f.CertifyingBody AS body,
             f.ExpiryDate,
             f.CertificateStatus AS Status
      FROM FSC_Certifications f
    )
    SELECT 
      s.SupplierID,
      COALESCE(COUNT(*) FILTER (WHERE ac.Status IS NOT NULL), 0) AS total_certs,
      COALESCE(COUNT(DISTINCT ac.body), 0) AS distinct_bodies,
      COALESCE(COUNT(*) FILTER (WHERE (ac.ExpiryDate IS NULL OR ac.ExpiryDate > CURRENT_DATE) AND ac.Status IN ('Valid','Verified')), 0) AS non_expired,
      COALESCE(COUNT(*) FILTER (WHERE ac.ExpiryDate IS NOT NULL AND ac.ExpiryDate <= CURRENT_DATE), 0) AS expired
    FROM Suppliers s
    LEFT JOIN all_certs ac ON s.SupplierID = ac.SupplierID
    GROUP BY s.SupplierID
    ORDER BY s.SupplierID;`;

    const result = await pool.query(query);
    
    return result.rows.map(row => {
        const distinctBodies = Number(row.distinct_bodies) || 0;
        const nonExpired = Number(row.non_expired) || 0;
        const expired = Number(row.expired) || 0;
        const totalCerts = Number(row.total_certs) || 0;

        let score = BASE_SCORE + distinctBodies * 5 + nonExpired * 3 - expired * 2;
        if (score < 0) score = 0;
        if (score > MAX_SCORE) score = MAX_SCORE;

        return {
            supplierId: row.supplierid,
            score,
            components: {
                distinctBodies,
                nonExpired,
                expired,
                totalCerts,
                base: BASE_SCORE,
                weights: { distinctBody: 5, nonExpired: 3, expired: -2 }
            }
        };
    });
}

/**
 * Persist a single supplier score row.
 * @param {Pool} pool
 * @param {object} scoreData - output from computeSupplierScore
 */
async function persistSupplierScore(pool, scoreData) {
    const c = scoreData.components;
    await pool.query(UPSERT_SQL, [
        scoreData.supplierId,
        scoreData.score,
        c.distinctBodies,
        c.nonExpired,
        c.expired,
        c.totalCerts
    ]);
    return { supplierId: scoreData.supplierId, persisted: true };
}

/**
 * Compute and persist all supplier scores efficiently using batch insert.
 * @param {Pool} pool
 */
async function persistAllSupplierScores(pool) {
    const all = await computeAllSupplierScores(pool);
    
    if (all.length === 0) {
        return { count: 0, timestamp: new Date().toISOString() };
    }

    // Optimized: Use a single batch upsert instead of sequential queries
    const values = [];
    const params = [];
    let paramIndex = 1;

    for (const s of all) {
        const c = s.components;
        values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, CURRENT_TIMESTAMP)`);
        params.push(s.supplierId, s.score, c.distinctBodies, c.nonExpired, c.expired, c.totalCerts);
        paramIndex += 6;
    }

    const batchUpsertSQL = `
        INSERT INTO Supplier_Verification_Scores
            (SupplierID, Score, DistinctBodies, NonExpired, Expired, TotalCerts, CalculatedAt)
        VALUES ${values.join(', ')}
        ON CONFLICT (SupplierID) DO UPDATE SET
            Score = EXCLUDED.Score,
            DistinctBodies = EXCLUDED.DistinctBodies,
            NonExpired = EXCLUDED.NonExpired,
            Expired = EXCLUDED.Expired,
            TotalCerts = EXCLUDED.TotalCerts,
            CalculatedAt = CURRENT_TIMESTAMP
    `;

    await pool.query(batchUpsertSQL, params);
    return { count: all.length, timestamp: new Date().toISOString() };
}

/**
 * Get persisted score (fallback to compute if not stored).
 */
async function getPersistedOrLiveScore(pool, supplierId) {
    const res = await pool.query('SELECT * FROM Supplier_Verification_Scores WHERE SupplierID = $1', [supplierId]);
    if (res.rows.length) {
        const r = res.rows[0];
        return {
            supplierId: r.supplierid,
            score: r.score,
            components: {
                distinctBodies: r.distinctbodies,
                nonExpired: r.nonexpired,
                expired: r.expired,
                totalCerts: r.totalcerts,
                base: BASE_SCORE,
                weights: { distinctBody: 5, nonExpired: 3, expired: -2 }
            },
            persisted: true,
            calculatedAt: r.calculatedat
        };
    }
    const live = await computeSupplierScore(pool, supplierId);
    return { ...live, persisted: false };
}

module.exports = {
    computeSupplierScore,
    computeAllSupplierScores,
    persistSupplierScore,
    persistAllSupplierScores,
    getPersistedOrLiveScore
};
