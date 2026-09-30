-- ============================================================
-- KIYUMI — Collections system + database hardening
-- Run this in Supabase SQL Editor (whole file at once):
-- https://supabase.com/dashboard/project/wnqfdmbypygvrdanosqx/sql/new
-- ============================================================

-- ------------------------------------------------------------
-- 1. COLLECTIONS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

-- Public read
DROP POLICY IF EXISTS "Public read collections" ON collections;
CREATE POLICY "Public read collections"
ON collections FOR SELECT
USING (true);

-- Only admin email can write
DROP POLICY IF EXISTS "Admin can manage collections" ON collections;
CREATE POLICY "Admin can manage collections"
ON collections FOR ALL
USING (auth.jwt() ->> 'email' = 'workrud14@gmail.com')
WITH CHECK (auth.jwt() ->> 'email' = 'workrud14@gmail.com');

-- Seed the existing collections (safe to re-run)
INSERT INTO collections (name, description, sort_order) VALUES
  ('YŌKAI // AFTER DARK', 'Supernatural streetwear for night crawlers.', 1),
  ('SHIBUYA.EXE', 'Digital noise meets physical form.', 2),
  ('SAKURA//SYSTEM', 'Cherry blossom meets circuit board.', 3),
  ('NEO TOKYO', 'Neon-lit future-tech essentials.', 4),
  ('KITSUNE PROTOCOL', 'Fox-spirit folklore in heavyweight cotton.', 5),
  ('MIDNIGHT ARCADE', 'Gaming-grade construction for the street.', 6)
ON CONFLICT (name) DO NOTHING;

-- ------------------------------------------------------------
-- 2. PERFORMANCE INDEXES (products)
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_collection ON products (collection);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products (featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_products_gaming ON products (gaming_drop) WHERE gaming_drop = true;
CREATE INDEX IF NOT EXISTS idx_products_name ON products (name);

-- ------------------------------------------------------------
-- 3. AUTO UPDATED_AT ON PRODUCTS
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at column if missing
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DROP TRIGGER IF EXISTS products_set_updated_at ON products;
CREATE TRIGGER products_set_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- 4. HARDEN RLS: only admin can write products
-- (any signed-in user could previously create/delete products)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage products" ON products;
CREATE POLICY "Admin can manage products"
ON products FOR ALL
USING (auth.jwt() ->> 'email' = 'workrud14@gmail.com')
WITH CHECK (auth.jwt() ->> 'email' = 'workrud14@gmail.com');

-- Public read stays open
DROP POLICY IF EXISTS "Public read access for products" ON products;
CREATE POLICY "Public read access for products"
ON products FOR SELECT
USING (true);

-- ------------------------------------------------------------
-- 5. HARDEN STORAGE: only admin can upload/delete images
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
CREATE POLICY "Admin can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images' AND auth.jwt() ->> 'email' = 'workrud14@gmail.com');

DROP POLICY IF EXISTS "Authenticated users can delete product images" ON storage.objects;
CREATE POLICY "Admin can delete product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images' AND auth.jwt() ->> 'email' = 'workrud14@gmail.com');

DROP POLICY IF EXISTS "Authenticated users can update product images" ON storage.objects;
CREATE POLICY "Admin can update product images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images' AND auth.jwt() ->> 'email' = 'workrud14@gmail.com');

-- ------------------------------------------------------------
-- 6. HARDEN NEWSLETTER: only admin can read subscribers
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view subscribers" ON newsletter_subscribers;
CREATE POLICY "Admin can view subscribers"
ON newsletter_subscribers FOR SELECT
USING (auth.jwt() ->> 'email' = 'workrud14@gmail.com');

-- Done! Collections now live in the DB and are manageable from /admin/collections
