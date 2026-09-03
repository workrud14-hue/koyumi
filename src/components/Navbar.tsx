import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ShoppingBag, Menu, X, User, Search } from "lucide-react";
import { useBag } from "../lib/bag-context";
import { useAuth } from "../lib/auth-context";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { bagCount } = useBag();
  const { user } = useAuth();
  const count = bagCount();

  const links = [
    { to: "/", label: "HOME" },
    { to: "/shop", label: "SHOP ALL" },
    { to: "/gaming", label: "GAMING DROP" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-outline-variant/20 bg-void/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-4 md:px-16">
        {/* Logo */}
        <Link
          to="/"
          className="group font-display text-xl font-extrabold tracking-tight text-signal no-underline transition-colors hover:text-primary md:text-2xl"
        >
          KIYUMI
          <span className="ml-1 inline-block text-[8px] align-top text-primary/50 transition-colors group-hover:text-primary">™</span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`relative font-mono text-[11px] font-medium tracking-[0.15em] no-underline transition-colors ${
                location.pathname === l.to
                  ? "text-signal"
                  : "text-outline/60 hover:text-signal"
              }`}
            >
              {l.label}
              {location.pathname === l.to && (
                <span className="absolute -bottom-1 left-0 h-px w-full bg-gradient-to-r from-primary to-secondary" />
              )}
            </Link>
          ))}
          {user && (
            <Link
              to="/admin"
              className={`relative font-mono text-[11px] font-medium tracking-[0.15em] no-underline transition-colors ${
                location.pathname.startsWith("/admin")
                  ? "text-signal"
                  : "text-outline/60 hover:text-signal"
              }`}
            >
              ADMIN
              {location.pathname.startsWith("/admin") && (
                <span className="absolute -bottom-1 left-0 h-px w-full bg-gradient-to-r from-primary to-secondary" />
              )}
            </Link>
          )}
        </div>

        {/* Icons */}
        <div className="flex items-center gap-3">
          <button className="rounded-sm p-1.5 text-outline/50 transition-colors hover:text-signal" aria-label="Search">
            <Search size={18} strokeWidth={1.5} />
          </button>
          <Link
            to="/wishlist"
            className="rounded-sm p-1.5 text-outline/50 transition-colors hover:text-signal"
            aria-label="Wishlist"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
          </Link>
          <Link
            to="/bag"
            className="relative rounded-sm p-1.5 text-outline/50 transition-colors hover:text-signal"
            aria-label="Bag"
          >
            <ShoppingBag size={18} strokeWidth={1.5} />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center bg-gradient-to-r from-primary-container to-secondary-container px-1 text-[9px] font-bold text-signal">
                {count}
              </span>
            )}
          </Link>
          {user ? (
            <Link to="/admin" className="rounded-sm p-1.5 text-outline/50 transition-colors hover:text-signal">
              <User size={18} strokeWidth={1.5} />
            </Link>
          ) : (
            <Link
              to="/auth"
              className="hidden border border-outline-variant/30 px-3 py-1.5 font-mono text-[10px] tracking-[0.1em] text-outline/70 no-underline transition-all hover:border-signal/40 hover:text-signal sm:inline-block"
            >
              SIGN IN
            </Link>
          )}
          <button
            className="rounded-sm p-1.5 text-outline/50 transition-colors hover:text-signal md:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div
        className={`overflow-hidden border-t border-outline-variant/20 bg-void/95 backdrop-blur-xl transition-all duration-300 md:hidden ${
          open ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex flex-col gap-1 px-4 py-4">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className={`rounded-sm px-3 py-2.5 font-mono text-xs tracking-[0.15em] no-underline transition-colors ${
                location.pathname === l.to
                  ? "bg-primary-container/10 text-primary"
                  : "text-outline/60 hover:text-signal"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {user && (
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className="rounded-sm px-3 py-2.5 font-mono text-xs tracking-[0.15em] text-outline/60"
            >
              ADMIN
            </Link>
          )}
          {!user && (
            <Link
              to="/auth"
              onClick={() => setOpen(false)}
              className="mt-2 border border-outline-variant/30 px-3 py-2.5 text-center font-mono text-xs tracking-[0.1em] text-outline/70 no-underline"
            >
              SIGN IN
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
