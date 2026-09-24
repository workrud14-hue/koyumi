import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const LAST_UPDATED = "September 22, 2026";

const sections: { title: string; body: string[] }[] = [
  {
    title: "1. OUR PROMISE",
    body: [
      "We want every KIYUMI piece to hit as hard in person as it does on screen. If something's wrong with your order — a defect, a printing error, or the wrong item arrived — we'll make it right with a replacement or a refund. This policy explains when and how.",
    ],
  },
  {
    title: "2. ELIGIBLE FOR REFUND OR REPLACEMENT",
    body: [
      "Defective items — manufacturing flaws such as stitching errors, holes, or fabric defects reported within 30 days of delivery.",
      "Printing errors — designs that are misprinted, misaligned, smudged, or missing reported within 30 days of delivery.",
      "Wrong item — if you received a different product, size, or color than ordered, reported within 30 days of delivery.",
      "Damaged in transit — packaging or product damage caused by shipping, reported within 7 days of delivery with photos of the parcel and product.",
    ],
  },
  {
    title: "3. HOW TO START A CLAIM",
    body: [
      "Email support@kiyumi.online within the applicable window with: your order number, a short description of the problem, and 2–3 clear photos of the affected item (including the printing area and, for transit damage, the packaging).",
      "We review every claim within 2–3 business days and may ask for one more photo or detail before approving. Approved claims get a free replacement or a full refund — your choice, subject to stock availability.",
    ],
  },
  {
    title: "4. WHAT WE CAN'T ACCEPT",
    body: [
      "Because every piece is made to order specifically for you, we can't accept returns or refunds for buyer's remorse, wrong size ordered (please check the size guide on each product page), color perception differences from screen displays, or unauthorized returns.",
      "Items reported after the 30-day window, items that have been worn or washed (other than to discover a defect), and custom/personalized designs where the defect is in the uploaded artwork itself are also outside the policy.",
    ],
  },
  {
    title: "5. DO I NEED TO SHIP IT BACK?",
    body: [
      "For most approved claims, no return shipping is needed — the photos are enough, and we ask you to keep or responsibly dispose of the item. If we do request a return, we'll provide instructions and cover the return cost for domestic (India) addresses.",
    ],
  },
  {
    title: "6. REFUND TIMING & METHOD",
    body: [
      "Approved refunds go back to the original payment method. Once approved, refunds are processed within 5–10 business days depending on your bank or payment provider; you'll get an email confirmation when the refund is issued.",
      "If the original payment method is unavailable, we'll arrange an alternative (bank transfer or store credit) with you.",
    ],
  },
  {
    title: "7. ORDER CANCELLATIONS",
    body: [
      "Orders enter production almost immediately, so we can only cancel within a few hours of purchase and only if production hasn't started. Email support@kiyumi.online with your order number as soon as possible — if we catch it in time, you'll receive a full refund.",
    ],
  },
  {
    title: "8. LOST OR NEVER DELIVERED",
    body: [
      "If tracking shows delivered but you never received the parcel, or the order is significantly overdue (30+ business days domestic, 45+ international), contact us — after verifying with the carrier, we'll reship or refund.",
    ],
  },
  {
    title: "9. CHANGES TO THIS POLICY",
    body: [
      "We may update this policy as the store evolves. The \"last updated\" date above always reflects the current version, and the policy in force on your purchase date applies to your order.",
    ],
  },
  {
    title: "10. CONTACT",
    body: [
      "Refund questions: support@kiyumi.online. Include your order number so we can pull it up immediately. For general questions, use the contact page below.",
    ],
  },
];

export default function Refund() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 md:px-16">
      {/* Header */}
      <div className="mb-16">
        <p className="mb-3 font-mono text-[10px] tracking-[0.3em] text-primary/70">
          LEGAL // REFUNDS
        </p>
        <h1 className="font-display text-4xl font-black tracking-tight text-signal md:text-6xl">
          REFUND POLICY
        </h1>
        <p className="mx-auto mt-6 max-w-2xl font-body text-base leading-relaxed text-shadow/70">
          Defects, printing errors, damage claims, cancellations, and how
          refunds work. Last updated:{" "}
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
