const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { requireEnv } = require('../config/validateEnv');

// ============================================
// CONSTANTS
// ============================================

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.NODE_ENV === 'production'
  ? requireEnv('JWT_SECRET', { minLength: 32 })
  : requireEnv('JWT_SECRET', { minLength: 16 });
const JWT_EXPIRY = '7d'; // Token valid for 7 days

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

// ============================================
// GOOGLE OAUTH ROUTES
// ============================================

/**
 * GET /auth/google
 * Initiates Google OAuth flow
 */
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

/**
 * GET /auth/google/callback
 * Handles Google OAuth callback
 */
router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: `${FRONTEND_URL}/login?error=google_auth_failed`,
    session: false 
  }),
  async (req, res) => {
    try {
      const user = req.user;
      
      if (!user) {
        return res.redirect(`${FRONTEND_URL}/login?error=google_callback_failed`);
      }

      // Generate JWT token
      const token = generateJWT(user.id, user.email, user.role);

      // Create refresh token (valid for 30 days)
      const refreshToken = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      // Store refresh token in database
      await pool.query(
        `INSERT INTO RefreshTokens (user_id, token, expires_at, created_at)
         VALUES ($1, $2, NOW() + INTERVAL '30 days', NOW())
         ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = NOW() + INTERVAL '30 days'`,
        [user.id, refreshToken]
      );

      // Redirect to frontend with tokens
      const redirectUrl = `${FRONTEND_URL}/login/callback?token=${encodeURIComponent(token)}&refresh_token=${encodeURIComponent(refreshToken)}&provider=google`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect(`${FRONTEND_URL}/login?error=google_callback_failed`);
    }
  }
);

// ============================================
// LINKEDIN OAUTH ROUTES
// ============================================

/**
 * GET /auth/linkedin
 * Initiates LinkedIn OAuth flow
 */
router.get('/linkedin', passport.authenticate('linkedin', {
  scope: ['openid', 'profile', 'email']
}));

/**
 * GET /auth/linkedin/callback
 * Handles LinkedIn OAuth callback
 */
router.get('/linkedin/callback',
  passport.authenticate('linkedin', {
    failureRedirect: `${FRONTEND_URL}/login?error=linkedin_auth_failed`,
    session: false
  }),
  async (req, res) => {
    try {
      const user = req.user;
      
      if (!user) {
        return res.redirect(`${FRONTEND_URL}/login?error=linkedin_callback_failed`);
      }

      // Generate JWT token
      const token = generateJWT(user.id, user.email, user.role);

      // Create refresh token (valid for 30 days)
      const refreshToken = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      // Store refresh token in database
      await pool.query(
        `INSERT INTO RefreshTokens (user_id, token, expires_at, created_at)
         VALUES ($1, $2, NOW() + INTERVAL '30 days', NOW())
         ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = NOW() + INTERVAL '30 days'`,
        [user.id, refreshToken]
      );

      // Redirect to frontend with tokens
      const redirectUrl = `${FRONTEND_URL}/login/callback?token=${encodeURIComponent(token)}&refresh_token=${encodeURIComponent(refreshToken)}&provider=linkedin`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('LinkedIn OAuth callback error:', error);
      res.redirect(`${FRONTEND_URL}/login?error=linkedin_callback_failed`);
    }
  }
);

module.exports = router;
