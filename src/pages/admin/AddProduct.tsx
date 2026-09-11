import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "../../lib/supabase";
import ImageUploader from "../../components/ImageUploader";

const CATEGORIES = ["Tees", "Hoodies & Outerwear", "Bottoms & Accessories"];

type Collection = { id: string; name: string };

const defaultForm = {
  name: "",
  price: 0,
  compare_price: 0,
  description: "",
  category: CATEGORIES[0],
  collection: "",
  sizes: "S, M, L, XL",
  colors: "#0A0A0A, #FFFFFF",
  sku: "",
  stock: 0,
  featured: false,
  gaming_drop: false,
  images: [] as string[],
};

export default function AddProduct() {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("collections")
      .select("id, name")
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        const cols = data ?? [];
        setCollections(cols);
        if (cols.length > 0) {
          setForm((prev) => ({ ...prev, collection: prev.collection || cols[0].name }));
        }
      });
  }, []);

  const update = (field: string, value: string | number | boolean | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: insertError } = await supabase.from("products").insert({
      name: form.name,
      price: form.price,
      compare_price: form.compare_price || null,
      description: form.description,
      category: form.category,
      collection: form.collection || "MIDNIGHT ARCADE",
      sizes: form.sizes.split(",").map((s) => s.trim()).filter(Boolean),
      colors: form.colors.split(",").map((c) => c.trim()).filter(Boolean),
      sku: form.sku || `KY-${Date.now().toString(36).toUpperCase()}`,
      stock: form.stock,
      featured: form.featured,
      gaming_drop: form.gaming_drop,
      images: form.images,
    });

    setLoading(false);
    if (insertError) {
      setError(insertError.message);
    } else {
      navigate("/admin/products");
    }
  };

  return (
    <div className="p-4 pb-24 md:p-8 md:pb-8">
      <button
        onClick={() => navigate("/admin/products")}
        className="mb-6 flex items-center gap-2 font-mono text-xs tracking-[0.1em] text-shadow transition-colors hover:text-signal"
      >
        <ArrowLeft size={14} /> BACK TO PRODUCTS
      </button>

      <h1 className="mb-2 font-display text-xl font-bold text-signal md:text-2xl">ADD PRODUCT</h1>
      <p className="mb-8 font-mono text-xs tracking-[0.1em] text-outline">
        Fill in the details to add a new product.
      </p>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {/* Name */}
        <div>
          <label className="mb-2 block font-mono text-[10px] tracking-[0.15em] text-outline">
            PRODUCT NAME
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            required
            className="w-full border-b-2 border-outline-variant/50 bg-transparent py-3 font-body text-sm text-signal outline-none transition-colors placeholder:text-outline-variant focus:border-primary"
            placeholder="Kuro Oni Oversized Tee"
          />
        </div>

        {/* Price Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block font-mono text-[10px] tracking-[0.15em] text-outline">
              PRICE ($)
            </label>
            <input
              type="number"
              value={form.price || ""}
              onChange={(e) => update("price", Number(e.target.value))}
              required
              min={0}
              className="w-full border-b-2 border-outline-variant/50 bg-transparent py-3 font-mono text-sm text-signal outline-none transition-colors focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-2 block font-mono text-[10px] tracking-[0.15em] text-outline">
              COMPARE PRICE ($)
            </label>
            <input
              type="number"
              value={form.compare_price || ""}
              onChange={(e) => update("compare_price", Number(e.target.value))}
              min={0}
              className="w-full border-b-2 border-outline-variant/50 bg-transparent py-3 font-mono text-sm text-signal outline-none transition-colors focus:border-primary"
              placeholder="Optional"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="mb-2 block font-mono text-[10px] tracking-[0.15em] text-outline">
            DESCRIPTION
          </label>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            required
            rows={4}
            className="w-full border-b-2 border-outline-variant/50 bg-transparent py-3 font-body text-sm text-signal outline-none transition-colors placeholder:text-outline-variant focus:border-primary resize-none"
            placeholder="Heavyweight cotton, dropped shoulders, minimalist oni mask print..."
          />
        </div>

        {/* Collection + Category */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block font-mono text-[10px] tracking-[0.15em] text-outline">
              COLLECTION
            </label>
            {collections.length === 0 ? (
              <p className="py-3 font-mono text-[11px] text-outline">
                No collections yet —{" "}
                <a href="/admin/collections" className="text-primary">create one first →</a>
              </p>
            ) : (
              <select
                value={form.collection}
                onChange={(e) => update("collection", e.target.value)}
                className="w-full border-b-2 border-outline-variant/50 bg-transparent py-3 font-body text-sm text-signal outline-none transition-colors focus:border-primary"
              >
                {collections.map((c) => (
                  <option key={c.id} value={c.name} className="bg-surface">{c.name}</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="mb-2 block font-mono text-[10px] tracking-[0.15em] text-outline">
              CATEGORY
            </label>
            <select
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
              className="w-full border-b-2 border-outline-variant/50 bg-transparent py-3 font-body text-sm text-signal outline-none transition-colors focus:border-primary"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-surface">{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Sizes + Colors */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block font-mono text-[10px] tracking-[0.15em] text-outline">
              SIZES (comma separated)
            </label>
            <input
              type="text"
              value={form.sizes}
              onChange={(e) => update("sizes", e.target.value)}
              className="w-full border-b-2 border-outline-variant/50 bg-transparent py-3 font-mono text-sm text-signal outline-none transition-colors focus:border-primary"
              placeholder="S, M, L, XL"
            />
          </div>
          <div>
            <label className="mb-2 block font-mono text-[10px] tracking-[0.15em] text-outline">
              COLORS (comma separated)
            </label>
            <input
              type="text"
              value={form.colors}
              onChange={(e) => update("colors", e.target.value)}
              className="w-full border-b-2 border-outline-variant/50 bg-transparent py-3 font-mono text-sm text-signal outline-none transition-colors focus:border-primary"
              placeholder="#0A0A0A, #FFFFFF"
            />
          </div>
        </div>

        {/* SKU + Stock */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block font-mono text-[10px] tracking-[0.15em] text-outline">
              SKU
            </label>
            <input
              type="text"
              value={form.sku}
              onChange={(e) => update("sku", e.target.value)}
              className="w-full border-b-2 border-outline-variant/50 bg-transparent py-3 font-mono text-sm text-signal outline-none transition-colors focus:border-primary"
              placeholder="Auto-generated if empty"
            />
          </div>
          <div>
            <label className="mb-2 block font-mono text-[10px] tracking-[0.15em] text-outline">
              STOCK
            </label>
            <input
              type="number"
              value={form.stock}
              onChange={(e) => update("stock", Number(e.target.value))}
              min={0}
              className="w-full border-b-2 border-outline-variant/50 bg-transparent py-3 font-mono text-sm text-signal outline-none transition-colors focus:border-primary"
            />
          </div>
        </div>

        {/* Toggles */}
        <div className="flex gap-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => update("featured", e.target.checked)}
              className="accent-primary"
            />
            <span className="font-mono text-xs tracking-[0.1em] text-shadow">FEATURED</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.gaming_drop}
              onChange={(e) => update("gaming_drop", e.target.checked)}
              className="accent-secondary"
            />
            <span className="font-mono text-xs tracking-[0.1em] text-shadow">GAMING DROP</span>
          </label>
        </div>

        {/* Image Upload */}
        <ImageUploader
          images={form.images}
          onChange={(images) => update("images", images)}
        />

        {error && <p className="font-mono text-xs text-error">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-primary-container to-secondary-container py-4 font-mono text-xs font-bold tracking-[0.15em] text-on-primary-container transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "ADDING..." : "ADD PRODUCT"}
        </button>
      </form>
    </div>
  );
}
