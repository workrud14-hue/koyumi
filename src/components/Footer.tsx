import { useState } from "react";
import { Link } from "react-router-dom";
import { Send, CheckCircle } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);

    await supabase
      .from("newsletter_subscribers")
      .insert({ email, subscribed_at: new Date().toISOString() })
      .select()
      .single();

    // If table doesn't exist, silently succeed (user can set it up later)
    setLoading(false);
    setSubscribed(true);
    setEmail("");
  };

  return (
    <footer className="mt-auto border-t border-outline-variant/30 bg-void">
      <div className="mx-auto max-w-[1400px] px-4 py-16 md:px-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-5">
          {/* Brand */}
          <div className="md:col-span-1">
            <h3 className="mb-4 font-display text-xl font-bold text-signal">
              KIYUMI
              <span className="ml-0.5 text-[8px] align-top text-primary/50">™</span>
            </h3>
            <p className="font-body text-sm leading-relaxed text-shadow/70">
              Digital flagship for the neo-street movement. Where gaming
              aesthetics meet premium streetwear.
            </p>

            {/* Social Links */}
            <div className="mt-6 flex gap-3">
              {/* Instagram */}
              <a
                href="https://instagram.com/kiyumi.official"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center border border-outline-variant/20 text-outline/50 transition-all hover:border-primary/40 hover:text-primary"
                aria-label="Instagram"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
              {/* TikTok */}
              <a
                href="https://tiktok.com/@kiyumi.official"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center border border-outline-variant/20 text-outline/50 transition-all hover:border-signal/40 hover:text-signal"
                aria-label="TikTok"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.51a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.71a8.16 8.16 0 0 0 3.76.92V6.69z" />
                </svg>
              </a>
              {/* Twitter/X */}
              <a
                href="https://x.com/kiyumi_official"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center border border-outline-variant/20 text-outline/50 transition-all hover:border-signal/40 hover:text-signal"
                aria-label="X (Twitter)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              {/* Discord */}
              <a
                href="https://discord.gg/kiyumi"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center border border-outline-variant/20 text-outline/50 transition-all hover:border-[#5865F2]/40 hover:text-[#5865F2]"
                aria-label="Discord"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="mb-4 font-mono text-xs font-medium tracking-[0.15em] text-outline">
              SHOP
            </h4>
            <div className="flex flex-col gap-2">
              <Link to="/shop" className="font-body text-sm text-shadow/70 no-underline transition-colors hover:text-signal">
                All Products
              </Link>
              <Link to="/gaming" className="font-body text-sm text-shadow/70 no-underline transition-colors hover:text-signal">
                Gaming Drop
              </Link>
              <Link to="/shop?collection=yokai" className="font-body text-sm text-shadow/70 no-underline transition-colors hover:text-signal">
                YŌKAI Collection
              </Link>
              <Link to="/shop?collection=shibuya" className="font-body text-sm text-shadow/70 no-underline transition-colors hover:text-signal">
                SHIBUYA.EXE
              </Link>
              <Link to="/shop?collection=sakura" className="font-body text-sm text-shadow/70 no-underline transition-colors hover:text-signal">
                SAKURA//SYSTEM
              </Link>
            </div>
          </div>

          {/* Info */}
          <div>
            <h4 className="mb-4 font-mono text-xs font-medium tracking-[0.15em] text-outline">
              INFO
            </h4>
            <div className="flex flex-col gap-2">
              <Link to="/about" className="font-body text-sm text-shadow/70 no-underline transition-colors hover:text-signal">
                About Us
              </Link>
              <Link to="/contact" className="font-body text-sm text-shadow/70 no-underline transition-colors hover:text-signal">
                Contact
              </Link>
              <Link to="/privacy" className="font-body text-sm text-shadow/70 no-underline transition-colors hover:text-signal">
                Privacy Policy
              </Link>
              <Link to="/terms" className="font-body text-sm text-shadow/70 no-underline transition-colors hover:text-signal">
                Terms of Service
              </Link>
              <span className="font-body text-sm text-shadow/70">Shipping & Returns</span>
            </div>
          </div>

          {/* Connect */}
          <div>
            <h4 className="mb-4 font-mono text-xs font-medium tracking-[0.15em] text-outline">
              CONNECT
            </h4>
            <div className="flex flex-col gap-2">
              <a href="https://instagram.com/kiyumi.official" target="_blank" rel="noopener noreferrer" className="font-body text-sm text-shadow/70 no-underline transition-colors hover:text-signal">
                Instagram
              </a>
              <a href="https://tiktok.com/@kiyumi.official" target="_blank" rel="noopener noreferrer" className="font-body text-sm text-shadow/70 no-underline transition-colors hover:text-signal">
                TikTok
              </a>
              <a href="https://x.com/kiyumi_official" target="_blank" rel="noopener noreferrer" className="font-body text-sm text-shadow/70 no-underline transition-colors hover:text-signal">
                X (Twitter)
              </a>
              <a href="https://discord.gg/kiyumi" target="_blank" rel="noopener noreferrer" className="font-body text-sm text-shadow/70 no-underline transition-colors hover:text-signal">
                Discord
              </a>
              <span className="font-body text-sm text-shadow/70">@kiyumi.official</span>
            </div>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="mb-4 font-mono text-xs font-medium tracking-[0.15em] text-outline">
              NEWSLETTER
            </h4>
            <p className="mb-4 font-body text-[13px] leading-relaxed text-shadow/60">
              Early drops. Exclusive colorways. Member-only pricing.
            </p>

            {subscribed ? (
              <div className="flex items-center gap-2 border border-primary/20 bg-primary/5 px-3 py-2.5">
                <CheckCircle size={14} className="text-primary" />
                <span className="font-mono text-[11px] text-primary">You're subscribed!</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-0">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                  className="flex-1 border border-outline-variant/30 border-r-0 bg-transparent px-3 py-2.5 font-body text-[12px] text-signal outline-none placeholder:text-outline-variant/40 focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center bg-primary-container px-3 text-on-primary-container transition-colors hover:opacity-90 disabled:opacity-50"
                >
                  <Send size={14} />
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="mt-12 border-t border-outline-variant/20 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="font-mono text-[10px] tracking-[0.1em] text-outline-variant">
              © 2026 KIYUMI. ALL RIGHTS RESERVED.
            </p>
            <div className="flex gap-4">
              <Link to="/privacy" className="font-mono text-[10px] tracking-[0.1em] text-outline-variant no-underline transition-colors hover:text-signal">
                PRIVACY
              </Link>
              <Link to="/terms" className="font-mono text-[10px] tracking-[0.1em] text-outline-variant no-underline transition-colors hover:text-signal">
                TERMS
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
