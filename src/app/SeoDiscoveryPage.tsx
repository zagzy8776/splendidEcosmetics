import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router";

const SITE_URL = "https://www.splendidcosmetics.com.ng";
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

const FALLBACK_LOCATIONS = [
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

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const titleCase = (value: string) => value.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function setMeta(name: string, content: string) {
  let node = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!node) { node = document.createElement("meta"); node.name = name; document.head.appendChild(node); }
  node.content = content;
}

function setCanonical(url: string) {
  let node = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!node) { node = document.createElement("link"); node.rel = "canonical"; document.head.appendChild(node); }
  node.href = url;
}

export default function SeoDiscoveryPage() {
  const { locationSlug, intentSlug, topicSlug } = useParams();
  const kind = locationSlug ? "location" : intentSlug ? "intent" : "topic";
  const rawSlug = locationSlug || intentSlug || topicSlug || "";
  const location = useMemo(() => FALLBACK_LOCATIONS.find(([state]) => slugify(`${state}-nigeria`) === rawSlug), [rawSlug]);

  const title = location
    ? `Cosmetics & Beauty Products in ${location[1]}, ${location[0]} | Splendid Empire Cosmetics`
    : kind === "topic" ? `${titleCase(rawSlug)} | Splendid Empire Cosmetics` : `${titleCase(rawSlug)} | Splendid Empire Cosmetics`;
  const description = location
    ? `Explore cosmetics, skincare, makeup and beauty shopping information for ${location[1]}, ${location[0]}. Shop online with Splendid Empire Cosmetics and check current product availability.`
    : `Explore beauty shopping information, product categories and practical guides from Splendid Empire Cosmetics in Nigeria.`;

  useEffect(() => {
    document.title = title;
    setMeta("description", description);
    setMeta("robots", "index,follow,max-image-preview:large");
    setCanonical(`${SITE_URL}${window.location.pathname}`);

    const existing = document.getElementById("seo-discovery-jsonld");
    existing?.remove();
    const script = document.createElement("script");
    script.id = "seo-discovery-jsonld";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      description,
      url: `${SITE_URL}${window.location.pathname}`,
      isPartOf: { "@type": "WebSite", name: "Splendid Empire Cosmetics", url: SITE_URL },
    });
    document.head.appendChild(script);
    return () => { document.getElementById("seo-discovery-jsonld")?.remove(); };
  }, [title, description]);

  if (location) {
    return (
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 20px", fontFamily: "system-ui, sans-serif" }}>
        <nav aria-label="Breadcrumb" style={{ marginBottom: 24 }}><Link to="/">Home</Link> / {location[0]} / {location[1]}</nav>
        <h1>Beauty & Cosmetics in {location[1]}, {location[0]}</h1>
        <p>{description}</p>
        <h2>Shop beauty products online</h2>
        <p>Browse the current Splendid Empire Cosmetics storefront for skincare, makeup, fragrance and beauty products. Product availability and prices are shown on individual product pages.</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
          {['Skincare', 'Makeup', 'Foundation', 'Lipstick', 'Serum', 'Moisturizer', 'Perfume'].map((category) => (
            <Link key={category} to={`/?category=${encodeURIComponent(category)}`} style={{ padding: "10px 14px", border: "1px solid #ddd", borderRadius: 8 }}>{category}</Link>
          ))}
        </div>
        <p style={{ marginTop: 32 }}><Link to="/">View the full Splendid Empire Cosmetics store</Link></p>
      </main>
    );
  }

  const label = kind === "topic" ? "Beauty Guide" : "Beauty Search";
  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 20px", fontFamily: "system-ui, sans-serif" }}>
      <nav aria-label="Breadcrumb" style={{ marginBottom: 24 }}><Link to="/">Home</Link> / {label}</nav>
      <h1>{titleCase(rawSlug)}</h1>
      <p>{description}</p>
      <section style={{ marginTop: 28 }}>
        <h2>Explore Splendid Empire Cosmetics</h2>
        <p>Find current products, beauty categories and practical information for shoppers in Nigeria.</p>
        <Link to="/">Shop the current collection</Link>
      </section>
    </main>
  );
}
