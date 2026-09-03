import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Zap, Ghost, ChevronDown } from "lucide-react";
import { supabase, type Product } from "../lib/supabase";
import ProductCard from "../components/ProductCard";
import { useInView, useStaggeredInView } from "../lib/animations";

function FadeIn({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, isInView } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? "translateY(0)" : "translateY(40px)",
        transition: `opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export default function Home() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [scrollY, setScrollY] = useState(0);
  const [heroLoaded, setHeroLoaded] = useState(false);

  const { containerRef: productsRef, visibleItems } = useStaggeredInView(
    featured.length || 8,
    100,
  );

  useEffect(() => {
    supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const all = data ?? [];
        setFeatured(all.filter((p) => p.featured).slice(0, 8));
        if (all.filter((p) => p.featured).length === 0) {
          setFeatured(all.slice(0, 8));
        }
      });

    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    const timer = setTimeout(() => setHeroLoaded(true), 100);

    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(timer);
    };
  }, []);

  const heroScale = 1 + scrollY * 0.00015;
  const heroOpacity = Math.max(0, 1 - scrollY / 800);

  return (
    <>
      {/* ── HERO: Full-bleed image, image is the content ── */}
      <section className="relative h-screen w-full overflow-hidden bg-void" style={{backgroundImage: "radial-gradient(ellipse at 40% 60%, rgba(107,33,168,0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 40%, rgba(217,70,239,0.1) 0%, transparent 60%)"}}>
        {/* Background Image — no text on top, the image IS the hero */}
        <img
          src="/hero-bg.jpg"
          alt="KIYUMI Streetwear — Shibuya"
          fetchPriority="high"
          onLoad={() => setHeroLoaded(true)}
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          style={{
            transform: `scale(${heroScale})`,
            transition: "transform 0.05s linear",
            filter: "brightness(0.65) contrast(1.08) saturate(1.15)",
          }}
        />

        {/* Bottom gradient fade to page */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-void via-void/50 to-transparent" />

        {/* Subtle vignette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 50%, rgba(10,10,10,0.55) 100%)",
          }}
        />

        {/* Minimal branding + CTA — bottom left */}
        <div
          className="absolute bottom-12 left-6 z-10 md:left-14"
          style={{
            opacity: heroOpacity,
            transform: `translateY(${scrollY * 0.15}px)`,
            transition: "opacity 0.15s linear",
          }}
        >
          <div
            className={`transition-all duration-1000 ${
              heroLoaded
                ? "translate-y-0 opacity-100"
                : "translate-y-6 opacity-0"
            }`}
          >
            <p className="mb-1 font-mono text-[10px] tracking-[0.3em] text-white/50">
              NEW DROP — COLLECTION 026
            </p>
            <h1 className="mb-5 font-display text-4xl font-black leading-tight text-white md:text-6xl">
              KIYUMI<span className="text-primary">.</span>
            </h1>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/shop"
                className="group inline-flex items-center gap-3 bg-white px-8 py-3.5 font-mono text-[11px] font-bold tracking-[0.15em] text-void no-underline transition-all hover:bg-white/90 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)]"
              >
                SHOP NOW
                <ArrowRight
                  size={13}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>
              <Link
                to="/gaming"
                className="inline-flex items-center gap-2 border border-white/25 bg-white/5 px-8 py-3.5 font-mono text-[11px] font-bold tracking-[0.15em] text-white/80 no-underline backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/10"
              >
                GAMING DROP
                <Zap size={13} />
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2"
          style={{ opacity: heroOpacity }}
        >
          <div className="flex flex-col items-center gap-2 text-white/30">
            <span className="font-mono text-[9px] tracking-[0.2em]">SCROLL</span>
            <ChevronDown size={16} className="animate-bounce" />
          </div>
        </div>
      </section>

      {/* Marquee */}
      <div className="relative overflow-hidden border-y border-outline-variant/20 bg-surface-container py-4">
        <div className="animate-[marquee_25s_linear_infinite] whitespace-nowrap">
          <span className="inline-block px-6 font-mono text-[11px] tracking-[0.25em] text-outline/70">
            YŌKAI COLLECTION • MIDNIGHT ARCADE • SHIBUYA.EXE • SAKURA//SYSTEM • NEO TOKYO • KITSUNE PROTOCOL •{" "}
            YŌKAI COLLECTION • MIDNIGHT ARCADE • SHIBUYA.EXE • SAKURA//SYSTEM • NEO TOKYO • KITSUNE PROTOCOL •{" "}
            YŌKAI COLLECTION • MIDNIGHT ARCADE • SHIBUYA.EXE • SAKURA//SYSTEM • NEO TOKYO • KITSUNE PROTOCOL •
          </span>
        </div>
      </div>

      {/* All Products — scroll-triggered stagger reveal */}
      <section className="mx-auto max-w-[1400px] px-4 py-24 md:px-16">
        <FadeIn>
          <div className="mb-14 flex items-end justify-between">
            <div>
              <p className="mb-2 font-mono text-[10px] tracking-[0.3em] text-primary/80">
                NEW ARRIVALS
              </p>
              <h2 className="font-display text-3xl font-bold tracking-tight text-signal md:text-4xl">
                THE DROP
              </h2>
            </div>
            <Link
              to="/shop"
              className="group hidden items-center gap-2 font-mono text-[10px] tracking-[0.15em] text-outline no-underline transition-colors hover:text-signal sm:flex"
            >
              VIEW ALL
              <ArrowRight
                size={12}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>
          </div>
        </FadeIn>

        <div
          ref={productsRef}
          className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6 md:gap-y-14"
        >
          {featured.map((product, i) => (
            <div
              key={product.id}
              style={{
                opacity: visibleItems.has(i) ? 1 : 0,
                transform: visibleItems.has(i)
                  ? "translateY(0) scale(1)"
                  : "translateY(30px) scale(0.97)",
                transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1)`,
              }}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        {featured.length === 0 && (
          <FadeIn className="py-16 text-center" delay={100}>
            <p className="font-body text-sm text-outline">
              Products will appear here once added to Supabase.
            </p>
          </FadeIn>
        )}
      </section>

      {/* Statement Section */}
      <section className="relative overflow-hidden border-y border-outline-variant/20">
        <div className="mx-auto grid max-w-[1400px] grid-cols-1 md:grid-cols-12">
          <div className="flex flex-col justify-center px-6 py-20 md:col-span-5 md:px-16 md:py-28">
            <FadeIn>
              <p className="mb-4 font-mono text-[10px] tracking-[0.3em] text-primary/70">
                EST. 2024 — TOKYO
              </p>
              <h2 className="mb-6 font-display text-3xl font-bold leading-tight tracking-tight text-signal md:text-4xl">
                NOT FOR
                <br />
                <span className="text-outline">THE MAINSTREAM.</span>
              </h2>
              <p className="max-w-sm font-body text-sm leading-relaxed text-shadow">
                Born in the back alleys of Shibuya, built for people who treat
                getting dressed like loading into a match. Every piece is a
                statement — not a safe choice.
              </p>
              <div className="mt-8 flex gap-3">
                <div className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
                <div className="h-px flex-1 bg-gradient-to-l from-secondary/30 to-transparent" />
              </div>
            </FadeIn>
          </div>

          <div className="relative md:col-span-7">
            <div className="grid grid-cols-2 gap-px bg-outline-variant/10">
              {[
                { num: "026", label: "COLLECTION", sub: "Current Season" },
                { num: "12", label: "PIECES", sub: "Limited Run" },
                { num: "∞", label: "AURA", sub: "Uncapped" },
                { num: "0", label: "COMPROMISES", sub: "Zero Tolerance" },
              ].map((stat, i) => (
                <FadeIn
                  key={stat.label}
                  className="bg-void px-6 py-10 text-center md:px-10 md:py-14"
                  delay={i * 100}
                >
                  <span className="block font-display text-4xl font-black text-signal md:text-5xl">
                    {stat.num}
                  </span>
                  <span className="mt-2 block font-mono text-[9px] tracking-[0.2em] text-outline">
                    {stat.label}
                  </span>
                  <span className="mt-1 block font-body text-[11px] text-outline/60">
                    {stat.sub}
                  </span>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Collections */}
      <section className="mx-auto max-w-[1400px] px-4 py-28 md:px-16">
        <FadeIn>
          <div className="mb-14 text-center">
            <p className="mb-2 font-mono text-[10px] tracking-[0.3em] text-primary/70">
              EXPLORE
            </p>
            <h2 className="font-display text-3xl font-bold tracking-tight text-signal md:text-4xl">
              COLLECTIONS
            </h2>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {[
            {
              name: "YŌKAI",
              sub: " AFTER DARK",
              desc: "Supernatural streetwear for night crawlers. Ghosts don't follow trends.",
              color: "from-primary-container/15 via-surface-container to-surface",
              link: "/shop?collection=yokai",
              accent: "text-primary",
            },
            {
              name: "SHIBUYA",
              sub: " .EXE",
              desc: "Digital noise meets physical form. Code running through cotton.",
              color: "from-secondary-container/15 via-surface-container to-surface",
              link: "/shop?collection=shibuya",
              accent: "text-secondary",
            },
            {
              name: "MIDNIGHT",
              sub: " ARCADE",
              desc: "Gaming-grade construction for the street. Hitboxes: zero. Fits: perfect.",
              color: "from-tertiary-container/15 via-surface-container to-surface",
              link: "/gaming",
              accent: "text-tertiary",
            },
          ].map((c, i) => (
            <FadeIn key={c.name} delay={i * 120}>
              <Link
                to={c.link}
                className={`group relative flex min-h-[300px] flex-col justify-end bg-gradient-to-br ${c.color} p-8 no-underline transition-all duration-300 hover:translate-y-[-2px] hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)]`}
              >
                <p className="mb-4 font-body text-[13px] leading-relaxed text-shadow/80">
                  {c.desc}
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="font-display text-2xl font-bold text-signal">
                    {c.name}
                  </h3>
                  <span className={`font-display text-2xl font-bold ${c.accent}`}>
                    {c.sub}
                  </span>
                </div>
                <div className="absolute right-6 top-6 flex h-9 w-9 items-center justify-center border border-outline-variant/20 text-outline/40 transition-all duration-300 group-hover:border-signal/40 group-hover:text-signal/80">
                  <ArrowRight size={14} />
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Brand ethos */}
      <section className="border-y border-outline-variant/20 bg-surface-container/50">
        <div className="mx-auto grid max-w-[1400px] grid-cols-1 md:grid-cols-3 md:px-16">
          {[
            {
              icon: <Zap size={20} strokeWidth={1.5} />,
              title: "BUILT DIFFERENT",
              desc: "Every stitch engineered with the precision of competitive gaming hardware.",
            },
            {
              icon: <Ghost size={20} strokeWidth={1.5} />,
              title: "CULTURE FIRST",
              desc: "Born from anime, gaming, and Tokyo street culture. Not trend-chasing.",
            },
            {
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              ),
              title: "LIMITED RUNS",
              desc: "Small batches only. When it's gone, it's gone. No restocks.",
            },
          ].map((v, i) => (
            <FadeIn
              key={v.title}
              delay={i * 80}
              className={`flex flex-col px-8 py-14 text-center ${
                i < 2 ? "border-b md:border-b-0 md:border-r" : ""
              } border-outline-variant/15`}
            >
              <div className="mb-4 text-primary/70">{v.icon}</div>
              <h3 className="mb-2 font-mono text-[11px] font-medium tracking-[0.15em] text-signal/90">
                {v.title}
              </h3>
              <p className="mx-auto max-w-[240px] font-body text-[13px] leading-relaxed text-shadow/70">
                {v.desc}
              </p>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Newsletter / CTA */}
      <section className="relative overflow-hidden px-4 py-28 text-center md:py-36">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 50%, #6b21a8 0%, transparent 50%), radial-gradient(circle at 70% 50%, #d946ef 0%, transparent 50%)",
          }}
        />
        <FadeIn className="relative z-10">
          <p className="mb-4 font-mono text-[10px] tracking-[0.3em] text-primary/70">
            JOIN THE GRID
          </p>
          <h2 className="mb-6 font-display text-3xl font-bold tracking-tight text-signal md:text-5xl">
            ENTER THE ARCADE
          </h2>
          <p className="mx-auto mb-10 max-w-md font-body text-sm leading-relaxed text-shadow/70">
            Early drops. Exclusive colorways. Member-only pricing.
            First to know, first to wear.
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center gap-3 bg-gradient-to-r from-primary-container to-secondary-container px-10 py-4 font-mono text-xs font-bold tracking-[0.15em] text-on-primary-container no-underline transition-all hover:shadow-[0_0_30px_rgba(107,33,168,0.25)]"
          >
            CREATE ACCOUNT
            <ArrowRight size={14} />
          </Link>
        </FadeIn>
      </section>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
      `}</style>
    </>
  );
}
