import prisma from '@/lib/prisma'
import ProductCard from '@/components/ProductCard'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="space-y-12">
      <section className="text-center py-12 md:py-24 space-y-4">
        <h1 className="text-4xl md:text-6xl font-black tracking-tight bg-gradient-to-r from-blue-700 via-blue-500 to-red-600 bg-clip-text text-transparent">
          Next-Gen Ordering
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto">
          Experience seamless e-commerce with NexusBarry, our AI voice call confirmation agent.
        </p>
      </section>

      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-blue-950">Featured Products</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {products.map((product) => (
            <ProductCard key={product.id} product={product as any} />
          ))}
        </div>
      </section>
    </div>
  )
}
