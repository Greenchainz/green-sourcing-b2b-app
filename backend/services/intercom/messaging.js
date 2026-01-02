const { client } = require('./index');
const { pool } = require('../../db');

// Check if user is eligible for outbound messaging (Pro or Enterprise)
async function checkOutboundEligibility(userId) {
  try {
    const result = await pool.query('SELECT Tier FROM Users WHERE UserID = $1', [userId]);
    if (result.rows.length === 0) return false;

    const tier = result.rows[0].tier;
    // If Tier is null/undefined, default to false.
    return tier === 'pro' || tier === 'enterprise';
  } catch (error) {
    console.error(`Error checking eligibility for user ${userId}:`, error.message);
    return false;
  }
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
  const { bypassEligibility = false, messageType = 'outbound_message' } = options;

  if (!bypassEligibility) {
    const isEligible = await checkOutboundEligibility(userId);
    if (!isEligible) {
      console.warn(`User ${userId} is not eligible for outbound messages.`);
      return null;
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

    return result;
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
  sendRFQNotification,
  sendQuoteUpdate,
  trackMessageSent
};
