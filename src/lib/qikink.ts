// KIYUMI — Qikink POD integration helpers (admin UI side).
// =========================================================
// The actual Qikink API credentials never live in the browser: all calls go
// through the printify-fulfillment Edge Function, which holds
// QIKINK_CLIENT_ID / QIKINK_CLIENT_SECRET as server-side function secrets and
// re-verifies the caller is the admin before proxying anything.
//
// Routes (server-side):
//   qikink.retry      — re-push an order to Qikink (dry_run supported)
//   qikink.syncStatus — pull Qikink's order list, reconcile status/tracking
//   db.qikinkOrders   — read the qikink-tracked storefront orders

import { callPrintifyFunction } from "./printify-client";
import type { QikinkOrderRow } from "./printify-client";

export type { QikinkOrderRow };

/** Full Qikink webhook URL including its secret query param (admin-only, via the Edge Function). */
export async function getQikinkWebhookUrl(): Promise<{ url: string; secret_set: boolean }> {
  return callPrintifyFunction<{ url: string; secret_set: boolean }>({ route: "qikink.webhookUrl" });
}

/** List storefront orders tracked through Qikink (pushed or failed). */
export function fetchQikinkOrders(): Promise<{ rows: QikinkOrderRow[] }> {
  return callPrintifyFunction<{ rows: QikinkOrderRow[] }>({ route: "db.qikinkOrders" });
}

/** Re-push an order to Qikink. Set dryRun to inspect the payload without sending. */
export function retryQikinkSync(orderId: string, dryRun = false) {
  return callPrintifyFunction<{
    ok: boolean;
    dryRun?: boolean;
    skipped?: boolean;
    order_number?: string;
    qikink_order_id?: string | null;
    error?: string;
    payload?: unknown;
    unmatched?: Array<{ sku: string; reason: string }>;
  }>({ route: "qikink.retry", order_id: orderId, dry_run: dryRun });
}

/** Pull Qikink's order list and reconcile status/tracking into our DB. */
export function syncQikinkStatus() {
  return callPrintifyFunction<{
    remote_count: number;
    checked: number;
    updated: Array<Record<string, unknown>>;
    note?: string;
  }>({ route: "qikink.syncStatus" });
}

export const FULFILLMENT_LABELS: Record<string, string> = {
  pending: "NOT SYNCED",
  synced: "SYNCED",
  failed: "FAILED TO SYNC",
  in_production: "IN PRODUCTION",
  shipped: "SHIPPED",
  delivered: "DELIVERED",
  returned: "RETURNED",
  cancelled: "CANCELLED",
};

export function fulfillmentTone(
  status: string,
): "ok" | "warn" | "err" | "muted" {
  switch (status) {
    case "shipped":
    case "delivered":
      return "ok";
    case "synced":
    case "in_production":
      return "warn";
    case "failed":
      return "err";
    default:
      return "muted";
  }
}
