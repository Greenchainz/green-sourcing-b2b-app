import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/server/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = await request.json();

    if (!role || !["buyer", "supplier", "admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const db = await getDb();
    if (db) {
      await db
        .update(users)
        .set({ role })
        .where(eq(users.openId, session.user.id));
    } else {
      console.warn("Database not configured, skipping user role update.");
    }

    return NextResponse.json({ success: true, role });
  } catch (error) {
    console.error("Error setting user role:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
