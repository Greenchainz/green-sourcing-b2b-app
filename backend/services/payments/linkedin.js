/**
 * LinkedIn OAuth Service
 * 
 * Handles LinkedIn OAuth for buyer verification:
 * - Generate OAuth authorization URL
 * - Exchange authorization code for access token
 * - Fetch user profile data
 * - Store verification in database
 * 
 * Environment Variables Required:
 * - LINKEDIN_CLIENT_ID: LinkedIn OAuth app client ID
 * - LINKEDIN_CLIENT_SECRET: LinkedIn OAuth app client secret
 * - LINKEDIN_REDIRECT_URI: OAuth callback URL (e.g., https://api.greenchainz.com/api/v1/payments/linkedin/callback)
 */

const axios = require('axios');
const crypto = require('crypto');
const { pool } = require('../../db');

// LinkedIn OAuth endpoints
const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_PROFILE_URL = 'https://api.linkedin.com/v2/userinfo';

// Required OAuth scopes for profile access
const LINKEDIN_SCOPES = ['openid', 'profile', 'email'];

/**
 * Generates a LinkedIn OAuth authorization URL
 * 
 * @param {string} state - CSRF protection state parameter (should be stored in session)
 * @returns {string} LinkedIn authorization URL
 */
function getAuthorizationUrl(state) {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

    if (!clientId) {
        throw new Error('LINKEDIN_CLIENT_ID environment variable is required');
    }
    if (!redirectUri) {
        throw new Error('LINKEDIN_REDIRECT_URI environment variable is required');
    }

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        state: state,
        scope: LINKEDIN_SCOPES.join(' ')
    });

    return `${LINKEDIN_AUTH_URL}?${params.toString()}`;
}

/**
 * Generates a cryptographically secure state parameter
 * 
 * @returns {string} Random state string
 */
function generateState() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Exchanges an authorization code for an access token
 * 
 * @param {string} code - Authorization code from LinkedIn callback
 * @returns {Promise<{access_token: string, expires_in: number}>}
 */
async function exchangeCodeForToken(code) {
    if (!code) {
        throw new Error('Authorization code is required');
    }

    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

    if (!clientId || !clientSecret) {
        throw new Error('LinkedIn OAuth credentials not configured');
    }

    const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
    });

    try {
        const response = await axios.post(LINKEDIN_TOKEN_URL, params.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            timeout: 15000
        });

        return {
            access_token: response.data.access_token,
            expires_in: response.data.expires_in
        };
    } catch (error) {
        const errorMessage = error.response?.data?.error_description || 
                            error.response?.data?.error || 
                            error.message;
        console.error('[LinkedIn OAuth] Token exchange error:', errorMessage);
        throw new Error(`LinkedIn token exchange failed: ${errorMessage}`);
    }
}

/**
 * Fetches the user's LinkedIn profile using their access token
 * 
 * @param {string} accessToken - LinkedIn OAuth access token
 * @returns {Promise<{sub: string, name: string, email: string, picture?: string}>}
 */
async function getProfile(accessToken) {
    if (!accessToken) {
        throw new Error('Access token is required');
    }

    try {
        const response = await axios.get(LINKEDIN_PROFILE_URL, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            timeout: 15000
        });

        const data = response.data;
        
        return {
            sub: data.sub,                           // LinkedIn member ID (unique identifier)
            name: data.name || '',                   // Full name
            given_name: data.given_name || '',       // First name
            family_name: data.family_name || '',     // Last name
            email: data.email || null,               // Email (if email scope granted)
            email_verified: data.email_verified || false,
            picture: data.picture || null,           // Profile picture URL
            locale: data.locale || null
        };
    } catch (error) {
        const errorMessage = error.response?.data?.message || error.message;
        console.error('[LinkedIn OAuth] Profile fetch error:', errorMessage);
        throw new Error(`Failed to fetch LinkedIn profile: ${errorMessage}`);
    }
}

/**
 * Complete LinkedIn OAuth verification and store in database
 * 
 * @param {string|number} userId - The user's ID in our system
 * @param {string} code - Authorization code from LinkedIn callback
 * @param {object} options - Additional options
 * @param {string} options.ipAddress - Client IP address
 * @param {string} options.userAgent - Client user agent
 * @returns {Promise<{success: boolean, profile?: object, error?: string}>}
 */
