import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Edit, Trash2, Image as ImageIcon, Printer, RefreshCw, DownloadCloud } from "lucide-react";
import { supabase, type Product } from "../../lib/supabase";
import { callPrintifyFunction } from "../../lib/printify-client";
import ImageUploader from "../../components/ImageUploader"

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

  const [editingImages, setEditingImages] = useState<string | null>(null);
  const [mappings, setMappings] = useState<Record<string, string>>({}); // sku → printify product id
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishMsg, setPublishMsg] = useState("");
  const [syncing, setSyncing] = useState(false);

  // Pull every visible Printify product into the storefront catalog so items
  // created on Printify (or by any other tool) become buyable on the site.
  const syncFromPrintify = async () => {
    setSyncing(true);
    setPublishMsg("");
    try {
      const res = await callPrintifyFunction<{
        total_remote: number;
        imported: number;
        updated: number;
        skipped: Array<Record<string, unknown>>;
        errors: Array<Record<string, unknown>>;
      }>({ route: "catalog.syncProducts" });
      const notes = [
        `PRINTIFY SYNC — ${res.imported} new, ${res.updated} refreshed (${res.total_remote} on Printify).`,
        ...res.errors.slice(0, 3).map((e) => `⚠ ${JSON.stringify(e)}`),
      ];
      setPublishMsg(notes.join(" "));
      load();
      loadMappings();
    } catch (err) {
      setPublishMsg(`Sync failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSyncing(false);
    }
  };

  const loadMappings = () => {
    callPrintifyFunction<{ rows: Array<{ storefront_sku: string; printify_product_id: string }> }>({
      route: "db.mappings",
    })
      .then(({ rows }) => {
        const map: Record<string, string> = {};
        for (const r of rows ?? []) map[r.storefront_sku] = r.printify_product_id;
        setMappings(map);
      })
      .catch(() => setMappings({}));
  };

  useEffect(() => {
    loadMappings();
  }, []);

  const publishToPrintify = async (product: Product) => {
    const designUrl = product.images[0];
    if (!designUrl) {
      setPublishMsg(`"${product.name}" has no image — add one first (it becomes the AOP print).`);
      return;
    }
    if (!confirm(`Create this product on Printify as an All-Over-Print tee?\n\n${product.name}\nDesign: its first product image\nPrice: $${product.price}`)) return;

    setPublishingId(product.id);
    setPublishMsg("");
    try {
      const res = await callPrintifyFunction<{
        printify_product_id: string;
        persisted: boolean;
        persistence_error?: string;
      }>({
        route: "products.createAop",
        title: product.name,
        description: product.description || "",
        design_image_url: designUrl,
        image_file_name: `${product.sku || product.id}.png`,
        storefront_sku: product.sku,
        retail_price_usd: product.price,
      });
      if (res.persisted === false) {
        setPublishMsg(`Created ${res.printify_product_id}, but DB save failed: ${res.persistence_error ?? "?"}`);
      } else {
        setPublishMsg(`"${product.name}" created on Printify (${res.printify_product_id}).`);
      }
      loadMappings();
    } catch (err) {
      setPublishMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setPublishingId(null);
    }
  };

  // ---- Qikink POD SKU (products.qikink_sku) ----
  // Plain SKU routes every size/color; a JSON map like {"black:M":"ABC-1"}
  // routes per variant. Empty = product is not POD-routed.
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [skuDraft, setSkuDraft] = useState("");
  const [skuSaving, setSkuSaving] = useState(false);

  const saveQikinkSku = async (product: Product) => {
    setSkuSaving(true);
    const value = skuDraft.trim();
    if (value.startsWith("{")) {
      try {
        JSON.parse(value);
      } catch {
        setSkuSaving(false);
        setPublishMsg(`Invalid JSON map for "${product.name}" — use {"black:M":"SKU"} or a plain SKU.`);
        return;
      }
    }
    const { error } = await supabase
      .from("products")
      .update({ qikink_sku: value || null })
      .eq("id", product.id);
    setSkuSaving(false);
    if (error) {
      setPublishMsg(error.message);
      return;
    }
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, qikink_sku: value || null } : p)),
    );
    setEditingSku(null);
    setPublishMsg(`QIKINK SKU saved for "${product.name}" — new orders with it will auto-push to Qikink.`);
  };

  const updateProductImages = async (productId: string, newImages: string[]) => {
    await supabase
      .from("products")
      .update({ images: newImages })
      .eq("id", productId);
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, images: newImages } : p)),
    );
    setEditingImages(null);
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
        <div className="flex items-center gap-3">
          <button
            onClick={syncFromPrintify}
            disabled={syncing}
            className="flex items-center gap-2 border border-primary/40 px-4 py-2 font-mono text-xs font-bold tracking-[0.1em] text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
          >
            <DownloadCloud size={14} className={syncing ? "animate-bounce" : ""} />
            {syncing ? "SYNCING…" : "SYNC PRINTIFY"}
          </button>
          <Link
            to="/admin/add-product"
            className="bg-gradient-to-r from-primary-container to-secondary-container px-4 py-2 font-mono text-xs font-bold tracking-[0.1em] text-on-primary-container no-underline transition-opacity hover:opacity-90"
          >
            + ADD PRODUCT
          </Link>
        </div>
      </div>

      {/* Image Editor Modal */}
      {editingImages && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm">
          <div className="mx-4 max-h-[80vh] w-full max-w-2xl overflow-y-auto bg-surface p-6">
            <h2 className="mb-4 font-display text-lg font-bold text-signal">
              EDIT IMAGES — {products.find(p => p.id === editingImages)?.name}
            </h2>
            <ImageUploader
              images={products.find(p => p.id === editingImages)?.images ?? []}
              onChange={(newImages) => updateProductImages(editingImages, newImages)}
              productId={editingImages}
            />
            <button
              onClick={() => setEditingImages(null)}
              className="mt-4 w-full border border-outline-variant/30 py-3 font-mono text-xs tracking-[0.1em] text-shadow transition-colors hover:text-signal"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto border border-outline-variant/20">
        {publishMsg && (
          <p className="border-b border-outline-variant/20 bg-surface-container px-4 py-3 font-mono text-[11px] text-primary">
            {publishMsg}
          </p>
        )}
        <table className="w-full">
          <thead>
            <tr className="border-b border-outline-variant/20 bg-surface-container">
              <th className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.1em] text-outline">PRODUCT</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.1em] text-outline">IMAGES</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.1em] text-outline">COLLECTION</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.1em] text-outline">PRICE</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.1em] text-outline">STOCK</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.1em] text-outline">PRINTIFY</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.1em] text-outline">QIKINK SKU</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.1em] text-outline">FLAGS</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.1em] text-outline">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-outline-variant/10">
                <td className="px-4 py-3">
                  <span className="font-body text-sm text-signal">{p.name}</span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setEditingImages(p.id)}
                    className="flex items-center gap-2 border border-outline-variant/20 px-2 py-1 transition-colors hover:border-outline-variant/40"
                  >
                    {p.images[0] ? (
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 flex-shrink-0 overflow-hidden bg-surface-container">
                          <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                        </div>
                        {p.images.length > 1 && (
                          <span className="font-mono text-[10px] text-outline">+{p.images.length - 1}</span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-outline/50">
                        <ImageIcon size={12} />
                        <span className="font-mono text-[9px]">NONE</span>
                      </div>
                    )}
                  </button>
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
                  {mappings[p.sku] ? (
                    <a
                      href={`https://printify.com/app/products/${mappings[p.sku]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-primary/10 px-2 py-1 font-mono text-[9px] tracking-[0.1em] text-primary transition-colors hover:bg-primary/20"
                    >
                      <Printer size={10} /> LIVE ↗
                    </a>
                  ) : (
                    <button
                      onClick={() => publishToPrintify(p)}
                      disabled={publishingId === p.id || !p.sku}
                      className="inline-flex items-center gap-1.5 border border-outline-variant/30 px-2 py-1 font-mono text-[9px] tracking-[0.1em] text-shadow transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
                    >
                      {publishingId === p.id ? (
                        <>
                          <RefreshCw size={10} className="animate-spin" /> PUBLISHING…
                        </>
                      ) : (
                        <>
                          <Printer size={10} /> PUBLISH
                        </>
                      )}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editingSku === p.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        type="text"
                        value={skuDraft}
                        onChange={(e) => setSkuDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            saveQikinkSku(p);
                          } else if (e.key === "Escape") {
                            setEditingSku(null);
                          }
                        }}
                        className="w-32 border border-primary/50 bg-surface px-2 py-1 font-mono text-[10px] text-signal outline-none"
                        placeholder="e.g. MVnHs or JSON map"
                      />
                      <button
                        onClick={() => saveQikinkSku(p)}
                        disabled={skuSaving}
                        className="px-2 py-1 font-mono text-[9px] text-primary transition-colors hover:underline disabled:opacity-50"
                      >
                        {skuSaving ? "…" : "SAVE"}
                      </button>
                      <button
                        onClick={() => setEditingSku(null)}
                        className="px-1 py-1 font-mono text-[9px] text-outline transition-colors hover:text-shadow"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingSku(p.id);
                        setSkuDraft(p.qikink_sku ?? "");
                      }}
                      className={`inline-flex items-center gap-1 px-2 py-1 font-mono text-[9px] tracking-[0.1em] transition-colors ${
                        p.qikink_sku
                          ? "bg-secondary/10 text-secondary hover:bg-secondary/20"
                          : "border border-outline-variant/30 text-outline hover:border-secondary hover:text-secondary"
                      }`}
                      title={p.qikink_sku || "Set the Qikink catalog SKU to enable POD auto-fulfillment"}
                    >
                      {p.qikink_sku ? `SET · ${p.qikink_sku.slice(0, 12)}` : "SET SKU"}
                    </button>
                  )}
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
                </td>              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
