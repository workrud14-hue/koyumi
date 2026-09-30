import { Link } from "react-router-dom";
import { X, Plus, Minus, Trash2, Check } from "lucide-react";
import { useBag } from "../lib/bag-context";
import { useCurrency } from "../lib/currency-context";

type Props = {
  /** Kept for any external open/close control; the bag context drives the drawer after adds. */
  open?: boolean;
  onClose?: () => void;
};

export default function CartDrawer({ open: openProp, onClose }: Props) {
  const { items, removeFromBag, updateQuantity, bagTotal, cartOpen, justAdded, closeCart } = useBag();
  const { formatPrice } = useCurrency();

  const isOpen = openProp ?? cartOpen;
  const handleClose = () => {
    closeCart();
    onClose?.();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="fixed bottom-0 right-0 top-0 z-[70] flex w-full max-w-md flex-col border-l border-outline-variant/30 bg-surface shadow-2xl">
        {/* Header — celebrates the add */}
        <div className="flex items-center justify-between border-b border-outline-variant/30 px-6 py-4">
          <div className="flex items-center gap-2.5">
            {justAdded ? (
              <>
                <span className="flex h-6 w-6 items-center justify-center bg-primary text-on-primary">
                  <Check size={15} strokeWidth={3} />
                </span>
                <h2 className="font-display text-lg font-bold tracking-tight text-signal">ADDED TO BAG</h2>
              </>
            ) : (
              <h2 className="font-display text-lg font-bold text-signal">YOUR BAG</h2>
            )}
          </div>
          <button onClick={handleClose} className="text-shadow transition-colors hover:text-signal" aria-label="Close">
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
                onClick={handleClose}
                className="mt-4 inline-block border border-signal bg-transparent px-6 py-2.5 font-mono text-xs font-medium tracking-[0.15em] text-signal no-underline transition-colors hover:bg-signal hover:text-void"
              >
                CONTINUE SHOPPING
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {justAdded && (
                <p className="font-mono text-[10px] tracking-[0.15em] text-outline">
                  {items.length === 1 ? "1 ITEM IN YOUR BAG" : `${items.length} ITEMS IN YOUR BAG`}
                </p>
              )}
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

        {/* Footer — the post-add options */}
        {items.length > 0 && (
          <div className="border-t border-outline-variant/30 px-6 py-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-mono text-xs tracking-[0.1em] text-outline">SUBTOTAL</span>
              <span className="font-display text-xl font-bold text-signal">
                {formatPrice(bagTotal())}
              </span>
            </div>
            <div className="flex flex-col gap-2.5">
              <Link
                to="/checkout"
                onClick={handleClose}
                className="block w-full bg-gradient-to-r from-primary-container to-secondary-container py-3.5 text-center font-mono text-xs font-bold tracking-[0.15em] text-on-primary-container no-underline transition-opacity hover:opacity-90"
              >
                CHECKOUT
              </Link>
              <button
                onClick={handleClose}
                className="w-full border border-outline-variant/40 py-3 text-center font-mono text-xs font-bold tracking-[0.15em] text-signal transition-colors hover:border-signal hover:bg-surface-container"
              >
                CONTINUE SHOPPING
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
