import React from "react";
import { Routes, Route, Navigate } from "react-router";
import AdminLayout from "./AdminLayout";
import AdminLogin from "./AdminLogin";
import Dashboard from "./Dashboard";
import ProductsPage from "./ProductsPage";
import OrdersPage from "./OrdersPage";
import CategoriesPage from "./CategoriesPage";
import SettingsPage from "./SettingsPage";
import { getAdminToken } from "../../api";

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!getAdminToken()) {
    return <Navigate to="/admin/login" replace />;
  }
  return <>{children}</>;
}

export default function AdminApp() {
  return (
    <Routes>
      <Route path="login" element={<AdminLogin />} />
      <Route
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
