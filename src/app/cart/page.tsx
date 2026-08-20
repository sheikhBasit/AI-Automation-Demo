'use client'
import { useCartStore } from '@/store/cart'
import CartItem from '@/components/CartItem'
import Link from 'next/link'
import { ArrowRight, ShoppingBag } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function CartPage() {
  const [mounted, setMounted] = useState(false)
  const { items, getCartTotal } = useCartStore()

  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <div className="bg-blue-50 p-6 rounded-full mb-6">
          <ShoppingBag className="h-12 w-12 text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-blue-950 mb-2">Your cart is empty</h2>
        <p className="text-slate-500 mb-8 max-w-sm">
          Looks like you haven't added any items to your cart yet.
        </p>
        <Link
          href="/"
          className="bg-gradient-to-r from-blue-600 to-red-600 text-white px-8 py-4 rounded-xl font-bold hover:from-blue-700 hover:to-red-700 transition-all"
        >
          Start Shopping
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-black text-blue-950 mb-8">Shopping Cart</h1>

      <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6 mb-8 flex flex-col">
        {items.map((item) => (
          <CartItem key={item.id} item={item} />
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-slate-500">Subtotal</span>
          <span className="font-bold text-blue-950">${getCartTotal().toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between mb-6 pb-6 border-b border-blue-100">
          <span className="text-slate-500">Shipping</span>
          <span className="text-green-600 font-medium">Free</span>
        </div>
        <div className="flex items-center justify-between mb-8">
          <span className="text-xl font-black text-blue-950">Total</span>
          <span className="text-2xl font-black bg-gradient-to-r from-blue-600 to-red-600 bg-clip-text text-transparent">${getCartTotal().toFixed(2)}</span>
        </div>

        <Link
          href="/checkout"
          className="w-full flex items-center justify-center bg-gradient-to-r from-blue-600 to-red-600 text-white px-8 py-4 rounded-xl font-bold hover:from-blue-700 hover:to-red-700 transition-all group"
        >
          Proceed to Checkout
          <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  )
}
