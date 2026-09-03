import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Edit, Trash2 } from "lucide-react";
import { supabase, type Product } from "../../lib/supabase";

export default function ProductsAdmin() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setProducts(data ?? []);
        setLoading(false);
      });
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await supabase.from("products").delete().eq("id", id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const toggleFeatured = async (product: Product) => {
    await supabase
      .from("products")
      .update({ featured: !product.featured })
      .eq("id", product.id);
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, featured: !p.featured } : p)),
    );
  };

  const toggleGaming = async (product: Product) => {
    await supabase
      .from("products")
      .update({ gaming_drop: !product.gaming_drop })
      .eq("id", product.id);
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, gaming_drop: !p.gaming_drop } : p)),
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin border-2 border-outline-variant border-t-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-signal">PRODUCTS</h1>
          <p className="mt-1 font-mono text-xs tracking-[0.1em] text-outline">
            {products.length} products total
          </p>
        </div>
        <Link
          to="/admin/add-product"
          className="bg-gradient-to-r from-primary-container to-secondary-container px-4 py-2 font-mono text-xs font-bold tracking-[0.1em] text-on-primary-container no-underline transition-opacity hover:opacity-90"
        >
          + ADD PRODUCT
        </Link>
      </div>

      <div className="overflow-x-auto border border-outline-variant/20">
        <table className="w-full">
          <thead>
            <tr className="border-b border-outline-variant/20 bg-surface-container">
              <th className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.1em] text-outline">PRODUCT</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.1em] text-outline">COLLECTION</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.1em] text-outline">PRICE</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.1em] text-outline">STOCK</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.1em] text-outline">FLAGS</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.1em] text-outline">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-outline-variant/10">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 flex-shrink-0 bg-surface-container">
                      {p.images[0] && (
                        <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <span className="font-body text-sm text-signal">{p.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-[10px] tracking-[0.1em] text-outline">
                  {p.collection}
                </td>
                <td className="px-4 py-3 font-mono text-sm text-signal">${p.price}</td>
                <td className="px-4 py-3">
                  <span className={`font-mono text-xs ${p.stock < 5 ? "text-tertiary" : "text-shadow"}`}>
                    {p.stock}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleFeatured(p)}
                      className={`px-2 py-0.5 font-mono text-[9px] tracking-[0.1em] transition-colors ${
                        p.featured
                          ? "bg-primary-container text-on-primary-container"
                          : "border border-outline-variant/30 text-outline"
                      }`}
                    >
                      FEAT
                    </button>
                    <button
                      onClick={() => toggleGaming(p)}
                      className={`px-2 py-0.5 font-mono text-[9px] tracking-[0.1em] transition-colors ${
                        p.gaming_drop
                          ? "bg-secondary-container text-on-secondary-container"
                          : "border border-outline-variant/30 text-outline"
                      }`}
                    >
                      GAME
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Link
                      to={`/admin/edit/${p.id}`}
                      className="text-shadow transition-colors hover:text-signal"
                    >
                      <Edit size={14} />
                    </Link>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-shadow transition-colors hover:text-error"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
