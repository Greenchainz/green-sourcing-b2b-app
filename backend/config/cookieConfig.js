// backend/config/cookieConfig.js

const isProduction = process.env.NODE_ENV === 'production';

const COOKIE_NAMES = {
  SESSION: 'gc_session',
  USER_ID: 'gc_user_id',
  TIER: 'gc_tier',
  PREFERENCES: 'gc_preferences',
  CONSENT: 'gc_consent',
};

const EXPIRATION = {
  DEFAULT: 24 * 60 * 60 * 1000, // 24 hours
  REMEMBER_ME: 7 * 24 * 60 * 60 * 1000, // 7 days
  CONSENT: 365 * 24 * 60 * 60 * 1000, // 1 year
};

const DEFAULT_SETTINGS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  signed: true,
  domain: process.env.COOKIE_DOMAIN, // Can be undefined to use the current domain
};

const PUBLIC_SETTINGS = {
  ...DEFAULT_SETTINGS,
  httpOnly: false, // For cookies accessible by frontend JS if needed
  signed: false,
};

module.exports = {
  COOKIE_NAMES,
  EXPIRATION,
  DEFAULT_SETTINGS,
  PUBLIC_SETTINGS,
  isProduction,
};
