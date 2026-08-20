'use client'
import Image from 'next/image'
import { Product } from '@/types'
import { useCartStore } from '@/store/cart'
import toast from 'react-hot-toast'
import { Plus } from 'lucide-react'

export default function ProductCard({ product }: { product: Product }) {
  const addItem = useCartStore((state) => state.addItem)

  const handleAddToCart = () => {
    addItem(product)
    toast.success(`Added ${product.name} to cart`)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden hover:shadow-md hover:shadow-blue-100 transition-shadow duration-300 flex flex-col h-full">
      <div className="relative h-64 w-full bg-blue-50 flex-shrink-0">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1 bg-white/90 backdrop-blur text-xs font-semibold text-blue-900 rounded-full shadow-sm">
            {product.category}
          </span>
        </div>
      </div>
      <div className="p-6 flex flex-col flex-grow">
        <h3 className="text-lg font-bold text-blue-950 mb-2">{product.name}</h3>
        <p className="text-slate-500 text-sm mb-6 line-clamp-2 flex-grow">{product.description}</p>
        <div className="flex items-center justify-between mt-auto">
          <span className="text-xl font-black text-blue-950">${product.price.toFixed(2)}</span>
          <button
            onClick={handleAddToCart}
            className="flex items-center justify-center bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-700 hover:to-red-700 text-white rounded-full px-4 py-2 transition-all active:scale-95 gap-2 font-medium"
            aria-label={`Add ${product.name} to cart`}
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
