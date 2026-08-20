'use client'
import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { useEffect, useState } from 'react'

export default function Navbar() {
  const [mounted, setMounted] = useState(false)
  const items = useCartStore((state) => state.items)
  
  useEffect(() => setMounted(true), [])
  
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0)

  return (
    <nav className="bg-white/80 backdrop-blur border-b border-blue-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-black tracking-tighter bg-gradient-to-r from-blue-600 to-red-600 bg-clip-text text-transparent">Agentic Order</span>
            </Link>
          </div>
          <div className="flex items-center">
            <Link href="/cart" className="p-2 relative text-blue-900/70 hover:text-red-600 transition-colors">
              <span className="sr-only">Cart</span>
              <ShoppingCart className="h-6 w-6" aria-hidden="true" />
              {mounted && itemCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-gradient-to-r from-blue-600 to-red-600 rounded-full border-2 border-white">
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
