import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getRfqDetail,
  updateRfqStatus,
  matchSuppliersToRfq,
} from '@/lib/services/rfq-service'
import { RfqStatus } from '@prisma/client'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [rfq, matches] = await Promise.all([
      getRfqDetail(params.id, session.user.id),
      matchSuppliersToRfq(params.id),
    ])

    return NextResponse.json({ rfq, matches })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    const status = message === 'RFQ not found' ? 404 : message === 'Access denied' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { status } = await req.json()
    const updated = await updateRfqStatus(params.id, session.user.id, status as RfqStatus)

    return NextResponse.json({ rfq: updated })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    const status = message === 'Not authorized' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
