import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

const MOCK_PRODUCTS = [
  {
    id: '1',
    name: 'Eco-Batt Insulation',
    category: 'Insulation',
    status: 'approved',
    carbon_footprint: 1.2,
    source: 'verified',
    image_url: 'https://images.unsplash.com/photo-1600607686527-6fb886090705?auto=format&fit=crop&q=80&w=200'
  },
  {
    id: '2',
    name: 'Recycled Steel Beams',
    category: 'Structural',
    status: 'pending_approval',
    carbon_footprint: 0.8,
    source: 'user',
    image_url: 'https://images.unsplash.com/photo-1535732759880-bbd5c7265e3f?auto=format&fit=crop&q=80&w=200'
  },
  {
    id: '3',
    name: 'Bamboo Flooring',
    category: 'Flooring',
    status: 'draft',
    carbon_footprint: 0.5,
    source: 'scraper',
    image_url: 'https://images.unsplash.com/photo-1516455590571-18256e5bb9ff?auto=format&fit=crop&q=80&w=200'
  }
];

export async function GET() {
  try {
    try {
        const text = `SELECT * FROM products ORDER BY created_at DESC`;
        const res = await query(text);
        if (res.rows.length > 0) {
            return NextResponse.json(res.rows);
        }
    } catch (e) {
        console.warn("DB failed, using mock products");
    }
    return NextResponse.json(MOCK_PRODUCTS);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, category, carbon_footprint } = body;

        // Validation would go here

        try {
            const text = `
                INSERT INTO products (name, category, carbon_footprint_kgco2e, status, source)
                VALUES ($1, $2, $3, 'draft', 'user')
                RETURNING *
            `;
            const values = [name, category, carbon_footprint];
            const res = await query(text, values);
            return NextResponse.json(res.rows[0]);
        } catch (e) {
             console.warn("DB failed, returning mock created product");
             return NextResponse.json({
                 id: Math.random().toString(),
                 name, category, carbon_footprint,
                 status: 'draft', source: 'user'
             });
        }
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
