import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const products = [
    {
      name: 'Wireless Pro Headphones',
      description: 'High-quality wireless headphones with noise cancellation.',
      price: 89.99,
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80',
      category: 'Electronics',
    },
    {
      name: 'Smart Watch Series X',
      description: 'Advanced smartwatch with health tracking and GPS.',
      price: 199.99,
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80',
      category: 'Electronics',
    },
    {
      name: 'USB-C 7-in-1 Hub',
      description: 'Versatile USB-C hub with HDMI, USB 3.0, and SD card reader.',
      price: 45.99,
      image: 'https://images.unsplash.com/photo-1592503254549-317f22588c87?w=500&q=80',
      category: 'Electronics',
    },
    {
      name: 'Premium Cotton Hoodie',
      description: 'Comfortable and stylish premium cotton hoodie.',
      price: 69.99,
      image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500&q=80',
      category: 'Clothing',
    },
    {
      name: 'Slim Fit Stretch Jeans',
      description: 'Classic slim fit stretch jeans for everyday wear.',
      price: 59.99,
      image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=500&q=80',
      category: 'Clothing',
    },
    {
      name: 'French Press Coffee Maker',
      description: 'Classic glass french press coffee maker.',
      price: 34.99,
      image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500&q=80',
      category: 'Home & Kitchen',
    },
    {
      name: 'Bamboo Cutting Board Set',
      description: 'Set of 3 durable bamboo cutting boards.',
      price: 24.99,
      image: 'https://images.unsplash.com/photo-1593001874114-118c89b703e7?w=500&q=80',
      category: 'Home & Kitchen',
    },
    {
      name: 'Professional Yoga Mat',
      description: 'Non-slip professional yoga mat with carrying strap.',
      price: 29.99,
      image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500&q=80',
      category: 'Sports',
    }
  ]

  console.log('Start seeding...')
  for (const p of products) {
    const product = await prisma.product.create({
      data: p,
    })
    console.log(`Created product with id: ${product.id}`)
  }
  console.log('Seeding finished.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
