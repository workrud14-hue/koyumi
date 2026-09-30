import { useEffect, useState } from "react";
import { Package, DollarSign, ShoppingCart, TrendingUp } from "lucide-react";
import { supabase, type Product } from "../../lib/supabase";

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setProducts(data ?? []);
        setLoading(false);
      });
  }, []);

  const totalProducts = products.length;
  const totalValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);
  const lowStock = products.filter((p) => p.stock < 5).length;
  const featuredCount = products.filter((p) => p.featured).length;

  const stats = [
    { label: "TOTAL PRODUCTS", value: totalProducts, icon: Package, color: "text-primary" },
    { label: "INVENTORY VALUE", value: `$${totalValue.toLocaleString()}`, icon: DollarSign, color: "text-green-400" },
    { label: "LOW STOCK", value: lowStock, icon: ShoppingCart, color: "text-tertiary" },
    { label: "FEATURED", value: featuredCount, icon: TrendingUp, color: "text-secondary" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin border-2 border-outline-variant border-t-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <h1 className="mb-2 font-display text-2xl font-bold text-signal">DASHBOARD</h1>
      <p className="mb-8 font-mono text-xs tracking-[0.1em] text-outline">
        Welcome back. Here's your store overview.
      </p>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="border border-outline-variant/20 bg-surface-container p-4">
              <div className="mb-2 flex items-center gap-2">
                <Icon size={16} className={s.color} strokeWidth={1.5} />
                <span className="font-mono text-[10px] tracking-[0.1em] text-outline">{s.label}</span>
              </div>
              <p className="font-display text-2xl font-bold text-signal">{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Products */}
      <div>
        <h2 className="mb-4 font-display text-lg font-bold text-signal">RECENT PRODUCTS</h2>
        <div className="overflow-x-auto border border-outline-variant/20">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant/20 bg-surface-container">
                <th className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.1em] text-outline">PRODUCT</th>
                <th className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.1em] text-outline">COLLECTION</th>
                <th className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.1em] text-outline">PRICE</th>
                <th className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.1em] text-outline">STOCK</th>
              </tr>
            </thead>
            <tbody>
              {products.slice(0, 10).map((p) => (
                <tr key={p.id} className="border-b border-outline-variant/10">
                  <td className="px-4 py-3 font-body text-sm text-signal">{p.name}</td>
                  <td className="px-4 py-3 font-mono text-[10px] tracking-[0.1em] text-outline">{p.collection}</td>
                  <td className="px-4 py-3 font-mono text-sm text-signal">${p.price}</td>
                  <td className="px-4 py-3">
                    <span className={`font-mono text-xs ${p.stock < 5 ? "text-tertiary" : "text-shadow"}`}>
                      {p.stock}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
