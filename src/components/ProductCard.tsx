import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { useBag } from "../lib/bag-context";
import { useCurrency } from "../lib/currency-context";
import type { Product } from "../lib/supabase";

type Props = { product: Product };

export default function ProductCard({ product }: Props) {
  const { addToWishlist, removeFromWishlist, isInWishlist } = useBag();
  const { formatPrice } = useCurrency();
  const wished = isInWishlist(product.id);

  return (
    <div className="group relative">
      <Link
        to={`/product/${product.id}`}
        className="block overflow-hidden bg-structure"
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-surface-container">
          {product.images[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display text-4xl text-outline-variant/30">
              KIYUMI
            </div>
          )}
          {product.compare_price && product.compare_price > product.price && (
            <div className="absolute left-0 top-0 bg-error px-2 py-1 font-mono text-[10px] font-bold tracking-[0.1em] text-on-error">
              SALE
            </div>
          )}
          {product.gaming_drop && (
            <div className="absolute right-0 top-0 bg-secondary-container px-2 py-1 font-mono text-[10px] font-bold tracking-[0.1em] text-on-secondary-container">
              GAMING
            </div>
          )}
        </div>
      </Link>

      <button
        onClick={() =>
          wished
            ? removeFromWishlist(product.id)
            : addToWishlist(product)
        }
        className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center bg-void/70 backdrop-blur-sm transition-colors hover:bg-void"
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
