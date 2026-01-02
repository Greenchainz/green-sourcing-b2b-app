// backend/middleware/cookies.js

const { COOKIE_NAMES, EXPIRATION, DEFAULT_SETTINGS, PUBLIC_SETTINGS } = require('../config/cookieConfig');
const crypto = require('crypto');

// Helper to encrypt values (for sensitive cookies like gc_user_id or gc_preferences if they contain PII)
const algorithm = 'aes-256-cbc';
const secretKey = process.env.COOKIE_SECRET || 'default-secret-change-me-32chars'; // Must be 32 chars
// Ensure key is 32 bytes
const key = crypto.scryptSync(secretKey, 'salt', 32);

function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(JSON.stringify(text));
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  if (!text) return null;
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return JSON.parse(decrypted.toString());
  } catch (error) {
    console.error('Cookie decryption error:', error);
    return null;
  }
}

// Middleware to manage cookies
const cookieManager = {
  // Middleware to check for cookie consent
  checkConsent: (req, res, next) => {
    const consent = req.signedCookies[COOKIE_NAMES.CONSENT] || req.cookies[COOKIE_NAMES.CONSENT];

    // Attach consent status to request for other controllers to use
    req.cookieConsent = consent ? JSON.parse(consent) : null;

    next();
  },

  // Set user tracking cookies
  setUserCookies: (res, user, rememberMe = false) => {
    if (!user) return;

    const maxAge = rememberMe ? EXPIRATION.REMEMBER_ME : EXPIRATION.DEFAULT;
    const options = { ...DEFAULT_SETTINGS, maxAge };

    // Encrypt sensitive data
    const encryptedUserId = encrypt(user.id);
    const encryptedTier = encrypt(user.tier);
    const encryptedPreferences = encrypt(user.preferences || {});

    res.cookie(COOKIE_NAMES.USER_ID, encryptedUserId, options);
    res.cookie(COOKIE_NAMES.TIER, encryptedTier, options);
    res.cookie(COOKIE_NAMES.PREFERENCES, encryptedPreferences, options);
  },

  // Clear user cookies (logout)
  clearUserCookies: (res) => {
    res.clearCookie(COOKIE_NAMES.USER_ID, DEFAULT_SETTINGS);
    res.clearCookie(COOKIE_NAMES.TIER, DEFAULT_SETTINGS);
    res.clearCookie(COOKIE_NAMES.PREFERENCES, DEFAULT_SETTINGS);
    // Session cookie is cleared by req.session.destroy(), but we can force it too if we want
    res.clearCookie(COOKIE_NAMES.SESSION, DEFAULT_SETTINGS);
  },

  // Read and decrypt user cookies
  readUserCookies: (req) => {
    const userIdCookie = req.signedCookies[COOKIE_NAMES.USER_ID];
    const tierCookie = req.signedCookies[COOKIE_NAMES.TIER];
    const preferencesCookie = req.signedCookies[COOKIE_NAMES.PREFERENCES];

    return {
      userId: decrypt(userIdCookie),
      tier: decrypt(tierCookie),
      preferences: decrypt(preferencesCookie),
    };
  },

  // Set GDPR consent cookie
  setConsentCookie: (res, consentData) => {
    // Consent cookie might need to be readable by frontend (not HTTPOnly) or handled via API
    // The prompt asks for "GDPR-compliant cookie banner tracking (gc_consent)"
    // Typically consent is not signed if frontend needs to read it, but let's stick to secure default unless frontend manages it.
    // If backend manages it via API:
    res.cookie(COOKIE_NAMES.CONSENT, JSON.stringify(consentData), {
        ...PUBLIC_SETTINGS, // Allow frontend to read if needed
        maxAge: EXPIRATION.CONSENT,
        signed: false // Usually consent flags aren't sensitive, but let's keep it simple
    });
  }
};

module.exports = cookieManager;
