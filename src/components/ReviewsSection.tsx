import { useEffect, useState } from "react";
import { MessageCircle, PenLine, X } from "lucide-react";
import {
  fetchReviews,
  submitReview,
  type Review,
} from "../lib/reviews";
import { useAuth } from "../lib/auth-context";
import StarRating from "./StarRating";

type Props = { productId: string };

export default function ReviewsSection({ productId }: Props) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchReviews(productId)
      .then((rows) => {
        if (!cancelled) setReviews(rows);
      })
      .catch(() => {
        /* table may not exist yet on very old deploys — show empty state */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  useEffect(() => {
    if (user?.email && !name) setName(user.email.split("@")[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  const avg =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1) {
      setError("Pick a star rating first.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await submitReview({
        productId,
        rating,
        title: title.trim(),
        body: body.trim(),
        authorName: name.trim() || "Anonymous",
        authorEmail: user?.email ?? null,
      });
      setReviews(await fetchReviews(productId));
      setDone(true);
      setShowForm(false);
      setRating(0);
      setTitle("");
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-20 border-t border-outline-variant/20 pt-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="font-display text-2xl font-bold tracking-tight text-signal">
            REVIEWS
          </h2>
          {reviews.length > 0 && (
            <div className="flex items-center gap-2">
              <StarRating value={Math.round(avg)} size={14} />
              <span className="font-mono text-xs text-shadow">
                {avg.toFixed(1)} · {reviews.length} review{reviews.length === 1 ? "" : "s"}
              </span>
            </div>
          )}
        </div>
        {!showForm && (
          <button
            onClick={() => {
              setShowForm(true);
              setDone(false);
            }}
            className="flex items-center gap-2 border border-outline-variant/30 px-4 py-2 font-mono text-[10px] tracking-[0.15em] text-shadow transition-colors hover:border-primary hover:text-primary"
          >
            <PenLine size={12} />
            WRITE A REVIEW
          </button>
        )}
      </div>

      {done && (
        <p className="mb-6 flex items-center gap-2 border border-primary/20 bg-primary/5 px-4 py-3 font-mono text-xs text-primary">
          Thanks — your review is live.
        </p>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-10 border border-outline-variant/30 bg-surface-container/40 p-6"
        >
          <div className="mb-5 flex items-center justify-between">
            <p className="font-mono text-[10px] tracking-[0.15em] text-outline">
              YOUR RATING
            </p>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-shadow transition-colors hover:text-signal"
              aria-label="Close review form"
            >
              <X size={16} />
            </button>
          </div>
          <StarRating value={rating} onChange={setRating} size={22} />
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Display name"
              maxLength={40}
              className="border-b-2 border-outline-variant/50 bg-transparent py-2.5 font-body text-sm text-signal outline-none transition-colors placeholder:text-outline-variant focus:border-primary"
            />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Headline (optional)"
              maxLength={80}
              className="border-b-2 border-outline-variant/50 bg-transparent py-2.5 font-body text-sm text-signal outline-none transition-colors placeholder:text-outline-variant focus:border-primary"
            />
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="How was the fit, fabric, print? (optional)"
            rows={3}
            maxLength={1000}
            className="mt-4 w-full resize-none border-b-2 border-outline-variant/50 bg-transparent py-2.5 font-body text-sm text-signal outline-none transition-colors placeholder:text-outline-variant focus:border-primary"
          />
          {error && (
            <p className="mt-3 font-mono text-xs text-error">{error}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="mt-6 bg-gradient-to-r from-primary-container to-secondary-container px-8 py-3 font-mono text-xs font-bold tracking-[0.15em] text-on-primary-container transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "POSTING…" : "POST REVIEW"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="py-6 font-mono text-xs text-outline">LOADING…</p>
      ) : reviews.length === 0 ? (
        <div className="flex items-center gap-3 border border-outline-variant/20 px-5 py-6 text-outline">
          <MessageCircle size={18} strokeWidth={1.5} />
          <p className="font-body text-sm">
            No reviews yet — be the first to rate this piece.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
          {reviews.map((r) => (
            <article key={r.id} className="border-b border-outline-variant/15 pb-5">
              <div className="flex items-center justify-between gap-3">
                <StarRating value={r.rating} size={12} />
                <span className="font-mono text-[9px] tracking-[0.1em] text-outline/60">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              </div>
              {r.title && (
                <p className="mt-2 font-body text-sm font-semibold text-signal">
                  {r.title}
                </p>
              )}
              {r.body && (
                <p className="mt-1 font-body text-sm leading-relaxed text-shadow">
                  {r.body}
                </p>
              )}
              <p className="mt-2 font-mono text-[10px] tracking-[0.1em] text-outline">
                {r.author_name}
                {r.is_verified && (
                  <span className="ml-2 text-primary">✓ VERIFIED BUYER</span>
                )}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
