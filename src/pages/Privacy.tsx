import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const LAST_UPDATED = "September 12, 2026";

const sections: { title: string; body: string[] }[] = [
  {
    title: "1. WHO WE ARE",
    body: [
      "KIYUMI (\"we\", \"us\", \"our\") operates kiyumi.online, a digital flagship store for limited-run streetwear. This policy explains what personal data we collect, why we collect it, and how we protect it. Questions about this policy can be sent to support@kiyumi.online.",
    ],
  },
  {
    title: "2. WHAT WE COLLECT",
    body: [
      "Account data — when you create an account we store your email address, a hashed password (or your Google identity if you sign in with Google), and your wishlist. We never see or store your Google password.",
      "Order data — when you place an order we collect your name, shipping address, phone number, email, and the items purchased. This is required to fulfil and deliver your order.",
      "Newsletter — if you subscribe we store your email address and the date you subscribed.",
      "Usage data — we may collect basic, privacy-friendly analytics such as pages visited and referrer, without personally identifying you.",
    ],
  },
  {
    title: "3. HOW WE USE YOUR DATA",
    body: [
      "To process and fulfil your orders (including sending order details to our print-on-demand fulfilment partner), to manage your account and wishlist, to send order confirmations and shipping updates, and — only if you opted in — to email you about new drops and exclusives.",
      "We do not sell your personal data to third parties. Ever.",
    ],
  },
  {
    title: "4. WHO WE SHARE WITH",
    body: [
      "Supabase — our hosting, database, and authentication provider. Your login credentials and account data are stored there under Supabase's security controls.",
      "Google — only if you choose \"Continue with Google\". Google handles that sign-in and shares only your email and name back to us.",
      "Fulfilment partner — your name, address, and order contents are shared with our print-on-demand fulfilment partner (Qikink) solely to print and ship your order.",
      "Payment processors — when payments go live, your card details are handled directly by the payment provider (we never see or store full card numbers).",
    ],
  },
  {
    title: "5. COOKIES & STORAGE",
    body: [
      "We use local browser storage for your shopping bag, wishlist, and login session. You can clear this at any time from your browser settings. We do not use invasive third-party tracking cookies.",
    ],
  },
  {
    title: "6. YOUR RIGHTS",
    body: [
      "You may request a copy of the personal data we hold about you, ask us to correct inaccurate data, or request deletion of your account and associated data. Email support@kiyumi.online from the address linked to your account and we will action your request within 30 days.",
    ],
  },
  {
    title: "7. DATA SECURITY",
    body: [
      "All traffic to kiyumi.online is encrypted (HTTPS). Passwords are stored only as salted hashes. Access to your data is restricted to the minimum number of people required to run the store. We review our security practices regularly and act on any reported vulnerability.",
    ],
  },
  {
    title: "8. CHILDREN",
    body: [
      "Our products are designed for a mature audience. If you are under 18, please review this policy with a parent or guardian before creating an account or ordering.",
    ],
  },
  {
    title: "9. CHANGES TO THIS POLICY",
    body: [
      "We may update this policy as the store evolves. The \"last updated\" date above always reflects the current version. Significant changes will be announced on the site.",
    ],
  },
  {
    title: "10. CONTACT",
    body: [
      "Privacy questions: support@kiyumi.online. For order or product questions, use the contact page below.",
    ],
  },
];

export default function Privacy() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 md:px-16">
      {/* Header */}
      <div className="mb-16">
        <p className="mb-3 font-mono text-[10px] tracking-[0.3em] text-primary/70">
          LEGAL // PRIVACY
        </p>
        <h1 className="font-display text-4xl font-black tracking-tight text-signal md:text-6xl">
          PRIVACY POLICY
        </h1>
        <p className="mx-auto mt-6 max-w-2xl font-body text-base leading-relaxed text-shadow/70">
          How KIYUMI collects, uses, and protects your data. Last updated:{" "}
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