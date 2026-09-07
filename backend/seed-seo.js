import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const locations = [
  ["Abia", "Umuahia", "South East"], ["Adamawa", "Yola", "North East"], ["Akwa Ibom", "Uyo", "South South"],
  ["Anambra", "Awka", "South East"], ["Bauchi", "Bauchi", "North East"], ["Bayelsa", "Yenagoa", "South South"],
  ["Benue", "Makurdi", "North Central"], ["Borno", "Maiduguri", "North East"], ["Cross River", "Calabar", "South South"],
  ["Delta", "Asaba", "South South"], ["Ebonyi", "Abakaliki", "South East"], ["Edo", "Benin City", "South South"],
  ["Ekiti", "Ado-Ekiti", "South West"], ["Enugu", "Enugu", "South East"], ["Gombe", "Gombe", "North East"],
  ["Imo", "Owerri", "South East"], ["Jigawa", "Dutse", "North West"], ["Kaduna", "Kaduna", "North West"],
  ["Kano", "Kano", "North West"], ["Katsina", "Katsina", "North West"], ["Kebbi", "Birnin Kebbi", "North West"],
  ["Kogi", "Lokoja", "North Central"], ["Kwara", "Ilorin", "North Central"], ["Lagos", "Ikeja", "South West"],
  ["Nasarawa", "Lafia", "North Central"], ["Niger", "Minna", "North Central"], ["Ogun", "Abeokuta", "South West"],
  ["Ondo", "Akure", "South West"], ["Osun", "Osogbo", "South West"], ["Oyo", "Ibadan", "South West"],
  ["Plateau", "Jos", "North Central"], ["Rivers", "Port Harcourt", "South South"], ["Sokoto", "Sokoto", "North West"],
  ["Taraba", "Jalingo", "North East"], ["Yobe", "Damaturu", "North East"], ["Zamfara", "Gusau", "North West"],
  ["Federal Capital Territory", "Abuja", "North Central"],
];

const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const commercialTemplates = [
  ["cosmetics-store", "commercial", "cosmetics", "buy cosmetics in {capital}"],
  ["beauty-products", "commercial", "beauty", "buy beauty products in {capital}"],
  ["skincare-products", "commercial", "skincare", "buy skincare products in {capital}"],
  ["makeup-products", "commercial", "makeup", "buy makeup products in {capital}"],
  ["cosmetics-online", "commercial", "cosmetics", "online cosmetics store in {state}"],
  ["skincare-online", "commercial", "skincare", "online skincare store in {state}"],
  ["makeup-online", "commercial", "makeup", "online makeup store in {state}"],
  ["beauty-store", "commercial", "beauty", "beauty store in {capital}"],
  ["foundation", "commercial", "foundation", "buy foundation in {capital}"],
  ["lipstick", "commercial", "lipstick", "buy lipstick in {capital}"],
  ["lip-gloss", "commercial", "lip gloss", "buy lip gloss in {capital}"],
  ["serum", "commercial", "serum", "buy face serum in {capital}"],
  ["moisturizer", "commercial", "moisturizer", "buy moisturizer in {capital}"],
  ["perfume", "commercial", "perfume", "buy perfume in {capital}"],
  ["eyeliner", "commercial", "eyeliner", "buy eyeliner in {capital}"],
  ["beauty-products-price", "commercial", "beauty prices", "cosmetics prices in {state}"],
  ["skincare-price", "commercial", "skincare prices", "skincare products prices in {state}"],
  ["makeup-price", "commercial", "makeup prices", "makeup products prices in {state}"],
  ["best-cosmetics", "commercial", "cosmetics", "best cosmetics store in {capital}"],
  ["best-skincare", "commercial", "skincare", "best skincare store in {capital}"],
  ["best-makeup", "commercial", "makeup", "best makeup store in {capital}"],
];

const informationalTemplates = [
  ["choose-foundation", "Foundation", "How to choose a foundation for your skin type and undertone"],
  ["foundation-vs-concealer", "Makeup", "Foundation vs concealer: what each product does and when to use it"],
  ["how-to-apply-foundation", "Makeup", "How to apply foundation for an even, natural-looking finish"],
  ["how-to-apply-concealer", "Makeup", "How to apply concealer without a heavy or cakey finish"],
  ["lip-gloss-vs-lipstick", "Lip", "Lip gloss vs lipstick: differences, finishes and when to choose each"],
  ["how-to-choose-lip-colour", "Lip", "How to choose a lip colour for your makeup look"],
  ["skincare-routine-basics", "Skincare", "Skincare routine basics: cleanser, serum, moisturizer and sunscreen"],
  ["serum-before-moisturizer", "Skincare", "Should serum go before moisturizer? A simple skincare order guide"],
  ["how-to-layer-skincare", "Skincare", "How to layer skincare products in the right order"],
  ["moisturizer-skin-types", "Skincare", "How to choose a moisturizer for different skin types"],
  ["oily-skin-makeup", "Makeup", "How to choose makeup for oily skin"],
  ["dry-skin-makeup", "Makeup", "How to choose makeup for dry skin"],
  ["combination-skin-makeup", "Makeup", "Makeup tips for combination skin"],
  ["sensitive-skin-product-check", "Skincare", "How to check a skincare product before using it on sensitive skin"],
  ["dark-spots-skincare-basics", "Skincare", "Skincare basics for the appearance of dark spots and uneven tone"],
  ["hyperpigmentation-ingredients", "Skincare", "Common skincare ingredients used for uneven skin tone"],
  ["sunscreen-basics", "Skincare", "Why sunscreen matters and how to use it consistently"],
  ["patch-testing-skincare", "Skincare", "How to patch test a new skincare product"],
  ["beauty-product-expiry", "Beauty", "How to tell when makeup and skincare products should be replaced"],
  ["cosmetics-storage", "Beauty", "How to store cosmetics and skincare products properly"],
  ["authentic-cosmetics-check", "Shopping", "What to check when buying authentic cosmetics and skincare products"],
  ["online-cosmetics-shopping", "Shopping", "A practical guide to buying cosmetics online in Nigeria"],
  ["beauty-shopping-checklist", "Shopping", "Beauty shopping checklist: what to compare before buying"],
  ["build-simple-routine", "Skincare", "How to build a simple skincare routine without buying too many products"],
  ["makeup-bag-essentials", "Makeup", "Everyday makeup bag essentials and what each one is for"],
  ["perfume-notes-guide", "Fragrance", "A beginner's guide to perfume notes and fragrance families"],
  ["eyeliner-types-guide", "Makeup", "Eyeliner types explained: pen, pencil and liquid formulas"],
];

