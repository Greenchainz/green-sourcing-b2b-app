const { pool } = require('../../db');
const { client } = require('./index');
const { createContact, updateContact } = require('./contacts');

async function handleWebhook(req, res) {
  // Verify signature if needed (requires raw body)
  // const signature = req.headers['x-hub-signature'];
  // ... verification logic ...

  const { topic, data } = req.body;

  if (!data || !data.item) {
    return res.status(400).send('Invalid payload');
  }

  const item = data.item;

  try {
    console.log(`Received Intercom webhook: ${topic}`);

    switch (topic) {
      case 'conversation.user.replied':
        await handleUserReplied(item);
        break;
      case 'user.created':
        await handleUserCreated(item);
        break;
      default:
        // Ignore other events
        break;
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error handling Intercom webhook:', error);
    res.status(500).send('Internal Server Error');
  }
}

async function handleUserReplied(conversation) {
  // Track engagement
  // conversation.source.author is the user
  const author = conversation.source.author;

  if (author && author.type === 'user') {
    const userId = author.user_id; // external_id
    const intercomId = author.id;

    console.log(`User replied in conversation ${conversation.id}. UserID: ${userId}, IntercomID: ${intercomId}`);

    if (userId) {
      // Update LastActive in Users table if possible
      try {
        await pool.query('UPDATE Users SET LastLogin = NOW() WHERE UserID = $1', [userId]);

        // Also log to Intercom_Contacts if tracking engagement there
        // Assuming MessageType 'reply'
         await pool.query(
            `INSERT INTO Intercom_Contacts (UserID, MessageType, SentAt) VALUES ($1, $2, NOW())`,
            [userId, 'reply']
        ).catch(() => {}); // Ignore error if table missing

      } catch (e) {
        console.error('Error updating user engagement:', e.message);
      }
    }
  }
}

async function handleUserCreated(user) {
  // user.created event
  // Check if user exists in our DB by email
  const email = user.email;
  const intercomId = user.id;

  if (email) {
    try {
      const result = await pool.query('SELECT UserID, Tier, Role FROM Users WHERE Email = $1', [email]);

      if (result.rows.length > 0) {
        const dbUser = result.rows[0];
        console.log(`User matched in DB: ${dbUser.userid}. Syncing data to Intercom.`);

        // Sync our data TO Intercom (ensure consistency)
        // We use updateContact logic which uses external_id (UserID)
        // Since we have the Intercom ID now, we can link them if we stored IntercomID.

        // For now, just ensure attributes are up to date in Intercom
        const updateData = {
          custom_attributes: {
            tier: dbUser.tier,
            role: dbUser.role,
            sync_source: 'webhook_match'
          }
        };

        // We can update by Intercom ID since we have it from webhook
        // We perform a direct update to link the external_id
        try {
          await client.contacts.update({
            id: intercomId,
            external_id: dbUser.userid,
            ...updateData
          });
          console.log(`Linked Intercom user ${intercomId} to DB user ${dbUser.userid}`);
        } catch (linkError) {
          console.error('Error linking user in Intercom:', linkError.message);
        }
      } else {
        console.log(`User created in Intercom (${email}) but not found in DB.`);
      }
    } catch (e) {
      console.error('Error syncing user from Intercom webhook:', e.message);
    }
  }
}

module.exports = {
  handleWebhook
};
