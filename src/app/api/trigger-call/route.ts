import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { orderId } = await request.json()
    
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } }
    })

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const webhookUrl = process.env.N8N_WEBHOOK_URL
    
    if (webhookUrl && webhookUrl.startsWith('http')) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...order, orderId: order.id })
        })
      } catch (e) {
        console.error('Failed to call n8n webhook', e)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Trigger call error:', error)
    return NextResponse.json({ error: 'Failed to trigger call' }, { status: 500 })
  }
}
