import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const LAST_UPDATED = "September 12, 2026";

const sections: { title: string; body: string[] }[] = [
  {
    title: "1. AGREEMENT",
    body: [
      "By using kiyumi.online, creating an account, or placing an order you agree to these Terms of Service. If you do not agree, please do not use the store. These terms were last updated on " +
        LAST_UPDATED +
        ".",
    ],
  },
  {
    title: "2. OUR PRODUCTS",
    body: [
      "KIYUMI designs and sells limited-run streetwear. All products are made to order by our print-on-demand fulfilment partner, which means production begins only after you place your order.",
      "Because every piece is printed on demand, small variations in colour and placement between the photos and your item are normal and not considered defects.",
    ],
  },
  {
    title: "3. ORDERS & PAYMENT",
    body: [
      "All prices are displayed in the store's currency and include applicable taxes unless stated otherwise. When you place an order, you agree to pay the total shown at checkout, including shipping.",
      "We reserve the right to cancel any order — for example if an item is sold out, if we suspect fraud, or if an address cannot be delivered to. If we cancel a paid order, you receive a full refund.",
      "Payment methods are shown at checkout. We never store your full card details.",
    ],
  },
  {
    title: "4. SHIPPING & DELIVERY",
    body: [
      "Orders are printed and shipped by our fulfilment partner. Shipping times vary by destination and are estimated at checkout; actual times can differ during high-volume periods and public holidays.",
      "Risk of loss passes to you once the carrier confirms delivery. If a package is lost in transit, contact us and we will investigate with the carrier and reship or refund as appropriate.",
    ],
  },
  {
    title: "5. RETURNS & EXCHANGES",
    body: [
      "Because items are made to order, returns are only accepted for manufacturing defects, incorrect items, or items damaged in transit — not for change of mind or sizing.",
      "If you receive a defective or incorrect item, email support@kiyumi.online with your order number and photos within 14 days of delivery. We will replace the item or refund the full order value, including shipping.",
    ],
  },
  {
    title: "6. ACCOUNTS",
    body: [
      "You are responsible for keeping your account credentials secure. You may sign in with email/password or Google. You must not share your account or use another person's account.",
      "We may suspend or delete accounts that are used for abusive behaviour, fraud, or any activity that violates these terms.",
    ],
  },
  {
    title: "7. INTELLECTUAL PROPERTY",
    body: [
      "All designs, artwork, logos, and content on this site belong to KIYUMI. You may not reproduce, copy, or resell our designs or products without written permission.",
      "Our collections are inspired by Japanese folklore, gaming, and Tokyo street culture. If you believe any design infringes your rights, contact support@kiyumi.online and we will review it promptly.",
    ],
  },
  {
    title: "8. PROHIBITED USE",
    body: [
      "You may not use this store for unlawful purposes, to resell products outside normal consumer quantities, to abuse the newsletter or review systems, or to attempt to disrupt the service or access other users' data.",
    ],
  },
  {
    title: "9. LIMITATION OF LIABILITY",
    body: [
      "We work hard to deliver what we promise, but our total liability for any claim relating to an order is limited to the amount you paid for that order. We are not liable for indirect or consequential damages, including lost profits or emotional damages.",
    ],
  },
  {
    title: "10. CHANGES & TERMINATION",
    body: [
      "We may update these terms at any time. Continued use of the site after changes take effect means you accept the updated terms. We may also suspend or close the store at any time, in which case outstanding paid orders will be fulfilled or refunded.",
    ],
  },
  {
    title: "11. GOVERNING LAW & CONTACT",
    body: [
      "These terms are governed by the laws of the store's operating jurisdiction. Questions about these terms can be sent to support@kiyumi.online or through the contact page.",
    ],
  },
];

export default function Terms() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 md:px-16">
      {/* Header */}
      <div className="mb-16">
        <p className="mb-3 font-mono text-[10px] tracking-[0.3em] text-primary/70">
          LEGAL // TERMS
        </p>
        <h1 className="font-display text-4xl font-black tracking-tight text-signal md:text-6xl">
          TERMS OF SERVICE
        </h1>
        <p className="mx-auto mt-6 max-w-2xl font-body text-base leading-relaxed text-shadow/70">
          The rules of the game. Last updated:{" "}
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
          <h2 className="mb-2 font-display text-xl font-bold text-signal">READY TO PLAY?</h2>
          <p className="mb-4 font-body text-sm leading-relaxed text-shadow/70">
            Terms agreed — now go get your fit.
          </p>
          <Link
            to="/shop"
            className="group inline-flex items-center gap-3 bg-gradient-to-r from-primary-container to-secondary-container px-8 py-3 font-mono text-xs font-bold tracking-[0.15em] text-on-primary-container no-underline transition-all hover:shadow-[0_0_20px_rgba(107,33,168,0.2)]"
          >
            SHOP THE COLLECTION
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  );
}