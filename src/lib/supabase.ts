import { createClient } from "@supabase/supabase-js";

// The Supabase URL + anon key are PUBLIC client-side credentials by design —
// they ship in every browser bundle and are safe to expose. Row Level Security
// (see supabase/SETUP_ALL.sql) is what actually protects the data.
// Env vars take priority when present; fallbacks keep auth working in every
// build environment (prod deploys, previews, local dev).
const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  "https://wnqfdmbypygvrdanosqx.supabase.co";
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InducWZkbWJ5cHlndnJkYW5vc3F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNTc2MjgsImV4cCI6MjEwMzkzMzYyOH0.RvL2SP20pHo_EYoMUqFlRhIgpQYkenNK1aHyT5nUY-8";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase env vars: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});

export type Product = {
  id: string;
  name: string;
  price: number;
  compare_price?: number;
  description: string;
  images: string[];
  category: string;
  collection: string;
  sizes: string[];
  colors: string[];
  sku: string;
  stock: number;
  featured: boolean;
  gaming_drop: boolean;
  created_at: string;
};

export type CartItem = {
  product: Product;
  size: string;
  color: string;
  quantity: number;
};
