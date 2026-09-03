import { Link } from "react-router-dom";
import { Plus, Minus, Trash2, ArrowLeft, ShoppingBag } from "lucide-react";
import { useBag } from "../lib/bag-context";

export default function Bag() {
  const { items, removeFromBag, updateQuantity, clearBag, bagTotal } = useBag();

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 md:px-16">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="mb-2 font-mono text-xs tracking-[0.3em] text-primary">CHECKOUT</p>
          <h1 className="font-display text-4xl font-bold text-signal">YOUR BAG</h1>
        </div>
        {items.length > 0 && (
          <button
            onClick={clearBag}
            className="font-mono text-[10px] tracking-[0.1em] text-outline transition-colors hover:text-error"
          >
            CLEAR ALL
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <ShoppingBag size={48} strokeWidth={1} className="mb-4 text-outline-variant" />
          <p className="font-display text-xl text-shadow">Your bag is empty</p>
          <Link
            to="/shop"
            className="mt-4 inline-flex items-center gap-2 bg-gradient-to-r from-primary-container to-secondary-container px-6 py-2.5 font-mono text-xs font-bold tracking-[0.15em] text-on-primary-container no-underline transition-opacity hover:opacity-90"
          >
            <ArrowLeft size={14} /> SHOP NOW
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Items */}
          <div className="lg:col-span-2">
            <div className="flex flex-col gap-6">
              {items.map((item, i) => (
                <div
                  key={`${item.product.id}-${item.size}-${item.color}-${i}`}
                  className="flex gap-6 border-b border-outline-variant/20 pb-6"
                >
                  <Link
                    to={`/product/${item.product.id}`}
                    className="h-32 w-24 flex-shrink-0 overflow-hidden bg-surface-container"
                  >
                    {item.product.images[0] && (
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </Link>

                  <div className="flex flex-1 flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <div>
                        <Link
                          to={`/product/${item.product.id}`}
                          className="font-body text-sm font-medium text-signal no-underline"
                        >
                          {item.product.name}
                        </Link>
                        <p className="mt-1 font-mono text-[10px] tracking-[0.1em] text-outline">
                          {item.size} / {item.color}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFromBag(i)}
                        className="text-outline-variant transition-colors hover:text-error"
                        aria-label="Remove"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center border border-outline-variant/30">
                        <button
                          onClick={() => updateQuantity(i, item.quantity - 1)}
                          className="flex h-8 w-8 items-center justify-center text-shadow hover:text-signal"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-8 text-center font-mono text-xs text-signal">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(i, item.quantity + 1)}
                          className="flex h-8 w-8 items-center justify-center text-shadow hover:text-signal"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <span className="font-mono text-base font-semibold text-signal">
                        ${item.product.price * item.quantity}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 border border-outline-variant/30 bg-surface-container p-6">
              <h2 className="mb-6 font-display text-lg font-bold text-signal">ORDER SUMMARY</h2>

              <div className="space-y-3 border-b border-outline-variant/20 pb-4">
                <div className="flex justify-between font-mono text-xs text-shadow">
                  <span className="tracking-[0.1em]">SUBTOTAL</span>
                  <span>${bagTotal()}</span>
                </div>
                <div className="flex justify-between font-mono text-xs text-shadow">
                  <span className="tracking-[0.1em]">SHIPPING</span>
                  <span>FREE</span>
                </div>
              </div>

              <div className="flex justify-between py-4">
                <span className="font-mono text-xs tracking-[0.1em] text-outline">TOTAL</span>
                <span className="font-display text-xl font-bold text-signal">${bagTotal()}</span>
              </div>

              <button className="w-full bg-gradient-to-r from-primary-container to-secondary-container py-4 font-mono text-xs font-bold tracking-[0.15em] text-on-primary-container transition-opacity hover:opacity-90">
                PROCEED TO CHECKOUT
              </button>

              <Link
                to="/shop"
                className="mt-4 flex items-center justify-center gap-2 font-mono text-[10px] tracking-[0.1em] text-shadow no-underline transition-colors hover:text-signal"
              >
                <ArrowLeft size={12} /> CONTINUE SHOPPING
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
