import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-outline-variant/30 bg-void">
      <div className="mx-auto max-w-[1400px] px-4 py-16 md:px-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
          {/* Brand */}
          <div>
            <h3 className="mb-4 font-display text-xl font-bold text-signal">
              KIYUMI
            </h3>
            <p className="font-body text-sm leading-relaxed text-shadow">
              Digital flagship for the neo-street movement. Where gaming
              aesthetics meet premium streetwear.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h4 className="mb-4 font-mono text-xs font-medium tracking-[0.15em] text-outline">
              SHOP
            </h4>
            <div className="flex flex-col gap-2">
              <Link to="/shop" className="font-body text-sm text-shadow no-underline transition-colors hover:text-signal">
                All Products
              </Link>
              <Link to="/gaming" className="font-body text-sm text-shadow no-underline transition-colors hover:text-signal">
                Gaming Drop
              </Link>
              <Link to="/shop?collection=yokai" className="font-body text-sm text-shadow no-underline transition-colors hover:text-signal">
                YŌKAI Collection
              </Link>
              <Link to="/shop?collection=shibuya" className="font-body text-sm text-shadow no-underline transition-colors hover:text-signal">
                SHIBUYA.EXE
              </Link>
            </div>
          </div>

          {/* Info */}
          <div>
            <h4 className="mb-4 font-mono text-xs font-medium tracking-[0.15em] text-outline">
              INFO
            </h4>
            <div className="flex flex-col gap-2">
              <span className="font-body text-sm text-shadow">Sizing Guide</span>
              <span className="font-body text-sm text-shadow">Shipping & Returns</span>
              <span className="font-body text-sm text-shadow">Contact</span>
              <span className="font-body text-sm text-shadow">Privacy Policy</span>
            </div>
          </div>

          {/* Connect */}
          <div>
            <h4 className="mb-4 font-mono text-xs font-medium tracking-[0.15em] text-outline">
              CONNECT
            </h4>
            <div className="flex flex-col gap-2">
              <span className="font-body text-sm text-shadow">@kiyumi.official</span>
              <span className="font-body text-sm text-shadow">Discord</span>
              <span className="font-body text-sm text-shadow">TikTok</span>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-outline-variant/20 pt-8">
          <p className="font-mono text-xs tracking-[0.1em] text-outline-variant">
            © 2026 KIYUMI. ALL RIGHTS RESERVED.
          </p>
        </div>
      </div>
    </footer>
  );
}
