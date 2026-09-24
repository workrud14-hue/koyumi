import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Heart, ShoppingBag, ArrowLeft, ChevronRight, ChevronDown, Minus, Plus, Ruler } from "lucide-react";
import { supabase, type Product } from "../lib/supabase";
import { useBag } from "../lib/bag-context";
import { useCurrency } from "../lib/currency-context";
import SizeGuide from "../components/SizeGuide";
import ReviewsSection from "../components/ReviewsSection";
import ProductCard from "../components/ProductCard";
import { useRatingSummaries } from "../lib/reviews";

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState("50% 50%");
  const [related, setRelated] = useState<Product[]>([]);
  const carouselRef = useRef<HTMLDivElement>(null);
  const ratings = useRatingSummaries();

  const { addToBag, addToWishlist, removeFromWishlist, isInWishlist } = useBag();
  const { formatPrice } = useCurrency();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setProduct(data);
        if (data) {
          setSelectedSize(data.sizes?.[0] ?? "");
          setSelectedColor(data.colors?.[0] ?? "");
        }
        setLoading(false);
      });
    setActiveImage(0);
  }, [id]);

  // Cross-sell: other pieces from the same collection
  useEffect(() => {
    if (!product?.collection) return;
    let cancelled = false;
    supabase
      .from("products")
      .select("*")
      .eq("collection", product.collection)
      .neq("id", product.id)
      .limit(4)
      .then(({ data }) => {
        if (!cancelled) setRelated(data ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [product?.id, product?.collection]);

  // Keep dots in sync with swipe position
  const handleCarouselScroll = () => {
    const el = carouselRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    setActiveImage(Math.round(el.scrollLeft / el.clientWidth));
  };

  // Jump carousel when a thumbnail is clicked (desktop)
  useEffect(() => {
    const el = carouselRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    el.scrollTo({ left: activeImage * el.clientWidth, behavior: "smooth" });
  }, [activeImage, product?.id]);

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-[1400px] items-center justify-center px-4 md:px-16">
        <div className="h-8 w-8 animate-spin border-2 border-outline-variant border-t-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-[1400px] flex-col items-center justify-center px-4 md:px-16">
        <p className="font-display text-xl text-shadow">Product not found</p>
        <Link to="/shop" className="mt-4 font-mono text-xs tracking-[0.1em] text-primary no-underline">
          BACK TO SHOP
        </Link>
      </div>
    );
  }

  const wished = isInWishlist(product.id);

  const handleAddToBag = () => {
    addToBag({
      product,
      size: selectedSize,
      color: selectedColor,
      quantity,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 md:px-16">
      {/* Breadcrumb */}
      <nav className="mb-8 flex items-center gap-2 text-outline">
        <Link to="/shop" className="flex items-center gap-1 font-mono text-[10px] tracking-[0.1em] text-shadow no-underline transition-colors hover:text-signal">
          <ArrowLeft size={12} /> SHOP
        </Link>
        <ChevronRight size={10} />
        <span className="font-mono text-[10px] tracking-[0.1em] text-signal">
          {product.name.toUpperCase()}
        </span>
      </nav>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-16">
        {/* Images — swipeable carousel on mobile, stacked on desktop */}
        <div className="md:sticky md:top-24 md:self-start">
          {/* Mobile: horizontal snap carousel */}
          <div className="-mx-4 md:mx-0">
            <div
              ref={carouselRef}
              onScroll={handleCarouselScroll}
              className="flex snap-x snap-mandatory overflow-x-auto scrollbar-hide"
            >
              {(product.images.length > 0 ? product.images : [""]).map((img, i) => (
                <div key={i} className="w-full flex-shrink-0 snap-center px-4 md:px-0">
                  <div
                    className="aspect-[3/4] overflow-hidden bg-surface-container"
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setZoomOrigin(
                        `${((e.clientX - rect.left) / rect.width) * 100}% ${((e.clientY - rect.top) / rect.height) * 100}%`,
                      );
                    }}
                    onMouseEnter={() => setZoomed(true)}
                    onMouseLeave={() => setZoomed(false)}
                  >
                    {img ? (
                      <img
                        src={img}
                        alt={`${product.name} view ${i + 1}`}
                        className={`h-full w-full object-cover transition-transform duration-200 ${zoomed ? "scale-[1.75]" : "scale-100"}`}
                        style={{ transformOrigin: zoomOrigin }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-display text-6xl text-outline-variant/20">
                        KIYUMI
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Carousel dots (mobile only) */}
          {product.images.length > 1 && (
            <div className="mt-3 flex justify-center gap-1.5 md:hidden">
              {product.images.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === activeImage ? "w-6 bg-primary" : "w-1.5 bg-outline-variant/40"
                  }`}
                />
              ))}
            </div>
          )}
          {/* Desktop thumbnails */}
          {product.images.length > 1 && (
            <div className="mt-4 hidden grid-cols-4 gap-2 md:grid">
              {product.images.slice(0, 4).map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`aspect-square overflow-hidden bg-surface-container transition-all ${
                    i === activeImage ? "ring-1 ring-primary" : "opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col">
          <p className="mb-2 font-mono text-[10px] tracking-[0.2em] text-primary">
            {product.collection}
          </p>
          <h1 className="font-display text-3xl font-bold text-signal md:text-4xl">
            {product.name}
          </h1>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-display text-2xl font-bold text-signal">
              {formatPrice(product.price)}
            </span>
            {product.compare_price && product.compare_price > product.price && (
              <>
                <span className="font-mono text-sm text-outline line-through">
                  {formatPrice(product.compare_price)}
                </span>
                <span className="font-mono text-xs font-bold tracking-[0.1em] text-error">
                  SAVE {formatPrice(product.compare_price - product.price)}
                </span>
              </>
            )}
          </div>

          <p className="mt-6 font-mono text-[10px] tracking-[0.1em] text-outline">
            SKU: {product.sku}
          </p>

          <p className="mt-6 font-body text-sm leading-relaxed text-on-surface-variant">
            {product.description}
          </p>

          {/* Colors */}
          {product.colors.length > 0 && (
            <div className="mt-8">
              <p className="mb-3 font-mono text-[10px] tracking-[0.15em] text-outline">
                COLOR — {selectedColor.toUpperCase()}
              </p>
              <div className="flex gap-2">
                {product.colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedColor(c)}
                    className={`h-8 w-8 border transition-all ${
                      selectedColor === c
                        ? "border-primary scale-110"
                        : "border-outline-variant/30 hover:border-signal"
                    }`}
                    style={{ backgroundColor: c.startsWith("#") ? c : undefined }}
                    title={c}
                  >
                    {!c.startsWith("#") && (
                      <span className="font-mono text-[8px] text-signal">{c.slice(0, 2).toUpperCase()}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size Guide Modal */}
          <SizeGuide open={showSizeGuide} onClose={() => setShowSizeGuide(false)} />

          {/* Sizes */}
          {product.sizes.length > 0 && (
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-mono text-[10px] tracking-[0.15em] text-outline">
                  SIZE
                </p>
                <button
                  onClick={() => setShowSizeGuide(true)}
                  className="flex items-center gap-1 font-mono text-[10px] tracking-[0.1em] text-primary transition-colors hover:text-signal"
                >
                  <Ruler size={12} />
                  SIZE GUIDE
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s)}
                    disabled={product.stock <= 0}
                    className={`min-w-[44px] px-4 py-2.5 font-mono text-xs font-medium tracking-[0.1em] transition-all ${
                      product.stock <= 0
                        ? "cursor-not-allowed border border-outline-variant/20 text-outline-variant/50 line-through decoration-1"
                        : selectedSize === s
                          ? "border border-primary bg-primary-container/20 text-primary"
                          : "border border-outline-variant/30 text-shadow hover:border-signal hover:text-signal"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="mt-6">
            <p className="mb-3 font-mono text-[10px] tracking-[0.15em] text-outline">QTY</p>
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-outline-variant/30">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="flex h-10 w-10 items-center justify-center text-shadow hover:text-signal"
                >
                  <Minus size={14} />
                </button>
                <span className="w-12 text-center font-mono text-sm text-signal">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="flex h-10 w-10 items-center justify-center text-shadow hover:text-signal"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex gap-3">
            <button
              onClick={handleAddToBag}
              className="flex flex-1 items-center justify-center gap-2 bg-gradient-to-r from-primary-container to-secondary-container py-4 font-mono text-xs font-bold tracking-[0.15em] text-on-primary-container transition-all hover:opacity-90"
            >
              <ShoppingBag size={16} />
              {added ? "ADDED!" : "ADD TO BAG"}
            </button>
            <button
              onClick={() =>
                wished ? removeFromWishlist(product.id) : addToWishlist(product)
              }
              className={`flex h-14 w-14 items-center justify-center border transition-all ${
                wished
                  ? "border-primary bg-primary-container/20 text-primary"
                  : "border-outline-variant/30 text-shadow hover:border-signal hover:text-signal"
              }`}
            >
              <Heart size={18} strokeWidth={1.5} className={wished ? "fill-primary" : ""} />
            </button>
          </div>

          {/* Stock */}
          <div className="mt-6 flex items-center gap-2">
            <div className={`h-2 w-2 ${product.stock > 0 ? "bg-green-500" : "bg-error"}`} />
            <span className="font-mono text-[10px] tracking-[0.1em] text-outline">
              {product.stock > 0 ? `IN STOCK — ${product.stock} LEFT` : "SOLD OUT"}
            </span>
          </div>
        </div>
      </div>

      {/* Spec accordions */}
      <div className="mt-12 border-t border-outline-variant/20">
        {[
          { title: "SHIPPING & DELIVERY", body: "Made to order — production starts immediately. Standard delivery 7–14 business days worldwide. Free shipping on orders over $150. Tracking number emailed the moment your order ships." },
          { title: "RETURNS & EXCHANGES", body: "Defects, misprints, or wrong items are covered for 30 days after delivery — free replacement or full refund. See our Refund Policy for details. Made-to-order means we can't accept size-swap returns, so check the size guide before ordering." },
          { title: "FABRIC & CARE", body: "Heavyweight 220–380gsm cotton depending on the piece. Cold machine wash inside-out, hang dry, do not iron directly on prints. All-over-print pieces are cut & sewn from the pattern — slight seam alignment variation is intentional." },
        ].map((sec) => (
          <details key={sec.title} className="group border-b border-outline-variant/20">
            <summary className="flex cursor-pointer list-none items-center justify-between py-4 font-mono text-[11px] font-medium tracking-[0.15em] text-shadow transition-colors hover:text-signal">
              {sec.title}
              <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
            </summary>
            <p className="pb-5 font-body text-[13px] leading-relaxed text-on-surface-variant">
              {sec.body}
            </p>
          </details>
        ))}
      </div>

      {/* Reviews & ratings */}
      <ReviewsSection productId={product.id} />

      {/* You may also like — same collection */}
      {related.length > 0 && (
        <section className="mt-20 border-t border-outline-variant/20 pt-12">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="mb-2 font-mono text-[10px] tracking-[0.3em] text-primary/80">
                COMPLETE THE FIT
              </p>
              <h2 className="font-display text-2xl font-bold tracking-tight text-signal md:text-3xl">
                YOU MAY ALSO LIKE
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} rating={ratings.get(p.id)} />
            ))}
          </div>
        </section>
      )}

      {/* Sticky mobile add-to-bag bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-outline-variant/20 bg-void/95 px-4 py-3 backdrop-blur-xl md:hidden">
        <div className="min-w-0">
          <p className="truncate font-body text-xs text-shadow">{product.name}</p>
          <p className="font-display text-base font-bold text-signal">{formatPrice(product.price)}</p>
        </div>
        <button
          onClick={handleAddToBag}
          className="ml-auto flex flex-shrink-0 items-center gap-2 bg-gradient-to-r from-primary-container to-secondary-container px-6 py-3.5 font-mono text-xs font-bold tracking-[0.15em] text-on-primary-container active:scale-95 transition-transform"
        >
          <ShoppingBag size={15} />
          {added ? "ADDED!" : "ADD TO BAG"}
        </button>
      </div>
      {/* Spacer so content isn't hidden behind the sticky bar */}
      <div className="h-20 md:hidden" />
    </div>
  );
}
