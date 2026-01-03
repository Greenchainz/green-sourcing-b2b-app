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

module.exports = {
  client,
  mapUserTierToTags,
  syncUsersToIntercom
};
