import { useEffect } from "react";
import { useLocation, useParams } from "react-router";

type CatalogProduct = {
  id: string;
  name: string;
  category?: string;
  description?: string;
  price?: number;
};

function setMeta(name: string, content: string) {
  let tag = document.querySelector(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

export default function ProductSeoSync({
  products,
  onOpen,
}: {
  products: CatalogProduct[];
  onOpen: (product: CatalogProduct) => void;
}) {
  const params = useParams();
  const location = useLocation();

  useEffect(() => {
    const fromPath = location.pathname.startsWith("/product/")
      ? decodeURIComponent(location.pathname.split("/")[2] || "")
      : "";
    const id = params.productId || fromPath;
    if (!id || !products.length) return;
    const product = products.find((item) => item.id === id);
    if (!product) return;
    const title = `${product.name} | Splendid Empire Cosmetics Owerri`;
    const desc = `${product.name} — authentic ${product.category || "skincare"} in Owerri. Shop Splendid Empire Cosmetics, IMSU Junction. Same-day delivery.`;
    document.title = title;
    setMeta("description", desc);
    onOpen(product);
  }, [params.productId, location.pathname, products, onOpen]);

  return null;
}
