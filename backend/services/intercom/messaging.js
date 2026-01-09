const { client } = require('./index');
const { pool } = require('../../db');
const entitlements = require('../entitlements');
const templates = require('./templates');
const { sanitizeForLog } = require('../../utils/sanitize');

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
    console.error('Error checking eligibility for user:', sanitizeForLog(userId), 'Error:', error.message);
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
    console.error('Error sending message to user:', sanitizeForLog(userId), 'Error:', error.message);
    throw error;
  }
}

async function sendRFQNotificationLegacy(supplierId, rfqData) {
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

async function sendQuoteUpdateLegacy(buyerId, quoteData) {
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

// ============================================
// NEW RFQ NOTIFICATION FUNCTIONS
// ============================================

/**
 * Notify a verified supplier of a new RFQ opportunity.
 * Uses templated messaging for consistent branding.
 * 
 * @param {string} supplierId - Supplier UUID
 * @param {string} rfqId - RFQ UUID
 * @param {number} waveNumber - Wave number (1-3)
 * @returns {Promise<{success: boolean, result?: object, error?: string}>}
 */
async function sendRfqNotification(supplierId, rfqId, waveNumber) {
  if (!supplierId || !rfqId) {
    console.warn('sendRfqNotification: Missing supplierId or rfqId');
    return { success: false, error: 'Missing required parameters' };
  }

  try {
    // Fetch RFQ and supplier details
    const rfqResult = await pool.query(
      `SELECT 
         r.id, r.project_name, r.category, r.quantity, r.project_details,
         q.visible_at, q.expires_at
       FROM rfqs r
       LEFT JOIN "RFQ_Distribution_Queue" q ON q.rfq_id = r.id AND q.supplier_id = $2
       WHERE r.id = $1`,
      [rfqId, supplierId]
    );

    if (rfqResult.rows.length === 0) {
      console.warn(`sendRfqNotification: RFQ ${rfqId} not found`);
      return { success: false, error: 'RFQ not found' };
    }

    const rfq = rfqResult.rows[0];
    const projectDetails = typeof rfq.project_details === 'string' 
      ? JSON.parse(rfq.project_details) 
      : (rfq.project_details || {});

    // Generate template
    const template = templates.newRfqTemplate({
      rfqId,
      projectName: rfq.project_name,
      category: rfq.category,
      quantity: rfq.quantity,
      location: projectDetails.location || projectDetails.city,
      waveNumber: waveNumber || 3,
      expiresAt: rfq.expires_at
    });

    // Send via Intercom
    const result = await sendMessage(supplierId, template.body, {
      bypassEligibility: true,
      messageType: 'rfq_notification',
      isSupplier: true
    });

    if (result.success) {
      console.log('[Intercom] RFQ notification sent to supplier:', sanitizeForLog(supplierId), 'RFQ:', sanitizeForLog(rfqId), 'Wave:', sanitizeForLog(waveNumber));
    }

    return result;
  } catch (error) {
    console.error('Error sending RFQ notification to supplier:', sanitizeForLog(supplierId), 'Error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send a claim prompt to a shadow supplier.
 * Shadow suppliers receive prompts to claim their profile, not full RFQ details.
 * 
 * @param {string} shadowSupplierId - Shadow supplier UUID (from scraped_supplier_data)
 * @param {string} rfqId - RFQ UUID (for tracking, not revealed to supplier)
 * @returns {Promise<{success: boolean, result?: object, error?: string}>}
 */
async function sendClaimPrompt(shadowSupplierId, rfqId) {
  if (!shadowSupplierId) {
    console.warn('sendClaimPrompt: Missing shadowSupplierId');
    return { success: false, error: 'Missing shadowSupplierId' };
  }

  try {
    // Fetch shadow supplier details and RFQ count
    const shadowResult = await pool.query(
      `SELECT 
         sd.id, sd.company_name, sd.email, sd.category, sd.claim_token,
         (SELECT COUNT(*) FROM "RFQ_Distribution_Queue" q 
          WHERE q.supplier_id = sd.linked_supplier_id 
          AND q.access_level = 'outreach_only'
          AND q.status = 'pending') as pending_rfq_count
       FROM scraped_supplier_data sd
       WHERE sd.id = $1`,
      [shadowSupplierId]
    );

    if (shadowResult.rows.length === 0) {
      // Try looking up by supplier ID in the suppliers table
      const supplierResult = await pool.query(
        `SELECT s.id, s.name as company_name, s.email, s.category,
                sd.claim_token, sd.id as shadow_id
         FROM suppliers s
         LEFT JOIN scraped_supplier_data sd ON sd.linked_supplier_id = s.id
         WHERE s.id = $1 AND s.tier = 'scraped'`,
        [shadowSupplierId]
      );

      if (supplierResult.rows.length === 0) {
        console.warn(`sendClaimPrompt: Shadow supplier ${shadowSupplierId} not found`);
        return { success: false, error: 'Shadow supplier not found' };
      }

      const supplier = supplierResult.rows[0];
      const template = templates.claimPromptTemplate({
        shadowSupplierId: supplier.shadow_id || shadowSupplierId,
        companyName: supplier.company_name,
        category: supplier.category,
        claimToken: supplier.claim_token,
        matchedRfqCount: 1
      });

      const result = await sendMessage(shadowSupplierId, template.body, {
        bypassEligibility: true,
        messageType: 'claim_prompt',
        isSupplier: true
      });

      if (result.success) {
        console.log(`[Intercom] Claim prompt sent to shadow supplier ${shadowSupplierId}`);
        
        // Track outreach attempt
        await trackClaimPromptSent(shadowSupplierId, rfqId);
      }

      return result;
    }

    const shadow = shadowResult.rows[0];
    
    // Generate template
    const template = templates.claimPromptTemplate({
      shadowSupplierId: shadow.id,
      companyName: shadow.company_name,
      category: shadow.category,
      claimToken: shadow.claim_token,
      matchedRfqCount: parseInt(shadow.pending_rfq_count) || 1
    });

    // For shadow suppliers, we use their email as the identifier if no Intercom contact exists
    // First try to find or create contact
    const contactId = shadow.email || shadow.id;

    const result = await sendMessage(contactId, template.body, {
      bypassEligibility: true,
      messageType: 'claim_prompt',
      isSupplier: true
    });

    if (result.success) {
      console.log(`[Intercom] Claim prompt sent to shadow supplier ${shadowSupplierId}`);
      
      // Track outreach attempt
      await trackClaimPromptSent(shadowSupplierId, rfqId);
    }

    return result;
  } catch (error) {
    console.error('Error sending claim prompt to shadow supplier:', sanitizeForLog(shadowSupplierId), 'Error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Track that a claim prompt was sent to a shadow supplier.
 * @param {string} shadowSupplierId 
 * @param {string} rfqId 
 */
async function trackClaimPromptSent(shadowSupplierId, rfqId) {
  try {
    await pool.query(
      `INSERT INTO Intercom_Contacts (UserID, MessageType, SentAt)
       VALUES ($1, 'claim_prompt', NOW())
       ON CONFLICT DO NOTHING`,
      [shadowSupplierId]
    );

    // Update distribution queue status if rfqId provided
    if (rfqId) {
      await pool.query(
        `UPDATE "RFQ_Distribution_Queue"
         SET status = 'outreach_sent',
             updated_at = NOW()
         WHERE rfq_id = $1 
           AND supplier_id = $2 
           AND access_level = 'outreach_only'`,
        [rfqId, shadowSupplierId]
      );
    }
  } catch (error) {
    console.error('Error tracking claim prompt:', error.message);
  }
}

/**
 * Notify an architect when a supplier submits a quote.
 * 
 * @param {string} architectId - Architect/buyer UUID
 * @param {string} rfqId - RFQ UUID
 * @param {string} supplierId - Supplier UUID who submitted the quote
 * @returns {Promise<{success: boolean, result?: object, error?: string}>}
 */
async function sendQuoteReceived(architectId, rfqId, supplierId) {
  if (!architectId || !rfqId || !supplierId) {
    console.warn('sendQuoteReceived: Missing required parameters');
    return { success: false, error: 'Missing required parameters' };
  }

  try {
    // Fetch RFQ, supplier, and quote details
    const result = await pool.query(
      `SELECT 
         r.id as rfq_id, r.project_name, r.buyer_id,
         s.id as supplier_id, s.name as supplier_name, s.tier as supplier_tier,
         vs.verification_score as sustainability_score,
         (SELECT COUNT(*) FROM rfq_quotes WHERE rfq_id = r.id) as total_quotes,
         q.price_amount, q.price_currency, q.lead_time_days
       FROM rfqs r
       JOIN suppliers s ON s.id = $3
       LEFT JOIN "Supplier_Verification_Scores" vs ON vs.supplier_id = s.id
       LEFT JOIN rfq_quotes q ON q.rfq_id = r.id AND q.supplier_id = s.id
       WHERE r.id = $1`,
      [rfqId, architectId, supplierId]
    );

    if (result.rows.length === 0) {
      console.warn(`sendQuoteReceived: RFQ ${rfqId} not found`);
      return { success: false, error: 'RFQ not found' };
    }

    const data = result.rows[0];

    // Format price range if available
    let priceRange = null;
    if (data.price_amount) {
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: data.price_currency || 'USD'
      });
      priceRange = formatter.format(parseFloat(data.price_amount));
    }

    // Generate template
    const template = templates.quoteReceivedTemplate({
      rfqId,
      projectName: data.project_name,
      supplierName: data.supplier_name,
      supplierTier: data.supplier_tier,
      priceRange,
      leadTime: data.lead_time_days,
      sustainabilityScore: data.sustainability_score,
      totalQuotes: parseInt(data.total_quotes) || 1
    });

    // Send to architect
    const sendResult = await sendMessage(architectId, template.body, {
      bypassEligibility: true,
      messageType: 'quote_received'
    });

    if (sendResult.success) {
      console.log(`[Intercom] Quote received notification sent to architect ${architectId} for RFQ ${rfqId}`);
    }

    return sendResult;
  } catch (error) {
    console.error('Error sending quote received notification to architect:', sanitizeForLog(architectId), 'Error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send a deposit verified notification to a buyer.
 * 
 * @param {string} buyerId - Buyer UUID
 * @param {object} depositData - Deposit information
 * @returns {Promise<{success: boolean, result?: object, error?: string}>}
 */
async function sendDepositVerified(buyerId, depositData) {
  if (!buyerId) {
    console.warn('sendDepositVerified: Missing buyerId');
    return { success: false, error: 'Missing buyerId' };
  }

  try {
    // Fetch buyer details
    const buyerResult = await pool.query(
      `SELECT u.userid, u.name, u.email,
              bv.linkedin_verified,
              (SELECT COUNT(*) FROM rfqs r WHERE r.buyer_id = u.userid AND r.status = 'pending_verification') as pending_rfqs
       FROM Users u
       LEFT JOIN buyer_verifications bv ON bv.buyer_id = u.userid
       WHERE u.userid = $1`,
      [buyerId]
    );

    const buyer = buyerResult.rows[0] || {};

    const template = templates.depositVerifiedTemplate({
      buyerId,
      buyerName: buyer.name,
      amount: depositData.amount,
      currency: depositData.currency || 'USD',
      linkedInVerified: buyer.linkedin_verified || false,
      pendingRfqs: parseInt(buyer.pending_rfqs) || 0
    });

    const result = await sendMessage(buyerId, template.body, {
      bypassEligibility: true,
      messageType: 'deposit_verified'
    });

    if (result.success) {
      console.log(`[Intercom] Deposit verified notification sent to buyer ${buyerId}`);
    }

    return result;
  } catch (error) {
    console.error('Error sending deposit verified notification to buyer:', sanitizeForLog(buyerId), 'Error:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  // Core messaging
  sendMessage,
  checkOutboundEligibility,
  checkOutboundEligibilityLegacy,
  trackMessageSent,
  
  // RFQ notifications (new)
  sendRfqNotification,
  sendClaimPrompt,
  sendQuoteReceived,
  sendDepositVerified,
  
  // Legacy functions (for backwards compatibility)
  sendRFQNotification: sendRFQNotificationLegacy,
  sendQuoteUpdate: sendQuoteUpdateLegacy
};
