import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ShieldCheck, TriangleAlert, Truck } from "lucide-react";
import {
  callPrintifyFunction,
  type PrintifyOrderRow,
  type PrintifyProductMapping,
} from "../../lib/printify-client";
import {
  fetchQikinkOrders,
  fulfillmentTone,
  FULFILLMENT_LABELS,
  getQikinkWebhookUrl,
  retryQikinkSync,
  syncQikinkStatus,
  type QikinkOrderRow,
} from "../../lib/qikink";

interface HealthInfo {
  status: string;
  printify_token_set: boolean;
  printify_shop_id: string | null;
  printify_reachable: boolean;
  db_configured: boolean;
  webhook_secret_set: boolean;
  qikink_client_id_set: boolean;
  qikink_base_url: string;
  qikink_token_ok: boolean;
  qikink_webhook_secret_set: boolean;
  time: string;
}

type StatusTone = "ok" | "warn" | "err" | "muted";

const TONE_CLASS: Record<StatusTone, string> = {
  ok: "bg-primary/10 text-primary border-primary/30",
  warn: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  err: "bg-error/10 text-error border-error/30",
  muted: "bg-surface-container text-outline border-outline-variant/30",
};

function StatusChip({ tone, label }: { tone: StatusTone; label: string }) {
  return (
    <span
      className={`inline-block border px-2 py-0.5 font-mono text-[9px] tracking-[0.1em] ${TONE_CLASS[tone]}`}
    >
      {label}
    </span>
  );
}

