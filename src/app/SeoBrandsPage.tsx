import { useEffect, useState } from "react";
import { Link } from "react-router";

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

export default function SeoBrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/seo/brands", { headers: { Accept: "application/json" } })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data)) setBrands(data);
        else setFailed(true);
      })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, []);

  const title = "Beauty Brands in Nigeria | CeraVe, COSRX & More | Splendid Empire Cosmetics";
  const description = "Explore skincare and beauty brands available through Splendid Empire Cosmetics in Nigeria. Check current product pages for live availability, prices and stock.";
  const canonical = `${SITE_URL}/brands`;

  useEffect(() => {
    document.title = title;
    setMeta("description", description);
    setMeta("robots", failed ? "noindex,follow" : "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1");
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

    document.getElementById("seo-brands-jsonld")?.remove();
    if (failed) return;
    const script = document.createElement("script");
    script.id = "seo-brands-jsonld";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "CollectionPage", "@id": `${canonical}#page`, name: title, description, url: canonical, isPartOf: { "@type": "WebSite", name: "Splendid Empire Cosmetics", url: SITE_URL } },
        { "@type": "ItemList", "@id": `${canonical}#brands`, name: "Beauty brands", numberOfItems: brands.length, itemListElement: brands.map((brand, index) => ({ "@type": "ListItem", position: index + 1, name: brand.name, url: `${SITE_URL}/brand/${brand.slug}` })) },
        { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: SITE_URL }, { "@type": "ListItem", position: 2, name: "Beauty Brands", item: canonical }] },
      ],
    });
    document.head.appendChild(script);
    return () => { document.getElementById("seo-brands-jsonld")?.remove(); };
  }, [brands, canonical, description, failed, title]);

  return (
    <main style={{ maxWidth: 1050, margin: "0 auto", padding: "48px 20px 72px", fontFamily: "system-ui, sans-serif", color: "#24160f" }}>
      <nav aria-label="Breadcrumb" style={{ marginBottom: 28, color: "#806b60", fontSize: 14 }}><Link to="/">Home</Link> / Beauty Brands</nav>
      <header>
        <p style={{ color: "#a8841a", fontSize: 12, fontWeight: 800, letterSpacing: "0.12em" }}>BEAUTY BRANDS</p>
        <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)", lineHeight: 1.08, margin: "10px 0 16px" }}>Beauty Brands in Nigeria</h1>
        <p style={{ fontSize: 18, lineHeight: 1.75, maxWidth: 820, color: "#5c473b" }}>{description}</p>
      </header>
      <section aria-labelledby="brand-list" style={{ marginTop: 40 }}>
        <h2 id="brand-list">Explore brands</h2>
        {failed ? <p style={{ color: "#806b60" }}>Brand information is temporarily unavailable. Please return to the storefront and browse current products.</p> : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 18 }}>
            {brands.map((brand) => (
              <article key={brand.slug} style={{ border: "1px solid #eadfd9", borderRadius: 18, padding: 22, background: "#fff" }}>
                <h3 style={{ marginTop: 0 }}><Link to={`/brand/${brand.slug}`}>{brand.name}</Link></h3>
                <p style={{ color: "#5c473b", lineHeight: 1.7 }}>{brand.description}</p>
                <Link to={`/brand/${brand.slug}`}>View brand guide →</Link>
              </article>
            ))}
          </div>
        )}
      </section>
      <section style={{ marginTop: 40, padding: 24, borderRadius: 18, background: "#fff7f3" }}>
        <h2>Shop current products</h2>
        <p style={{ lineHeight: 1.8, color: "#5c473b" }}>Use the storefront to compare current products, prices and stock. Product pages are the source of truth for what is currently available.</p>
        <Link to="/#products" style={{ display: "inline-block", marginTop: 12, padding: "12px 18px", borderRadius: 10, background: "#24160f", color: "white", textDecoration: "none", fontWeight: 700 }}>Browse products →</Link>
      </section>
      <footer style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid #eadfd9", color: "#806b60" }}><p>Splendid Empire Cosmetics is based in Owerri, Imo State. Product availability, pricing and delivery should be confirmed before ordering.</p><Link to="/">Return to the storefront →</Link></footer>
    </main>
  );
}
