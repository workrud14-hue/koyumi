import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal } from "lucide-react";
import { supabase, type Product } from "../lib/supabase";
import ProductCard from "../components/ProductCard";

const COLLECTIONS = [
  "ALL",
  "YŌKAI // AFTER DARK",
  "SHIBUYA.EXE",
  "SAKURA//SYSTEM",
  "NEO TOKYO",
  "KITSUNE PROTOCOL",
  "MIDNIGHT ARCADE",
];

const CATEGORIES = ["ALL", "Tees", "Hoodies & Outerwear", "Bottoms & Accessories"];

const SORT_OPTIONS = [
  { label: "NEWEST", value: "newest" },
  { label: "PRICE: LOW → HIGH", value: "price-asc" },
  { label: "PRICE: HIGH → LOW", value: "price-desc" },
];

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const activeCollection = searchParams.get("collection") ?? "ALL";
  const activeCategory = searchParams.get("category") ?? "ALL";
  const sort = searchParams.get("sort") ?? "newest";

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === "ALL" || value === "newest") {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next);
  };

  useEffect(() => {
    setLoading(true);
    let query = supabase.from("products").select("*");

    if (activeCollection !== "ALL") {
      query = query.eq("collection", activeCollection);
    }
    if (activeCategory !== "ALL") {
      query = query.eq("category", activeCategory);
    }

    switch (sort) {
      case "price-asc":
        query = query.order("price", { ascending: true });
        break;
      case "price-desc":
        query = query.order("price", { ascending: false });
        break;
      default:
        query = query.order("created_at", { ascending: false });
    }

    query.then(({ data }) => {
      setProducts(data ?? []);
      setLoading(false);
    });
  }, [activeCollection, activeCategory, sort]);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 md:px-16">
      {/* Header */}
      <div className="mb-8">
        <p className="mb-2 font-mono text-xs tracking-[0.3em] text-primary">COLLECTION</p>
        <h1 className="font-display text-4xl font-bold text-signal md:text-5xl">SHOP ALL</h1>
      </div>

      {/* Filters Bar */}
      <div className="mb-8 flex flex-wrap items-center gap-4 border-b border-outline-variant/20 pb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 font-mono text-xs tracking-[0.1em] text-shadow transition-colors hover:text-signal md:hidden"
        >
          <SlidersHorizontal size={14} /> FILTERS
        </button>

        {/* Collection pills */}
        <div className="flex flex-wrap gap-2">
          {COLLECTIONS.map((c) => (
            <button
              key={c}
              onClick={() => setFilter("collection", c)}
              className={`px-3 py-1.5 font-mono text-[10px] font-medium tracking-[0.1em] transition-all ${
                activeCollection === c
                  ? "bg-primary-container text-on-primary-container"
                  : "border border-outline-variant/30 text-shadow hover:border-signal hover:text-signal"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="ml-auto hidden md:flex items-center gap-2">
          <span className="font-mono text-[10px] tracking-[0.1em] text-outline">SORT:</span>
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setFilter("sort", o.value)}
              className={`px-2 py-1 font-mono text-[10px] tracking-[0.1em] transition-colors ${
                sort === o.value ? "text-signal" : "text-outline hover:text-shadow"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Filters */}
      {showFilters && (
        <div className="mb-6 flex flex-wrap gap-2 border-b border-outline-variant/20 pb-6 md:hidden">
          <span className="w-full font-mono text-[10px] tracking-[0.1em] text-outline">CATEGORY:</span>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setFilter("category", c)}
              className={`px-3 py-1.5 font-mono text-[10px] font-medium tracking-[0.1em] transition-all ${
                activeCategory === c
                  ? "bg-primary-container text-on-primary-container"
                  : "border border-outline-variant/30 text-shadow"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Desktop Categories */}
      <div className="mb-8 hidden flex-wrap gap-2 md:flex">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setFilter("category", c)}
            className={`px-3 py-1.5 font-mono text-[10px] font-medium tracking-[0.1em] transition-all ${
              activeCategory === c
                ? "bg-primary-container text-on-primary-container"
                : "border border-outline-variant/30 text-shadow hover:border-signal hover:text-signal"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[3/4] bg-surface-container" />
              <div className="mt-3 h-4 w-3/4 bg-surface-container" />
              <div className="mt-2 h-3 w-1/2 bg-surface-container" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="py-20 text-center">
          <p className="font-display text-xl text-shadow">No products found</p>
          <p className="mt-2 font-body text-sm text-outline">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
