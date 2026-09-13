import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";

const SITE_URL = "https://www.splendidcosmetics.com.ng";

type Brand = { name: string; slug: string; description: string; priority: number };

function setMeta(name: string, content: string) {
  let node = document.querySelector(`meta[name=\"${name}\"]`) as HTMLMetaElement | null;
  if (!node) { node = document.createElement("meta"); node.name = name; document.head.appendChild(node); }
  node.content = content;
}

function setProperty(property: string, content: string) {
  let node = document.querySelector(`meta[property=\"${property}\"]`) as HTMLMetaElement | null;
  if (!node) { node = document.createElement("meta"); node.setAttribute("property", property); document.head.appendChild(node); }
  node.content = content;
}

export default function SeoBrandPage() {
  const { brandSlug = "" } = useParams();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/seo/brand/${encodeURIComponent(brandSlug)}`, { headers: { Accept: "application/json" } })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (cancelled) return;
        if (data) setBrand(data);
        else setMissing(true);
      })
      .catch(() => { if (!cancelled) setMissing(true); });
    return () => { cancelled = true; };
  }, [brandSlug]);

  const canonical = `${SITE_URL}/brand/${brandSlug}`;
  const title = brand ? `${brand.name} Skincare & Beauty Products in Nigeria | Splendid Empire Cosmetics` : "Brand | Splendid Empire Cosmetics";
  const description = brand?.description || "Beauty brand information from Splendid Empire Cosmetics.";

  useEffect(() => {
    document.title = title;
    setMeta("description", description);
    setMeta("robots", missing ? "noindex,follow" : "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1");
    let canonicalNode = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalNode) { canonicalNode = document.createElement("link"); canonicalNode.rel = "canonical"; document.head.appendChild(canonicalNode); }
    canonicalNode.href = canonical;
    setProperty("og:type", "website");
    setProperty("og:title", title);
    setProperty("og:description", description);
    setProperty("og:url", canonical);
    setProperty("og:site_name", "Splendid Empire Cosmetics");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);

    document.getElementById("seo-brand-jsonld")?.remove();
    if (!brand || missing) return;
    const script = document.createElement("script");
    script.id = "seo-brand-jsonld";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "Brand", "@id": `${canonical}#brand`, name: brand.name, description: brand.description, url: canonical },
        { "@type": "WebPage", "@id": `${canonical}#page`, name: title, description, url: canonical, about: { "@id": `${canonical}#brand` }, isPartOf: { "@type": "WebSite", name: "Splendid Empire Cosmetics", url: SITE_URL } },
        { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: SITE_URL }, { "@type": "ListItem", position: 2, name: "Beauty Brands", item: canonical }] },
      ],
    });
    document.head.appendChild(script);
    return () => { document.getElementById("seo-brand-jsonld")?.remove(); };
  }, [brand, canonical, description, missing, title]);

  if (missing) return <main style={{ maxWidth: 900, margin: "0 auto", padding: "64px 20px", fontFamily: "system-ui, sans-serif" }}><h1>Brand not found</h1><p>This brand page is not available.</p><Link to="/">Return to Splendid Empire Cosmetics</Link></main>;
  if (!brand) return <main style={{ maxWidth: 900, margin: "0 auto", padding: "64px 20px", fontFamily: "system-ui, sans-serif" }}><p>Loading brand information…</p></main>;

  return (
    <main style={{ maxWidth: 1050, margin: "0 auto", padding: "48px 20px 72px", fontFamily: "system-ui, sans-serif", color: "#24160f" }}>
      <nav aria-label="Breadcrumb" style={{ marginBottom: 28, color: "#806b60", fontSize: 14 }}><Link to="/">Home</Link> / Beauty Brands / {brand.name}</nav>
      <header>
        <p style={{ color: "#a8841a", fontSize: 12, fontWeight: 800, letterSpacing: "0.12em" }}>BEAUTY BRAND GUIDE</p>
        <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)", lineHeight: 1.08, margin: "10px 0 16px" }}>{brand.name} Skincare &amp; Beauty Products in Nigeria</h1>
        <p style={{ fontSize: 18, lineHeight: 1.75, maxWidth: 820, color: "#5c473b" }}>{brand.description}</p>
      </header>
      <section style={{ marginTop: 40 }}>
        <h2>Shop with current availability in mind</h2>
        <p style={{ lineHeight: 1.8, color: "#5c473b" }}>Use the current Splendid Empire Cosmetics storefront to check products, prices and stock before ordering. Availability can change, so the product page is the source of truth for what can be purchased now.</p>
        <Link to="/#products" style={{ display: "inline-block", marginTop: 12, padding: "12px 18px", borderRadius: 10, background: "#24160f", color: "white", textDecoration: "none", fontWeight: 700 }}>Browse current products →</Link>
      </section>
      <section style={{ marginTop: 40, padding: 24, borderRadius: 18, background: "#fff7f3" }}>
        <h2>Related beauty resources</h2>
        <ul style={{ lineHeight: 2 }}>
          <li><Link to="/guide/skincare">Skincare routine basics</Link></li>
          <li><Link to="/guide/online-cosmetics-shopping">Buying cosmetics online in Nigeria</Link></li>
          <li><Link to="/location/imo-nigeria">Beauty shopping in Imo State</Link></li>
          <li><Link to="/location/lagos-nigeria">Beauty shopping in Lagos State</Link></li>
        </ul>
      </section>
      <footer style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid #eadfd9", color: "#806b60" }}><p>Splendid Empire Cosmetics is based in Owerri, Imo State. Product availability, pricing and delivery should be confirmed before ordering.</p><Link to="/">Return to the Splendid Empire Cosmetics storefront →</Link></footer>
    </main>
  );
}
