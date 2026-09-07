import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";
import App from "./app/App.tsx";
import AdminApp from "./app/admin/AdminApp.tsx";
import OrderTrackPage from "./app/OrderTrackPage.tsx";
import ProductSeoSync from "./app/ProductSeoSync.tsx";
import SeoDiscoveryPage from "./app/SeoDiscoveryPage.tsx";
import "./styles/index.css";

function ProductRoute() {
  return (
    <>
      <ProductSeoSync />
      <App />
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/admin/*" element={<AdminApp />} />
      <Route path="/order/:orderId" element={<OrderTrackPage />} />
      <Route path="/product/:productId" element={<ProductRoute />} />
      <Route path="/location/:locationSlug" element={<SeoDiscoveryPage />} />
      <Route path="/search/:intentSlug" element={<SeoDiscoveryPage />} />
      <Route path="/guide/:topicSlug" element={<SeoDiscoveryPage />} />
      <Route path="/*" element={<App />} />
    </Routes>
  </BrowserRouter>
);
