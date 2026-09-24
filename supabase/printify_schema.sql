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
-- 5. orders — storefront customer orders (checkout source of truth)
--    Written ONLY by the checkout.submit Edge Function (service role).
--    RLS enabled with no public policies: nothing is readable/writable
--    from the browser; admin reads go through the function.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_email     TEXT NOT NULL,
  customer_name      TEXT DEFAULT '',
  shipping_address   JSONB NOT NULL DEFAULT '{}'::jsonb,
  items              JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- items: [{sku, name, size, color, quantity, unit_price_cents}]
  subtotal_cents     BIGINT NOT NULL DEFAULT 0,
  shipping_cents     BIGINT NOT NULL DEFAULT 0,
  total_cents        BIGINT NOT NULL DEFAULT 0,
  currency           TEXT NOT NULL DEFAULT 'USD',
  status             TEXT NOT NULL DEFAULT 'pending',
  -- pending | routed | in_production | fulfilled | canceled | failed
  payment_status     TEXT NOT NULL DEFAULT 'unpaid',
  -- unpaid | paid | refunded
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at DESC);

-- Qikink POD fulfillment columns (auto order push + tracking sync):
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qikink_order_id    TEXT;          -- Qikink order number/id returned by /api/order/create
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_status TEXT NOT NULL DEFAULT 'pending';
-- pending | synced | failed | shipped | delivered | cancelled
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qikink_sync_error  TEXT;          -- last "Failed to Sync with Provider" reason
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number    TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_url       TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier            TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_fulfillment ON orders (fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_orders_qikink ON orders (qikink_order_id);

-- ------------------------------------------------------------
-- 5b. products.qikink_sku — Qikink catalog SKU for POD routing
--     Plain value: one SKU for all sizes/colors (e.g. 'MVnHs').
--     JSON object: per color/size map, keys 'color:size' or 'size'
--     e.g. {"black:M":"MVnHs-Bk-M", "L": "MVnHs-Wh-L"}.
-- ------------------------------------------------------------
ALTER TABLE products ADD COLUMN IF NOT EXISTS qikink_sku TEXT;

-- ------------------------------------------------------------
-- 5c. qikink_events — Qikink webhook / sync audit log
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qikink_events (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event             TEXT NOT NULL,
  qikink_order_id   TEXT,
  order_number      TEXT,
  external_order_id TEXT,
  payload           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qikink_events_order
  ON qikink_events (qikink_order_id);

ALTER TABLE qikink_events ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 7. product_reviews — customer ratings & reviews (public)
--    Anyone may read + submit; only the admin email may delete.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_reviews (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rating        INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title         TEXT NOT NULL DEFAULT '',
  body          TEXT NOT NULL DEFAULT '',
  author_name   TEXT NOT NULL DEFAULT 'Anonymous',
  author_email  TEXT,
  is_verified   BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_product
  ON product_reviews (product_id, created_at DESC);

ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read reviews" ON product_reviews;
CREATE POLICY "Public read reviews"
ON product_reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can submit a review" ON product_reviews;
CREATE POLICY "Anyone can submit a review"
ON product_reviews FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admin can delete reviews" ON product_reviews;
CREATE POLICY "Admin can delete reviews"
ON product_reviews FOR DELETE
USING (auth.jwt() ->> 'email' = 'workrud14@gmail.com');

-- Public per-product aggregate used by the storefront cards:
--   product_ratings(product_id, avg_rating, review_count)
CREATE OR REPLACE VIEW product_ratings WITH (security_invoker = true) AS
SELECT
  product_id,
  ROUND(AVG(rating)::numeric, 1) AS avg_rating,
  COUNT(*)::int AS review_count
FROM product_reviews
GROUP BY product_id;

GRANT SELECT ON product_ratings TO anon, authenticated;
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders (customer_email);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS orders_set_updated_at ON orders;
CREATE TRIGGER orders_set_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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
