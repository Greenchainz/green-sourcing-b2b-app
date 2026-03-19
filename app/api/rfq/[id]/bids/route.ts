import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { submitBid, acceptBid, rejectBid } from '@/lib/services/rfq-service'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { action, bidId, ...bidData } = body

    if (action === 'accept') {
      if (!bidId) return NextResponse.json({ error: 'bidId required' }, { status: 400 })
      const bid = await acceptBid(bidId, session.user.id)
      return NextResponse.json({ bid })
    }

    if (action === 'reject') {
      if (!bidId) return NextResponse.json({ error: 'bidId required' }, { status: 400 })
      const bid = await rejectBid(bidId, session.user.id)
      return NextResponse.json({ bid })
    }

    // Default: supplier submitting a new bid
    const bid = await submitBid({
      rfqId: params.id,
      supplierId: session.user.id,
      totalPrice: bidData.totalPrice,
      leadDays: bidData.leadDays,
      notes: bidData.notes,
    })

    return NextResponse.json({ bid }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    const status =
      message === 'RFQ not found' ? 404
      : message === 'Not authorized' ? 403
      : message.includes('already submitted') ? 409
      : message.includes('no longer accepting') ? 422
      : 500
    return NextResponse.json({ error: message }, { status })
  }
}
