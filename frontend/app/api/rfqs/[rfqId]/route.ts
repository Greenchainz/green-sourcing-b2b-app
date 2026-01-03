import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// GET /api/rfqs/[rfqId] - Get single RFQ
export async function GET(
  req: NextRequest,
  { params }: { params: { rfqId: string } }
) {
  try {
    const { data, error } = await supabase
      .from('rfqs')
      .select('*')
      .eq('id', params.rfqId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json({ error: 'RFQ not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('RFQ fetch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
