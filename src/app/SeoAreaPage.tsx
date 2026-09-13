import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";

const SITE_URL = "https://www.splendidcosmetics.com.ng";

type AreaData = {
  state: string;
  capital: string;
  area: string;
  slug: string;
  description: string;
  priority: number;
};

function setMeta(name: string, content: string) {
  let node = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!node) {
    node = document.createElement("meta");
    node.name = name;
    document.head.appendChild(node);
  }
  node.content = content;
}

function setProperty(property: string, content: string) {
  let node = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute("property", property);
    document.head.appendChild(node);
  }
  node.content = content;
}

export default function SeoAreaPage() {
  const { areaSlug = "" } = useParams();
  const [area, setArea] = useState<AreaData | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/seo/area/${encodeURIComponent(areaSlug)}`, { headers: { Accept: "application/json" } })
      .then((response) => response.ok ? response.json() : null)
      .then((data: AreaData | null) => {
        if (!cancelled) setArea(data);
      })
      .catch(() => {
        if (!cancelled) setArea(null);
      });
    return () => { cancelled = true; };
  }, [areaSlug]);

  useEffect(() => {
    if (!area) return;
    const title = `Cosmetics & Beauty Products in ${area.area}, ${area.capital} | Splendid Empire Cosmetics`;
    const description = area.description;
    const canonical = `${SITE_URL}/area/${area.slug}`;
    document.title = title;
    setMeta("description", description);
    setMeta("robots", "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1");
    setProperty("og:type", "website");
    setProperty("og:title", title);
    setProperty("og:description", description);
    setProperty("og:url", canonical);
    setProperty("og:site_name", "Splendid Empire Cosmetics");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);

    let canonicalNode = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalNode) {
      canonicalNode = document.createElement("link");
      canonicalNode.rel = "canonical";
      document.head.appendChild(canonicalNode);
    }
    canonicalNode.href = canonical;

    document.getElementById("seo-area-jsonld")?.remove();
    const script = document.createElement("script");
    script.id = "seo-area-jsonld";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          "@id": `${canonical}#page`,
          name: title,
          description,
          url: canonical,
          isPartOf: { "@type": "WebSite", name: "Splendid Empire Cosmetics", url: SITE_URL },
          about: { "@type": "Place", name: `${area.area}, ${area.capital}, ${area.state}, Nigeria` },
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: area.state, item: `${SITE_URL}/location/${area.state.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-nigeria` },
            { "@type": "ListItem", position: 3, name: area.area, item: canonical },
          ],
        },
      ],
    });
    document.head.appendChild(script);

    return () => document.getElementById("seo-area-jsonld")?.remove();
  }, [area]);

  if (!area) {
    return <main style={{ maxWidth: 900, margin: "0 auto", padding: "64px 20px", fontFamily: "system-ui, sans-serif" }}><h1>Beauty shopping area</h1><p>This local beauty shopping page is unavailable right now.</p><Link to="/">Return to Splendid Empire Cosmetics</Link></main>;
  }

  return (
    <main style={{ maxWidth: 1050, margin: "0 auto", padding: "48px 20px 72px", fontFamily: "system-ui, sans-serif", color: "#24160f" }}>
      <nav aria-label="Breadcrumb" style={{ marginBottom: 28, color: "#806b60", fontSize: 14 }}>
        <Link to="/">Home</Link> / <Link to={`/location/${area.state.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-nigeria`}>{area.state}</Link> / {area.area}
      </nav>
      <header>
        <p style={{ color: "#a8841a", fontSize: 12, fontWeight: 800, letterSpacing: "0.12em" }}>NIGERIA BEAUTY SHOPPING</p>
        <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)", lineHeight: 1.08, margin: "10px 0 16px" }}>Cosmetics & Beauty Products in {area.area}, {area.capital}</h1>
        <p style={{ fontSize: 17, lineHeight: 1.75, maxWidth: 820, color: "#5c473b" }}>{area.description}</p>
      </header>

      <section style={{ marginTop: 40 }}>
        <h2>Beauty shopping in {area.area}</h2>
        <p style={{ lineHeight: 1.8, color: "#5c473b" }}>Shoppers in {area.area} can use Splendid Empire Cosmetics to browse skincare, makeup, lip products, serums, moisturizers, eyeliner and fragrance. Check individual product pages for the current price and stock status before ordering.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
          {["Skincare", "Foundation", "Serum", "Moisturizer", "Lipstick", "Perfume", "Eyeliner"].map((category) => <Link key={category} to="/#products" style={{ padding: "10px 14px", border: "1px solid #eadfd9", borderRadius: 999, textDecoration: "none", color: "#5c473b", background: "#fffaf8" }}>{category}</Link>)}
        </div>
      </section>

      <section style={{ marginTop: 40, padding: 24, borderRadius: 18, background: "#fff7f3" }}>
        <h2>Before you order</h2>
        <ul style={{ lineHeight: 1.9, color: "#5c473b" }}>
          <li>Compare the product type with your actual skincare or makeup need.</li>
          <li>Check the current product page for price and availability.</li>
          <li>Confirm your delivery address and ordering details with the store.</li>
        </ul>
      </section>

      <section style={{ marginTop: 40 }}>
        <h2>Serving shoppers across Nigeria</h2>
        <p style={{ lineHeight: 1.8, color: "#5c473b" }}>Splendid Empire Cosmetics is based in Owerri, Imo State. This page is local search information for shoppers in {area.area}, {area.capital}; it does not claim a physical Splendid branch at this location.</p>
      </section>

      <footer style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid #eadfd9" }}>
        <Link to="/" style={{ fontWeight: 700, color: "#a8841a" }}>Browse the current Splendid Empire Cosmetics collection →</Link>
      </footer>
    </main>
  );
}
