'use client'
import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { CheckCircle2, Clock, XCircle, PhoneCall, Loader2 } from 'lucide-react'
import { Order, OrderItem, Product } from '@/types'

type OrderWithItems = Order & { items: (OrderItem & { product: Product })[] }

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [order, setOrder] = useState<OrderWithItems | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let interval: NodeJS.Timeout

    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${id}`)
        if (res.ok) {
          const data = await res.json()
          setOrder(data)
        }
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
    interval = setInterval(fetchOrder, 5000)

    return () => clearInterval(interval)
  }, [id])

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>
  if (!order) return <div className="text-center py-20">Order not found</div>

  const isConfirmed = order.status === 'CONFIRMED'
  const isCancelled = order.status === 'CANCELLED'

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-blue-100 text-center">
        {isConfirmed ? (
          <div className="inline-flex items-center justify-center p-3 bg-green-100 rounded-full mb-4">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
        ) : isCancelled ? (
          <div className="inline-flex items-center justify-center p-3 bg-red-100 rounded-full mb-4">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
        ) : (
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-blue-100 to-red-100 rounded-full mb-4">
            <Clock className="h-10 w-10 text-blue-600" />
          </div>
        )}

        <h1 className="text-2xl font-bold text-blue-950 mb-2">
          {isConfirmed ? 'Order Confirmed!' : isCancelled ? 'Order Cancelled' : 'Order Pending'}
        </h1>
        <p className="text-slate-500 mb-6">Order #{order.id}</p>

        {order.callRoomUrl && order.status === 'PENDING' && (
          <div className="bg-gradient-to-br from-blue-50 to-red-50 border border-blue-100 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-center mb-4">
              <PhoneCall className="h-6 w-6 text-blue-600 animate-pulse mr-2" />
              <span className="font-semibold text-blue-900">NexusBarry is ready to confirm your order</span>
            </div>
            <Link
              href={`/orders/${order.id}/call`}
              className="inline-block bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-700 hover:to-red-700 text-white px-6 py-3 rounded-lg font-medium transition-all"
            >
              Open Confirmation Call
            </Link>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-100">
        <h2 className="text-xl font-bold text-blue-950 mb-4">Order Items</h2>
        <div className="space-y-4">
          {order.items?.map((item) => (
            <div key={item.id} className="flex justify-between items-center py-2 border-b border-blue-50 last:border-0">
              <div className="flex items-center">
                <span className="text-slate-500 mr-4">{item.quantity}x</span>
                <span className="font-medium text-blue-950">{item.product?.name}</span>
              </div>
              <span className="text-blue-950">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between items-center pt-4">
            <span className="font-bold text-blue-950">Total</span>
            <span className="font-bold bg-gradient-to-r from-blue-600 to-red-600 bg-clip-text text-transparent text-xl">${order.total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
