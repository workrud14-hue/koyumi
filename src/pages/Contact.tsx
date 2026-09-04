import { useState } from "react";
import { Mail, MessageCircle, Package, Clock, CheckCircle } from "lucide-react";
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

const FAQ = [
  {
    q: "How long does shipping take?",
    a: "Domestic orders ship within 2-3 business days. International orders take 7-14 business days depending on your location.",
  },
  {
    q: "Do you ship internationally?",
    a: "Yes! We ship worldwide. International shipping rates are calculated at checkout based on your location.",
  },
  {
    q: "Can I return or exchange an item?",
    a: "We accept returns within 14 days of delivery for unworn items in original packaging. Contact us to start a return.",
  },
  {
    q: "What if my size is sold out?",
    a: "Limited runs mean limited stock. Once a size sells out, it's gone forever. Sign up for restock alerts on the product page.",
  },
  {
    q: "How do I track my order?",
    a: "You'll receive a tracking number via email once your order ships. You can also check your order status in your account dashboard.",
  },
];

export default function Contact() {
  const [formSent, setFormSent] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Build mailto link
    const mailtoLink = `mailto:support@kiyumi.com?subject=${encodeURIComponent(`[${subject}] ${name}`)}&body=${encodeURIComponent(`From: ${name} (${email})\n\n${message}`)}`;
    window.open(mailtoLink, "_blank");
    setFormSent(true);
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 md:px-16">
      {/* Hero */}
      <FadeIn className="mb-16 text-center">
        <p className="mb-3 font-mono text-[10px] tracking-[0.3em] text-primary/70">
          SUPPORT
        </p>
        <h1 className="font-display text-4xl font-black tracking-tight text-signal md:text-5xl">
          GET IN TOUCH
        </h1>
        <p className="mx-auto mt-4 max-w-md font-body text-sm leading-relaxed text-shadow/70">
          Questions, feedback, or just want to say hi? We're here for you.
        </p>
      </FadeIn>

      {/* Contact Options */}
      <section className="mb-20 grid grid-cols-1 gap-6 md:grid-cols-3">
        {[
          {
            icon: <Mail size={20} strokeWidth={1.5} />,
            title: "EMAIL US",
            detail: "support@kiyumi.com",
            desc: "We respond within 24 hours",
          },
          {
            icon: <MessageCircle size={20} strokeWidth={1.5} />,
            title: "LIVE CHAT",
            detail: "Coming Soon",
            desc: "Real-time support during business hours",
          },
          {
            icon: <Clock size={20} strokeWidth={1.5} />,
            title: "HOURS",
            detail: "Mon–Fri, 9AM–6PM JST",
            desc: "Tokyo Standard Time",
          },
        ].map((opt, i) => (
          <FadeIn key={opt.title} delay={i * 100}>
            <div className="border border-outline-variant/15 p-8 text-center">
              <div className="mb-4 inline-flex text-primary/60">{opt.icon}</div>
              <h3 className="mb-1 font-mono text-[11px] font-medium tracking-[0.15em] text-signal/90">
                {opt.title}
              </h3>
              <p className="font-body text-sm text-signal">{opt.detail}</p>
              <p className="mt-1 font-mono text-[10px] text-outline/60">{opt.desc}</p>
            </div>
          </FadeIn>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-16 md:grid-cols-2">
        {/* Contact Form */}
        <FadeIn>
          <div>
            <h2 className="mb-2 font-display text-2xl font-bold text-signal">SEND A MESSAGE</h2>
            <p className="mb-8 font-mono text-[10px] tracking-[0.1em] text-outline">
              Fill out the form and we'll get back to you.
            </p>

            {formSent ? (
              <div className="flex flex-col items-center border border-primary/20 bg-primary/5 py-12 text-center">
                <CheckCircle size={32} className="mb-4 text-primary" />
                <p className="font-display text-lg font-bold text-signal">MESSAGE SENT!</p>
                <p className="mt-2 max-w-sm font-body text-sm text-shadow/70">
                  Your email client should have opened with the message. We'll get back to you within 24 hours.
                </p>
                <button
                  onClick={() => { setFormSent(false); setName(""); setEmail(""); setSubject(""); setMessage(""); }}
                  className="mt-6 font-mono text-xs tracking-[0.1em] text-primary transition-colors hover:text-signal"
                >
                  SEND ANOTHER MESSAGE
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block font-mono text-[10px] tracking-[0.15em] text-outline">
                      NAME
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full border-b-2 border-outline-variant/40 bg-transparent py-3 font-body text-sm text-signal outline-none transition-colors placeholder:text-outline-variant/50 focus:border-primary"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block font-mono text-[10px] tracking-[0.15em] text-outline">
                      EMAIL
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full border-b-2 border-outline-variant/40 bg-transparent py-3 font-body text-sm text-signal outline-none transition-colors placeholder:text-outline-variant/50 focus:border-primary"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block font-mono text-[10px] tracking-[0.15em] text-outline">
                    SUBJECT
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    className="w-full border-b-2 border-outline-variant/40 bg-transparent py-3 font-body text-sm text-signal outline-none transition-colors focus:border-primary"
                  >
                    <option value="" className="bg-surface">Select a topic...</option>
                    <option value="order" className="bg-surface">Order Issue</option>
                    <option value="return" className="bg-surface">Return / Exchange</option>
                    <option value="shipping" className="bg-surface">Shipping Question</option>
                    <option value="product" className="bg-surface">Product Inquiry</option>
                    <option value="wholesale" className="bg-surface">Wholesale / Collab</option>
                    <option value="other" className="bg-surface">Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block font-mono text-[10px] tracking-[0.15em] text-outline">
                    MESSAGE
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    rows={5}
                    className="w-full resize-none border-b-2 border-outline-variant/40 bg-transparent py-3 font-body text-sm text-signal outline-none transition-colors placeholder:text-outline-variant/50 focus:border-primary"
                    placeholder="Tell us what's on your mind..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary-container to-secondary-container py-4 font-mono text-xs font-bold tracking-[0.15em] text-on-primary-container transition-all hover:shadow-[0_0_20px_rgba(107,33,168,0.2)]"
                >
                  SEND MESSAGE
                </button>
              </form>
            )}
          </div>
        </FadeIn>

        {/* FAQ */}
        <FadeIn delay={200}>
          <div>
            <h2 className="mb-2 font-display text-2xl font-bold text-signal">FAQ</h2>
            <p className="mb-8 font-mono text-[10px] tracking-[0.1em] text-outline">
              Common questions answered.
            </p>

            <div className="space-y-3">
              {FAQ.map((item, i) => (
                <div
                  key={i}
                  className="border border-outline-variant/15 transition-colors hover:border-outline-variant/30"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-center justify-between px-6 py-4 text-left"
                  >
                    <span className="font-body text-sm font-medium text-signal">
                      {item.q}
                    </span>
                    <span className={`ml-4 flex-shrink-0 text-outline transition-transform ${openFaq === i ? "rotate-45" : ""}`}>
                      +
                    </span>
                  </button>
                  {openFaq === i && (
                    <div className="border-t border-outline-variant/10 px-6 py-4">
                      <p className="font-body text-sm leading-relaxed text-shadow/70">
                        {item.a}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </div>

      {/* Shipping Info */}
      <FadeIn className="mt-20">
        <div className="border-y border-outline-variant/20 py-12">
          <div className="grid grid-cols-1 gap-8 text-center md:grid-cols-3">
            {[
              {
                icon: <Package size={20} strokeWidth={1.5} />,
                title: "FREE SHIPPING",
                desc: "On all orders over $100 worldwide",
              },
              {
                icon: <Package size={20} strokeWidth={1.5} />,
                title: "SECURE PACKAGING",
                desc: "Every order ships in premium KIYUMI packaging",
              },
              {
                icon: <Package size={20} strokeWidth={1.5} />,
                title: "14-DAY RETURNS",
                desc: "Not your vibe? Send it back, no questions asked",
              },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="mb-3 text-primary/60">{item.icon}</div>
                <h3 className="mb-1 font-mono text-[11px] font-medium tracking-[0.15em] text-signal/90">
                  {item.title}
                </h3>
                <p className="max-w-xs font-body text-[13px] text-shadow/60">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
