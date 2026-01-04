const { client } = require('./index');
const { pool } = require('../../db');
const entitlements = require('../entitlements');

/**
 * Check if user is eligible for outbound messaging.
 * Uses the entitlements service for tier-based access control.
 * Supports both user IDs and supplier IDs.
 * 
 * @param {string|number} userId - User or Supplier ID
 * @param {object} options - Options
 * @param {boolean} options.isSupplier - If true, treat ID as supplier ID (default: false)
 * @returns {Promise<{eligible: boolean, reason?: string, remaining?: number}>}
 */
async function checkOutboundEligibility(userId, options = {}) {
  const { isSupplier = false } = options;
  
  try {
    let supplierId = userId;
    
    // If not a supplier ID, look up the supplier ID from user
    if (!isSupplier) {
      const result = await pool.query(
        `SELECT s.SupplierID 
         FROM Users u 
         JOIN Suppliers s ON u.CompanyID = s.CompanyID 
         WHERE u.UserID = $1`,
        [userId]
      );
      
      if (result.rows.length === 0) {
        // Fallback to legacy check for non-supplier users
        const userResult = await pool.query('SELECT Tier FROM Users WHERE UserID = $1', [userId]);
        if (userResult.rows.length === 0) {
          return { eligible: false, reason: 'User not found' };
        }
        const tier = userResult.rows[0].tier;
        const eligible = tier === 'pro' || tier === 'enterprise' || tier === 'standard' || tier === 'premium';
        return { 
          eligible, 
          reason: eligible ? undefined : 'Upgrade to Standard or Premium tier for outbound messaging'
        };
      }
      
      supplierId = result.rows[0].supplierid;
    }
    
    // Use entitlements service for the check
    const canSend = await entitlements.canOutbound(supplierId);
    
    return {
      eligible: canSend.allowed,
      reason: canSend.reason,
      remaining: canSend.remaining
    };
  } catch (error) {
    console.error(`Error checking eligibility for user ${userId}:`, error.message);
    return { eligible: false, reason: 'Error checking eligibility' };
  }
}

/**
 * Legacy wrapper for backward compatibility
 * @deprecated Use checkOutboundEligibility with options instead
 */
async function checkOutboundEligibilityLegacy(userId) {
  const result = await checkOutboundEligibility(userId);
  return result.eligible;
}

async function trackMessageSent(userId, messageType) {
  try {
    // Assumes Intercom_Contacts table exists with UserID, MessageType, SentAt
    await pool.query(
      `INSERT INTO Intercom_Contacts (UserID, MessageType, SentAt) VALUES ($1, $2, NOW())`,
      [userId, messageType]
    );
  } catch (error) {
    console.error('Error tracking message in DB:', error.message);
  }
}

async function getAdminId() {
  try {
    const response = await client.admins.list();
    if (response.admins && response.admins.length > 0) {
      return response.admins[0].id;
    }
    return null;
  } catch (error) {
    console.error('Error fetching Intercom admins:', error.message);
    return null;
  }
}

async function sendMessage(userId, message, options = {}) {
  const { 
    bypassEligibility = false, 
    messageType = 'outbound_message',
    isSupplier = false,
    supplierId = null
  } = options;

  let effectiveSupplierId = supplierId;

  if (!bypassEligibility) {
    const eligibility = await checkOutboundEligibility(userId, { isSupplier });
    if (!eligibility.eligible) {
      console.warn(`User ${userId} is not eligible for outbound messages: ${eligibility.reason}`);
      return { 
        success: false, 
        error: eligibility.reason,
        remaining: eligibility.remaining 
      };
    }
  }

  try {
    const adminId = await getAdminId();
    if (!adminId) {
      throw new Error('No Intercom admin available to send message');
    }

    const messageData = {
      message_type: 'inapp',
      body: message,
      from: { type: 'admin', id: adminId },
      to: { type: 'user', user_id: userId } // user_id maps to external_id
    };

    const result = await client.messages.create(messageData);

    await trackMessageSent(userId, messageType);

    // Track outbound usage for quota enforcement
    if (!bypassEligibility && effectiveSupplierId) {
      await entitlements.incrementOutboundUsage(effectiveSupplierId, result?.id);
    }

    return { success: true, result };
  } catch (error) {
    console.error(`Error sending message to user ${userId}:`, error.message);
    throw error;
  }
}

async function sendRFQNotification(supplierId, rfqData) {
  const message = `
    <p>You have received a new RFQ!</p>
    <p><strong>Project:</strong> ${rfqData.projectName}</p>
    <p><strong>Quantity:</strong> ${rfqData.quantity}</p>
    <p><a href="${process.env.FRONTEND_URL}/supplier/rfqs">View Details</a></p>
  `;

  // RFQ notifications are transactional, so we bypass eligibility check
  return await sendMessage(supplierId, message, {
    bypassEligibility: true,
    messageType: 'rfq_notification'
  });
}

async function sendQuoteUpdate(buyerId, quoteData) {
  const message = `
    <p>You have a new quote for <strong>${quoteData.projectName}</strong>.</p>
    <p><strong>Price:</strong> ${quoteData.price}</p>
    <p><a href="${process.env.FRONTEND_URL}/buyer/rfqs">View Quote</a></p>
  `;

  // Quote updates are transactional, bypass eligibility
  return await sendMessage(buyerId, message, {
    bypassEligibility: true,
    messageType: 'quote_update'
  });
}

module.exports = {
  sendMessage,
  checkOutboundEligibility,
  checkOutboundEligibilityLegacy,
  sendRFQNotification,
  sendQuoteUpdate,
  trackMessageSent
};