export default function Fulfillment() {
  const [qikinkOrders, setQikinkOrders] = useState<QikinkOrderRow[]>([]);
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [mappings, setMappings] = useState<PrintifyProductMapping[]>([]);
  const [orders, setOrders] = useState<PrintifyOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [h, m, o, q] = await Promise.all([
        callPrintifyFunction<HealthInfo>({ route: "health" }),
        callPrintifyFunction<{ rows: PrintifyProductMapping[] }>({ route: "db.mappings" }),
        callPrintifyFunction<{ rows: PrintifyOrderRow[] }>({ route: "db.orders" }),
        fetchQikinkOrders().catch(() => ({ rows: [] as QikinkOrderRow[] })),
      ]);
      setHealth(h);
      setMappings(m.rows ?? []);
      setOrders(o.rows ?? []);
      setQikinkOrders(q.rows ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const [sendingId, setSendingId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState("");

  const sendToProduction = async (printifyOrderId: string) => {
    setSendingId(printifyOrderId);
    setActionMsg("");
    try {
      await callPrintifyFunction({ route: "orders.sendToProduction", order_id: printifyOrderId });
      setActionMsg(`Order ${printifyOrderId} sent to production.`);
      await load();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setSendingId(null);
    }
  };

  // ---- Qikink POD actions ----
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const retrySync = async (orderId: string, dryRun: boolean) => {
    setRetryingId(orderId);
    setActionMsg("");
    try {
      const res = await retryQikinkSync(orderId, dryRun);
      if (dryRun) {
        setActionMsg(
          `Payload preview for ${orderId.slice(0, 8)}…:\n${JSON.stringify(res.payload, null, 2)}`,
        );
      } else if (res.ok) {
        setActionMsg(
          `Order pushed to Qikink as ${res.qikink_order_id ?? res.order_number ?? "?"}.`,
        );
        await load();
      } else {
        setActionMsg(`Qikink push failed: ${res.error ?? "unknown error"}`);
      }
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setRetryingId(null);
    }
  };

  const syncStatus = async () => {
    setSyncing(true);
    setActionMsg("");
    try {
      const res = await syncQikinkStatus();
      setActionMsg(
        res.note
          ? `Sync note: ${res.note}`
          : `Checked ${res.checked} Qikink order(s) against ${res.remote_count} remote — ${res.updated.length} updated.`,
      );
      await load();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-4 pb-24 md:p-8 md:pb-8">
      <div className="mb-2 flex items-center gap-3">
        <h1 className="font-display text-xl font-bold text-signal md:text-2xl">
          FULFILLMENT
        </h1>
        <button
          onClick={load}
          className="flex items-center gap-2 font-mono text-[10px] tracking-[0.1em] text-outline transition-colors hover:text-signal"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> REFRESH
        </button>
      </div>
      <p className="mb-8 font-mono text-xs tracking-[0.1em] text-outline">
        Printify production backend — live status, product mappings, order routing.
      </p>

      {error && (
        <div className="mb-6 border border-error/30 bg-error/5 p-4">
          <p className="flex items-center gap-2 font-mono text-xs text-error">
            <TriangleAlert size={14} /> {error}
          </p>
        </div>
      )}

      {/* Service status */}
      <section className="mb-10">
        <h2 className="mb-3 font-mono text-[10px] tracking-[0.15em] text-outline">
          SERVICE STATUS
        </h2>
        {health ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            <div className="border border-outline-variant/20 bg-surface p-4">
              <p className="mb-1 font-mono text-[9px] tracking-[0.1em] text-outline">PRINTIFY</p>
              <StatusChip
                tone={health.printify_reachable ? "ok" : health.printify_token_set ? "warn" : "err"}
                label={
                  health.printify_reachable
                    ? `CONNECTED · SHOP ${health.printify_shop_id}`
                    : health.printify_token_set
                      ? "TOKEN SET, UNREACHABLE"
                      : "NO TOKEN"
                }
              />
            </div>
            <div className="border border-outline-variant/20 bg-surface p-4">
              <p className="mb-1 font-mono text-[9px] tracking-[0.1em] text-outline">DATABASE</p>
              <StatusChip tone={health.db_configured ? "ok" : "err"} label={health.db_configured ? "CONNECTED" : "NOT CONFIGURED"} />
            </div>
            <div className="border border-outline-variant/20 bg-surface p-4">
              <p className="mb-1 font-mono text-[9px] tracking-[0.1em] text-outline">WEBHOOK</p>
              <StatusChip tone={health.webhook_secret_set ? "ok" : "warn"} label={health.webhook_secret_set ? "SECRET SET" : "NO SECRET"} />
            </div>
            <div className="border border-outline-variant/20 bg-surface p-4">
              <p className="mb-1 font-mono text-[9px] tracking-[0.1em] text-outline">MAPPINGS</p>
              <p className="font-display text-lg font-bold text-signal">{mappings.length}</p>
            </div>
            <div className="border border-outline-variant/20 bg-surface p-4">
              <p className="mb-1 font-mono text-[9px] tracking-[0.1em] text-outline">ORDERS</p>
              <p className="font-display text-lg font-bold text-signal">{orders.length}</p>
            </div>
            <div className="border border-outline-variant/20 bg-surface p-4">
              <p className="mb-1 font-mono text-[9px] tracking-[0.1em] text-outline">QIKINK POD</p>
              <StatusChip
                tone={
                  health.qikink_token_ok
                    ? "ok"
                    : health.qikink_client_id_set
                      ? "warn"
                      : "err"
                }
                label={
                  health.qikink_token_ok
                    ? "CONNECTED"
                    : health.qikink_client_id_set
                      ? "CREDS SET, NO TOKEN"
                      : "NOT CONFIGURED"
                }
              />
            </div>
          </div>
        ) : (
          <div className="border border-outline-variant/20 bg-surface p-4 font-mono text-xs text-outline">
            {loading ? "LOADING…" : "status unavailable"}
          </div>
        )}
      </section>

      {/* Product mappings */}
      <section className="mb-10">
        <h2 className="mb-3 font-mono text-[10px] tracking-[0.15em] text-outline">
          PRODUCT MAPPINGS ({mappings.length})
        </h2>
        {mappings.length === 0 ? (
          <div className="border border-outline-variant/20 bg-surface p-6 font-mono text-xs text-outline">
            No AOP products created yet. The first product you publish via
            "PUBLISH TO PRINTIFY" will appear here with its Printify variant map.
          </div>
        ) : (
          <div className="space-y-3">
            {mappings.map((m) => (
              <div key={m.id} className="border border-outline-variant/20 bg-surface p-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="font-mono text-xs font-bold tracking-[0.1em] text-signal">
                    {m.storefront_sku}
                  </span>
                  <span className="font-mono text-[10px] text-outline">
                    product {m.printify_product_id}
                  </span>
                  <span className="font-mono text-[10px] text-outline">
                    blueprint {m.blueprint_id} · provider {m.print_provider_id}
                  </span>
                  <a
                    href={`https://printify.com/app/products/${m.printify_product_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto font-mono text-[10px] tracking-[0.1em] text-primary hover:underline"
                  >
                    VIEW IN PRINTIFY ↗
                  </a>
                </div>
                <p className="mt-2 font-mono text-[10px] text-outline/70">
                  {m.variants.length} variants ·{" "}
                  {m.variants
                    .slice(0, 4)
                    .map((v) => `$${(v.price_cents / 100).toFixed(0)}`)
                    .join(", ")}
                  {m.variants.length > 4 ? " …" : ""} · synced{" "}
                  {new Date(m.updated_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Orders */}
      <section>
        <h2 className="mb-3 font-mono text-[10px] tracking-[0.15em] text-outline">
          FULFILLMENT ORDERS ({orders.length})
        </h2>
        {actionMsg && (
          <p className="mb-3 font-mono text-[11px] text-primary">{actionMsg}</p>
        )}
        {orders.length === 0 ? (
          <div className="border border-outline-variant/20 bg-surface p-6 font-mono text-xs text-outline">
            No production orders yet. Orders appear here once checkout routes
            them to Printify, and flip to FULFILLED with tracking when the
            shipment webhook fires.
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <div key={o.id} className="border border-outline-variant/20 bg-surface p-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="font-mono text-xs font-bold tracking-[0.1em] text-signal">
                    {o.external_order_id}
                  </span>
                  <StatusChip
                    tone={
                      o.status === "fulfilled"
                        ? "ok"
                        : o.status === "failed" || o.status === "canceled"
                          ? "err"
                          : "warn"
                    }
                    label={o.status.toUpperCase()}
                  />
                  {o.tracking_number && (
                    <span className="flex items-center gap-1 font-mono text-[10px] text-outline">
                      <Truck size={11} /> {o.carrier ?? "carrier?"} · {o.tracking_number}
                    </span>
                  )}
                  {o.printify_order_id && o.status !== "fulfilled" && (
                    <button
                      onClick={() => sendToProduction(o.printify_order_id!)}
                      disabled={sendingId === o.printify_order_id}
                      className="ml-auto border border-outline-variant/30 px-3 py-1 font-mono text-[10px] tracking-[0.1em] text-shadow transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                    >
                      {sendingId === o.printify_order_id ? "SENDING…" : "SEND TO PRODUCTION"}
                    </button>
                  )}
                </div>
                {o.total_price_cents != null && (
                  <p className="mt-2 font-mono text-[10px] text-outline/70">
                    ${(o.total_price_cents / 100).toFixed(2)} · shipping{" "}
                    {o.total_shipping_cents != null ? `$${(o.total_shipping_cents / 100).toFixed(2)}` : "—"}{" "}
                    · {new Date(o.updated_at).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Qikink POD orders */}
      <section className="mt-10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-mono text-[10px] tracking-[0.15em] text-outline">
            QIKINK POD ORDERS ({qikinkOrders.length})
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={syncStatus}
              disabled={syncing}
              className="flex items-center gap-2 border border-outline-variant/30 px-3 py-1 font-mono text-[10px] tracking-[0.1em] text-shadow transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
            >
              <RefreshCw size={11} className={syncing ? "animate-spin" : ""} />
              {syncing ? "SYNCING…" : "SYNC STATUS NOW"}
            </button>
            <button
              onClick={async () => {
                try {
                  const { url } = await getQikinkWebhookUrl();
                  navigator.clipboard?.writeText(url);
                  setActionMsg(
                    `Qikink webhook URL copied (with secret) — paste it into the Qikink dashboard → Settings → Webhooks.`,
                  );
                } catch (err) {
                  setActionMsg(
                    `Could not fetch webhook URL: ${err instanceof Error ? err.message : String(err)}`,
                  );
                }
              }}
              className="font-mono text-[10px] tracking-[0.1em] text-primary hover:underline"
            >
              COPY WEBHOOK URL
            </button>
          </div>
        </div>
        {actionMsg && (
          <pre className="mb-3 max-h-52 overflow-auto whitespace-pre-wrap border border-primary/20 bg-primary/5 p-3 font-mono text-[11px] text-primary">
            {actionMsg}
          </pre>
        )}
        {qikinkOrders.length === 0 ? (
          <div className="border border-outline-variant/20 bg-surface p-6 font-mono text-xs text-outline">
            No Qikink-tracked orders yet. Set a QIKINK SKU on a product below,
            then any checkout containing it is auto-pushed to Qikink and shows
            up here (or as FAILED TO SYNC, retryable in one click).
          </div>
        ) : (
          <div className="space-y-3">
            {qikinkOrders.map((o) => (
              <div key={o.id} className="border border-outline-variant/20 bg-surface p-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="font-mono text-xs font-bold tracking-[0.1em] text-signal">
                    {o.id.slice(0, 8).toUpperCase()}
                  </span>
                  <StatusChip
                    tone={fulfillmentTone(o.fulfillment_status)}
                    label={FULFILLMENT_LABELS[o.fulfillment_status] ?? o.fulfillment_status.toUpperCase()}
                  />
                  {o.qikink_order_id && (
                    <span className="font-mono text-[10px] text-outline">qikink #{o.qikink_order_id}</span>
                  )}
                  <span className="font-mono text-[10px] text-outline/70">
                    {o.customer_email}
                  </span>
                  {o.tracking_number && (
                    <span className="flex items-center gap-1 font-mono text-[10px] text-outline">
                      <Truck size={11} /> {o.courier ?? "courier"} · {o.tracking_number}
                    </span>
                  )}
                  {o.fulfillment_status !== "synced" &&
                    o.fulfillment_status !== "shipped" &&
                    o.fulfillment_status !== "delivered" && (
                      <div className="ml-auto flex gap-2">
                        <button
                          onClick={() => retrySync(o.id, true)}
                          disabled={retryingId === o.id}
                          className="border border-outline-variant/30 px-3 py-1 font-mono text-[10px] tracking-[0.1em] text-outline transition-colors hover:border-signal hover:text-signal disabled:opacity-50"
                        >
                          {retryingId === o.id ? "…" : "PREVIEW PAYLOAD"}
                        </button>
                        <button
                          onClick={() => retrySync(o.id, false)}
                          disabled={retryingId === o.id}
                          className="border border-outline-variant/30 px-3 py-1 font-mono text-[10px] tracking-[0.1em] text-shadow transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                        >
                          {retryingId === o.id ? "RETRYING…" : "RETRY QIKINK SYNC"}
                        </button>
                      </div>
                    )}
                </div>
                {(o.qikink_sync_error || o.items) && (
                  <div className="mt-2 space-y-1">
                    {o.qikink_sync_error && (
                      <p className="font-mono text-[10px] text-error">
                        ⚠ {o.qikink_sync_error}
                      </p>
                    )}
                    {o.items && o.items.length > 0 && (
                      <p className="font-mono text-[10px] text-outline/70">
                        {o.items
                          .map((i) => `${i.name ?? i.sku ?? "item"}${i.size ? ` · ${i.size}` : ""} ×${i.quantity ?? 1}`)
                          .join("  ·  ")}
                        {o.total_cents != null
                          ? `  —  $${(o.total_cents / 100).toFixed(2)}`
                          : ""}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="mt-10 flex items-center gap-2 font-mono text-[9px] tracking-[0.05em] text-outline/50">
        <ShieldCheck size={11} />
        Admin-only. Requests are authorized by your Supabase session; the
        Printify token never leaves the server.
      </p>
    </div>
  );
}
