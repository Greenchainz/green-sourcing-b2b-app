import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// POST /api/rfqs/[rfqId]/responses - Supplier submits bid
export async function POST(
  req: NextRequest,
  { params }: { params: { rfqId: string } }
) {
  try {
    const { quotedPrice, availabilityDate, notes, attachments } = await req.json();

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get supplier ID from user metadata or suppliers table
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    // Insert response
    const { data, error } = await supabase
      .from('rfq_responses')
      .insert([
        {
          rfq_id: params.rfqId,
          supplier_id: supplier.id,
          quoted_price: quotedPrice,
          availability_date: availabilityDate,
          notes,
          attachments,
          status: 'pending',
        },
      ])
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data[0], { status: 201 });
  } catch (err) {
    console.error('RFQ response error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/rfqs/[rfqId]/responses - Get all responses for an RFQ
export async function GET(
  req: NextRequest,
  { params }: { params: { rfqId: string } }
) {
  try {
    const { data, error } = await supabase
      .from('rfq_responses')
      .select('*, suppliers(name, certifications)')
      .eq('rfq_id', params.rfqId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('RFQ responses fetch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
