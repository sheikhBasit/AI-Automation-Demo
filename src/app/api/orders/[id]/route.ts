import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    })

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    return NextResponse.json(order)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const { status, callStatus, callRoomUrl } = body

    const updateData: any = {}
    if (status !== undefined) updateData.status = status
    if (callStatus !== undefined) updateData.callStatus = callStatus
    if (callRoomUrl !== undefined) updateData.callRoomUrl = callRoomUrl

    const order = await prisma.order.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(order)
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    console.error('Update order error:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
