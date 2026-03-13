import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { sendInAppNotification } from "@/lib/greenchainz";
import { getEasyAuthUser } from "@/lib/auth/easy-auth";

const pool = getPool();

/**
 * POST /api/supplier/onboard
 * 
 * Complete supplier onboarding with profile and filter preferences
 * 
 * Body:
 * - company_name: string
 * - contact_name: string
 * - email: string
 * - phone: string
 * - location: { lat: number, lng: number, address: string }
 * - certifications: string[]
 * - materials_offered: string[] (material IDs or categories)
 * - service_radius_km: number
 * - min_order_value?: number
 * - max_order_value?: number
 * - lead_time_days: number
 * - filter_preferences: {
 *     categories: string[]
 *     min_project_value?: number
 *     max_distance_km?: number
 *     required_certifications?: string[]
 *   }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      company_name,
      contact_name,
      email,
      phone,
      location,
      certifications = [],
      materials_offered = [],
      service_radius_km,
      min_order_value,
      max_order_value,
      lead_time_days,
      filter_preferences = {},
    } = body;

    // Validate required fields
    if (
      !company_name ||
      !contact_name ||
      !email ||
      !phone ||
      !location ||
      !service_radius_km ||
      !lead_time_days
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: company_name, contact_name, email, phone, location, service_radius_km, lead_time_days",
        },
        { status: 400 }
      );
    }

    const user = getEasyAuthUser(request.headers);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: User information not available" },
        { status: 401 }
      );
    }

    const user_id = user.id;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Insert supplier profile
      const supplierResult = await client.query(
        `INSERT INTO Suppliers (
          id,
          company_name,
          contact_name,
          email,
          phone,
          location_lat,
          location_lng,
          address,
          certifications,
          service_radius_km,
          min_order_value,
          max_order_value,
          lead_time_days,
          onboarding_completed,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, NOW(), NOW())
        RETURNING id`,
        [
          user_id,
          company_name,
          contact_name,
          email,
          phone,
          location.lat,
          location.lng,
          location.address,
          JSON.stringify(certifications),
          service_radius_km,
          min_order_value || null,
          max_order_value || null,
          lead_time_days,
        ]
      );

      const supplier_id = supplierResult.rows[0].id;

      // Insert materials offered in bulk to avoid N+1 queries
      if (materials_offered.length > 0) {
        await client.query(
          `INSERT INTO supplier_materials (supplier_id, material_id, created_at)
           SELECT $1, unnest($2::text[]), NOW()
           ON CONFLICT (supplier_id, material_id) DO NOTHING`,
          [supplier_id, materials_offered]
        );
      }

      // Insert filter preferences
      if (filter_preferences.categories && filter_preferences.categories.length > 0) {
        await client.query(
          `INSERT INTO supplier_preferences (
            supplier_id,
            preference_type,
            preference_value,
            created_at
          ) VALUES ($1, 'category_filter', $2, NOW())`,
          [supplier_id, JSON.stringify(filter_preferences.categories)]
        );
      }

      if (filter_preferences.min_project_value) {
        await client.query(
          `INSERT INTO supplier_preferences (
            supplier_id,
            preference_type,
            preference_value,
            created_at
          ) VALUES ($1, 'min_project_value', $2, NOW())`,
          [supplier_id, filter_preferences.min_project_value.toString()]
        );
      }

      if (filter_preferences.max_distance_km) {
        await client.query(
          `INSERT INTO supplier_preferences (
            supplier_id,
            preference_type,
            preference_value,
            created_at
          ) VALUES ($1, 'max_distance_km', $2, NOW())`,
          [supplier_id, filter_preferences.max_distance_km.toString()]
        );
      }

      if (
        filter_preferences.required_certifications &&
        filter_preferences.required_certifications.length > 0
      ) {
        await client.query(
          `INSERT INTO supplier_preferences (
            supplier_id,
            preference_type,
            preference_value,
            created_at
          ) VALUES ($1, 'required_certifications', $2, NOW())`,
          [supplier_id, JSON.stringify(filter_preferences.required_certifications)]
        );
      }

      await client.query("COMMIT");

      // Send welcome notification
      await sendInAppNotification({
        userId: supplier_id,
        title: "Welcome to GreenChainz!",
        body: `Your supplier profile for ${company_name} has been created. You'll start receiving RFQ matches based on your preferences.`,
      });

      return NextResponse.json({
        success: true,
        data: {
          supplier_id,
          company_name,
          onboarding_completed: true,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("[Supplier Onboarding] Error:", error);
    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/supplier/onboard
 * 
 * Get onboarding status for current user
 */
export async function GET(request: NextRequest) {
  try {
    const user = getEasyAuthUser(request.headers);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: User information not available" },
        { status: 401 }
      );
    }

    const user_id = user.id;

    const result = await pool.query(
      `SELECT 
        id,
        company_name,
        onboarding_completed,
        created_at
      FROM Suppliers
      WHERE id = $1`,
      [user_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          onboarding_completed: false,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("[Supplier Onboarding] Error fetching status:", error);
    return NextResponse.json(
      { error: "Failed to fetch onboarding status" },
      { status: 500 }
    );
  }
}
