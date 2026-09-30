import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Zap, Ghost, ChevronDown } from "lucide-react";
import { supabase, type Product } from "../lib/supabase";
import ProductCard from "../components/ProductCard";
import { useInView, useStaggeredInView } from "../lib/animations";
import { useRatingSummaries } from "../lib/reviews";

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
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const ratings = useRatingSummaries();

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
        setProductsLoaded(true);
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
        {/* Background image — mobile poster on small screens, desktop shot on large.
            On mobile the poster has KIYUMI/SHOP NOW baked in, so the whole hero
            is a tappable link to the shop; overlay branding is hidden. */}
        <Link
          to="/shop"
          aria-label="Shop KIYUMI"
          className="absolute inset-0 block md:pointer-events-none"
        >
          <picture>
            <source media="(max-width: 767px)" srcSet="/hero-bg-mobile.webp" type="image/webp" />
            <source media="(max-width: 767px)" srcSet="/hero-bg-mobile.jpg" />
            <img
              src="/hero-bg.jpg"
              alt="KIYUMI Streetwear — Shibuya"
              fetchPriority="high"
              decoding="async"
              onLoad={() => setHeroLoaded(true)}
              className="hero-img absolute inset-0 h-full w-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              style={{
                transform: `scale(${heroScale})`,
                transition: "transform 0.05s linear",
              }}
            />
          </picture>
        </Link>

        {/* Bottom gradient fade to page — softer on mobile so poster text stays crisp */}
        <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-void/90 to-transparent md:h-1/2 md:from-void md:via-void/50" />

        {/* Subtle vignette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 50%, rgba(10,10,10,0.55) 100%)",
          }}
        />

        {/* Mobile CTA row — sits above the poster's baked-in SHOP NOW area */}
        <div
          className={`absolute inset-x-4 bottom-6 z-20 flex gap-3 transition-all duration-1000 md:hidden ${
            heroLoaded ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <Link
            to="/shop"
            className="flex flex-1 items-center justify-center gap-2 bg-white py-3.5 font-mono text-[11px] font-bold tracking-[0.15em] text-black shadow-lg no-underline transition-all active:scale-95"
          >
            SHOP NOW
            <ArrowRight size={13} />
          </Link>
        </div>

        {/* Minimal branding + CTA — desktop only; mobile uses the baked-in poster text */}
        <div
          className="absolute bottom-12 left-6 z-10 hidden md:left-14 md:block"
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
                className="group inline-flex items-center justify-center gap-3 bg-white px-6 py-3 font-mono text-[10px] font-bold tracking-[0.15em] text-black no-underline transition-all hover:bg-white/90 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] sm:px-8 sm:py-3.5 sm:text-[11px]"
              >
                SHOP NOW
                <ArrowRight
                  size={13}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className="absolute bottom-8 left-1/2 z-10 hidden -translate-x-1/2 md:block"
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
            YŌKAI COLLECTION • SHIBUYA.EXE • SAKURA//SYSTEM • NEO TOKYO • KITSUNE PROTOCOL •{" "}
            YŌKAI COLLECTION • SHIBUYA.EXE • SAKURA//SYSTEM • NEO TOKYO • KITSUNE PROTOCOL •{" "}
            YŌKAI COLLECTION • SHIBUYA.EXE • SAKURA//SYSTEM • NEO TOKYO • KITSUNE PROTOCOL •
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
          {!productsLoaded &&
            Array.from({ length: 8 }).map((_, i) => (
              <div key={`sk-${i}`} className="animate-pulse">
                <div className="aspect-[3/4] bg-surface-container" />
                <div className="mt-3 h-4 w-3/4 bg-surface-container" />
                <div className="mt-2 h-3 w-1/2 bg-surface-container" />
              </div>
            ))}
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
              <ProductCard product={product} rating={ratings.get(product.id)} />
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
              sub: " // AFTER DARK",
              num: "01",
              desc: "Supernatural streetwear for night crawlers. Ghosts don't follow trends.",
              color: "from-primary-container/15 via-surface-container to-surface",
              link: "/shop?collection=Y%C5%8DKAI%20%2F%2F%20AFTER%20DARK",
              accent: "text-primary",
            },
            {
              name: "SHIBUYA",
              sub: ".EXE",
              num: "02",
              desc: "Digital noise meets physical form. Code running through cotton.",
              color: "from-secondary-container/15 via-surface-container to-surface",
              link: "/shop?collection=SHIBUYA.EXE",
              accent: "text-secondary",
            },
            {
              name: "SAKURA",
              sub: "//SYSTEM",
              num: "03",
              desc: "Cherry blossom meets circuit board. Softness, weaponized.",
              color: "from-tertiary-container/15 via-surface-container to-surface",
              link: "/shop?collection=SAKURA%2F%2FSYSTEM",
              accent: "text-tertiary",
            },
            {
              name: "NEO",
              sub: " TOKYO",
              num: "04",
              desc: "Neon-lit future-tech essentials. Reflective by design.",
              color: "from-primary/10 via-surface-container to-surface",
              link: "/shop?collection=NEO%20TOKYO",
              accent: "text-primary",
            },
            {
              name: "KITSUNE",
              sub: " PROTOCOL",
              num: "05",
              desc: "Fox-spirit folklore in heavyweight cotton. Nine tails, zero mercy.",
              color: "from-error/10 via-surface-container to-surface",
              link: "/shop?collection=KITSUNE%20PROTOCOL",
              accent: "text-error",
            },
          ].map((c, i) => (
            <FadeIn key={c.num} delay={i * 90}>
              <Link
                to={c.link}
                className={`group relative flex min-h-[260px] flex-col justify-end bg-gradient-to-br ${c.color} p-8 no-underline transition-all duration-300 hover:translate-y-[-2px] hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)]`}
              >
                <span className="absolute left-8 top-6 font-mono text-[10px] tracking-[0.25em] text-outline/50">
                  {c.num}
                </span>
                <div className="absolute right-6 top-6 flex h-9 w-9 items-center justify-center border border-outline-variant/20 text-outline/40 transition-all duration-300 group-hover:border-signal/40 group-hover:text-signal/80">
                  <ArrowRight size={14} />
                </div>
                <p className="mb-4 mt-8 font-body text-[13px] leading-relaxed text-shadow/80">
                  {c.desc}
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="font-display text-2xl font-bold text-signal">
                    {c.name}
                  </h3>
                  <span className={`font-display text-xl font-bold ${c.accent}`}>
                    {c.sub}
                  </span>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* UGC / Instagram wall */}
      <section className="border-y border-outline-variant/20 bg-surface-container/40">
        <div className="mx-auto max-w-[1400px] px-4 py-20 md:px-16">
          <FadeIn>
            <div className="mb-10 text-center">
              <p className="mb-2 font-mono text-[10px] tracking-[0.3em] text-primary/70">
                IN THE WILD
              </p>
              <h2 className="font-display text-3xl font-bold tracking-tight text-signal md:text-4xl">
                #KIYUMIONLINE
              </h2>
              <p className="mx-auto mt-3 max-w-sm font-body text-sm leading-relaxed text-shadow/70">
                Tag @kiyumi.official in your fit pics — the best ones get featured
                (and a discount code).
              </p>
            </div>
          </FadeIn>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {[
              { tag: "鬼", label: "ONI SZN" },
              { tag: "渋", label: "SHIBUYA" },
              { tag: "桜", label: "SAKURA" },
              { tag: "狐", label: "KITSUNE" },
              { tag: "電", label: "NEON" },
              { tag: "夢", label: "DREAM" },
            ].map((t, i) => (
              <FadeIn key={t.label} delay={i * 70}>
                <a
                  href="https://instagram.com/kiyumi.official"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex aspect-square flex-col items-center justify-center gap-2 border border-outline-variant/15 bg-surface transition-colors no-underline hover:border-primary/40"
                >
                  <span className="font-display text-3xl text-outline/40 transition-colors group-hover:text-primary">
                    {t.tag}
                  </span>
                  <span className="font-mono text-[9px] tracking-[0.2em] text-outline/60">
                    {t.label}
                  </span>
                </a>
              </FadeIn>
            ))}
          </div>
          <FadeIn className="mt-10 text-center" delay={200}>
            <a
              href="https://instagram.com/kiyumi.official"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-outline-variant/30 px-6 py-3 font-mono text-[10px] font-bold tracking-[0.15em] text-signal no-underline transition-colors hover:border-primary hover:text-primary"
            >
              FOLLOW @KIYUMI.OFFICIAL
              <ArrowRight size={12} />
            </a>
          </FadeIn>
        </div>
      </section>

      {/* Brand ethos */}
      <section className="border-y border-outline-variant/20 bg-surface-container/50">
        <div className="mx-auto grid max-w-[1400px] grid-cols-1 md:grid-cols-3 md:px-16">
          {[
            {
              icon: <Zap size={20} strokeWidth={1.5} />,
              title: "BUILT DIFFERENT",
              desc: "Every stitch engineered with obsessive, uncompromising precision.",
            },
            {
              icon: <Ghost size={20} strokeWidth={1.5} />,
              title: "CULTURE FIRST",
              desc: "Born from anime and Tokyo street culture. Not trend-chasing.",
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
            ENTER THE VOID
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
