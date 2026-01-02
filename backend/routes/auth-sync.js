const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../db');

/**
 * Sync Azure AD user with local database
 * Called after Azure AD login via Supabase
 * 
 * POST /api/v1/auth/sync-azure-user
 * Authorization: Bearer <supabase_jwt>
 */
router.post('/sync-azure-user', authenticateToken, async (req, res) => {
  try {
    const { email, firstName, lastName, azureId, role } = req.body;

    if (!email || !azureId) {
      return res.status(400).json({ error: 'Email and Azure ID required' });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT UserID FROM Users WHERE Email = $1',
      [email]
    );

    let userId;

    if (existingUser.rows.length > 0) {
      // User exists - update Azure ID
      userId = existingUser.rows[0].userid;
      await pool.query(
        'UPDATE Users SET AzureID = $1, UpdatedAt = CURRENT_TIMESTAMP WHERE UserID = $2',
        [azureId, userId]
      );
    } else {
      // Create new user
      const result = await pool.query(
        `INSERT INTO Users (Email, FirstName, LastName, AzureID, Role, CreatedAt, UpdatedAt)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING UserID`,
        [email, firstName || null, lastName || null, azureId, role || 'Buyer']
      );
      userId = result.rows[0].userid;
    }

    // If Buyer role, ensure Buyer profile exists
    if (role === 'Buyer' || !role) {
      const buyerExists = await pool.query(
        'SELECT BuyerID FROM Buyers WHERE UserID = $1',
        [userId]
      );

      if (buyerExists.rows.length === 0) {
        // Create buyer profile
        await pool.query(
          `INSERT INTO Buyers (UserID, PreferredContactMethod, CreatedAt)
           VALUES ($1, 'Email', CURRENT_TIMESTAMP)`,
          [userId]
        );
      }
    }

    res.status(200).json({
      message: 'User synchronized successfully',
      userId,
      email,
      role: role || 'Buyer'
    });
  } catch (err) {
    console.error('User sync error:', err);
    res.status(500).json({ error: 'Failed to sync user' });
  }
});

module.exports = router;
