-- ============================================================
-- KIYUMI — Printify Fulfillment Schema
-- Paste into Supabase SQL Editor and RUN (idempotent):
-- https://supabase.com/dashboard/project/wnqfdmbypygvrdanosqx/sql/new
-- ============================================================

-- ------------------------------------------------------------
-- 1. printify_products — storefront SKU → Printify mapping
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS printify_products (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  storefront_sku      TEXT NOT NULL UNIQUE,          -- our SKU (e.g. 'KY-KOT-001')
  printify_product_id TEXT NOT NULL,                 -- global Printify product id
  blueprint_id        INTEGER NOT NULL,              -- e.g. 281 (Unisex Tee AOP)
  print_provider_id   INTEGER NOT NULL,              -- e.g. 10 (MWW On Demand)
  image_id            TEXT,                          -- Printify uploaded design id
  shop_id             TEXT NOT NULL,                 -- Printify shop id
  variants            JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- variants: [{variant_id, price_cents, options: {color,size}, title}]
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_printify_products_sku
  ON printify_products (storefront_sku);
CREATE INDEX IF NOT EXISTS idx_printify_products_pid
  ON printify_products (printify_product_id);

-- ------------------------------------------------------------
-- 2. printify_orders — order routing + fulfillment state
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS printify_orders (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  external_order_id    TEXT NOT NULL UNIQUE,         -- our storefront order id
  printify_order_id    TEXT,                         -- Printify order id
  status               TEXT NOT NULL DEFAULT 'pending',
  -- pending | submitted | in_production | fulfilled | canceled | failed
  total_price_cents    BIGINT,
  total_shipping_cents BIGINT,
  shipping_method      INTEGER,                      -- 1 standard, 2 express
  tracking_number      TEXT,
  tracking_url         TEXT,
  carrier              TEXT,
  raw_response         JSONB,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_printify_orders_external
  ON printify_orders (external_order_id);
CREATE INDEX IF NOT EXISTS idx_printify_orders_status
  ON printify_orders (status);

-- ------------------------------------------------------------
-- 3. printify_shipments — tracking rows (one per shipment event)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS printify_shipments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_record_id UUID NOT NULL REFERENCES printify_orders(id) ON DELETE CASCADE,
  tracking_number TEXT,
  tracking_url    TEXT,
  carrier         TEXT,
  shipped_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_printify_shipments_order
  ON printify_shipments (order_record_id);

-- ------------------------------------------------------------
-- 4. printify_events — webhook audit log
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS printify_events (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event              TEXT NOT NULL,                 -- e.g. order:shipment:created
  printify_order_id  TEXT,
  external_order_id  TEXT,
  payload            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_printify_events_order
  ON printify_events (printify_order_id);

-- ------------------------------------------------------------
-- 5. RLS: backend uses the service-role key (bypasses RLS).
--    Lock everything down so anon/authed keys can't touch fulfillment data.
-- ------------------------------------------------------------
ALTER TABLE printify_products  ENABLE ROW LEVEL SECURITY;
ALTER TABLE printify_orders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE printify_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE printify_events    ENABLE ROW LEVEL SECURITY;

-- No public policies → only service_role can read/write. Admin UI (if ever
-- needed in the browser) should read via a server route, never directly.

-- ------------------------------------------------------------
-- 6. Auto updated_at for mapping + orders tables
-- ------------------------------------------------------------
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
