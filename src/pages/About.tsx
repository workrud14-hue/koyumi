import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useInView } from "../lib/animations";

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
        transform: isInView ? "translateY(0)" : "translateY(30px)",
        transition: `opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export default function About() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 md:px-16">
      {/* Hero */}
      <FadeIn className="mb-20 text-center">
        <p className="mb-3 font-mono text-[10px] tracking-[0.3em] text-primary/70">
          EST. 2024 — TOKYO
        </p>
        <h1 className="font-display text-4xl font-black tracking-tight text-signal md:text-6xl">
          THE KIYUMI STORY
        </h1>
        <p className="mx-auto mt-6 max-w-2xl font-body text-base leading-relaxed text-shadow/70 md:text-lg">
          Born in the neon-lit backstreets of Shibuya. Built for the ones who
          see fashion as armor, not decoration.
        </p>
      </FadeIn>

      {/* Origin Story */}
      <section className="mb-24 grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-20">
        <FadeIn>
          <div className="flex flex-col justify-center">
            <p className="mb-3 font-mono text-[10px] tracking-[0.3em] text-primary/70">
              THE ORIGIN
            </p>
            <h2 className="mb-6 font-display text-3xl font-bold tracking-tight text-signal">
              NOT FOR
              <br />
              <span className="text-outline">THE MAINSTREAM.</span>
            </h2>
            <div className="space-y-4 font-body text-sm leading-relaxed text-on-surface-variant">
              <p>
                KIYUMI started as a late-night conversation between friends who
                were tired of wearing the same mass-produced streetwear that
                everyone else was wearing. We wanted something that spoke our
                language — anime, gaming, Tokyo underground culture, and the raw
                energy of Shibuya at 2 AM.
              </p>
              <p>
                Every piece in our collection is designed to make a statement.
                We don't follow trends — we set them. Our designers draw
                inspiration from yōkai folklore, arcade aesthetics, sakura
                blossoms, and the digital noise of Japanese pop culture.
              </p>
              <p>
                We believe getting dressed should feel like loading into a match.
                Every outfit is a character build. Every drop is a new season.
              </p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={200}>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center justify-center border border-outline-variant/15 bg-surface-container p-8 text-center">
              <span className="block font-display text-4xl font-black text-signal">026</span>
              <span className="mt-2 font-mono text-[9px] tracking-[0.2em] text-outline">COLLECTIONS</span>
            </div>
            <div className="flex flex-col items-center justify-center border border-outline-variant/15 bg-surface-container p-8 text-center">
              <span className="block font-display text-4xl font-black text-signal">12</span>
              <span className="mt-2 font-mono text-[9px] tracking-[0.2em] text-outline">LIMITED PIECES</span>
            </div>
            <div className="flex flex-col items-center justify-center border border-outline-variant/15 bg-surface-container p-8 text-center">
              <span className="block font-display text-4xl font-black text-signal">∞</span>
              <span className="mt-2 font-mono text-[9px] tracking-[0.2em] text-outline">AURA</span>
            </div>
            <div className="flex flex-col items-center justify-center border border-outline-variant/15 bg-surface-container p-8 text-center">
              <span className="block font-display text-4xl font-black text-signal">0</span>
              <span className="mt-2 font-mono text-[9px] tracking-[0.2em] text-outline">COMPROMISES</span>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Values */}
      <section className="mb-24">
        <FadeIn>
          <p className="mb-3 text-center font-mono text-[10px] tracking-[0.3em] text-primary/70">
            OUR CODE
          </p>
          <h2 className="mb-14 text-center font-display text-3xl font-bold tracking-tight text-signal">
            WHAT WE STAND FOR
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {[
            {
              num: "01",
              title: "CULTURE FIRST",
              desc: "Every design is rooted in anime, gaming, and Tokyo street culture. We don't chase trends — we create movements.",
            },
            {
              num: "02",
              title: "BUILT DIFFERENT",
              desc: "Premium materials, heavyweight cotton, construction quality that matches competitive gaming hardware. No shortcuts.",
            },
            {
              num: "03",
              title: "LIMITED RUNS",
              desc: "Small batches only. When it's gone, it's gone. No restocks, no reproductions. Your piece is yours alone.",
            },
          ].map((v, i) => (
            <FadeIn key={v.num} delay={i * 100}>
              <div className="border border-outline-variant/15 p-8">
                <span className="block font-display text-3xl font-black text-outline/20">
                  {v.num}
                </span>
                <h3 className="mt-4 mb-3 font-mono text-[11px] font-medium tracking-[0.15em] text-signal/90">
                  {v.title}
                </h3>
                <p className="font-body text-sm leading-relaxed text-shadow/70">
                  {v.desc}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* CTA */}
      <FadeIn className="text-center">
        <div className="border-y border-outline-variant/20 py-20">
          <p className="mb-3 font-mono text-[10px] tracking-[0.3em] text-primary/70">
            JOIN THE MOVEMENT
          </p>
          <h2 className="mb-6 font-display text-3xl font-bold tracking-tight text-signal md:text-4xl">
            READY TO PLAY?
          </h2>
          <Link
            to="/shop"
            className="group inline-flex items-center gap-3 bg-gradient-to-r from-primary-container to-secondary-container px-10 py-4 font-mono text-xs font-bold tracking-[0.15em] text-on-primary-container no-underline transition-all hover:shadow-[0_0_30px_rgba(107,33,168,0.25)]"
          >
            SHOP THE COLLECTION
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </FadeIn>
    </div>
  );
}
