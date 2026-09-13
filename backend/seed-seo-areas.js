import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Curated commercial areas, not every street in Nigeria. Each area is intended
// to become a useful local shopping page with real navigation and context.
const areas = [
  ["Abia", "Umuahia", ["Umuahia Main Market", "Bank Road"]],
  ["Adamawa", "Yola", ["Jimeta", "Jambutu"]],
  ["Akwa Ibom", "Uyo", ["Ibom Plaza", "Abak Road"]],
  ["Anambra", "Awka", ["Ifite", "UNIZIK Junction"]],
  ["Bauchi", "Bauchi", ["Wunti", "Central Market"]],
  ["Bayelsa", "Yenagoa", ["Sani Abacha Road", "Swali"]],
  ["Benue", "Makurdi", ["Wurukum", "High Level"]],
  ["Borno", "Maiduguri", ["Monday Market", "Shehu's Palace Road"]],
  ["Cross River", "Calabar", ["Marian Road", "8 Miles"]],
  ["Delta", "Asaba", ["Nnebisi Road", "Okpanam Road"]],
  ["Ebonyi", "Abakaliki", ["Presco", "Kpirikpiri"]],
  ["Edo", "Benin City", ["Ring Road", "Sapele Road"]],
  ["Ekiti", "Ado-Ekiti", ["Fajuyi", "Ajilosun"]],
  ["Enugu", "Enugu", ["Independence Layout", "Ogui Road"]],
  ["Gombe", "Gombe", ["Tashan Dukku", "Pantami"]],
  ["Imo", "Owerri", ["Wetheral Road", "Douglas Road", "Ikenegbu"]],
  ["Jigawa", "Dutse", ["Takur", "Central Dutse"]],
  ["Kaduna", "Kaduna", ["Kaduna Central Market", "Ahmadu Bello Way"]],
  ["Kano", "Kano", ["Sabon Gari", "Fagge"]],
  ["Katsina", "Katsina", ["Central Market", "Kofar Sauri"]],
  ["Kebbi", "Birnin Kebbi", ["Gesse", "Central Market"]],
  ["Kogi", "Lokoja", ["Ganaja", "Adankolo"]],
  ["Kwara", "Ilorin", ["Tanke", "Fate"]],
  ["Lagos", "Ikeja", ["Allen Avenue", "Computer Village", "Alausa", "Opebi"]],
  ["Nasarawa", "Lafia", ["Makurdi Road", "Shendam Road"]],
  ["Niger", "Minna", ["Tunga", "Bosso"]],
  ["Ogun", "Abeokuta", ["Oke-Ilewo", "Kuto"]],
  ["Ondo", "Akure", ["Alagbaka", "Oba Adesida Road"]],
  ["Osun", "Osogbo", ["Ogo-Oluwa", "Old Garage"]],
  ["Oyo", "Ibadan", ["Bodija", "Dugbe", "Ring Road", "Jericho"]],
  ["Plateau", "Jos", ["Terminus", "Ahmadu Bello Way"]],
  ["Rivers", "Port Harcourt", ["GRA", "D-Line", "Rumuola", "Trans Amadi"]],
  ["Sokoto", "Sokoto", ["Central Market", "Arkilla"]],
  ["Taraba", "Jalingo", ["Barde Way", "Mile Six"]],
  ["Yobe", "Damaturu", ["Gashua Road", "Pompomari"]],
  ["Zamfara", "Gusau", ["Central Market", "Katsina Road"]],
  ["Federal Capital Territory", "Abuja", ["Wuse", "Garki", "Jabi", "Maitama"]],
];

const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function main() {
  console.log("Seeding SEO capital-area data only — products are untouched.");

  for (const [state, capital, areaNames] of areas) {
    for (const area of areaNames) {
      const slug = slugify(`${area}-${capital}-${state}`);
      await prisma.seoArea.upsert({
        where: { slug },
        update: { state, capital, area, active: true },
        create: {
          state,
          capital,
          area,
          slug,
          description: `Beauty and cosmetics shopping information for ${area}, ${capital}, ${state}, Nigeria. This page helps shoppers discover online products and contact options; it does not claim that Splendid Empire Cosmetics operates a physical branch at this location.`,
          priority: state === "Imo" || state === "Lagos" || state === "Federal Capital Territory" ? 90 : 60,
          active: true,
        },
      });
    }
  }

  console.log(`Seeded ${areas.reduce((count, [, , names]) => count + names.length, 0)} capital commercial areas.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
