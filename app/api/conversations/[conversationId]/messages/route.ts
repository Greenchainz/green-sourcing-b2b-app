import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { WebPubSubServiceClient } from "@azure/web-pubsub";
import { getEasyAuthUser } from "@/lib/auth/easy-auth";

const pool = getPool();

// Initialize Azure Web PubSub client
const serviceClient = process.env.AZURE_WEBPUBSUB_CONNECTION_STRING
  ? new WebPubSubServiceClient(
      process.env.AZURE_WEBPUBSUB_CONNECTION_STRING,
      process.env.NEXT_PUBLIC_WEBPUBSUB_HUB || "greenchainz"
    )
  : null;

/**
 * GET /api/conversations/[conversationId]/messages
 * 
 * Fetch messages in a conversation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const { conversationId } = params;
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const before = searchParams.get("before"); // Message ID for pagination

    let query = `
      SELECT 
        m.id,
        m.sender_id,
        m.content,
        m.read,
        m.created_at,
        u.name as sender_name
      FROM messages m
      LEFT JOIN Users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1
    `;

    const params: any[] = [conversationId];
    let paramCount = 2;

    if (before) {
      query += ` AND m.id < $${paramCount}`;
      params.push(before);
      paramCount++;
    }

    query += ` ORDER BY m.created_at DESC LIMIT $${paramCount}`;
    params.push(limit);

    const result = await pool.query(query, params);

    // Mark messages as read for the current user
    const user = getEasyAuthUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user_id = user.id;

    await pool.query(
      `UPDATE messages 
       SET read = true, read_at = NOW() 
       WHERE conversation_id = $1 AND sender_id != $2 AND read = false`,
      [conversationId, user_id]
    );

    return NextResponse.json({
      success: true,
      data: result.rows.reverse(), // Reverse to show oldest first
    });
  } catch (error) {
    console.error("[Messages API] Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/conversations/[conversationId]/messages
 * 
 * Send a message in a conversation
 * 
 * Body:
 * - content: string
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const { conversationId } = params;
    const body = await request.json();
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Message content required" },
        { status: 400 }
      );
    }

    const user = getEasyAuthUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const sender_id = user.id;

    // Insert message
    const result = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, content, read, created_at)
       VALUES ($1, $2, $3, false, NOW())
       RETURNING id, conversation_id, sender_id, content, read, created_at`,
      [conversationId, sender_id, content]
    );

    const message = result.rows[0];

    // Update conversation updated_at
    await pool.query(
      `UPDATE conversations SET updated_at = NOW() WHERE id = $1`,
      [conversationId]
    );

    // Get conversation details for WebSocket broadcast
    const convResult = await pool.query(
      `SELECT buyer_id, supplier_id FROM conversations WHERE id = $1`,
      [conversationId]
    );

    if (convResult.rows.length > 0) {
      const { buyer_id, supplier_id } = convResult.rows[0];
      const recipient_id = sender_id === buyer_id ? supplier_id : buyer_id;

      // Send real-time notification via Azure Web PubSub
      if (serviceClient) {
        try {
          await serviceClient.sendToUser(recipient_id, {
            type: "new_message",
            conversation_id: conversationId,
            message: {
              id: message.id,
              sender_id: message.sender_id,
              content: message.content,
              created_at: message.created_at,
            },
          });
        } catch (wsError) {
          console.error("[WebPubSub] Failed to send message:", wsError);
          // Don't fail the request if WebSocket fails
        }
      }

      // Create notification for recipient
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, metadata, read, created_at)
         VALUES ($1, $2, $3, $4, $5, false, NOW())`,
        [
          recipient_id,
          "new_message",
          "New Message",
          content.substring(0, 100),
          JSON.stringify({ conversation_id: conversationId, message_id: message.id }),
        ]
      );
    }

    return NextResponse.json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error("[Messages API] Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
