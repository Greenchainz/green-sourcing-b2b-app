import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getEasyAuthUser } from "@/lib/auth/easy-auth";

const pool = getPool();

/**
 * GET /api/notifications
 * 
 * Fetch notifications for the current user
 * 
 * Query Parameters:
 * - unread_only: boolean - only return unread notifications
 * - limit: number - max 100, default 20
 * - offset: number - pagination offset
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const unreadOnly = searchParams.get("unread_only") === "true";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get user from Easy Auth session
    const user = getEasyAuthUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user_id = user.id;

    let query = `
      SELECT 
        id,
        type,
        title,
        message,
        metadata,
        read,
        created_at
      FROM notifications
      WHERE user_id = $1
    `;

    const params: any[] = [user_id];
    let paramCount = 2;

    if (unreadOnly) {
      query += ` AND read = false`;
    }

    query += `
      ORDER BY created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get unread count
    const unreadCountResult = await pool.query(
      `SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = $1 AND read = false`,
      [user_id]
    );

    const unreadCount = parseInt(unreadCountResult.rows[0]?.unread_count || "0");

    return NextResponse.json({
      success: true,
      data: result.rows,
      unread_count: unreadCount,
      pagination: {
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("[Notifications API] Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications
 * 
 * Mark notifications as read
 * 
 * Body:
 * - notification_ids: string[] - IDs to mark as read
 * - mark_all_read: boolean - mark all notifications as read
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { notification_ids, mark_all_read } = body;

    // Get user from Easy Auth session
    const user = getEasyAuthUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user_id = user.id;

    if (mark_all_read) {
      await pool.query(
        `UPDATE notifications SET read = true, read_at = NOW() WHERE user_id = $1 AND read = false`,
        [user_id]
      );

      return NextResponse.json({
        success: true,
        message: "All notifications marked as read",
      });
    }

    if (!notification_ids || notification_ids.length === 0) {
      return NextResponse.json(
        { error: "notification_ids required" },
        { status: 400 }
      );
    }

    const placeholders = notification_ids.map((_, i) => `$${i + 2}`).join(", ");
    const query = `
      UPDATE notifications 
      SET read = true, read_at = NOW() 
      WHERE user_id = $1 AND id IN (${placeholders})
    `;

    await pool.query(query, [user_id, ...notification_ids]);

    return NextResponse.json({
      success: true,
      message: `${notification_ids.length} notifications marked as read`,
    });
  } catch (error) {
    console.error("[Notifications API] Error updating notifications:", error);
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}
