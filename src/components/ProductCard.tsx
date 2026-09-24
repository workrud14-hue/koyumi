import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Plus } from "lucide-react";
import { useBag } from "../lib/bag-context";
import { useCurrency } from "../lib/currency-context";
import type { Product } from "../lib/supabase";
import type { RatingSummary } from "../lib/reviews";
import StarRating from "./StarRating";

type Props = { product: Product; rating?: RatingSummary };

export default function ProductCard({ product, rating }: Props) {
  const { addToBag, addToWishlist, removeFromWishlist, isInWishlist } = useBag();
  const { formatPrice } = useCurrency();
  const wished = isInWishlist(product.id);

  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [addedSize, setAddedSize] = useState<string | null>(null);
  const hasSecondImage = product.images.length > 1;
  const soldOut = product.stock <= 0;

  const quickAdd = (size: string) => {
    addToBag({ product, size, color: product.colors[0] ?? "", quantity: 1 });
    setAddedSize(size);
    setTimeout(() => {
      setAddedSize(null);
      setShowQuickAdd(false);
    }, 900);
  };

  return (
    <div className="group relative">
      <div className="relative">
      <Link
        to={`/product/${product.id}`}
        className="block overflow-hidden bg-structure transition-transform duration-300 group-hover:-translate-y-1"
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-surface-container">
          {/* Primary image; second image fades in on hover (desktop) */}
          {product.images[0] && (
            <img
              src={product.images[0]}
              alt={product.name}
              className={`absolute inset-0 h-full w-full object-cover transition-all duration-500 ${
                hasSecondImage ? "group-hover:opacity-0" : ""
              } group-hover:scale-105`}
              loading="lazy"
            />
          )}
          {hasSecondImage && (
            <img
              src={product.images[1]}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full scale-105 object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              loading="lazy"
            />
          )}
          {!product.images[0] && (
            <div className="flex h-full w-full items-center justify-center font-display text-4xl text-outline-variant/30">
              KIYUMI
            </div>
          )}
          {product.compare_price && product.compare_price > product.price && (
            <div className="absolute left-0 top-0 bg-error px-2 py-1 font-mono text-[10px] font-bold tracking-[0.1em] text-on-error">
              SALE
            </div>
          )}
          {product.stock > 0 && product.stock <= 5 && (
            <div className="absolute bottom-0 left-0 bg-tertiary-container px-2 py-1 font-mono text-[10px] font-bold tracking-[0.1em] text-on-primary-container">
              {product.stock === 1 ? "LAST ONE" : `ONLY ${product.stock} LEFT`}
            </div>
          )}
          {soldOut && (
            <div className="absolute bottom-0 left-0 bg-error px-2 py-1 font-mono text-[10px] font-bold tracking-[0.1em] text-on-error">
              SOLD OUT
            </div>
          )}
        </div>
      </Link>

      {/* Quick-add: slides over the image on hover (desktop, in-stock, sized items) */}
      {!soldOut && product.sizes.length > 0 && product.sizes[0] !== "ONE SIZE" && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-3 z-10 hidden justify-center px-3 opacity-0 transition-all duration-300 group-hover:pointer-events-auto group-hover:opacity-100 md:flex"
        >
          {showQuickAdd ? (
            <div className="flex flex-wrap items-center justify-center gap-1.5 border border-outline-variant/40 bg-void/95 p-2 shadow-xl backdrop-blur-md">
              {product.sizes.map((s) => (
                <button
                  key={s}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    quickAdd(s);
                  }}
                  className={`min-w-[34px] border px-2 py-1.5 font-mono text-[10px] font-bold tracking-[0.05em] transition-all ${
                    addedSize === s
                      ? "border-primary bg-primary-container text-on-primary-container"
                      : "border-outline-variant/40 text-signal hover:border-primary hover:text-primary"
                  }`}
                >
                  {addedSize === s ? "✓" : s}
                </button>
              ))}
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowQuickAdd(true);
              }}
              className="flex items-center gap-1.5 border border-outline-variant/40 bg-void/95 px-5 py-2.5 font-mono text-[10px] font-bold tracking-[0.15em] text-signal shadow-xl backdrop-blur-md transition-colors hover:border-primary hover:text-primary"
            >
              <Plus size={12} /> QUICK ADD
            </button>
          )}
        </div>
      )}
      </div>

      <button
        onClick={() =>
          wished
            ? removeFromWishlist(product.id)
            : addToWishlist(product)
        }
        className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center bg-void/70 backdrop-blur-sm transition-colors active:scale-90 hover:bg-void"
        aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
      >
        <Heart
          size={16}
          strokeWidth={1.5}
          className={wished ? "fill-primary text-primary" : "text-signal"}
        />
      </button>

      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            to={`/product/${product.id}`}
            className="font-body text-sm font-medium text-signal no-underline transition-colors hover:text-primary"
          >
            {product.name}
          </Link>
          <p className="mt-0.5 font-mono text-[10px] tracking-[0.1em] text-outline">
            {product.collection}
          </p>
          {rating && rating.review_count > 0 && (
            <div className="mt-1 flex items-center gap-1.5">
              <StarRating value={Math.round(Number(rating.avg_rating ?? 0))} size={10} />
              <span className="font-mono text-[9px] text-outline">
                {Number(rating.avg_rating).toFixed(1)} ({rating.review_count})
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold text-signal">
            {formatPrice(product.price)}
          </span>
          {product.compare_price && product.compare_price > product.price && (
            <span className="font-mono text-xs text-outline line-through">
              {formatPrice(product.compare_price)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
