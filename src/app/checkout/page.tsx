'use client'
import { useState, useEffect } from 'react'
import { useCartStore } from '@/store/cart'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'

export default function CheckoutPage() {
  const router = useRouter()
  const { items, getCartTotal, clearCart } = useCartStore()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    address: '',
    city: ''
  })

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted) return
    
    // Small delay to allow persist middleware to hydrate from localStorage
    const timer = setTimeout(() => {
      if (items.length === 0) {
        router.push('/cart')
      }
    }, 100)
    
    return () => clearTimeout(timer)
  }, [mounted, items, router])

  if (!mounted) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          total: getCartTotal(),
          items: items.map(item => ({
            productId: item.id,
            quantity: item.quantity,
            price: item.price
          }))
        })
      })

      if (!response.ok) {
        const errorData = await response.text()
        console.error('Order creation failed:', response.status, errorData)
        throw new Error('Failed to create order')
      }

      const { orderId } = await response.json()
      console.log('Order created with ID:', orderId)
      
      if (!orderId) {
        throw new Error('No order ID returned')
      }
      
      // Trigger AI call asynchronously (don't wait for it)
      fetch('/api/trigger-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      }).catch(err => console.error('Trigger call error:', err))

      // Clear cart first
      clearCart()
      
      // Show success message
      toast.success('Order placed successfully!')
      
      // Redirect after a small delay to ensure state updates complete
      setTimeout(() => {
        console.log('Redirecting to /orders/' + orderId + '/call')
        router.push(`/orders/${orderId}/call`)
      }, 500)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong')
      console.error('Checkout error:', error)
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-black text-blue-950 mb-8">Checkout</h1>
      
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-blue-950 mb-4">Contact Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input
                required
                type="text"
                className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.customerName}
                onChange={e => setFormData({...formData, customerName: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                required
                type="email"
                className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.customerEmail}
                onChange={e => setFormData({...formData, customerEmail: e.target.value})}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
              <input
                required
                type="tel"
                className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.customerPhone}
                onChange={e => setFormData({...formData, customerPhone: e.target.value})}
              />
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-100">
          <h2 className="text-xl font-bold text-blue-950 mb-4">Shipping Address</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Street Address</label>
              <input
                required
                type="text"
                className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
              <input
                required
                type="text"
                className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.city}
                onChange={e => setFormData({...formData, city: e.target.value})}
              />
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <span className="text-xl font-black text-blue-950">Total to pay</span>
            <span className="text-2xl font-black bg-gradient-to-r from-blue-600 to-red-600 bg-clip-text text-transparent">${getCartTotal().toFixed(2)}</span>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-700 hover:to-red-700 text-white px-8 py-4 rounded-xl font-bold transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                Processing...
              </>
            ) : (
              'Place Order'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
