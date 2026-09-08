import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";

const SITE_URL = "https://www.splendidcosmetics.com.ng";

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
] as const;

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const titleCase = (value: string) => value.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const CATEGORY_GUIDES: Record<string, { intro: string; tips: string[] }> = {
  skincare: { intro: "A practical starting point is to choose products by your skin concern, then keep the routine simple enough to use consistently.", tips: ["Check the product ingredients and intended skin type.", "Introduce one new active product at a time.", "Use sunscreen during the day when your routine contains brightening or exfoliating products."] },
  foundation: { intro: "Foundation shopping is easier when you match undertone, depth and preferred finish instead of choosing only by a product name.", tips: ["Compare the shade with your jawline rather than only your hand.", "Choose the finish according to how your skin behaves during the day.", "Ask for help when you are between shades."] },
  serum: { intro: "Serums are concentrated products, so the right choice depends on the concern you want to address and how it fits into the rest of your routine.", tips: ["Identify one primary concern before adding several actives.", "Patch-test unfamiliar formulas when appropriate.", "Follow the product directions and avoid combining too many strong actives at once."] },
  moisturizer: { intro: "A good moisturizer should support the skin barrier without making your routine unnecessarily complicated.", tips: ["Consider whether your skin feels dry, oily or combination.", "Look for barrier-supporting and hydrating ingredients suited to your routine.", "Apply after compatible serums to help reduce moisture loss."] },
  lipstick: { intro: "Lip colour is easier to choose when you consider undertone, desired finish and how the shade works with your everyday makeup.", tips: ["Nude shades can be compared against your natural lip tone.", "Matte formulas usually need better lip preparation than glossy formulas.", "Choose a shade you can realistically wear often, not only one that photographs well."] },
  perfume: { intro: "Fragrance shopping is personal. Notes, concentration and how a scent develops on your skin matter more than the first few seconds after spraying.", tips: ["Test fragrance on skin where possible.", "Give the scent time to develop before deciding.", "Store perfume away from direct heat and strong sunlight."] },
};

type LocationData = { state: string; capital: string; slug: string; country: string; region: string | null; description: string; isCapital: boolean };
type IntentData = { slug: string; query: string; intentType: string; topic: string; location: string | null; description: string | null };
type TopicData = { slug: string; title: string; summary: string; contentType: string; category: string | null; audience: string | null; searchQuestions: string };

function setMeta(name: string, content: string) {
  let node = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!node) { node = document.createElement("meta"); node.name = name; document.head.appendChild(node); }
  node.content = content;
}

function setProperty(property: string, content: string) {
  let node = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!node) { node = document.createElement("meta"); node.setAttribute("property", property); document.head.appendChild(node); }
  node.content = content;
}

function setCanonical(url: string) {
  let node = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!node) { node = document.createElement("link"); node.rel = "canonical"; document.head.appendChild(node); }
  node.href = url;
}

async function fetchSeo<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(path, { headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    return await response.json() as T;
  } catch {
    return null;
  }
}

