// KIYUMI — Admin client for the printify-fulfillment Edge Function.
// Every call piggybacks the current Supabase session; the function validates
// the caller is the admin email before doing anything privileged.

import { supabase } from "./supabase";

const FUNCTION_URL = `${
  (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "") ??
  "https://wnqfdmbypygvrdanosqx.supabase.co"
}/functions/v1/printify-fulfillment`;

export interface PrintifyVariant {
  variant_id: number;
  price_cents: number;
  options: Record<string, unknown>;
  title: string | null;
}

export interface PrintifyProductMapping {
  id: string;
  storefront_sku: string;
  printify_product_id: string;
  blueprint_id: number;
  print_provider_id: number;
  image_id: string | null;
  shop_id: string;
  variants: PrintifyVariant[];
  created_at: string;
  updated_at: string;
}

export interface PrintifyOrderRow {
  id: string;
  external_order_id: string;
  printify_order_id: string | null;
  status: string;
  total_price_cents: number | null;
  total_shipping_cents: number | null;
  shipping_method: number | null;
  tracking_number: string | null;
  tracking_url: string | null;
  carrier: string | null;
  created_at: string;
  updated_at: string;
}

/** Storefront order as tracked through the Qikink POD pipeline. */
export interface QikinkOrderRow {
  id: string;
  customer_email: string;
  customer_name: string | null;
  items: Array<{ sku?: string; name?: string; size?: string; color?: string; quantity?: number }> | null;
  total_cents: number | null;
  currency: string;
  status: string;
  payment_status: string;
  fulfillment_status: string;
  qikink_order_id: string | null;
  qikink_sync_error: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  courier: string | null;
  created_at: string;
  updated_at: string;
}

export async function callPrintifyFunction<T = unknown>(
  body: Record<string, unknown>,
): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const sessionToken = sessionData.session?.access_token;
  // Public routes (health, checkout.submit) accept the anon key; admin routes
  // require the session token and are validated server-side.
  const token = sessionToken ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
  if (!token) throw new Error("No Supabase key available for function call.");

  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* keep raw text */
  }

  if (!response.ok) {
    const message =
      parsed && typeof parsed === "object" && "error" in parsed
        ? String((parsed as Record<string, unknown>).error)
        : `function call failed (HTTP ${response.status})`;
    const err = new Error(message) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }
  return parsed as T;
}
