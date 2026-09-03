import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./lib/auth-context";
import { BagProvider } from "./lib/bag-context";
import { CurrencyProvider } from "./lib/currency-context";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import Gaming from "./pages/Gaming";
import Auth from "./pages/Auth";
import Wishlist from "./pages/Wishlist";
import Bag from "./pages/Bag";
import AdminLayout from "./pages/Admin";
import Dashboard from "./pages/admin/Dashboard";
import ProductsAdmin from "./pages/admin/ProductsAdmin";
import PriceManager from "./pages/admin/PriceManager";
import AddProduct from "./pages/admin/AddProduct";

function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CurrencyProvider>
        <BagProvider>
          <Routes>
            {/* Store routes */}
            <Route
              path="/"
              element={
                <StoreLayout>
                  <Home />
                </StoreLayout>
              }
            />
            <Route
              path="/shop"
              element={
                <StoreLayout>
                  <Shop />
                </StoreLayout>
              }
            />
            <Route
              path="/product/:id"
              element={
                <StoreLayout>
                  <ProductDetail />
                </StoreLayout>
              }
            />
            <Route
              path="/gaming"
              element={
                <StoreLayout>
                  <Gaming />
                </StoreLayout>
              }
            />
            <Route
              path="/auth"
              element={
                <StoreLayout>
                  <Auth />
                </StoreLayout>
              }
            />
            <Route
              path="/wishlist"
              element={
                <StoreLayout>
                  <Wishlist />
                </StoreLayout>
              }
            />
            <Route
              path="/bag"
              element={
                <StoreLayout>
                  <Bag />
                </StoreLayout>
              }
            />

            {/* Admin routes (no store navbar/footer) */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="products" element={<ProductsAdmin />} />
              <Route path="pricing" element={<PriceManager />} />
              <Route path="add-product" element={<AddProduct />} />
            </Route>
          </Routes>
        </BagProvider>
        </CurrencyProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
