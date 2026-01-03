# Intercom Integration

This module provides services for integrating with Intercom.

## Setup

1.  **Environment Variables**:
    Ensure the following environment variables are set:
    *   `INTERCOM_ACCESS_TOKEN`: Access token for Intercom API.
    *   `INTERCOM_WEBHOOK_SECRET`: Secret for verifying webhook signatures (optional but recommended).
    *   `FRONTEND_URL`: URL of the frontend (used in email/message templates).

2.  **Database Migration**:
    Run the SQL in `schema.sql` to create the `Intercom_Contacts` table needed for tracking message history.

## Usage

*   **Initialize**: The client is initialized in `index.js`.
*   **Contacts**: Use `contacts.js` to create/update contacts and add tags.
*   **Messaging**: Use `messaging.js` to send outbound messages (Premium users only) and notifications.
*   **Webhooks**: Use `webhooks.js` to handle events like `conversation.user.replied` and `user.created`.

## Files

*   `index.js`: Entry point, client initialization, tag mapping.
*   `contacts.js`: Contact management (create, update, tag).
*   `messaging.js`: Outbound messaging and notifications.
*   `webhooks.js`: Webhook handlers.
*   `schema.sql`: Database schema for tracking.
