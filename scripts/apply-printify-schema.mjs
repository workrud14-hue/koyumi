/**
 * KIYUMI — Apply the Printify fulfillment schema via the Supabase Management API.
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx bun scripts/apply-printify-schema.mjs
 *   (or place the token in scripts/.sb_token.tmp — deleted after the run)
 *
 * Idempotent: safe to run repeatedly. Executes supabase/printify_schema.sql
 * section by section so any failure points at the exact block.
 */
import { readFileSync, existsSync, unlinkSync } from "node:fs";

const PROJECT = "wnqfdmbypygvrdanosqx";
const TOKEN =
  process.env.SUPABASE_ACCESS_TOKEN ||
  (existsSync(new URL(".sb_token.tmp", import.meta.url))
    ? readFileSync(new URL(".sb_token.tmp", import.meta.url), "utf8").trim()
    : "");

if (!TOKEN) {
  console.error("Missing SUPABASE_ACCESS_TOKEN (env or scripts/.sb_token.tmp)");
  process.exit(1);
}

const endpoint = `https://api.supabase.com/v1/projects/${PROJECT}/database/query`;

async function runSql(label, sql) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`\n✗ FAILED: ${label} (HTTP ${res.status})`);
    console.error(text.slice(0, 2000));
    process.exit(1);
  }
  console.log(`✓ ${label}`);
  return text;
}

// ---------------------------------------------------------------- 1. tables
await runSql(
  "Printify tables (products, orders, shipments, events)",
  `
CREATE TABLE IF NOT EXISTS printify_products (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  storefront_sku      TEXT NOT NULL UNIQUE,
  printify_product_id TEXT NOT NULL,
  blueprint_id        INTEGER NOT NULL,
  print_provider_id   INTEGER NOT NULL,
  image_id            TEXT,
  shop_id             TEXT NOT NULL,
  variants            JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS printify_orders (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  external_order_id    TEXT NOT NULL UNIQUE,
  printify_order_id    TEXT,
  status               TEXT NOT NULL DEFAULT 'pending',
  total_price_cents    BIGINT,
  total_shipping_cents BIGINT,
  shipping_method      INTEGER,
  tracking_number      TEXT,
  tracking_url         TEXT,
  carrier              TEXT,
  raw_response         JSONB,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS printify_shipments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_record_id UUID NOT NULL REFERENCES printify_orders(id) ON DELETE CASCADE,
  tracking_number TEXT,
  tracking_url    TEXT,
  carrier         TEXT,
  shipped_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS printify_events (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event              TEXT NOT NULL,
  printify_order_id  TEXT,
  external_order_id  TEXT,
  payload            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ DEFAULT now()
);
`
);

// ---------------------------------------------------------------- 2. indexes
await runSql(
  "Performance indexes",
  `
CREATE INDEX IF NOT EXISTS idx_printify_products_sku
  ON printify_products (storefront_sku);
CREATE INDEX IF NOT EXISTS idx_printify_products_pid
  ON printify_products (printify_product_id);
CREATE INDEX IF NOT EXISTS idx_printify_orders_external
  ON printify_orders (external_order_id);
CREATE INDEX IF NOT EXISTS idx_printify_orders_status
  ON printify_orders (status);
CREATE INDEX IF NOT EXISTS idx_printify_orders_pid
  ON printify_orders (printify_order_id);
CREATE INDEX IF NOT EXISTS idx_printify_shipments_order
  ON printify_shipments (order_record_id);
CREATE INDEX IF NOT EXISTS idx_printify_events_order
  ON printify_events (printify_order_id);
`
);

// ---------------------------------------------------------------- 3. trigger fn
await runSql(
  "updated_at trigger function + triggers",
  `
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS printify_products_set_updated_at ON printify_products;
CREATE TRIGGER printify_products_set_updated_at
BEFORE UPDATE ON printify_products
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS printify_orders_set_updated_at ON printify_orders;
CREATE TRIGGER printify_orders_set_updated_at
BEFORE UPDATE ON printify_orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
`
);

// ---------------------------------------------------------------- 4. RLS
await runSql(
  "RLS enabled on all printify tables (service-role only)",
  `
ALTER TABLE printify_products  ENABLE ROW LEVEL SECURITY;
ALTER TABLE printify_orders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE printify_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE printify_events    ENABLE ROW LEVEL SECURITY;
`
);

// ---------------------------------------------------------------- 5. verify
const summary = await runSql(
  "Verification summary",
  `
SELECT
  (SELECT count(*) FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name LIKE 'printify_%') AS printify_tables,
  (SELECT count(*) FROM pg_policies
    WHERE tablename LIKE 'printify_%') AS public_policies_must_be_zero,
  (SELECT count(*) FROM pg_indexes
    WHERE tablename LIKE 'printify_%') AS indexes;
`
);
console.log("\nSummary:", summary);
console.log("\n✅ Printify fulfillment schema applied.");
