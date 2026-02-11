// app/api/leads/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface LeadSubmission {
  email: string;
  name?: string;
  company?: string;
  toolName: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: LeadSubmission = await request.json();

    // Validate required fields
    if (!body.email || !body.toolName) {
      return NextResponse.json(
        { error: 'Email and toolName are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate tool name
    const validTools = ['Excel Audit', 'Browser Extension', 'Revit Plugin', 'Submittal Generator'];
    if (!validTools.includes(body.toolName)) {
      return NextResponse.json(
        { error: 'Invalid tool name' },
        { status: 400 }
      );
    }

    // Insert lead into database (ON CONFLICT DO NOTHING to handle duplicates)
    const result = await query(
      `INSERT INTO leads (email, name, company, tool_name, source)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email, tool_name) DO NOTHING
       RETURNING id, email, tool_name, created_at`,
      [
        body.email.toLowerCase().trim(),
        body.name?.trim() || null,
        body.company?.trim() || null,
        body.toolName,
        'website'
      ]
    );

    // Check if lead was inserted or already existed
    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: 'You are already on the waitlist for this tool',
          duplicate: true
        },
        { status: 200 }
      );
    }

    const lead = result.rows[0];

    console.log('[Leads] New lead captured:', {
      id: lead.id,
      email: lead.email,
      tool: lead.tool_name,
      timestamp: lead.created_at
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Successfully joined the waitlist!',
        lead: {
          id: lead.id,
          email: lead.email,
          toolName: lead.tool_name,
          createdAt: lead.created_at
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('[Leads] Error capturing lead:', error);

    return NextResponse.json(
      {
        error: 'Failed to submit. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve leads (admin only - add auth later)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const toolName = searchParams.get('tool');

    let sql = 'SELECT id, email, name, company, tool_name, created_at FROM leads';
    const params: any[] = [];

    if (toolName) {
      sql += ' WHERE tool_name = $1';
      params.push(toolName);
    }

    sql += ' ORDER BY created_at DESC LIMIT 1000';

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      count: result.rows.length,
      leads: result.rows
    });

  } catch (error) {
    console.error('[Leads] Error fetching leads:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch leads',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
