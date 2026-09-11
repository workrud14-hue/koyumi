/**
 * KIYUMI — Supabase DB restore via Management API.
 * Usage: SUPABASE_ACCESS_TOKEN=sbp_xxx bun scripts/restore-db.mjs
 */
import { readFileSync } from "node:fs";

const PROJECT = "wnqfdmbypygvrdanosqx";
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!TOKEN) {
  console.error("Missing SUPABASE_ACCESS_TOKEN env var");
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

const base = readFileSync(new URL("../supabase/SETUP_ALL.sql", import.meta.url), "utf8");

// Split the canonical script into its numbered sections so failures are localized.
const sections = base.split(/^-- -+$/m);
const sectionByTitle = {};
for (const s of sections) {
  const m = s.match(/^\s*(\d+\..+?)\s*$/m);
  if (m) sectionByTitle[m[1].trim()] = "-- " + s.trim();
}

// 1. Tables
await runSql(
  "Tables (products, collections, newsletter_subscribers)",
  `
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  compare_price NUMERIC(10,2),
  description TEXT DEFAULT '',
  images TEXT[] DEFAULT '{}',
  category TEXT DEFAULT 'Tees',
  collection TEXT DEFAULT 'MIDNIGHT ARCADE',
  sizes TEXT[] DEFAULT '{S, M, L, XL}',
  colors TEXT[] DEFAULT '{#0A0A0A}',
  sku TEXT DEFAULT '',
  stock INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT false,
  gaming_drop BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMPTZ DEFAULT now(),
  active BOOLEAN DEFAULT true
);
`
);

// 2. RLS on all three tables
await runSql(
  "Row Level Security enabled on all tables",
  `
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
`
);

// 3. Policies
const ADMIN = "workrud14@gmail.com";
await runSql(
  "RLS policies (public read, admin write, public newsletter subscribe)",
  `
DROP POLICY IF EXISTS "Public read access for products" ON products;
CREATE POLICY "Public read access for products"
ON products FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage products" ON products;
DROP POLICY IF EXISTS "Admin can manage products" ON products;
CREATE POLICY "Admin can manage products"
ON products FOR ALL
USING (auth.jwt() ->> 'email' = '${ADMIN}')
WITH CHECK (auth.jwt() ->> 'email' = '${ADMIN}');

DROP POLICY IF EXISTS "Public read collections" ON collections;
CREATE POLICY "Public read collections"
ON collections FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admin can manage collections" ON collections;
CREATE POLICY "Admin can manage collections"
ON collections FOR ALL
USING (auth.jwt() ->> 'email' = '${ADMIN}')
WITH CHECK (auth.jwt() ->> 'email' = '${ADMIN}');

DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON newsletter_subscribers;
CREATE POLICY "Anyone can subscribe to newsletter"
ON newsletter_subscribers FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can view subscribers" ON newsletter_subscribers;
DROP POLICY IF EXISTS "Admin can view subscribers" ON newsletter_subscribers;
CREATE POLICY "Admin can view subscribers"
ON newsletter_subscribers FOR SELECT
USING (auth.jwt() ->> 'email' = '${ADMIN}');
`
);

// 4. Collections seed
await runSql(
  "Seed 6 collections",
  `
INSERT INTO collections (name, description, sort_order) VALUES
  ('YŌKAI // AFTER DARK', 'Supernatural streetwear for night crawlers.', 1),
  ('SHIBUYA.EXE', 'Digital noise meets physical form.', 2),
  ('SAKURA//SYSTEM', 'Cherry blossom meets circuit board.', 3),
  ('NEO TOKYO', 'Neon-lit future-tech essentials.', 4),
  ('KITSUNE PROTOCOL', 'Fox-spirit folklore in heavyweight cotton.', 5),
  ('MIDNIGHT ARCADE', 'Gaming-grade construction for the street.', 6)
ON CONFLICT (name) DO NOTHING;
`
);

// 5. Indexes + updated_at trigger
await runSql(
  "Performance indexes + updated_at trigger",
  `
CREATE INDEX IF NOT EXISTS idx_products_collection ON products (collection);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products (featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_products_gaming ON products (gaming_drop) WHERE gaming_drop = true;
CREATE INDEX IF NOT EXISTS idx_products_name ON products (name);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_set_updated_at ON products;
CREATE TRIGGER products_set_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
`
);

// 6. Storage bucket + policies
await runSql(
  "Storage: product-images bucket + policies",
  `
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/png','image/jpeg','image/webp','image/gif','image/avif']
) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read access for product images" ON storage.objects;
CREATE POLICY "Public read access for product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admin can upload product images" ON storage.objects;
CREATE POLICY "Admin can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images' AND auth.jwt() ->> 'email' = '${ADMIN}');

DROP POLICY IF EXISTS "Authenticated users can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete product images" ON storage.objects;
CREATE POLICY "Admin can delete product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images' AND auth.jwt() ->> 'email' = '${ADMIN}');

DROP POLICY IF EXISTS "Authenticated users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update product images" ON storage.objects;
CREATE POLICY "Admin can update product images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images' AND auth.jwt() ->> 'email' = '${ADMIN}');
`
);

// 7. Products seed — only when empty (idempotent)
const productCount = JSON.parse(await runSql("Count existing products", "SELECT count(*) AS n FROM products;"))[0].n;
if (productCount === 0) {
  const seedMatch = base.match(/INSERT INTO products \(name[\s\S]*$/);
  if (!seedMatch) {
    console.error("Could not extract product seed from SETUP_ALL.sql");
    process.exit(1);
  }
  await runSql("Seed 12 KIYUMI products", seedMatch[0]);
} else {
  console.log(`• Products table already has ${productCount} rows — skipping seed`);
}

// 8. Verification summary
const summary = await runSql(
  "Verification summary",
  `
SELECT
  (SELECT count(*) FROM products) AS products,
  (SELECT count(*) FROM collections) AS collections,
  (SELECT count(*) FROM newsletter_subscribers) AS subscribers,
  (SELECT count(*) FROM pg_policies WHERE tablename IN ('products','collections','newsletter_subscribers')) AS app_policies,
  (SELECT count(*) FROM storage.buckets WHERE id = 'product-images') AS bucket;
`
);
console.log("\nSummary:", summary);
console.log("\n✅ Database restore complete.");
