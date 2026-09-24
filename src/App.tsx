import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./lib/auth-context";
import { BagProvider } from "./lib/bag-context";
import { CurrencyProvider } from "./lib/currency-context";
import { ThemeProvider } from "./lib/theme-context";
import AnnouncementBar from "./components/AnnouncementBar";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import Auth from "./pages/Auth";
import Wishlist from "./pages/Wishlist";
import Bag from "./pages/Bag";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Shipping from "./pages/Shipping";
import Refund from "./pages/Refund";
import AdminLayout from "./pages/Admin";
import Dashboard from "./pages/admin/Dashboard";
import ProductsAdmin from "./pages/admin/ProductsAdmin";
import PriceManager from "./pages/admin/PriceManager";
import AddProduct from "./pages/admin/AddProduct";
import CollectionsAdmin from "./pages/admin/Collections";
import Fulfillment from "./pages/admin/Fulfillment";
import Checkout from "./pages/Checkout";

function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
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
            <Route
              path="/checkout"
              element={
                <StoreLayout>
                  <Checkout />
                </StoreLayout>
              }
            />
            <Route
              path="/about"
              element={
                <StoreLayout>
                  <About />
                </StoreLayout>
              }
            />
            <Route
              path="/contact"
              element={
                <StoreLayout>
                  <Contact />
                </StoreLayout>
              }
            />
            <Route
              path="/privacy"
              element={
                <StoreLayout>
                  <Privacy />
                </StoreLayout>
              }
            />
            <Route
              path="/terms"
              element={
                <StoreLayout>
                  <Terms />
                </StoreLayout>
              }
            />
            <Route
              path="/shipping"
              element={
                <StoreLayout>
                  <Shipping />
                </StoreLayout>
              }
            />
            <Route
              path="/refund"
              element={
                <StoreLayout>
                  <Refund />
                </StoreLayout>
              }
            />
            {/* 404 */}
            <Route
              path="*"
              element={
                <StoreLayout>
                  <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
                    <p className="font-display text-6xl font-black text-outline/20">404</p>
                    <h1 className="mt-4 font-display text-2xl font-bold text-signal">PAGE NOT FOUND</h1>
                    <p className="mt-3 max-w-sm font-body text-sm text-shadow/60">
                      The page you're looking for doesn't exist or has been moved.
                    </p>
                    <a
                      href="/"
                      className="mt-8 inline-flex items-center gap-2 bg-gradient-to-r from-primary-container to-secondary-container px-8 py-3 font-mono text-xs font-bold tracking-[0.15em] text-on-primary-container no-underline transition-all hover:shadow-[0_0_20px_rgba(107,33,168,0.2)]"
                    >
                      BACK TO HOME
                    </a>
                  </div>
                </StoreLayout>
              }
            />

            {/* Admin routes (no store navbar/footer) */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="products" element={<ProductsAdmin />} />
              <Route path="collections" element={<CollectionsAdmin />} />
              <Route path="pricing" element={<PriceManager />} />
              <Route path="add-product" element={<AddProduct />} />
              <Route path="fulfillment" element={<Fulfillment />} />
            </Route>
          </Routes>
        </BagProvider>
        </CurrencyProvider>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