const brands = [
  {
    name: "CeraVe",
    slug: "cerave",
    description: "CeraVe skincare products and product information available through Splendid Empire Cosmetics. Check current storefront inventory for availability.",
    priority: 90,
  },
  {
    name: "COSRX",
    slug: "cosrx",
    description: "COSRX skincare products and product information available through Splendid Empire Cosmetics. Check current storefront inventory for availability.",
    priority: 90,
  },
];

const topics = informationalTemplates.map(([slug, category, title]) => ({
  slug,
  title,
  summary: `${title}. This guide is designed to help Nigerian beauty shoppers understand the topic, compare suitable product types and make more informed purchases.`,
  contentType: "guide",
  category,
  audience: "beauty shoppers in Nigeria",
  searchQuestions: JSON.stringify([
    title,
    `${title} Nigeria`,
    `best ${title.toLowerCase()}`,
    `how to ${title.toLowerCase().replace(/^how to /i, "")}`,
  ]),
  priority: 70,
}));

async function main() {
  console.log("Seeding SEO discovery data only — products are untouched.");

  for (const [state, capital, region] of locations) {
    const slug = slugify(`${state}-nigeria`);
    await prisma.seoLocation.upsert({
      where: { slug },
      update: { state, capital, region, isCapital: true, active: true },
      create: {
        state,
        capital,
        region,
        slug,
        isCapital: true,
        description: `Beauty and cosmetics search coverage for ${capital}, the capital of ${state}, Nigeria. This page represents online discovery and service information; it does not claim a physical branch in ${capital}.`,
        priority: state === "Imo" ? 100 : state === "Lagos" || state === "Federal Capital Territory" ? 95 : 60,
      },
    });

    for (const [suffix, intentType, topic, template] of commercialTemplates) {
      const query = template.replaceAll("{capital}", capital).replaceAll("{state}", state);
      const intentSlug = slugify(`${state}-${capital}-${suffix}`);
      await prisma.searchIntent.upsert({
        where: { slug: intentSlug },
        update: { query, intentType, topic, location: capital, active: true },
        create: {
          slug: intentSlug,
          query,
          intentType,
          topic,
          location: capital,
          description: `Commercial search intent for shoppers looking for ${topic} in ${capital}, ${state}.`,
          priority: 60,
        },
      });
    }
  }

  const nationalCommercial = [
    "buy cosmetics online Nigeria", "online cosmetics store Nigeria", "buy skincare products Nigeria",
    "buy makeup products Nigeria", "beauty products online Nigeria", "cosmetics store Nigeria",
    "skincare store Nigeria", "makeup store Nigeria", "foundation price Nigeria", "concealer price Nigeria",
    "serum price Nigeria", "moisturizer price Nigeria", "lipstick price Nigeria", "lip gloss price Nigeria",
    "perfume price Nigeria", "eyeliner price Nigeria", "best skincare products Nigeria", "best makeup products Nigeria",
    "authentic skincare products Nigeria", "authentic cosmetics Nigeria", "beauty products delivery Nigeria",
  ];

  for (const query of nationalCommercial) {
    const slug = slugify(query);
    await prisma.searchIntent.upsert({
      where: { slug },
      update: { query, intentType: "commercial", active: true, priority: 85 },
      create: { slug, query, intentType: "commercial", topic: "beauty shopping", description: `National commercial search intent: ${query}.`, priority: 85 },
    });
  }

  for (const topic of topics) {
    await prisma.contentTopic.upsert({
      where: { slug: topic.slug },
      update: topic,
      create: topic,
    });
  }

  for (const brand of brands) {
    await prisma.seoBrand.upsert({
      where: { slug: brand.slug },
      update: brand,
      create: brand,
    });
  }

  console.log(`Seeded ${locations.length} Nigerian locations, ${locations.length * commercialTemplates.length + nationalCommercial.length} commercial intents, ${topics.length} informational topics and ${brands.length} brands.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
