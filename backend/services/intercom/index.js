const { IntercomClient } = require('intercom-client');

// Initialize Intercom client
const client = new IntercomClient({ token: process.env.INTERCOM_ACCESS_TOKEN });

const TIER_TAG_MAP = {
  free: 'free_tier',
  pro: 'pro_tier',
  enterprise: 'enterprise_tier',
  supplier: 'supplier',
  buyer: 'buyer'
};

const mapUserTierToTags = (tier, role) => {
  const tags = [];
  if (tier && TIER_TAG_MAP[tier.toLowerCase()]) {
    tags.push(TIER_TAG_MAP[tier.toLowerCase()]);
  }
  if (role && TIER_TAG_MAP[role.toLowerCase()]) {
    tags.push(TIER_TAG_MAP[role.toLowerCase()]);
  }
  return tags;
};

// This function will be populated with logic to sync users using contacts.js
const syncUsersToIntercom = async (user) => {
  // We need to require contacts here to avoid circular dependency if contacts.js requires this file
  const { createContact, updateContact, getContact } = require('./contacts');

  try {
    const existing = await getContact(user.id);
    if (existing) {
      return await updateContact(user.id, user);
    } else {
      return await createContact(user);
    }
  } catch (error) {
    console.error('Error syncing user to Intercom:', error);
    // If error implies not found, try create?
    // Usually getContact should return null or throw specific error if not found.
    // We will refine this based on contacts.js implementation.
    return await createContact(user);
  }
};

/**
 * Trigger Intercom notifications after RFQ wave distribution.
 * This function is designed to be called from the RFQ distribution service.
 * 
 * - Full access suppliers (Waves 1-3) receive RFQ notifications
 * - Shadow suppliers (Wave 4) receive claim prompts
 * 
 * @param {string} rfqId - RFQ UUID
 * @param {Array} waveEntries - Array of wave distribution entries
 * @param {string} waveEntries[].supplier_id - Supplier UUID
 * @param {number} waveEntries[].wave_number - Wave number (1-4)
 * @param {string} waveEntries[].access_level - 'full' or 'outreach_only'
 * @param {object} options - Notification options
 * @param {boolean} options.async - Send notifications asynchronously (default: true)
 * @returns {Promise<{sent: number, failed: number, errors: Array}>}
 */
async function triggerWaveNotifications(rfqId, waveEntries, options = {}) {
  const { async: isAsync = true } = options;
  
  // Lazy load to avoid circular dependencies
  const messaging = require('./messaging');
  
  const results = {
    sent: 0,
    failed: 0,
    errors: []
  };
  
  if (!rfqId || !waveEntries || waveEntries.length === 0) {
    console.log('[Intercom] No wave entries to notify');
    return results;
  }
  
  console.log(`[Intercom] Triggering notifications for RFQ ${rfqId}: ${waveEntries.length} suppliers`);
  
  const sendNotification = async (entry) => {
    try {
      if (entry.access_level === 'outreach_only') {
        // Shadow supplier - send claim prompt
        const result = await messaging.sendClaimPrompt(entry.supplier_id, rfqId);
        if (result.success) {
          results.sent++;
        } else {
          results.failed++;
          results.errors.push({
            supplierId: entry.supplier_id,
            type: 'claim_prompt',
            error: result.error
          });
        }
      } else {
        // Full access supplier - send RFQ notification
        const result = await messaging.sendRfqNotification(
          entry.supplier_id, 
          rfqId, 
          entry.wave_number
        );
        if (result.success) {
          results.sent++;
        } else {
          results.failed++;
          results.errors.push({
            supplierId: entry.supplier_id,
            type: 'rfq_notification',
            error: result.error
          });
        }
      }
    } catch (error) {
      results.failed++;
      results.errors.push({
        supplierId: entry.supplier_id,
        type: entry.access_level === 'outreach_only' ? 'claim_prompt' : 'rfq_notification',
        error: error.message
      });
    }
  };
  
  if (isAsync) {
    // Fire and forget - don't block wave distribution
    Promise.all(waveEntries.map(sendNotification))
      .then(() => {
        console.log(`[Intercom] Wave notifications complete for RFQ ${rfqId}: ${results.sent} sent, ${results.failed} failed`);
      })
      .catch((error) => {
        console.error(`[Intercom] Error in async wave notifications for RFQ ${rfqId}:`, error);
      });
    
    return results; // Return immediately
  } else {
    // Synchronous - wait for all notifications
    await Promise.all(waveEntries.map(sendNotification));
    console.log(`[Intercom] Wave notifications complete for RFQ ${rfqId}: ${results.sent} sent, ${results.failed} failed`);
    return results;
  }
}

/**
 * Helper to extract wave entries from distribution result.
 * Converts the auditLog from createDistributionWaves to notification entries.
 * 
 * @param {Array} auditLog - Audit log from createDistributionWaves
 * @returns {Array} Wave entries for notification
 */
function extractWaveEntries(auditLog) {
  if (!Array.isArray(auditLog)) return [];
  
  return auditLog.map(entry => ({
    supplier_id: entry.supplier_id,
    wave_number: entry.wave_number,
    access_level: entry.access_level || (entry.is_shadow ? 'outreach_only' : 'full')
  }));
}

module.exports = {
  client,
  mapUserTierToTags,
  syncUsersToIntercom,
  triggerWaveNotifications,
  extractWaveEntries,
  TIER_TAG_MAP
};
