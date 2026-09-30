import { useState } from "react";
import { Star } from "lucide-react";

type Props = {
  value: number;
  onChange?: (rating: number) => void;
  size?: number;
  className?: string;
};

/** Five-star row. Interactive when `onChange` is passed, display-only otherwise. */
export default function StarRating({ value, onChange, size = 12, className = "" }: Props) {
  const [hover, setHover] = useState(0);
  const interactive = typeof onChange === "function";
  const shown = hover || value;

  return (
    <div
      className={`flex items-center gap-0.5 ${className}`}
      role={interactive ? "radiogroup" : undefined}
      aria-label={interactive ? "Select a rating" : `Rated ${value} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((star) =>
        interactive ? (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange?.(star)}
            className="p-0.5 transition-transform hover:scale-110"
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
          >
            <Star
              size={size}
              className={star <= shown ? "fill-primary text-primary" : "text-outline-variant"}
            />
          </button>
        ) : (
          <Star
            key={star}
            size={size}
            className={star <= value ? "fill-primary text-primary" : "text-outline-variant"}
          />
        ),
      )}
    </div>
  );
}
