import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const LAST_UPDATED = "September 22, 2026";

const sections: { title: string; body: string[] }[] = [
  {
    title: "1. MADE TO ORDER",
    body: [
      "Every KIYUMI piece is printed and produced after you order — that keeps limited drops truly limited and cuts fabric waste. Production usually takes 2–5 business days before your order ships. Because items are made to order, we can't ship before production finishes, so please factor production into your expected delivery window.",
    ],
  },
  {
    title: "2. PROCESSING TIME",
    body: [
      "Orders are processed within 2–5 business days (Monday–Friday, excluding public holidays). Orders placed on weekends or holidays enter production the next business day.",
      "During limited drops or sales, production may take slightly longer due to volume. We'll always keep you updated by email if anything changes with your order.",
    ],
  },
  {
    title: "3. SHIPPING RATES & DELIVERY ESTIMATES",
    body: [
      "India — standard shipping typically delivers 3–7 business days after production. Shipping is calculated at checkout; many orders qualify for free shipping above a threshold.",
      "International — we ship worldwide. Typical delivery is 7–15 business days after production, depending on destination country and customs. Live rates for your country are shown at checkout.",
      "Delivery estimates are business-day estimates provided by our carriers, not guarantees. Actual delivery can vary with carrier load, weather, and customs processing.",
    ],
  },
  {
    title: "4. TRACKING YOUR ORDER",
    body: [
      "Once your order ships, we'll send a shipping confirmation email to the address you used at checkout with your tracking number and a tracking link. If the order was routed through our print-on-demand partner, tracking activates as soon as the carrier scans the parcel.",
      "Didn't get the email? Check your spam folder first, then contact us at support@kiyumi.online with your order number and we'll resend the tracking details.",
    ],
  },
  {
    title: "5. DUTIES & CUSTOMS (INTERNATIONAL)",
    body: [
      "International orders may be subject to import duties, taxes, or customs fees charged by the destination country. These charges are set and collected by your local customs authority — they are not included in our product prices or shipping rates, and they are the recipient's responsibility.",
      "We recommend checking your country's import policies before ordering. We are unable to mark orders as gifts or under-declare their value.",
    ],
  },
  {
    title: "6. WRONG OR INCOMPLETE ADDRESS",
    body: [
      "Please double-check your shipping address before placing an order. Because production starts immediately, we can only change an address if you contact us within a few hours of ordering and before production begins.",
      "If a package is returned to us because of an incorrect or incomplete address, we'll contact you about reshipping; a reshipping fee may apply.",
    ],
  },
  {
    title: "7. LOST OR DELAYED PARCELS",
    body: [
      "Carriers occasionally miss the estimated window. If your tracking hasn't updated for more than 7 consecutive business days (or your order is more than 30 days late for domestic / 45 days for international), contact us and we'll investigate with the carrier and reship or refund the affected order where appropriate.",
    ],
  },
  {
    title: "8. CONTACT",
    body: [
      "Shipping questions: support@kiyumi.online — include your order number (you'll find it in your confirmation email) and we'll get back to you within 1–2 business days.",
    ],
  },
];

export default function Shipping() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 md:px-16">
      {/* Header */}
      <div className="mb-16">
        <p className="mb-3 font-mono text-[10px] tracking-[0.3em] text-primary/70">
          LEGAL // SHIPPING
        </p>
        <h1 className="font-display text-4xl font-black tracking-tight text-signal md:text-6xl">
          SHIPPING POLICY
        </h1>
        <p className="mx-auto mt-6 max-w-2xl font-body text-base leading-relaxed text-shadow/70">
          Production times, delivery estimates, tracking, and everything else
          about getting your order to your door. Last updated:{" "}
          <span className="font-mono text-[11px] text-primary">{LAST_UPDATED}</span>
        </p>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-3xl">
        {sections.map((s) => (
          <section key={s.title} className="mb-8 border-b border-outline-variant/20 pb-8">
            <h2 className="mb-3 font-mono text-[13px] font-medium tracking-[0.15em] text-signal/90">
              {s.title.toUpperCase()}
            </h2>
            {s.body.map((p) => (
              <p key={p.slice(0, 24)} className="mb-3 font-body text-sm leading-relaxed text-shadow/70">
                {p}
              </p>
            ))}
          </section>
        ))}

        {/* CTA */}
        <div className="mt-16 border border-outline-variant/20 bg-surface-container p-8">
          <h2 className="mb-2 font-display text-xl font-bold text-signal">STILL HAVE QUESTIONS?</h2>
          <p className="mb-4 font-body text-sm leading-relaxed text-shadow/70">
            Reach the team directly — we read everything.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="mailto:support@kiyumi.online"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-container to-secondary-container px-6 py-3 font-mono text-xs font-bold tracking-[0.15em] text-on-primary-container no-underline transition-all hover:shadow-[0_0_20px_rgba(107,33,168,0.2)]"
            >
              EMAIL SUPPORT
            </a>
            <Link
              to="/contact"
              className="group inline-flex items-center gap-2 border border-outline-variant/30 px-6 py-3 font-mono text-xs font-bold tracking-[0.15em] text-signal no-underline transition-colors hover:border-primary"
            >
              CONTACT PAGE
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
