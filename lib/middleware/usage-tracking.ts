import { NextRequest } from "next/server";
import { getPool } from "@/lib/db";
import { trackUsage } from "@/lib/greenchainz";
import { getEasyAuthUser } from "@/lib/auth/easy-auth";

const pool = getPool();

export interface UsageEvent {
  userId: string;
  endpoint: string;
  method: string;
  statusCode?: number;
  responseTime?: number;
  metadata?: Record<string, any>;
}

/**
 * Track API usage for metering and analytics
 */
export async function trackAPIUsage(event: UsageEvent): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO usage_tracking (
        user_id,
        endpoint,
        method,
        status_code,
        response_time_ms,
        metadata,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        event.userId,
        event.endpoint,
        event.method,
        event.statusCode || null,
        event.responseTime || null,
        event.metadata ? JSON.stringify(event.metadata) : null,
      ]
    );

    // Also track for Microsoft Marketplace metering if applicable
    await trackUsage({
      userId: event.userId,
      dimension: getDimensionForEndpoint(event.endpoint),
      quantity: 1,
    });
  } catch (error) {
    console.error("[Usage Tracking] Failed to track usage:", error);
    // Don't throw - usage tracking failures shouldn't break the API
  }
}

/**
 * Map endpoint to Microsoft Marketplace dimension
 */
function getDimensionForEndpoint(endpoint: string): string {
  const dimensionMap: Record<string, string> = {
    "/api/materials": "material_searches",
    "/api/rfqs": "rfq_creations",
    "/api/conversations": "messages_sent",
    "/api/notifications": "notifications",
  };

  for (const [pattern, dimension] of Object.entries(dimensionMap)) {
    if (endpoint.startsWith(pattern)) {
      return dimension;
    }
  }

  return "api_calls";
}

/**
 * Middleware wrapper to automatically track usage for an API route
 */
export function withUsageTracking(
  handler: (request: NextRequest, context?: any) => Promise<Response>
) {
  return async (request: NextRequest, context?: any): Promise<Response> => {
    const startTime = Date.now();
    
    const user = getEasyAuthUser(request.headers);
    const userId = user?.id || "anonymous";
    
    const endpoint = request.nextUrl.pathname;
    const method = request.method;

    try {
      const response = await handler(request, context);
      const responseTime = Date.now() - startTime;

      // Track usage asynchronously (don't await)
      trackAPIUsage({
        userId,
        endpoint,
        method,
        statusCode: response.status,
        responseTime,
      }).catch((err) => console.error("[Usage Tracking] Error:", err));

      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Track failed request
      trackAPIUsage({
        userId,
        endpoint,
        method,
        statusCode: 500,
        responseTime,
        metadata: { error: String(error) },
      }).catch((err) => console.error("[Usage Tracking] Error:", err));

      throw error;
    }
  };
}

/**
 * Get usage stats for a user
 */
export async function getUserUsageStats(
  userId: string,
  period: "hour" | "day" | "week" | "month" = "day"
): Promise<{
  total_requests: number;
  by_endpoint: Record<string, number>;
  by_status: Record<string, number>;
  avg_response_time: number;
}> {
  try {
    const intervals: Record<string, string> = {
      hour: "1 hour",
      day: "1 day",
      week: "7 days",
      month: "30 days",
    };

    const interval = intervals[period];

    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_requests,
        AVG(response_time_ms) as avg_response_time,
        json_object_agg(endpoint, endpoint_count) as by_endpoint,
        json_object_agg(status_code, status_count) as by_status
      FROM (
        SELECT 
          endpoint,
          status_code,
          response_time_ms,
          COUNT(*) OVER (PARTITION BY endpoint) as endpoint_count,
          COUNT(*) OVER (PARTITION BY status_code) as status_count
        FROM usage_tracking
        WHERE user_id = $1 
          AND created_at > NOW() - INTERVAL '${interval}'
      ) subquery`,
      [userId]
    );

    const row = result.rows[0];

    return {
      total_requests: parseInt(row?.total_requests || "0"),
      by_endpoint: row?.by_endpoint || {},
      by_status: row?.by_status || {},
      avg_response_time: parseFloat(row?.avg_response_time || "0"),
    };
  } catch (error) {
    console.error("[Usage Stats] Error:", error);
    return {
      total_requests: 0,
      by_endpoint: {},
      by_status: {},
      avg_response_time: 0,
    };
  }
}
