import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal, X } from "lucide-react";
import { supabase, type Product } from "../lib/supabase";
import ProductCard from "../components/ProductCard";

const DEFAULT_COLLECTIONS = [
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
  { label: "PRICE ↑", value: "price-asc" },
  { label: "PRICE ↓", value: "price-desc" },
];

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<string[]>(DEFAULT_COLLECTIONS);
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

  // Load collections from DB (fall back to defaults)
  useEffect(() => {
    supabase
      .from("collections")
      .select("name")
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setCollections(data.map((c: { name: string }) => c.name));
        }
      });
  }, []);

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

  const collectionPills = (
    <>
      <button
        onClick={() => setFilter("collection", "ALL")}
        className={`px-3 py-2 font-mono text-[10px] font-medium tracking-[0.1em] transition-all ${
          activeCollection === "ALL"
            ? "bg-primary-container text-on-primary-container"
            : "border border-outline-variant/30 text-shadow hover:border-signal hover:text-signal"
        }`}
      >
        ALL
      </button>
      {collections.map((c) => (
        <button
          key={c}
          onClick={() => setFilter("collection", c)}
          className={`px-3 py-2 font-mono text-[10px] font-medium tracking-[0.1em] transition-all ${
            activeCollection === c
              ? "bg-primary-container text-on-primary-container"
              : "border border-outline-variant/30 text-shadow hover:border-signal hover:text-signal"
          }`}
        >
          {c}
        </button>
      ))}
    </>
  );

  const categoryPills = CATEGORIES.map((c) => (
    <button
      key={c}
      onClick={() => setFilter("category", c)}
      className={`px-3 py-2 font-mono text-[10px] font-medium tracking-[0.1em] transition-all ${
        activeCategory === c
          ? "bg-secondary-container text-on-secondary-container"
          : "border border-outline-variant/30 text-shadow hover:border-signal hover:text-signal"
      }`}
    >
      {c}
    </button>
  ));

  const sortPills = (
    <>
      <span className="w-full font-mono text-[10px] tracking-[0.1em] text-outline sm:w-auto">
        SORT:
      </span>
      {SORT_OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => setFilter("sort", o.value)}
          className={`px-2 py-2 font-mono text-[10px] tracking-[0.1em] transition-colors ${
            sort === o.value ? "text-signal underline underline-offset-4" : "text-outline hover:text-shadow"
          }`}
        >
          {o.label}
        </button>
      ))}
    </>
  );

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 md:px-16 md:py-12">
      {/* Header */}
      <div className="mb-6">
        <p className="mb-2 font-mono text-[10px] tracking-[0.3em] text-primary md:text-xs">
          COLLECTION
        </p>
        <h1 className="font-display text-3xl font-bold text-signal md:text-5xl">SHOP ALL</h1>
        {!loading && products.length > 0 && (
          <p className="mt-2 font-mono text-[10px] tracking-[0.1em] text-outline">
            {products.length} ITEM{products.length === 1 ? "" : "S"}
          </p>
        )}
      </div>

      {/* Mobile filter toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="mb-4 flex w-full items-center justify-between border border-outline-variant/30 px-4 py-3 font-mono text-xs tracking-[0.1em] text-shadow transition-colors hover:border-signal hover:text-signal md:hidden"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal size={14} />
          FILTERS
          {(activeCollection !== "ALL" || activeCategory !== "ALL" || sort !== "newest") && (
            <span className="bg-primary-container px-1.5 py-0.5 text-[9px] text-on-primary-container">
              ON
            </span>
          )}
        </span>
        {showFilters ? <X size={14} /> : <span className="text-[10px] text-outline">TAP TO EXPAND</span>}
      </button>

      {/* Mobile filters (collapsible) */}
      {showFilters && (
        <div className="mb-6 flex flex-col gap-4 border-b border-outline-variant/20 pb-6 md:hidden">
          <div>
            <p className="mb-2 font-mono text-[10px] tracking-[0.15em] text-outline">COLLECTION</p>
            <div className="flex flex-wrap gap-2">{collectionPills}</div>
          </div>
          <div>
            <p className="mb-2 font-mono text-[10px] tracking-[0.15em] text-outline">CATEGORY</p>
            <div className="flex flex-wrap gap-2">{categoryPills}</div>
          </div>
          <div>
            <p className="mb-2 font-mono text-[10px] tracking-[0.15em] text-outline">SORT</p>
            <div className="flex flex-wrap items-center gap-2">{sortPills}</div>
          </div>
        </div>
      )}

      {/* Desktop filters */}
      <div className="mb-8 hidden flex-col gap-4 border-b border-outline-variant/20 pb-4 md:flex">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 font-mono text-[10px] tracking-[0.1em] text-outline">COLLECTION:</span>
          {collectionPills}
          <div className="ml-auto flex items-center gap-1">{sortPills}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 font-mono text-[10px] tracking-[0.1em] text-outline">CATEGORY:</span>
          {categoryPills}
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-6">
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
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 md:grid-cols-4 md:gap-x-6 md:gap-y-12">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
