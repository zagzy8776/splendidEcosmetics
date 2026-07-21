import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const products = [
  { id: "p1", name: "Velvet Matte Foundation", category: "Foundation", price: 8500, image: "https://images.unsplash.com/photo-1631730486572-226d1f595b68?w=500&h=500&fit=crop", description: "Full-coverage foundation with a luxurious velvet matte finish. 24-hour wear.", inStock: true, badge: "NEW", rating: 4.8, reviews: 124 },
  { id: "p2", name: "Rose Petal Lip Gloss", category: "Lipstick", price: 3200, image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&h=500&fit=crop", description: "Hydrating gloss with a stunning rose petal tint. Kiss-proof formula.", inStock: true, badge: "BESTSELLER", rating: 4.9, reviews: 89 },
  { id: "p3", name: "24K Glow Serum 30ml", category: "Serum", price: 12500, image: "https://images.unsplash.com/photo-1582616698198-f978da534162?w=500&h=500&fit=crop", description: "Gold-infused brightening serum. Visibly radiant skin in 7 days.", inStock: true, badge: "HOT", rating: 4.7, reviews: 203 },
  { id: "p4", name: "Precision Eyeliner Pen", category: "Eyeliner", price: 2800, image: "https://images.unsplash.com/photo-1531646317777-0619c7c5d1d3?w=500&h=500&fit=crop", description: "Ultra-fine tip for perfect wings every time. Waterproof 36hr wear.", inStock: true, rating: 4.6, reviews: 67 },
  { id: "p5", name: "Ivory Shea Moisturizer", category: "Moisturizer", price: 6800, image: "https://images.unsplash.com/photo-1643168186368-c42359c82573?w=500&h=500&fit=crop", description: "Rich hydrating cream with shea butter & vitamin E. For all skin types.", inStock: true, rating: 4.8, reviews: 156 },
  { id: "p6", name: "Nude Lip Collection Set", category: "Lipstick", price: 4500, image: "https://images.unsplash.com/photo-1676570092589-a6c09ecbb373?w=500&h=500&fit=crop", description: "3 bestselling nude shades in matte, satin & glossy finishes.", inStock: true, badge: "SET", rating: 4.9, reviews: 312 },
  { id: "p7", name: "Empress Parfum 50ml", category: "Perfume", price: 18000, image: "https://images.unsplash.com/photo-1631730359585-38a4935cbec4?w=500&h=500&fit=crop", description: "Signature floral-musk fragrance. Notes of rose, jasmine & amber.", inStock: false, badge: "LUXURY", rating: 4.9, reviews: 44 },
  { id: "p8", name: "Flawless Concealer", category: "Foundation", price: 5200, image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500&h=500&fit=crop", description: "Medium-to-full coverage. Blends seamlessly into all Nigerian skin tones.", inStock: true, rating: 4.7, reviews: 98 },
];

async function main() {
  console.log("Seeding database...");

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: product,
      create: product,
    });
  }

  console.log(`Seeded ${products.length} products successfully!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });