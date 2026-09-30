import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export type Review = {
  id: string;
  product_id: string;
  rating: number;
  title: string;
  body: string;
  author_name: string;
  is_verified: boolean;
  created_at: string;
};

export type RatingSummary = {
  product_id: string;
  avg_rating: number | null;
  review_count: number;
};

/** All review rows for one product, newest first. */
export async function fetchReviews(productId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from("product_reviews")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as Review[];
}

/** Rating aggregates for every product at once (one query for the grid). */
export async function fetchRatingSummaries(): Promise<Map<string, RatingSummary>> {
  const { data, error } = await supabase
    .from("product_ratings")
    .select("product_id, avg_rating, review_count");
  if (error) {
    // View may not exist yet on older deploys — degrade silently.
    console.warn("ratings unavailable:", error.message);
    return new Map();
  }
  return new Map((data ?? []).map((r) => [r.product_id, r as RatingSummary]));
}

/** React hook: rating summaries for all products, loaded once. */
export function useRatingSummaries() {
  const [summaries, setSummaries] = useState<Map<string, RatingSummary>>(new Map());
  useEffect(() => {
    let cancelled = false;
    fetchRatingSummaries().then((m) => {
      if (!cancelled) setSummaries(m);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return summaries;
}

export async function submitReview(input: {
  productId: string;
  rating: number;
  title: string;
  body: string;
  authorName: string;
  authorEmail?: string | null;
}): Promise<void> {
  const { error } = await supabase.from("product_reviews").insert({
    product_id: input.productId,
    rating: input.rating,
    title: input.title,
    body: input.body,
    author_name: input.authorName,
    author_email: input.authorEmail ?? null,
  });
  if (error) throw new Error(error.message);
}
