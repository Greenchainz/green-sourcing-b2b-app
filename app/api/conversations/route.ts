import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getEasyAuthUser } from "@/lib/auth/easy-auth";

const pool = getPool();

/**
 * GET /api/conversations
 * 
 * List conversations for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const user = getEasyAuthUser(request.headers);
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user_id = user.id;

    const result = await pool.query(
      `SELECT 
        c.id,
        c.rfq_id,
        c.buyer_id,
        c.supplier_id,
        c.created_at,
        c.updated_at,
        r.project_name,
        CASE 
          WHEN c.buyer_id = $1 THEN s.company_name
          ELSE b.name
        END as other_party_name,
        CASE 
          WHEN c.buyer_id = $1 THEN 'supplier'
          ELSE 'buyer'
        END as other_party_type,
        (
          SELECT COUNT(*) 
          FROM messages m 
          WHERE m.conversation_id = c.id 
            AND m.sender_id != $1 
            AND m.read = false
        ) as unread_count,
        (
          SELECT m.content 
          FROM messages m 
          WHERE m.conversation_id = c.id 
          ORDER BY m.created_at DESC 
          LIMIT 1
        ) as last_message,
        (
          SELECT m.created_at 
          FROM messages m 
          WHERE m.conversation_id = c.id 
          ORDER BY m.created_at DESC 
          LIMIT 1
        ) as last_message_at
      FROM conversations c
      LEFT JOIN RFQs r ON c.rfq_id = r.id
      LEFT JOIN Suppliers s ON c.supplier_id = s.id
      LEFT JOIN Users b ON c.buyer_id = b.id
      WHERE c.buyer_id = $1 OR c.supplier_id = $1
      ORDER BY last_message_at DESC NULLS LAST, c.created_at DESC`,
      [user_id]
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("[Conversations API] Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/conversations
 * 
 * Create a new conversation
 * 
 * Body:
 * - rfq_id: string
 * - supplier_id: string
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rfq_id, supplier_id, buyer_id: body_buyer_id } = body;

    const user = getEasyAuthUser(request.headers);
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let buyer_id: string;
    let supplier_id_resolved: string;
    let rfq_id_resolved: string | null = rfq_id || null;

    if (supplier_id) {
      // Buyer-initiated: current user is the buyer, supplier_id provided in body
      buyer_id = user.id;
      supplier_id_resolved = supplier_id;
    } else if (body_buyer_id) {
      // Supplier-initiated: current user is the supplier, buyer_id provided in body
      supplier_id_resolved = user.id;
      buyer_id = body_buyer_id;
    } else {
      return NextResponse.json(
        { error: "supplier_id or buyer_id required" },
        { status: 400 }
      );
    }

    // Check if conversation already exists
    const existingParams: (string | null)[] = [buyer_id, supplier_id_resolved];
    let existingQuery = `SELECT id FROM conversations WHERE buyer_id = $1 AND supplier_id = $2`;
    if (rfq_id_resolved) {
      existingQuery += ` AND rfq_id = $3`;
      existingParams.push(rfq_id_resolved);
    } else {
      existingQuery += ` AND rfq_id IS NULL`;
    }

    const existingResult = await pool.query(existingQuery, existingParams);

    if (existingResult.rows.length > 0) {
      return NextResponse.json({
        success: true,
        data: { id: existingResult.rows[0].id },
        message: "Conversation already exists",
      });
    }

    // Create new conversation
    const result = await pool.query(
      `INSERT INTO conversations (rfq_id, buyer_id, supplier_id, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING id, rfq_id, buyer_id, supplier_id, created_at`,
      [rfq_id_resolved, buyer_id, supplier_id_resolved]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("[Conversations API] Error creating conversation:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}
