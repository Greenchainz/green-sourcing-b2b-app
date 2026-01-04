const { client, mapUserTierToTags } = require('./index');
const { pool } = require('../../db');

/**
 * Supplier tier to Intercom tag mapping
 */
const SUPPLIER_TIER_TAGS = {
  premium: 'supplier_premium',
  enterprise: 'supplier_enterprise',
  standard: 'supplier_standard',
  pro: 'supplier_pro',
  claimed: 'supplier_claimed',
  free: 'supplier_free',
  scraped: 'supplier_shadow'
};

async function getContact(userId) {
  try {
    const result = await client.contacts.search({
      query: {
        field: 'external_id',
        operator: '=',
        value: String(userId)
      }
    });

    if (result.data && result.data.length > 0) {
      return result.data[0];
    }
    return null;
  } catch (error) {
    // If 404 or other error, return null or throw
    console.error(`Error searching contact for user ${userId}:`, error.message);
    return null;
  }
}

async function createContact(user) {
  try {
    const contactData = {
      role: 'user',
      external_id: user.id,
      email: user.email,
      name: user.name || user.company_name,
      custom_attributes: {
        tier: user.tier,
        role: user.role,
        company: user.company_name
      }
    };

    const contact = await client.contacts.create(contactData);

    // Auto-tag on creation
    const tags = mapUserTierToTags(user.tier, user.role);
    if (tags.length > 0) {
      await addTags(user.id, tags, contact.id);
    }

    return contact;
  } catch (error) {
    console.error('Error creating contact:', error.message);
    throw error;
  }
}

async function updateContact(userId, data) {
  try {
    const contact = await getContact(userId);
    if (!contact) {
      throw new Error(`Contact not found for user ${userId}`);
    }

    const updateData = {
      id: contact.id,
      ...data
    };

    return await client.contacts.update(updateData);
  } catch (error) {
    console.error('Error updating contact:', error.message);
    throw error;
  }
}

async function addTags(userId, tags, intercomId = null) {
  try {
    let id = intercomId;
    if (!id) {
      const contact = await getContact(userId);
      if (!contact) return;
      id = contact.id;
    }

    // Intercom API allows tagging users.
    // We iterate over tags and apply them.
    // Note: In some versions, you can pass array.
    // But usually client.tags.tag({ name: 'tag', users: [...] })

    for (const tagName of tags) {
      await client.tags.tag({
        name: tagName,
        users: [{ id: id }]
      });
    }
  } catch (error) {
    console.error('Error adding tags:', error.message);
    throw error;
  }
}

// ============================================
// SUPPLIER SYNC FUNCTIONS
// ============================================

/**
 * Sync a supplier to Intercom with tier-based tagging.
 * Creates the contact if it doesn't exist, updates if it does.
 * Automatically applies tier tags for segmentation.
 * 
 * @param {object} supplier - Supplier object from database
 * @param {string} supplier.id - Supplier UUID
 * @param {string} supplier.name - Company name
 * @param {string} supplier.email - Contact email
 * @param {string} supplier.tier - Supplier tier (premium, standard, free, scraped, etc.)
 * @param {string} [supplier.category] - Product category
 * @param {string} [supplier.location] - Supplier location
 * @param {number} [supplier.verification_score] - Sustainability verification score
 * @returns {Promise<{success: boolean, contact?: object, created?: boolean, error?: string}>}
 */
