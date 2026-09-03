import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Gamepad2, Cpu, Crosshair } from "lucide-react";
import { supabase, type Product } from "../lib/supabase";
import ProductCard from "../components/ProductCard";

export default function Gaming() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    supabase
      .from("products")
      .select("*")
      .eq("gaming_drop", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => setProducts(data ?? []));
  }, []);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-surface px-4 py-24 md:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(174,5,198,0.12)_0%,_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(250,186,114,0.06)_0%,_transparent_50%)]" />

        <div className="relative z-10 mx-auto max-w-[1400px] text-center">
          <div className="mb-6 flex items-center justify-center gap-3 text-secondary">
            <Gamepad2 size={24} />
            <Cpu size={24} />
            <Crosshair size={24} />
          </div>
          <p className="mb-4 font-mono text-xs tracking-[0.3em] text-secondary">
            LIMITED EDITION DROP
          </p>
          <h1 className="font-display text-5xl font-black text-signal md:text-[100px] md:leading-[0.9]">
            MIDNIGHT
            <br />
            <span className="bg-gradient-to-r from-secondary to-tertiary bg-clip-text text-transparent">
              ARCADE
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-lg font-body text-base leading-relaxed text-shadow">
            Gaming-grade streetwear built with technical fabrics, modular
            construction, and neon-lit aesthetics. Limited quantities. No
            restocks.
          </p>
        </div>
      </section>

      {/* Specs Banner */}
      <div className="border-y border-outline-variant/20 bg-surface-container">
        <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-px md:grid-cols-4">
          {[
            { label: "TECHNICAL SHELL", value: "RIPSTOP" },
            { label: "MODULAR", value: "POCKETS" },
            { label: "NEON", value: "PIPING" },
            { label: "LIMITED", value: "EDITION" },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center bg-surface px-4 py-6 text-center">
              <span className="font-mono text-[10px] tracking-[0.15em] text-outline">{s.label}</span>
              <span className="mt-1 font-display text-lg font-bold text-secondary">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Products */}
      <section className="mx-auto max-w-[1400px] px-4 py-24 md:px-16">
        <div className="mb-12">
          <p className="mb-2 font-mono text-xs tracking-[0.3em] text-secondary">DROP 001</p>
          <h2 className="font-display text-3xl font-bold text-signal md:text-4xl">
            GAMING COLLECTION
          </h2>
        </div>

        {products.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-display text-xl text-shadow">Drop incoming...</p>
            <p className="mt-2 font-body text-sm text-outline">
              Gaming collection products will appear here once added.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="border-t border-outline-variant/20 bg-surface-container py-24 text-center">
        <h2 className="mb-4 font-display text-3xl font-bold text-signal">
          DON'T MISS THE NEXT DROP
        </h2>
        <p className="mb-8 font-body text-base text-shadow">
          Sign up for early access and exclusive member pricing.
        </p>
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-secondary-container to-primary-container px-8 py-3.5 font-mono text-xs font-bold tracking-[0.15em] text-on-secondary-container no-underline transition-opacity hover:opacity-90"
        >
          GET ACCESS
        </Link>
      </section>
    </>
  );
}
