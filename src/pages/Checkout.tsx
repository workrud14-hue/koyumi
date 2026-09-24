import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Lock, ShoppingBag, TriangleAlert, Shirt, RotateCcw, Globe } from "lucide-react";
import { useBag } from "../lib/bag-context";
import { useCurrency } from "../lib/currency-context";
import { callPrintifyFunction } from "../lib/printify-client";

interface CheckoutResult {
  order_id: string;
  status: string;
  printify_order_id: string | null;
  unrouted: Array<{ sku: string; reason: string }>;
  routing_error: string | null;
}

const inputClass =
  "w-full border-b-2 border-outline-variant/50 bg-transparent py-3 font-body text-sm text-signal outline-none transition-colors placeholder:text-outline-variant focus:border-primary";

export default function Checkout() {
  const { items, clearBag, bagTotal } = useBag();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    region: "",
    zip: "",
    country: "US",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CheckoutResult | null>(null);

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await callPrintifyFunction<CheckoutResult>({
        route: "checkout.submit",
        customer: {
          email: form.email,
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
        },
        shipping_address: {
          address1: form.address1,
          address2: form.address2,
          city: form.city,
          region: form.region,
          zip: form.zip,
          country: form.country,
        },
        items: items.map((i) => ({
          sku: i.product.sku,
          name: i.product.name,
          size: i.size,
          color: i.color,
          quantity: i.quantity,
          unit_price_cents: Math.round(i.product.price * 100),
        })),
        currency: "USD",
        payment_status: "unpaid",
      });
      setResult(res);
      clearBag();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ---- confirmation state ----
  if (result) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
        <CheckCircle2 size={56} strokeWidth={1} className="mb-6 text-primary" />
        <h1 className="font-display text-3xl font-bold text-signal">ORDER CONFIRMED</h1>
        <p className="mt-3 font-mono text-xs tracking-[0.1em] text-outline">
          ORDER {result.order_id}
        </p>
        <p className="mt-6 max-w-md font-body text-sm leading-relaxed text-shadow">
          Thanks {form.first_name || "friend"} — your order is in. We'll email{" "}
          {form.email} when it ships with tracking. KIYUMI pieces are made to
          order, so production starts right away.
        </p>
        {result.printify_order_id ? (
          <p className="mt-4 font-mono text-[10px] tracking-[0.1em] text-outline/70">
            ROUTED TO PRODUCTION · {result.printify_order_id}
          </p>
        ) : (
          <p className="mt-4 flex items-center gap-2 font-mono text-[10px] tracking-[0.1em] text-outline/70">
            <TriangleAlert size={11} /> QUEUED — WE'LL ROUTE IT SHORTLY
          </p>
        )}
        <Link
          to="/shop"
          className="mt-10 bg-gradient-to-r from-primary-container to-secondary-container px-8 py-3 font-mono text-xs font-bold tracking-[0.15em] text-on-primary-container no-underline transition-opacity hover:opacity-90"
        >
          CONTINUE SHOPPING
        </Link>
      </div>
    );
  }

  // ---- empty bag guard ----
  if (items.length === 0) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
        <ShoppingBag size={48} strokeWidth={1} className="mb-4 text-outline-variant" />
        <p className="font-display text-xl text-shadow">Nothing to check out</p>
        <p className="mt-2 font-body text-sm text-shadow/60">
          Your bag is empty — add something first.
        </p>
        <button
          onClick={() => navigate("/shop")}
          className="mt-6 flex items-center gap-2 border border-signal px-6 py-2.5 font-mono text-xs tracking-[0.15em] text-signal transition-colors hover:bg-signal hover:text-void"
        >
          <ArrowLeft size={14} /> BACK TO SHOP
        </button>
      </div>
    );
  }

  // ---- checkout form ----
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 md:px-16 md:py-12">
      <div className="mb-8">
        <p className="mb-2 font-mono text-[10px] tracking-[0.3em] text-primary md:text-xs">
          SECURE CHECKOUT
        </p>
        <h1 className="font-display text-3xl font-bold text-signal md:text-4xl">CHECKOUT</h1>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-5">
        {/* Form */}
        <form onSubmit={submit} className="space-y-6 lg:col-span-3">
          <div>
            <h2 className="mb-4 font-mono text-[10px] tracking-[0.15em] text-outline">
              CONTACT
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <input className={inputClass} placeholder="First name" value={form.first_name} onChange={(e) => update("first_name", e.target.value)} required />
              <input className={inputClass} placeholder="Last name" value={form.last_name} onChange={(e) => update("last_name", e.target.value)} required />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <input className={inputClass} type="email" placeholder="Email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
              <input className={inputClass} type="tel" placeholder="Phone (optional)" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </div>
          </div>

          <div>
            <h2 className="mb-4 font-mono text-[10px] tracking-[0.15em] text-outline">
              SHIPPING ADDRESS
            </h2>
            <div className="space-y-4">
              <input className={inputClass} placeholder="Address line 1" value={form.address1} onChange={(e) => update("address1", e.target.value)} required />
              <input className={inputClass} placeholder="Address line 2 (optional)" value={form.address2} onChange={(e) => update("address2", e.target.value)} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input className={inputClass} placeholder="City" value={form.city} onChange={(e) => update("city", e.target.value)} required />
                <input className={inputClass} placeholder="State / Province / Region" value={form.region} onChange={(e) => update("region", e.target.value)} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input className={inputClass} placeholder="ZIP / Postal code" value={form.zip} onChange={(e) => update("zip", e.target.value)} required />
                <input
                  className={inputClass}
                  placeholder="Country (ISO code, e.g. US, IN, GB)"
                  value={form.country}
                  onChange={(e) => update("country", e.target.value.toUpperCase().slice(0, 2))}
                  required
                  maxLength={2}
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="flex items-center gap-2 font-mono text-xs text-error">
              <TriangleAlert size={13} /> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 bg-gradient-to-r from-primary-container to-secondary-container py-4 font-mono text-xs font-bold tracking-[0.15em] text-on-primary-container transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Lock size={13} />
            {submitting ? "PLACING ORDER…" : "PLACE ORDER"}
          </button>            <p className="text-center font-mono text-[9px] tracking-[0.05em] text-outline/50">
              Cash on delivery — pay when your order arrives. Made to order, ships worldwide.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-2 border-t border-outline-variant/15 pt-5 text-center">
              {[
                { icon: <Shirt size={15} strokeWidth={1.5} />, label: "MADE TO ORDER" },
                { icon: <RotateCcw size={15} strokeWidth={1.5} />, label: "30-DAY RETURNS" },
                { icon: <Globe size={15} strokeWidth={1.5} />, label: "WORLDWIDE SHIPPING" },
              ].map((t) => (
                <div key={t.label} className="flex flex-col items-center gap-1.5 text-outline">
                  {t.icon}
                  <span className="font-mono text-[8px] tracking-[0.12em]">{t.label}</span>
                </div>
              ))}
            </div>
        </form>

        {/* Summary */}
        <div className="lg:col-span-2">
          <div className="sticky top-24 border border-outline-variant/30 bg-surface-container p-6">
            <h2 className="mb-6 font-display text-lg font-bold text-signal">YOUR ORDER</h2>
            <div className="mb-4 space-y-3 border-b border-outline-variant/20 pb-4">
              {items.map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {item.product.images[0] && (
                      <img src={item.product.images[0]} alt="" className="h-12 w-9 object-cover" />
                    )}
                    <div>
                      <p className="font-body text-xs text-signal">{item.product.name}</p>
                      <p className="font-mono text-[9px] text-outline">
                        {item.size} / {item.color} × {item.quantity}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-signal">
                    {formatPrice(item.product.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between border-b border-outline-variant/20 pb-4 font-mono text-xs text-shadow">
              <span className="tracking-[0.1em]">SUBTOTAL</span>
              <span>{formatPrice(bagTotal())}</span>
            </div>
            <div className="flex justify-between border-b border-outline-variant/20 py-4 font-mono text-xs text-shadow">
              <span className="tracking-[0.1em]">SHIPPING</span>
              <span>FREE</span>
            </div>
            <div className="flex justify-between py-4">
              <span className="font-mono text-xs tracking-[0.1em] text-outline">TOTAL</span>
              <span className="font-display text-xl font-bold text-signal">
                {formatPrice(bagTotal())}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
