'use client'
import Image from 'next/image'
import { CartItem as CartItemType } from '@/store/cart'
import { useCartStore } from '@/store/cart'
import { Minus, Plus, Trash2 } from 'lucide-react'

export default function CartItem({ item }: { item: CartItemType }) {
  const { updateQuantity, removeItem } = useCartStore()

  return (
    <div className="flex items-center py-6 border-b border-gray-100 last:border-0">
      <div className="relative h-24 w-24 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
        <Image src={item.image} alt={item.name} fill className="object-cover" />
      </div>
      <div className="ml-6 flex-grow">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-blue-950 text-lg">{item.name}</h3>
            <p className="text-gray-500 text-sm">{item.category}</p>
          </div>
          <span className="font-bold text-blue-950">${(item.price * item.quantity).toFixed(2)}</span>
        </div>
        
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-200">
            <button
              onClick={() => updateQuantity(item.id, item.quantity - 1)}
              className="p-1 rounded-md hover:bg-white hover:shadow-sm transition-all cursor-pointer disabled:opacity-50"
              disabled={item.quantity <= 1}
            >
              <Minus className="h-4 w-4 text-gray-600" />
            </button>
            <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
            <button
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
              className="p-1 rounded-md hover:bg-white hover:shadow-sm transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4 text-gray-600" />
            </button>
          </div>
          <button
            onClick={() => removeItem(item.id)}
            className="text-red-500 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors cursor-pointer"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
