const { client, mapUserTierToTags } = require('./index');

async function getContact(userId) {
  try {
    const result = await client.contacts.search({
      query: {
        field: 'external_id',
        operator: '=',
        value: userId
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

module.exports = {
  createContact,
  updateContact,
  addTags,
  getContact
};