async function verifyAndStore(userId, code, options = {}) {
    if (!userId) {
        return { success: false, error: 'userId is required' };
    }
    if (!code) {
        return { success: false, error: 'Authorization code is required' };
    }

    const client = await pool.connect();
    
    try {
        // Exchange code for token
        const tokenData = await exchangeCodeForToken(code);
        
        // Fetch profile
        const profile = await getProfile(tokenData.access_token);
        
        if (!profile.sub) {
            return { success: false, error: 'LinkedIn profile missing member ID' };
        }

        await client.query('BEGIN');

        // Store verification in user_verifications table
        await client.query(
            `INSERT INTO user_verifications 
             (user_id, provider, provider_id, provider_email, profile_data, verified_at, ip_address, user_agent)
             VALUES ($1, 'linkedin', $2, $3, $4, NOW(), $5, $6)
             ON CONFLICT (user_id, provider) 
             DO UPDATE SET 
                 provider_id = $2,
                 provider_email = $3,
                 profile_data = $4,
                 verified_at = NOW(),
                 ip_address = $5,
                 user_agent = $6`,
            [
                userId,
                profile.sub,
                profile.email,
                JSON.stringify({
                    name: profile.name,
                    given_name: profile.given_name,
                    family_name: profile.family_name,
                    picture: profile.picture,
                    locale: profile.locale
                }),
                options.ipAddress || null,
                options.userAgent || null
            ]
        );

        // Update users table linkedin_verified flag
        await client.query(
            `UPDATE Users 
             SET linkedin_verified = TRUE,
                 linkedin_id = $2,
                 updated_at = NOW()
             WHERE id = $1`,
            [userId, profile.sub]
        );

        // Also update Buyers table if user is a buyer
        await client.query(
            `UPDATE Buyers 
             SET linkedin_verified = TRUE,
                 linkedin_verified_at = NOW(),
                 linkedin_profile_id = $2,
                 UpdatedAt = NOW()
             WHERE UserID = $1 OR BuyerID = $1`,
            [userId, profile.sub]
        );

        // Log the verification event
        await client.query(
            `INSERT INTO Buyer_Verification_Log 
             (buyer_id, verification_type, status, profile_id, metadata, ip_address, user_agent)
             SELECT BuyerID, 'linkedin', 'verified', $2, $3, $4, $5
             FROM Buyers WHERE UserID = $1 OR BuyerID = $1`,
            [
                userId,
                profile.sub,
                JSON.stringify({ 
                    source: 'oauth',
                    name: profile.name,
                    email: profile.email
                }),
                options.ipAddress || null,
                options.userAgent || null
            ]
        );

        await client.query('COMMIT');

        console.log(`[LinkedIn OAuth] User ${userId} verified with LinkedIn ID: ${profile.sub}`);
        
        return {
            success: true,
            profile: {
                id: profile.sub,
                name: profile.name,
                email: profile.email,
                picture: profile.picture
            }
        };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[LinkedIn OAuth] Verify and store error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Checks if a user has LinkedIn verification
 * 
 * @param {string|number} userId - The user's ID
 * @returns {Promise<{verified: boolean, profile?: object}>}
 */
async function getVerificationStatus(userId) {
    if (!userId) {
        return { verified: false };
    }

    try {
        const result = await pool.query(
            `SELECT provider_id, provider_email, profile_data, verified_at
             FROM user_verifications 
             WHERE user_id = $1 AND provider = 'linkedin'`,
            [userId]
        );

        if (result.rows.length === 0) {
            return { verified: false };
        }

        const row = result.rows[0];
        return {
            verified: true,
            profile: {
                id: row.provider_id,
                email: row.provider_email,
                ...row.profile_data,
                verified_at: row.verified_at
            }
        };
    } catch (error) {
        console.error('[LinkedIn OAuth] Status check error:', error);
        return { verified: false, error: error.message };
    }
}

/**
 * Revokes LinkedIn verification for a user
 * 
 * @param {string|number} userId - The user's ID
 * @param {string} reason - Reason for revocation
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function revokeVerification(userId, reason = 'manual_revocation') {
    if (!userId) {
        return { success: false, error: 'userId is required' };
    }

    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        // Remove from user_verifications
        await client.query(
            `DELETE FROM user_verifications 
             WHERE user_id = $1 AND provider = 'linkedin'`,
            [userId]
        );

        // Update Users table
        await client.query(
            `UPDATE Users 
             SET linkedin_verified = FALSE,
                 linkedin_id = NULL,
                 updated_at = NOW()
             WHERE id = $1`,
            [userId]
        );

        // Update Buyers table
        await client.query(
            `UPDATE Buyers 
             SET linkedin_verified = FALSE,
                 linkedin_verified_at = NULL,
                 linkedin_profile_id = NULL,
                 linkedin_profile_url = NULL,
                 UpdatedAt = NOW()
             WHERE UserID = $1 OR BuyerID = $1`,
            [userId]
        );

        // Log revocation
        await client.query(
            `INSERT INTO Buyer_Verification_Log 
             (buyer_id, verification_type, status, metadata)
             SELECT BuyerID, 'linkedin', 'revoked', $2
             FROM Buyers WHERE UserID = $1 OR BuyerID = $1`,
            [userId, JSON.stringify({ reason })]
        );

        await client.query('COMMIT');

        console.log(`[LinkedIn OAuth] Revoked verification for user ${userId}: ${reason}`);
        return { success: true };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[LinkedIn OAuth] Revocation error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

module.exports = {
    getAuthorizationUrl,
    generateState,
    exchangeCodeForToken,
    getProfile,
    verifyAndStore,
    getVerificationStatus,
    revokeVerification,
    LINKEDIN_SCOPES
};
