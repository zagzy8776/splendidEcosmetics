import { useEffect } from "react";
import { useLocation, useParams } from "react-router";
import { fetchProducts } from "../api";

type CatalogProduct = {
  id: string;
  name: string;
  category?: string;
  description?: string;
  price?: number;
  image?: string;
  inStock?: boolean;
  rating?: number;
  reviews?: number;
};

const SITE_URL = "https://www.splendidcosmetics.com.ng";

function upsertMeta(selector: string, attribute: string, key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function setCanonical(url: string) {
  let tag = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", "canonical");
    document.head.appendChild(tag);
  }
  tag.setAttribute("href", url);
}

function setJsonLd(product: CatalogProduct, url: string) {
  const id = "product-seo-jsonld";
  let script = document.getElementById(id) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement("script");
    script.id = id;
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.name,
    description: product.description || `${product.name} available from Splendid Empire Cosmetics in Owerri, Nigeria.`,
    url,
    image: product.image ? [product.image] : undefined,
    category: product.category,
    brand: {
      "@type": "Brand",
      name: "Splendid Empire Cosmetics",
    },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "NGN",
      price: product.price,
      availability: product.inStock === false
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: "Splendid Empire Cosmetics",
        url: SITE_URL,
      },
    },
  };

  if (typeof product.rating === "number" && typeof product.reviews === "number" && product.reviews > 0) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      reviewCount: product.reviews,
      bestRating: 5,
      worstRating: 1,
    };
  }

  script.textContent = JSON.stringify(data);
}

function removeProductJsonLd() {
  document.getElementById("product-seo-jsonld")?.remove();
}

export default function ProductSeoSync() {
  const params = useParams();
  const location = useLocation();

  useEffect(() => {
    if (!location.pathname.startsWith("/product/")) {
      document.title = "Splendid Empire Cosmetics | Skincare & Beauty Store in Owerri";
      setCanonical(`${SITE_URL}/`);
      removeProductJsonLd();
      return;
    }

    const id = params.productId || decodeURIComponent(location.pathname.split("/")[2] || "");
    if (!id) return;

    let cancelled = false;

    fetchProducts()
      .then((products) => {
        if (cancelled) return;
        const product = (products as CatalogProduct[]).find((item) => item.id === id);
        if (!product) {
          document.title = "Product not found | Splendid Empire Cosmetics";
          setCanonical(`${SITE_URL}/product/${encodeURIComponent(id)}`);
          removeProductJsonLd();
          return;
        }

        const url = `${SITE_URL}/product/${encodeURIComponent(product.id)}`;
        const description = `${product.name}${product.category ? ` — ${product.category.toLowerCase()}` : ""} from Splendid Empire Cosmetics in Owerri, Nigeria. ${product.description || "Shop online for beauty and skincare products."}`.slice(0, 160);

        document.title = `${product.name} | Splendid Empire Cosmetics`;
        upsertMeta('meta[name="description"]', "name", "description", description);
        upsertMeta('meta[property="og:type"]', "property", "og:type", "product");
        upsertMeta('meta[property="og:title"]', "property", "og:title", `${product.name} | Splendid Empire Cosmetics`);
        upsertMeta('meta[property="og:description"]', "property", "og:description", description);
        upsertMeta('meta[property="og:url"]', "property", "og:url", url);
        if (product.image) upsertMeta('meta[property="og:image"]', "property", "og:image", product.image);
        upsertMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
        upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", `${product.name} | Splendid Empire Cosmetics`);
        upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
        if (product.image) upsertMeta('meta[name="twitter:image"]', "name", "twitter:image", product.image);
        setCanonical(url);
        setJsonLd(product, url);
      })
      .catch(() => {
        if (!cancelled) removeProductJsonLd();
      });

    return () => {
      cancelled = true;
    };
  }, [params.productId, location.pathname]);

  return null;
}