export default function SeoDiscoveryPage() {
  const { locationSlug, intentSlug, topicSlug } = useParams();
  const kind = locationSlug ? "location" : intentSlug ? "intent" : "topic";
  const rawSlug = locationSlug || intentSlug || topicSlug || "";
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [intentData, setIntentData] = useState<IntentData | null>(null);
  const [topicData, setTopicData] = useState<TopicData | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLocationData(null);
    setIntentData(null);
    setTopicData(null);
    const path = kind === "location" ? `/api/seo/location/${encodeURIComponent(rawSlug)}` : kind === "intent" ? `/api/seo/search/${encodeURIComponent(rawSlug)}` : `/api/seo/guide/${encodeURIComponent(rawSlug)}`;
    fetchSeo<LocationData | IntentData | TopicData>(path).then((data) => {
      if (cancelled || !data) return;
      if (kind === "location") setLocationData(data as LocationData);
      else if (kind === "intent") setIntentData(data as IntentData);
      else setTopicData(data as TopicData);
    });
    return () => { cancelled = true; };
  }, [kind, rawSlug]);

  const fallbackLocation = useMemo(
    () => FALLBACK_LOCATIONS.find(([state]) => slugify(`${state}-nigeria`) === rawSlug),
    [rawSlug],
  );
  const location = locationData || (fallbackLocation ? { state: fallbackLocation[0], capital: fallbackLocation[1], slug: rawSlug, country: "Nigeria", region: fallbackLocation[2], description: "Beauty shopping information for this Nigerian location. Explore skincare, makeup, fragrance and product guidance from Splendid Empire Cosmetics.", isCapital: true } : null);

  const topicKey = useMemo(() => {
    const source = topicData?.category || intentData?.topic || rawSlug;
    const slug = source.toLowerCase();
    return Object.keys(CATEGORY_GUIDES).find((key) => slug.includes(key)) || "skincare";
  }, [intentData, rawSlug, topicData]);
  const guide = CATEGORY_GUIDES[topicKey];

  const displayTitle = intentData?.query || topicData?.title || titleCase(rawSlug);
  const pageTitle = location
    ? `Cosmetics & Beauty Products in ${location.capital}, ${location.state} | Splendid Empire Cosmetics`
    : `${displayTitle} | Splendid Empire Cosmetics`;
  const description = location
    ? location.description
    : topicData?.summary || intentData?.description || `Practical beauty shopping information about ${displayTitle} from Splendid Empire Cosmetics. Explore products, buying tips and related beauty guides in Nigeria.`;
  const canonical = `${SITE_URL}${window.location.pathname}`;

  useEffect(() => {
    document.title = pageTitle;
    setMeta("description", description);
    setMeta("robots", "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1");
    setCanonical(canonical);
    setProperty("og:type", "website");
    setProperty("og:title", pageTitle);
    setProperty("og:description", description);
    setProperty("og:url", canonical);
    setProperty("og:site_name", "Splendid Empire Cosmetics");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", pageTitle);
    setMeta("twitter:description", description);

    document.getElementById("seo-discovery-jsonld")?.remove();
    const script = document.createElement("script");
    script.id = "seo-discovery-jsonld";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        { "@type": kind === "topic" ? "Article" : "WebPage", "@id": `${canonical}#page`, name: pageTitle, description, url: canonical, isPartOf: { "@type": "WebSite", name: "Splendid Empire Cosmetics", url: SITE_URL }, ...(location ? { about: { "@type": "Place", name: `${location.capital}, ${location.state}, Nigeria` } } : {}) },
        { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: SITE_URL }, { "@type": "ListItem", position: 2, name: location ? location.state : kind === "topic" ? "Beauty Guides" : "Beauty Searches", item: canonical }] },
      ],
    });
    document.head.appendChild(script);
    return () => { document.getElementById("seo-discovery-jsonld")?.remove(); };
  }, [canonical, description, kind, location, pageTitle]);

  if (location) {
    const { state, capital, region } = location;
    const nearbySearches = [`beauty products in ${capital}`, `skincare store in ${capital}`, `makeup products in ${state} State`, `serum and moisturizer in ${capital}`, `perfume and beauty products in ${capital}`];
    return (
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 20px 72px", fontFamily: "system-ui, sans-serif", color: "#24160f" }}>
        <nav aria-label="Breadcrumb" style={{ marginBottom: 28, color: "#806b60", fontSize: 14 }}><Link to="/">Home</Link> / {state} / {capital}</nav>
        <header><p style={{ color: "#a8841a", fontSize: 12, fontWeight: 800, letterSpacing: "0.12em" }}>NIGERIA BEAUTY SHOPPING GUIDE</p><h1 style={{ fontSize: "clamp(32px, 5vw, 52px)", lineHeight: 1.08, margin: "10px 0 16px" }}>Beauty & Cosmetics in {capital}, {state}</h1><p style={{ fontSize: 17, lineHeight: 1.75, maxWidth: 820, color: "#5c473b" }}>{description}</p></header>
        <section style={{ marginTop: 40 }}><h2>What can shoppers find at Splendid Empire Cosmetics?</h2><p style={{ lineHeight: 1.8, color: "#5c473b" }}>The storefront features beauty categories including skincare, foundation, lip products, serums, moisturizers, eyeliner and fragrance. Product pages show the current price, stock status, description and available ordering path, so shoppers can check what is currently available before placing an order.</p><div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>{["Skincare", "Foundation", "Serum", "Moisturizer", "Lipstick", "Perfume", "Eyeliner"].map((category) => <Link key={category} to="/#products" style={{ padding: "10px 14px", border: "1px solid #eadfd9", borderRadius: 999, textDecoration: "none", color: "#5c473b", background: "#fffaf8" }}>{category}</Link>)}</div></section>
        <section style={{ marginTop: 40, padding: 24, borderRadius: 18, background: "#fff7f3" }}><h2>Popular beauty searches in {capital}</h2><ul style={{ lineHeight: 1.9, color: "#5c473b" }}>{nearbySearches.map((query) => <li key={query}>{query}</li>)}</ul><p style={{ lineHeight: 1.8, color: "#5c473b" }}>These are useful starting points for comparing products and finding the right category. Delivery availability can vary by destination, so confirm your address with Splendid Empire Cosmetics before ordering.</p></section>
        <section style={{ marginTop: 40 }}><h2>Beauty shopping tips for {state}</h2><p style={{ lineHeight: 1.8, color: "#5c473b" }}>Whether you are shopping from {capital} or another city in {state}, focus on the product that matches your actual concern rather than choosing only from a trending list. Compare the ingredients, intended use, size, price and current stock status, then ask the store for help if you need a recommendation.</p><p style={{ lineHeight: 1.8, color: "#5c473b" }}>Splendid Empire Cosmetics is based in Owerri, Imo State. This page is intended to help shoppers across Nigeria discover the online storefront; it does not claim that Splendid has a physical branch in {capital}.</p></section>
        <footer style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid #eadfd9" }}><p style={{ color: "#806b60", lineHeight: 1.7 }}>Region: {region || "Nigeria"} · State: {state} · Capital: {capital}</p><Link to="/" style={{ fontWeight: 700, color: "#a8841a" }}>Browse the current Splendid Empire Cosmetics collection →</Link></footer>
      </main>
    );
  }

  const label = kind === "topic" ? "Beauty Guide" : "Beauty Search Guide";
  const questions = topicData?.searchQuestions ? (() => { try { const parsed = JSON.parse(topicData.searchQuestions); return Array.isArray(parsed) ? parsed : []; } catch { return []; } })() : [];
  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 20px 72px", fontFamily: "system-ui, sans-serif", color: "#24160f" }}>
      <nav aria-label="Breadcrumb" style={{ marginBottom: 28, color: "#806b60", fontSize: 14 }}><Link to="/">Home</Link> / {label}</nav>
      <p style={{ color: "#a8841a", fontSize: 12, fontWeight: 800, letterSpacing: "0.12em" }}>{label.toUpperCase()}</p>
      <h1 style={{ fontSize: "clamp(32px, 5vw, 50px)", lineHeight: 1.08, margin: "10px 0 16px" }}>{displayTitle}</h1>
      <p style={{ fontSize: 17, lineHeight: 1.75, color: "#5c473b", maxWidth: 820 }}>{description}</p>
      {intentData?.location && <p style={{ color: "#806b60" }}>Search location: {intentData.location}</p>}
      <section style={{ marginTop: 40 }}><h2>How to approach {displayTitle.toLowerCase()}</h2><p style={{ lineHeight: 1.8, color: "#5c473b" }}>{guide.intro}</p><ul style={{ lineHeight: 1.9, color: "#5c473b" }}>{guide.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul>{questions.length > 0 && <><h3 style={{ marginTop: 28 }}>Questions shoppers often consider</h3><ul style={{ lineHeight: 1.9, color: "#5c473b" }}>{questions.map((question: unknown) => <li key={String(question)}>{String(question)}</li>)}</ul></>}</section>
      <section style={{ marginTop: 36, padding: 24, borderRadius: 18, background: "#fff7f3" }}><h2>Explore related products</h2><p style={{ lineHeight: 1.8, color: "#5c473b" }}>Splendid Empire Cosmetics publishes current product information on individual product pages. Check the product description, price and stock status before ordering.</p><Link to="/#products" style={{ display: "inline-block", marginTop: 8, padding: "12px 18px", borderRadius: 999, background: "#a8841a", color: "#fff", textDecoration: "none", fontWeight: 700 }}>Browse the collection</Link></section>
      <section style={{ marginTop: 36 }}><h2>More from Splendid Empire Cosmetics</h2><div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>{[["Skincare guides", "/guide/skincare"], ["Foundation guide", "/guide/foundation"], ["Serum guide", "/guide/serum"], ["Moisturizer guide", "/guide/moisturizer"], ["Lipstick guide", "/guide/lipstick"], ["Perfume guide", "/guide/perfume"]].map(([text, href]) => <Link key={href} to={href} style={{ color: "#806b60", border: "1px solid #eadfd9", padding: "9px 12px", borderRadius: 999, textDecoration: "none" }}>{text}</Link>)}</div></section>
    </main>
  );
}
