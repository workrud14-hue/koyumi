-- Run this in Supabase SQL Editor to seed the product catalog
-- Go to: https://supabase.com/dashboard/project/wnqfdmbypygvrdanosqx/sql/new

-- First, create the products table if it doesn't exist
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
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Allow public read access to products
CREATE POLICY "Public read access for products"
ON products FOR SELECT
USING (true);

-- Allow authenticated users to manage products
CREATE POLICY "Authenticated users can manage products"
ON products FOR ALL
USING (auth.role() = 'authenticated');

-- Now seed the products
INSERT INTO products (name, price, compare_price, description, images, category, collection, sizes, colors, sku, stock, featured, gaming_drop) VALUES

-- KURO ONI COLLECTION
(
  'Kuro Oni Oversized Tee',
  78.00,
  95.00,
  'Heavyweight 220gsm cotton. Dropped shoulders. Minimalist oni mask print across the chest. Oversized fit designed for layering.',
  ARRAY[
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80',
    'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&q=80'
  ],
  'Tees',
  'YŌKAI // AFTER DARK',
  ARRAY['S', 'M', 'L', 'XL', 'XXL'],
  ARRAY['#0A0A0A', '#1a1a2e', '#2d1b3d'],
  'KY-KOT-001',
  45,
  true,
  false
),
(
  'Shibuya Night Hoodie',
  128.00,
  NULL,
  'Premium 380gsm French terry. Shibuya crossing holographic print on back. Kangaroo pocket with hidden zip compartment.',
  ARRAY[
    'https://images.unsplash.com/photo-1556821840-3a63f7563303?w=800&q=80',
    'https://images.unsplash.com/photo-1578768079470-8a0a1b7b5c2b?w=800&q=80'
  ],
  'Hoodies & Outerwear',
  'SHIBUYA.EXE',
  ARRAY['S', 'M', 'L', 'XL'],
  ARRAY['#0A0A0A', '#1C1C1C'],
  'KY-SNH-002',
  30,
  true,
  false
),
(
  'Oni Mask Bomber Jacket',
  198.00,
  245.00,
  'Nylon shell with quilted lining. Embroidered oni mask on left chest. Ribbed cuffs and hem. Side pockets + inner pocket.',
  ARRAY[
    'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80',
    'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&q=80'
  ],
  'Hoodies & Outerwear',
  'YŌKAI // AFTER DARK',
  ARRAY['S', 'M', 'L', 'XL'],
  ARRAY['#0A0A0A'],
  'KY-OMB-003',
  15,
  true,
  false
),

-- NEO TOKYO COLLECTION
(
  'Neon Circuit Tee',
  68.00,
  NULL,
  'Soft cotton blend. Circuit board pattern with neon accent lines. Reflective elements glow under street lights.',
  ARRAY[
    'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=800&q=80',
    'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&q=80'
  ],
  'Tees',
  'NEO TOKYO',
  ARRAY['S', 'M', 'L', 'XL'],
  ARRAY['#0A0A0A', '#00ff88'],
  'KY-NCT-004',
  50,
  false,
  false
),
(
  'Sakura Storm Wide Pants',
  98.00,
  NULL,
  'Relaxed wide-leg fit. Cherry blossom print along the left leg. Elastic waist with drawstring. Twin side pockets.',
  ARRAY[
    'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&q=80',
    'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80'
  ],
  'Bottoms & Accessories',
  'SAKURA//SYSTEM',
  ARRAY['S', 'M', 'L', 'XL'],
  ARRAY['#0A0A0A', '#1C1C1C'],
  'KY-SSW-005',
  35,
  true,
  false
),

-- KITSUNE PROTOCOL COLLECTION
(
  'Kitsune Fox Hoodie',
  138.00,
  160.00,
  'Oversized heavyweight hoodie. Hand-drawn kitsune fox graphic across the back. Hidden inner hood print. Metal eyelets.',
  ARRAY[
    'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=800&q=80',
    'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&q=80'
  ],
  'Hoodies & Outerwear',
  'KITSUNE PROTOCOL',
  ARRAY['S', 'M', 'L', 'XL'],
  ARRAY['#0A0A0A', '#8B0000'],
  'KY-KFH-006',
  25,
  true,
  false
),
(
  'Fox Spirit Enamel Pin Set',
  24.00,
  NULL,
  'Set of 3 enamel pins featuring kitsune motifs. Hard enamel with gold plating. Dual pin-back clasps.',
  ARRAY[
    'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=800&q=80'
  ],
  'Bottoms & Accessories',
  'KITSUNE PROTOCOL',
  ARRAY['ONE SIZE'],
  ARRAY['GOLD'],
  'KY-FSP-007',
  100,
  false,
  false
),

-- MIDNIGHT ARCADE (GAMING DROP)
(
  'Player One Crop Tee',
  65.00,
  NULL,
  'Cropped fit. Pixel art controller graphic. Glitch-effect text. Perfect for streamers and gamers.',
  ARRAY[
    'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&q=80',
    'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&q=80'
  ],
  'Tees',
  'MIDNIGHT ARCADE',
  ARRAY['S', 'M', 'L'],
  ARRAY['#0A0A0A', '#6B21A8'],
  'KY-POC-008',
  40,
  false,
  true
),
(
  'Arcade Cabinet Bomber',
  188.00,
  NULL,
  'Retrosynth bomber jacket. Arcade cabinet pixel art on the back. LED-style reflective trim. Inner satin lining.',
  ARRAY[
    'https://images.unsplash.com/photo-1548126032-079a0fb0099d?w=800&q=80'
  ],
  'Hoodies & Outerwear',
  'MIDNIGHT ARCADE',
  ARRAY['S', 'M', 'L', 'XL'],
  ARRAY['#0A0A0A'],
  'KY-ACB-009',
  20,
  true,
  true
),
(
  'Pixel Ghost Bucket Hat',
  35.00,
  NULL,
  'Reversible bucket hat. Solid black on one side, pixel ghost print on the other. Embroidered details.',
  ARRAY[
    'https://images.unsplash.com/photo-1588850561407-ed78c334e67a?w=800&q=80'
  ],
  'Bottoms & Accessories',
  'MIDNIGHT ARCADE',
  ARRAY['S/M', 'L/XL'],
  ARRAY['#0A0A0A'],
  'KY-PGB-010',
  60,
  false,
  true
),

-- SAKURA//SYSTEM
(
  'Sakura Circuit Tee',
  72.00,
  NULL,
  'Japanese cherry blossoms merge with circuit traces. Watercolor-style print on premium cotton. Gender-neutral oversized fit.',
  ARRAY[
    'https://images.unsplash.com/photo-1564859228273-274232fdb516?w=800&q=80'
  ],
  'Tees',
  'SAKURA//SYSTEM',
  ARRAY['S', 'M', 'L', 'XL'],
  ARRAY['#0A0A0A', '#FFB7C5'],
  'KY-SCC-011',
  40,
  false,
  false
),
(
  'Hanami Windbreaker',
  148.00,
  180.00,
  'Lightweight ripstop nylon. Full-zip with storm flap. All-over sakura print. Packs into its own pocket.',
  ARRAY[
    'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=800&q=80',
    'https://images.unsplash.com/photo-1608042314453-ae338d80c427?w=800&q=80'
  ],
  'Hoodies & Outerwear',
  'SAKURA//SYSTEM',
  ARRAY['S', 'M', 'L', 'XL'],
  ARRAY['#FFB7C5', '#1C1C1C'],
  'KY-HMW-012',
  20,
  false,
  false
);

-- Done! Products seeded.