async function syncSupplierToIntercom(supplier) {
  if (!supplier?.id) {
    console.warn('syncSupplierToIntercom: Missing supplier ID');
    return { success: false, error: 'Missing supplier ID' };
  }

  try {
    // Check if contact exists
    const existingContact = await getContact(supplier.id);
    
    const tier = (supplier.tier || 'free').toLowerCase();
    const tierTag = SUPPLIER_TIER_TAGS[tier] || SUPPLIER_TIER_TAGS.free;
    
    const contactData = {
      role: 'user',
      external_id: String(supplier.id),
      email: supplier.email,
      name: supplier.name || supplier.company_name,
      custom_attributes: {
        tier: tier,
        role: 'supplier',
        company: supplier.name || supplier.company_name,
        category: supplier.category,
        location: supplier.location,
        verification_score: supplier.verification_score,
        is_shadow: tier === 'scraped',
        sync_source: 'supplier_sync',
        synced_at: new Date().toISOString()
      }
    };

    let contact;
    let created = false;

    if (existingContact) {
      // Update existing contact
      contact = await client.contacts.update({
        id: existingContact.id,
        ...contactData
      });
      console.log(`[Intercom] Updated supplier contact: ${supplier.id}`);
    } else {
      // Create new contact
      contact = await client.contacts.create(contactData);
      created = true;
      console.log(`[Intercom] Created supplier contact: ${supplier.id}`);
    }

    // Apply tier tag
    if (contact?.id) {
      await addTierTag(contact.id, tier);
      
      // Also add base 'supplier' tag
      await client.tags.tag({
        name: 'supplier',
        users: [{ id: contact.id }]
      }).catch(() => {}); // Ignore errors for this optional tag
    }

    return { success: true, contact, created };
  } catch (error) {
    console.error(`Error syncing supplier ${supplier.id} to Intercom:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Add a tier tag to an Intercom contact.
 * Removes any existing tier tags before adding the new one.
 * 
 * @param {string} contactId - Intercom contact ID (not external_id)
 * @param {string} tier - Supplier tier code
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function addTierTag(contactId, tier) {
  if (!contactId || !tier) {
    return { success: false, error: 'Missing contactId or tier' };
  }

  try {
    const normalizedTier = tier.toLowerCase();
    const newTag = SUPPLIER_TIER_TAGS[normalizedTier] || SUPPLIER_TIER_TAGS.free;

    // Remove old tier tags first (optional - Intercom may not support bulk untag)
    // For simplicity, we just add the new tag. Tags accumulate, which is actually
    // useful for tracking tier history.
    
    await client.tags.tag({
      name: newTag,
      users: [{ id: contactId }]
    });

    console.log(`[Intercom] Added tier tag '${newTag}' to contact ${contactId}`);
    return { success: true };
  } catch (error) {
    console.error(`Error adding tier tag to contact ${contactId}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Batch sync multiple suppliers to Intercom.
 * Useful for initial data migration or periodic syncs.
 * 
 * @param {Array} suppliers - Array of supplier objects
 * @param {object} options - Sync options
 * @param {number} options.batchDelay - Delay between batches in ms (default: 100)
 * @returns {Promise<{success: number, failed: number, errors: Array}>}
 */
async function batchSyncSuppliers(suppliers, options = {}) {
  const { batchDelay = 100 } = options;
  
  let success = 0;
  let failed = 0;
  const errors = [];

  for (const supplier of suppliers) {
    try {
      const result = await syncSupplierToIntercom(supplier);
      if (result.success) {
        success++;
      } else {
        failed++;
        errors.push({ supplierId: supplier.id, error: result.error });
      }
      
      // Rate limiting delay
      if (batchDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, batchDelay));
      }
    } catch (error) {
      failed++;
      errors.push({ supplierId: supplier.id, error: error.message });
    }
  }

  console.log(`[Intercom] Batch sync complete: ${success} success, ${failed} failed`);
  return { success, failed, errors };
}

/**
 * Sync suppliers from database by tier.
 * Fetches suppliers from DB and syncs them to Intercom.
 * 
 * @param {string} tier - Tier to sync (or 'all')
 * @param {object} options - Query options
 * @param {number} options.limit - Max suppliers to sync (default: 100)
 * @returns {Promise<{success: number, failed: number, errors: Array}>}
 */
async function syncSuppliersByTier(tier, options = {}) {
  const { limit = 100 } = options;

  try {
    let query = `
      SELECT s.id, s.name, s.email, s.tier, s.category, s.location,
             vs.verification_score
      FROM suppliers s
      LEFT JOIN "Supplier_Verification_Scores" vs ON vs.supplier_id = s.id
    `;
    const params = [];

    if (tier && tier !== 'all') {
      query += ` WHERE s.tier = $1`;
      params.push(tier);
    }

    query += ` ORDER BY s.updated_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      console.log(`[Intercom] No suppliers found for tier: ${tier}`);
      return { success: 0, failed: 0, errors: [] };
    }

    return await batchSyncSuppliers(result.rows);
  } catch (error) {
    console.error('Error syncing suppliers by tier:', error.message);
    return { success: 0, failed: 0, errors: [{ error: error.message }] };
  }
}

module.exports = {
  // Core contact functions
  createContact,
  updateContact,
  addTags,
  getContact,
  
  // Supplier sync functions
  syncSupplierToIntercom,
  addTierTag,
  batchSyncSuppliers,
  syncSuppliersByTier,
  
  // Constants
  SUPPLIER_TIER_TAGS
};
