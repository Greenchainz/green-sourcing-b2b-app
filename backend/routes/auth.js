const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const { requireEnv } = require('../config/validateEnv');

// ============================================
// CONSTANTS
// ============================================

const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID || 'greenchainz2025.onmicrosoft.com';
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID || '';
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET || '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const JWT_SECRET = process.env.NODE_ENV === 'production'
  ? requireEnv('JWT_SECRET', { minLength: 32 })
  : requireEnv('JWT_SECRET', { minLength: 16 });
const JWT_EXPIRY = '7d'; // Token valid for 7 days

// Rate limiter specifically for token verification to prevent abuse
const verifyTokenLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 30, // limit each IP to 30 requests per windowMs for /verify
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// HELPER FUNCTIONS
// ============================================

const generateJWT = (userId, email, role) => {
  return jwt.sign(
    { userId, email, role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
};

const verifyJWT = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// ============================================
// POST /api/v1/auth/azure-token-exchange
// Exchange Azure AD auth code -> ID token (server-side using client secret)
// ============================================

router.post('/azure-token-exchange', async (req, res) => {
  try {
    const { code, redirectUri } = req.body || {};
    if (!code || !redirectUri) {
      return res.status(400).json({ error: 'code and redirectUri required' });
    }

    const tenant = process.env.NODE_ENV === 'production'
      ? requireEnv('AZURE_TENANT_ID')
      : (AZURE_TENANT_ID || 'common');
    const clientId = process.env.NODE_ENV === 'production'
      ? requireEnv('AZURE_CLIENT_ID')
      : AZURE_CLIENT_ID;
    const clientSecret = process.env.NODE_ENV === 'production'
      ? requireEnv('AZURE_CLIENT_SECRET', { minLength: 10 })
      : AZURE_CLIENT_SECRET;

    const tokenUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;

    const form = new URLSearchParams();
    form.set('client_id', clientId);
    form.set('client_secret', clientSecret);
    form.set('grant_type', 'authorization_code');
    form.set('code', code);
    form.set('redirect_uri', redirectUri);
    form.set('scope', 'openid profile email');

    const tokenResp = await axios.post(tokenUrl, form.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000,
    });

    const idToken = tokenResp.data?.id_token;
    if (!idToken) {
      return res.status(502).json({ error: 'Azure token response missing id_token' });
    }

    // Decode token payload (claims). This token was obtained via client_secret exchange.
    const [, payloadB64] = String(idToken).split('.');
    const payloadJson = Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    const claims = JSON.parse(payloadJson);

    const email =
      claims.preferred_username ||
      (Array.isArray(claims.emails) ? claims.emails[0] : undefined) ||
      claims.email ||
      null;
    const azureId = claims.oid || claims.sub || null;

    res.status(200).json({
      idToken,
      email,
      firstName: claims.given_name || null,
      lastName: claims.family_name || null,
      azureId,
    });
  } catch (error) {
    console.error('Azure token exchange error:', error?.response?.data || error.message);
    res.status(500).json({ error: 'Token exchange failed' });
  }
});

// ============================================
// POST /api/v1/auth/azure-callback
// Exchange Azure auth code for JWT token
// ============================================

router.post('/azure-callback', async (req, res) => {
  try {
    const { code, email, firstName, lastName, azureId } = req.body;

    if (!email || !azureId) {
      return res.status(400).json({ error: 'Email and Azure ID required' });
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if user exists
      const userCheck = await client.query(
        'SELECT id, email, role FROM Users WHERE azure_id = $1 OR email = $2',
        [azureId, email]
      );

      let userId, userRole;

      if (userCheck.rows.length > 0) {
        // User exists - update last login
        const user = userCheck.rows[0];
        userId = user.id;
        userRole = user.role;

        await client.query(
          'UPDATE Users SET last_login = NOW(), updated_at = NOW() WHERE id = $1',
          [userId]
        );
      } else {
        // Create new user - default role is 'architect'
        // They can update to 'supplier' later
        const result = await client.query(
          `INSERT INTO Users (email, first_name, last_name, azure_id, role, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
           RETURNING id, role`,
          [email, firstName || null, lastName || null, azureId, 'architect']
        );

        userId = result.rows[0].id;
        userRole = result.rows[0].role;
      }

      await client.query('COMMIT');

      // Generate JWT token
      const token = generateJWT(userId, email, userRole);

      // Also create refresh token (valid for 30 days)
      const refreshToken = jwt.sign(
        { userId, email },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      // Store refresh token in database
      await pool.query(
        `INSERT INTO RefreshTokens (user_id, token, expires_at, created_at)
         VALUES ($1, $2, NOW() + INTERVAL '30 days', NOW())
         ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = NOW() + INTERVAL '30 days'`,
        [userId, refreshToken]
      );

      res.status(200).json({
        token,
        refreshToken,
        user: {
          id: userId,
          email,
          firstName: firstName || null,
          lastName: lastName || null,
          role: userRole
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Azure callback error:', error);
    res.status(500).json({ error: 'Authentication failed', details: error.message });
  }
});

// ============================================
// POST /api/v1/auth/refresh
// Exchange refresh token for new JWT
// ============================================

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // Verify refresh token
    const decoded = verifyJWT(refreshToken);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Check if token exists in database
    const tokenCheck = await pool.query(
      'SELECT user_id FROM RefreshTokens WHERE user_id = $1 AND token = $2 AND expires_at > NOW()',
      [decoded.userId, refreshToken]
    );

    if (tokenCheck.rows.length === 0) {
      return res.status(401).json({ error: 'Refresh token not found or expired' });
    }

    // Get user details
    const userResult = await pool.query(
      'SELECT id, email, role FROM Users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const newToken = generateJWT(user.id, user.email, user.role);

    res.status(200).json({ token: newToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// ============================================
// POST /api/v1/auth/logout
// Invalidate refresh token
// ============================================

router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(400).json({ error: 'Authorization header required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyJWT(token);

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Delete refresh token
    await pool.query('DELETE FROM RefreshTokens WHERE user_id = $1', [decoded.userId]);

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// ============================================
// GET /api/v1/auth/me
// Get current user details (protected)
// ============================================

router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyJWT(token);

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get full user data including OAuthProvider
    const userResult = await pool.query(
      'SELECT UserID, Email, FirstName, LastName, FullName, Role, OAuthProvider FROM Users WHERE UserID = $1',
      [decoded.userId]
    );

    if (!userResult.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    res.status(200).json({
      user: {
        id: user.userid || decoded.userId,
        email: user.email || decoded.email,
        firstName: user.firstname,
        lastName: user.lastname,
        fullName: user.fullname,
        role: user.role || decoded.role,
        oauthProvider: user.oauthprovider
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// ============================================
// PATCH /api/v1/auth/role
// Update user role (architect or supplier)
// ============================================

router.patch('/role', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyJWT(token);

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { role } = req.body;
    const validRoles = ['architect', 'supplier'];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Role must be one of: ${validRoles.join(', ')}` });
    }

    // Update user role
    const result = await pool.query(
      'UPDATE Users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, role',
      [role, decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Generate new token with updated role
    const newToken = generateJWT(user.id, user.email, user.role);

    res.status(200).json({
      message: 'Role updated successfully',
      token: newToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// ============================================
// POST /api/v1/auth/verify
// Verify JWT token validity
// ============================================

router.post('/verify', verifyTokenLimiter, (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token required', valid: false });
    }

    const decoded = verifyJWT(token);

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token', valid: false });
    }

    res.status(200).json({
      valid: true,
      user: {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Token verification failed', valid: false });
  }
});

module.exports = router;
