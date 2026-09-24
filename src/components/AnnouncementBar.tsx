import { useEffect, useState } from "react";

const MESSAGES = [
  "DROP 026 LIVE NOW — WHEN IT'S GONE, IT'S GONE",
  "FREE WORLDWIDE SHIPPING ON ORDERS OVER $150",
  "MADE TO ORDER · SHIPS WORLDWIDE",
];

export default function AnnouncementBar() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % MESSAGES.length), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="relative z-50 overflow-hidden bg-gradient-to-r from-primary-container to-secondary-container text-center"
      role="status"
      aria-live="polite"
    >
      <div className="flex h-8 items-center justify-center">
        {MESSAGES.map((m, i) => (
          <span
            key={m}
            className={`absolute px-4 font-mono text-[9px] font-bold tracking-[0.18em] text-on-primary-container transition-all duration-500 sm:text-[10px] ${
              i === index ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
            }`}
          >
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}
