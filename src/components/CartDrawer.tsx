import { Link } from "react-router-dom";
import { X, Plus, Minus, Trash2 } from "lucide-react";
import { useBag } from "../lib/bag-context";
import { useCurrency } from "../lib/currency-context";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function CartDrawer({ open, onClose }: Props) {
  const { items, removeFromBag, updateQuantity, bagTotal } = useBag();
  const { formatPrice } = useCurrency();

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/60" onClick={onClose} />
      <div className="fixed bottom-0 right-0 top-0 z-[70] w-full max-w-md bg-surface border-l border-outline-variant/30 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/30 px-6 py-4">
          <h2 className="font-display text-lg font-bold text-signal">YOUR BAG</h2>
          <button onClick={onClose} className="text-shadow hover:text-signal" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="font-display text-lg text-shadow">Your bag is empty</p>
              <Link
                to="/shop"
                onClick={onClose}
                className="mt-4 inline-block border border-signal bg-transparent px-6 py-2.5 font-mono text-xs font-medium tracking-[0.15em] text-signal no-underline transition-colors hover:bg-signal hover:text-void"
              >
                SHOP NOW
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {items.map((item, i) => (
                <div
                  key={`${item.product.id}-${item.size}-${item.color}-${i}`}
                  className="flex gap-4 border-b border-outline-variant/20 pb-4"
                >
                  <div className="h-20 w-16 flex-shrink-0 bg-surface-container">
                    {item.product.images[0] && (
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <p className="font-body text-sm font-medium text-signal">
                        {item.product.name}
                      </p>
                      <p className="font-mono text-[10px] tracking-[0.1em] text-outline">
                        {item.size} / {item.color}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(i, item.quantity - 1)}
                          className="flex h-6 w-6 items-center justify-center border border-outline-variant/30 text-shadow hover:border-signal hover:text-signal"
                          aria-label="Decrease"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-6 text-center font-mono text-xs text-signal">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(i, item.quantity + 1)}
                          className="flex h-6 w-6 items-center justify-center border border-outline-variant/30 text-shadow hover:border-signal hover:text-signal"
                          aria-label="Increase"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-semibold text-signal">
                          {formatPrice(item.product.price * item.quantity)}
                        </span>
                        <button
                          onClick={() => removeFromBag(i)}
                          className="text-outline-variant transition-colors hover:text-error"
                          aria-label="Remove"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-outline-variant/30 px-6 py-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-mono text-xs tracking-[0.1em] text-outline">SUBTOTAL</span>
              <span className="font-display text-xl font-bold text-signal">
                {formatPrice(bagTotal())}
              </span>
            </div>
            <Link
              to="/bag"
              onClick={onClose}
              className="block w-full bg-gradient-to-r from-primary-container to-secondary-container py-3 text-center font-mono text-xs font-bold tracking-[0.15em] text-on-primary-container no-underline transition-opacity hover:opacity-90"
            >
              CHECKOUT
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
