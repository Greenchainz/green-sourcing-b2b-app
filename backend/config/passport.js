// ============================================
// PASSPORT.JS OAUTH CONFIGURATION
// Google, GitHub, LinkedIn, Microsoft
// ============================================

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const { pool } = require('../db');

// Serialize user into session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const result = await pool.query('SELECT * FROM Users WHERE id = $1', [id]);
        done(null, result.rows[0]);
    } catch (err) {
        done(err, null);
    }
});

// ============================================
// GOOGLE OAUTH STRATEGY
// ============================================
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/auth/google/callback'
    },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // Check if user exists with this Google ID
                let result = await pool.query(
                    'SELECT * FROM Users WHERE OAuthProvider = $1 AND OAuthID = $2',
                    ['google', profile.id]
                );

                let user;
                if (result.rows.length > 0) {
                    // User exists, update last login
                    user = result.rows[0];
                    await pool.query(
                        'UPDATE Users SET LastLogin = NOW() WHERE id = $1',
                        [user.id]
                    );
                } else {
                    // Create new user
                    const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
                    const name = profile.displayName || 'Google User';

                    result = await pool.query(
                        `INSERT INTO Users (Email, FullName, Role, OAuthProvider, OAuthID, CreatedAt, LastLogin)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
           RETURNING *`,
                        [email, name, 'architect', 'google', profile.id]
                    );
                    user = result.rows[0];
                }

                return done(null, user);
            } catch (err) {
                return done(err, null);
            }
        }));
}

// ============================================
// FACEBOOK OAUTH STRATEGY
// ============================================
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(new FacebookStrategy({
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: process.env.FACEBOOK_CALLBACK_URL || 'http://localhost:3001/auth/facebook/callback',
        profileFields: ['id', 'displayName', 'emails']
    },
        async (accessToken, refreshToken, profile, done) => {
            try {
                let result = await pool.query(
                    'SELECT * FROM Users WHERE OAuthProvider = $1 AND OAuthID = $2',
                    ['facebook', profile.id]
                );

                let user;
                if (result.rows.length > 0) {
                    user = result.rows[0];
                    await pool.query(
                        'UPDATE Users SET LastLogin = NOW() WHERE id = $1',
                        [user.id]
                    );
                } else {
                    const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
                    const name = profile.displayName || 'Facebook User';

                    result = await pool.query(
                        `INSERT INTO Users (Email, FullName, Role, OAuthProvider, OAuthID, CreatedAt, LastLogin)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
           RETURNING *`,
                        [email, name, 'architect', 'facebook', profile.id]
                    );
                    user = result.rows[0];
                }

                return done(null, user);
            } catch (err) {
                return done(err, null);
            }
        }));
}

// ============================================
// LINKEDIN OAUTH STRATEGY
// ============================================
if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
    passport.use(new LinkedInStrategy({
        clientID: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        callbackURL: process.env.LINKEDIN_CALLBACK_URL || 'http://localhost:3001/auth/linkedin/callback',
        scope: ['openid', 'profile', 'email']
    },
        async (accessToken, refreshToken, profile, done) => {
            try {
                let result = await pool.query(
                    'SELECT * FROM Users WHERE OAuthProvider = $1 AND OAuthID = $2',
                    ['linkedin', profile.id]
                );

                let user;
                if (result.rows.length > 0) {
                    user = result.rows[0];
                    await pool.query(
                        'UPDATE Users SET LastLogin = NOW() WHERE id = $1',
                        [user.id]
                    );
                } else {
                    const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
                    const name = profile.displayName || 'LinkedIn User';

                    result = await pool.query(
                        `INSERT INTO Users (Email, FullName, Role, OAuthProvider, OAuthID, CreatedAt, LastLogin)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
           RETURNING *`,
                        [email, name, 'architect', 'linkedin', profile.id]
                    );
                    user = result.rows[0];
                }

                return done(null, user);
            } catch (err) {
                return done(err, null);
            }
        }));
}

// ============================================
// GITHUB OAUTH STRATEGY
// ============================================
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3001/auth/github/callback',
        scope: ['user:email']
    },
        async (accessToken, refreshToken, profile, done) => {
            try {
                let result = await pool.query(
                    'SELECT * FROM Users WHERE OAuthProvider = $1 AND OAuthID = $2',
                    ['github', profile.id]
                );

                let user;
                if (result.rows.length > 0) {
                    user = result.rows[0];
                    await pool.query(
                        'UPDATE Users SET LastLogin = NOW() WHERE id = $1',
                        [user.id]
                    );
                } else {
                    const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
                    const name = profile.displayName || profile.username || 'GitHub User';

                    result = await pool.query(
                        `INSERT INTO Users (Email, FullName, Role, OAuthProvider, OAuthID, CreatedAt, LastLogin)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
           RETURNING *`,
                        [email, name, 'architect', 'github', profile.id]
                    );
                    user = result.rows[0];
                }

                return done(null, user);
            } catch (err) {
                return done(err, null);
            }
        }));
}

// ============================================
// MICROSOFT OAUTH STRATEGY
// ============================================
if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
    passport.use(new MicrosoftStrategy({
        clientID: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        callbackURL: process.env.MICROSOFT_CALLBACK_URL || 'http://localhost:3001/auth/microsoft/callback',
        scope: ['user.read']
    },
        async (accessToken, refreshToken, profile, done) => {
            try {
                let result = await pool.query(
                    'SELECT * FROM Users WHERE OAuthProvider = $1 AND OAuthID = $2',
                    ['microsoft', profile.id]
                );

                let user;
                if (result.rows.length > 0) {
                    user = result.rows[0];
                    await pool.query(
                        'UPDATE Users SET LastLogin = NOW() WHERE id = $1',
                        [user.id]
                    );
                } else {
                    const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
                    const name = profile.displayName || 'Microsoft User';

                    result = await pool.query(
                        `INSERT INTO Users (Email, FullName, Role, OAuthProvider, OAuthID, CreatedAt, LastLogin)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
           RETURNING *`,
                        [email, name, 'architect', 'microsoft', profile.id]
                    );
                    user = result.rows[0];
                }

                return done(null, user);
            } catch (err) {
                return done(err, null);
            }
        }));
}

module.exports = passport;
