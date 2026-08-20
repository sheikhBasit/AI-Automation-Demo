import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { orderId, confirmed } = body

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
    }

    const status = confirmed ? 'CONFIRMED' : 'CANCELLED'
    const callStatus = confirmed ? 'CONFIRMED_BY_CALL' : 'CANCELLED_BY_CALL'

    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        callStatus
      }
    })

    return NextResponse.json({ success: true, order })
  } catch (error) {
    console.error('Webhook dispatch error:', error)
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 })
  }
}
