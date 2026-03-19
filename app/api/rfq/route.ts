import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createRfq, getUserRfqs, matchSuppliersToRfq } from '@/lib/services/rfq-service'
import { RfqStatus } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') as RfqStatus | null

    const rfqs = await getUserRfqs(session.user.id, status ?? undefined)
    return NextResponse.json({ rfqs })
  } catch (error) {
    console.error('GET /api/rfq error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const rfq = await createRfq({ ...body, buyerId: session.user.id })

    // Fire supplier matching async — don't block response
    matchSuppliersToRfq(rfq.id)
      .then((matches) => {
        console.log(`✅ Matched ${matches.length} suppliers for RFQ ${rfq.id}`)
        // TODO: send in-app + email notifications to matched suppliers
      })
      .catch((err) => console.error('Supplier matching error:', err))

    return NextResponse.json({ rfq }, { status: 201 })
  } catch (error) {
    console.error('POST /api/rfq error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
