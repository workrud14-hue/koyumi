import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { supabase } from "../../lib/supabase";

type PriceRow = {
  id: string;
  name: string;
  collection: string;
  price: number;
  compare_price: number | null;
};

export default function PriceManager() {
  const [products, setProducts] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edits, setEdits] = useState<Record<string, { price: number; compare_price: number }>>({});

  useEffect(() => {
    supabase
      .from("products")
      .select("id, name, collection, price, compare_price")
      .order("name")
      .then(({ data }) => {
        setProducts((data ?? []) as PriceRow[]);
        setLoading(false);
      });
  }, []);

  const updateEdit = (id: string, field: "price" | "compare_price", value: number) => {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const saveAll = async () => {
    setSaving(true);
    const entries = Object.entries(edits);
    for (const [id, data] of entries) {
      await supabase.from("products").update(data).eq("id", id);
    }
    setProducts((prev) =>
      prev.map((p) => {
        if (edits[p.id]) {
          return { ...p, ...edits[p.id] };
        }
        return p;
      }),
    );
    setEdits({});
    setSaving(false);
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
          <h1 className="font-display text-2xl font-bold text-signal">PRICE MANAGER</h1>
          <p className="mt-1 font-mono text-xs tracking-[0.1em] text-outline">
            Edit prices in bulk. Changes are local until saved.
          </p>
        </div>
        {Object.keys(edits).length > 0 && (
          <button
            onClick={saveAll}
            disabled={saving}
            className="flex items-center gap-2 bg-gradient-to-r from-primary-container to-secondary-container px-4 py-2 font-mono text-xs font-bold tracking-[0.1em] text-on-primary-container transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? "SAVING..." : `SAVE (${Object.keys(edits).length})`}
          </button>
        )}
      </div>

      <div className="overflow-x-auto border border-outline-variant/20">
        <table className="w-full">
          <thead>
            <tr className="border-b border-outline-variant/20 bg-surface-container">
              <th className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.1em] text-outline">PRODUCT</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.1em] text-outline">COLLECTION</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.1em] text-outline">PRICE</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.1em] text-outline">COMPARE PRICE</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.1em] text-outline">DISCOUNT</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const price = edits[p.id]?.price ?? p.price;
              const compare = edits[p.id]?.compare_price ?? p.compare_price ?? 0;
              const discount = compare > price ? Math.round(((compare - price) / compare) * 100) : 0;
              const changed = !!edits[p.id];

              return (
                <tr
                  key={p.id}
                  className={`border-b border-outline-variant/10 ${changed ? "bg-primary-container/5" : ""}`}
                >
                  <td className="px-4 py-3 font-body text-sm text-signal">{p.name}</td>
                  <td className="px-4 py-3 font-mono text-[10px] tracking-[0.1em] text-outline">{p.collection}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => updateEdit(p.id, "price", Number(e.target.value))}
                      className="w-20 border-b border-outline-variant/30 bg-transparent py-1 font-mono text-sm text-signal outline-none focus:border-primary"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={compare || ""}
                      onChange={(e) => updateEdit(p.id, "compare_price", Number(e.target.value))}
                      className="w-20 border-b border-outline-variant/30 bg-transparent py-1 font-mono text-sm text-signal outline-none focus:border-primary"
                      placeholder="—"
                    />
                  </td>
                  <td className="px-4 py-3">
                    {discount > 0 && (
                      <span className="px-2 py-0.5 font-mono text-[10px] font-bold tracking-[0.1em] text-error">
                        -{discount}%
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
