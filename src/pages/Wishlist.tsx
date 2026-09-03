import { Link } from "react-router-dom";
import { Heart, X } from "lucide-react";
import { useBag } from "../lib/bag-context";

export default function Wishlist() {
  const { wishlist, removeFromWishlist, addToBag } = useBag();

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 md:px-16">
      <p className="mb-2 font-mono text-xs tracking-[0.3em] text-primary">SAVED</p>
      <h1 className="mb-8 font-display text-4xl font-bold text-signal">WISHLIST</h1>

      {wishlist.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <Heart size={48} strokeWidth={1} className="mb-4 text-outline-variant" />
          <p className="font-display text-xl text-shadow">Your wishlist is empty</p>
          <Link
            to="/shop"
            className="mt-4 inline-block border border-signal bg-transparent px-6 py-2.5 font-mono text-xs tracking-[0.15em] text-signal no-underline transition-colors hover:bg-signal hover:text-void"
          >
            BROWSE SHOP
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {wishlist.map((product) => (
            <div key={product.id} className="group relative">
              <Link to={`/product/${product.id}`} className="block overflow-hidden bg-structure">
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
                </div>
              </Link>

              <button
                onClick={() => removeFromWishlist(product.id)}
                className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center bg-void/70 backdrop-blur-sm transition-colors hover:bg-error/80"
                aria-label="Remove from wishlist"
              >
                <X size={14} className="text-signal" />
              </button>

              <div className="mt-3">
                <Link
                  to={`/product/${product.id}`}
                  className="font-body text-sm font-medium text-signal no-underline"
                >
                  {product.name}
                </Link>
                <div className="mt-2 flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-signal">${product.price}</span>
                  <button
                    onClick={() =>
                      addToBag({
                        product,
                        size: product.sizes?.[0] ?? "",
                        color: product.colors?.[0] ?? "",
                      })
                    }
                    className="ml-auto font-mono text-[10px] tracking-[0.1em] text-primary transition-colors hover:text-signal"
                  >
                    ADD TO BAG
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
