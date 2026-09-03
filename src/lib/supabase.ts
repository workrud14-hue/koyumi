import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

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
