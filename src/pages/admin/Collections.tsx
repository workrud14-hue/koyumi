import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Package, X, Loader2, FolderPlus } from "lucide-react";
import { supabase, type Product } from "../../lib/supabase";

type Collection = {
  id: string;
  name: string;
  description: string;
  sort_order: number;
  created_at: string;
};

export default function CollectionsAdmin() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showAssign, setShowAssign] = useState<Collection | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [colRes, prodRes] = await Promise.all([
      supabase.from("collections").select("*").order("sort_order", { ascending: true }),
      supabase.from("products").select("*"),
    ]);
    if (colRes.error) setError(`Could not load collections: ${colRes.error.message}. Have you run supabase/migrations/collections_and_hardening.sql?`);
    else {
      setCollections(colRes.data ?? []);
      setError("");
    }
    setProducts(prodRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const productCount = (collectionName: string) =>
    products.filter((p) => p.collection === collectionName).length;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    setSuccess("");

    const { error: insErr } = await supabase.from("collections").insert({
      name: name.trim(),
      description: description.trim(),
      sort_order: collections.length + 1,
    });

    setSaving(false);
    if (insErr) {
      setError(insErr.message.includes("duplicate")
        ? "A collection with this name already exists."
        : `${insErr.message} — make sure you ran supabase/migrations/collections_and_hardening.sql`);
    } else {
      setSuccess(`Collection "${name.trim()}" created.`);
      setName("");
      setDescription("");
      setShowAdd(false);
      load();
    }
  };

  const handleDelete = async (col: Collection) => {
    if (!window.confirm(`Delete collection "${col.name}"? Products keep their collection label but it will no longer be listed here.`)) return;
    setError("");
    const { error: delErr } = await supabase.from("collections").delete().eq("id", col.id);
    if (delErr) setError(delErr.message);
    else {
      setSuccess(`Collection "${col.name}" deleted.`);
      load();
    }
  };

  const handleAssign = async (product: Product) => {
    if (!showAssign) return;
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, collection: showAssign.name } : p)),
    );
    await supabase.from("products").update({ collection: showAssign.name }).eq("id", product.id);
  };

  const collectionProducts = showAssign
    ? products.filter((p) => p.collection === showAssign.name)
    : [];

  return (
    <div className="p-4 pb-24 md:p-8 md:pb-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-signal md:text-2xl">COLLECTIONS</h1>
          <p className="mt-1 font-mono text-[10px] tracking-[0.1em] text-outline md:text-xs">
            Organize products into collections. Shown on the shop & home pages.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-primary-container to-secondary-container px-4 py-2.5 font-mono text-xs font-bold tracking-[0.1em] text-on-primary-container transition-opacity hover:opacity-90"
        >
          <Plus size={14} /> NEW COLLECTION
        </button>
      </div>

      {error && (
        <div className="mb-4 border border-error/20 bg-error/5 px-4 py-3">
          <p className="font-mono text-[11px] text-error">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-4 border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="font-mono text-[11px] text-primary">{success}</p>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center gap-2 py-12 text-outline">
          <Loader2 size={16} className="animate-spin" />
          <span className="font-mono text-xs">LOADING...</span>
        </div>
      ) : collections.length === 0 ? (
        <div className="border border-outline-variant/20 py-16 text-center">
          <FolderPlus size={36} className="mx-auto mb-4 text-outline/40" strokeWidth={1} />
          <p className="font-display text-lg text-shadow">No collections yet</p>
          <p className="mt-2 font-body text-sm text-outline">
            Create your first collection to organize products.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {collections.map((col) => (
            <div
              key={col.id}
              className="group border border-outline-variant/20 bg-surface-container/40 p-4 transition-colors hover:border-outline-variant/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-display text-base font-bold text-signal">
                    {col.name}
                  </h3>
                  <p className="mt-1 line-clamp-2 font-body text-xs leading-relaxed text-shadow/60">
                    {col.description || "No description"}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(col)}
                  className="flex-shrink-0 p-1.5 text-outline/50 transition-colors hover:text-error"
                  aria-label={`Delete ${col.name}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-outline-variant/15 pt-3">
                <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.1em] text-outline">
                  <Package size={12} />
                  {productCount(col.name)} PRODUCT{productCount(col.name) === 1 ? "" : "S"}
                </span>
                <button
                  onClick={() => setShowAssign(col)}
                  className="font-mono text-[10px] tracking-[0.1em] text-primary transition-colors hover:text-signal"
                >
                  MANAGE PRODUCTS →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Collection Modal */}
      {showAdd && (
        <>
          <div className="fixed inset-0 z-[80] bg-black/70" onClick={() => setShowAdd(false)} />
          <div className="fixed left-1/2 top-1/2 z-[90] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 border border-outline-variant/30 bg-surface p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-signal">NEW COLLECTION</h2>
              <button onClick={() => setShowAdd(false)} className="text-shadow hover:text-signal">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-5">
              <div>
                <label className="mb-2 block font-mono text-[10px] tracking-[0.15em] text-outline">NAME</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                  placeholder="e.g. TOKYO NIGHTS"
                  className="w-full border-b-2 border-outline-variant/50 bg-transparent py-2.5 font-body text-sm text-signal outline-none transition-colors focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-2 block font-mono text-[10px] tracking-[0.15em] text-outline">
                  DESCRIPTION (OPTIONAL)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full resize-none border-b-2 border-outline-variant/50 bg-transparent py-2.5 font-body text-sm text-signal outline-none transition-colors focus:border-primary"
                  placeholder="What is this collection about?"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-gradient-to-r from-primary-container to-secondary-container py-3 font-mono text-xs font-bold tracking-[0.15em] text-on-primary-container disabled:opacity-50"
              >
                {saving ? "CREATING..." : "CREATE COLLECTION"}
              </button>
            </form>
          </div>
        </>
      )}

      {/* Assign Products Modal */}
      {showAssign && (
        <>
          <div className="fixed inset-0 z-[80] bg-black/70" onClick={() => setShowAssign(null)} />
          <div className="fixed inset-x-2 top-[4vh] z-[90] mx-auto flex max-h-[88vh] max-w-2xl flex-col border border-outline-variant/30 bg-surface shadow-2xl sm:inset-x-auto sm:left-1/2 sm:w-[calc(100vw-4rem)] sm:-translate-x-1/2">
            <div className="flex items-center justify-between border-b border-outline-variant/20 px-5 py-4">
              <div>
                <h2 className="font-display text-base font-bold text-signal md:text-lg">
                  {showAssign.name}
                </h2>
                <p className="font-mono text-[10px] tracking-[0.1em] text-outline">
                  {collectionProducts.length} product{collectionProducts.length === 1 ? "" : "s"} in this collection
                </p>
              </div>
              <button onClick={() => setShowAssign(null)} className="text-shadow hover:text-signal">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-col gap-2">
                {products.map((p) => {
                  const inCollection = p.collection === showAssign.name;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleAssign(p)}
                      className={`flex items-center gap-3 border p-2.5 text-left transition-all ${
                        inCollection
                          ? "border-primary/40 bg-primary-container/10"
                          : "border-outline-variant/20 hover:border-outline-variant/50"
                      }`}
                    >
                      <div className="h-12 w-10 flex-shrink-0 overflow-hidden bg-surface-container">
                        {p.images[0] && (
                          <img src={p.images[0]} alt="" className="h-full w-full object-cover" loading="lazy" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-body text-sm text-signal">{p.name}</p>
                        <p className="truncate font-mono text-[10px] text-outline">
                          Currently: {p.collection}
                        </p>
                      </div>
                      <span
                        className={`flex-shrink-0 px-2 py-1 font-mono text-[9px] tracking-[0.1em] ${
                          inCollection ? "bg-primary-container/30 text-primary" : "text-outline/60"
                        }`}
                      >
                        {inCollection ? "✓ ADDED" : "+ ADD"}
                      </span>
                    </button>
                  );
                })}
                {products.length === 0 && (
                  <p className="py-8 text-center font-body text-sm text-outline">
                    No products yet. Add products first.
                  </p>
                )}
              </div>
            </div>

            <div className="border-t border-outline-variant/20 px-5 py-3">
              <p className="font-mono text-[10px] text-outline/60">
                Tap a product to add/remove it from this collection.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
