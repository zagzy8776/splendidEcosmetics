import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const claims = [
  {
    key: "business-name",
    claim: "Splendid Empire Cosmetics is a beauty and cosmetics business serving customers in Nigeria.",
    claimType: "business",
    value: "Splendid Empire Cosmetics",
    source: "business-confirmed",
    verified: true,
    priority: 100,
  },
  {
    key: "nigeria-market",
    claim: "Splendid Empire Cosmetics serves the Nigerian beauty market through its online storefront.",
    claimType: "market",
    value: "Nigeria",
    source: "business-confirmed",
    verified: true,
    priority: 95,
  },
  {
    key: "cerave-inventory",
    claim: "CeraVe inventory is available through the Splendid Empire Cosmetics storefront; current product availability should be checked before publication of stock-specific copy.",
    claimType: "brand-inventory",
    value: "CeraVe",
    source: "business-confirmed",
    verified: true,
    priority: 90,
  },
  {
    key: "cosrx-inventory",
    claim: "COSRX inventory is available through the Splendid Empire Cosmetics storefront; current product availability should be checked before publication of stock-specific copy.",
    claimType: "brand-inventory",
    value: "COSRX",
    source: "business-confirmed",
    verified: true,
    priority: 90,
  },
  {
    key: "customer-rating",
    claim: "Splendid Empire Cosmetics has a 5/5 customer rating.",
    claimType: "rating",
    value: "5/5",
    source: "business-confirmed",
    verified: true,
    priority: 90,
  },
  {
    key: "customer-reviews",
    claim: "Splendid Empire Cosmetics has 1,200 customer reviews.",
    claimType: "reviews",
    value: "1200",
    source: "business-confirmed",
    verified: true,
    priority: 90,
  },
  {
    key: "owerri-base",
    claim: "Splendid Empire Cosmetics is associated with Owerri, Imo State, Nigeria.",
    claimType: "location",
    value: "Owerri, Imo State",
    source: "business-confirmed",
    verified: true,
    priority: 100,
  },
];

async function main() {
  for (const claim of claims) {
    await prisma.seoClaim.upsert({
      where: { key: claim.key },
      update: claim,
      create: claim,
    });
  }

  console.log(`Seeded ${claims.length} approved business claims.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
