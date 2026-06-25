import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Scale,
  HeartHandshake,
  Stethoscope,
  Wallet,
  HelpCircle,
  Laptop,
  ArrowRight,
  Mail,
  MessageSquare,
  X,
  CheckCircle2,
  Send,
  LayoutGrid,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import logo from "@/assets/LegacyNest_Logo.jpeg";
import { dataService } from "@/lib/data/mock";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session-store";

export const Route = createFileRoute("/support")({
  head: () => ({ meta: [{ title: "Support & Contact — LegacyNest" }] }),
  component: SupportPublicPage,
});

type Category = {
  key: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  color: string;
  iconBg: string;
  description: string;
  helpText: string;
};

const CATEGORIES: Category[] = [
  {
    key: "Legal",
    label: "Legal Guidance",
    Icon: Scale,
    color: "border-blue-200 hover:border-blue-400",
    iconBg: "bg-blue-50 text-blue-600",
    description: "Questions about wills, special needs trusts, guardianship, RPWD Act, or court orders.",
    helpText: "e.g. How do I set up a special needs trust? What is a court-appointed guardian?",
  },
  {
    key: "Financial",
    label: "Financial Planning",
    Icon: Wallet,
    color: "border-amber-200 hover:border-amber-400",
    iconBg: "bg-amber-50 text-amber-600",
    description: "Corpus planning, government schemes, Niramaya insurance, FDs, PPF, and nominations.",
    helpText: "e.g. How much corpus do I need? How do I register for Niramaya?",
  },
  {
    key: "Therapy",
    label: "Therapy & Medical",
    Icon: Stethoscope,
    color: "border-green-200 hover:border-green-400",
    iconBg: "bg-green-50 text-green-600",
    description: "Finding therapists, therapy plans, medication tracking, and medical record queries.",
    helpText: "e.g. How to find a good ABA therapist in my city?",
  },
  {
    key: "Community",
    label: "Community & Care",
    Icon: HeartHandshake,
    color: "border-rose-200 hover:border-rose-400",
    iconBg: "bg-rose-50 text-rose-600",
    description: "Connecting with other families, care circle setup, caregiver training, and support groups.",
    helpText: "e.g. Are there parent support groups in my area?",
  },
  {
    key: "Technical",
    label: "Technical Support",
    Icon: Laptop,
    color: "border-violet-200 hover:border-violet-400",
    iconBg: "bg-violet-50 text-violet-600",
    description: "Help with the LegacyNest platform — login issues, data upload, vault, or features.",
    helpText: "e.g. I can't upload a document. My insurance data isn't saving.",
  },
  {
    key: "General",
    label: "General Enquiry",
    Icon: HelpCircle,
    color: "border-primary/30 hover:border-primary",
    iconBg: "bg-primary/10 text-primary",
    description: "Anything else — feedback, partnership, volunteering, or just saying hello.",
    helpText: "e.g. I'd like to partner with LegacyNest for our NGO.",
  },
];

type FormState = {
  name: string;
  email: string;
  phone: string;
  query: string;
};

const EMPTY: FormState = { name: "", email: "", phone: "", query: "" };

function ContactModal({
  category,
  onClose,
}: {
  category: Category;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.query.trim()) {
      toast.error("Please fill in name, email and your query.");
      return;
    }
    setSubmitting(true);
    const ok = await dataService.submitSupportRequest({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      category: category.key,
      query: form.query.trim(),
    });
    setSubmitting(false);
    if (ok) {
      setDone(true);
    } else {
      toast.error("Could not submit. Please email us directly at legacynest.co.in@gmail.com");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-5 flex items-center justify-between border-b border-border`}>
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl ${category.iconBg} flex items-center justify-center`}>
              <category.Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-foreground">{category.label}</div>
              <div className="text-xs text-muted-foreground">We understand your world — you are not alone</div>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          <div className="px-6 py-12 flex flex-col items-center text-center gap-4">
            <div className="h-16 w-16 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="h-9 w-9 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Your message is with us 🙏</h3>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              Thank you, <strong>{form.name.split(" ")[0]}</strong>. We hear you, and we care deeply.
              Every family's journey is unique — and so is the support we offer.
            </p>
            <p className="text-xs text-muted-foreground italic">We will reach out to you at <strong>{form.email}</strong> soon.</p>
            <button
              onClick={onClose}
              className="mt-2 rounded-xl bg-primary text-primary-foreground font-semibold px-6 py-2.5 hover:bg-primary/90 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
            <p className="text-sm text-muted-foreground bg-muted/40 rounded-xl px-4 py-3 leading-relaxed">
              {category.helpText}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground/70">Full Name *</label>
                <input
                  value={form.name}
                  onChange={set("name")}
                  placeholder="Your name"
                  className="rounded-xl border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground/70">Phone</label>
                <input
                  value={form.phone}
                  onChange={set("phone")}
                  placeholder="+91-XXXXX XXXXX"
                  type="tel"
                  className="rounded-xl border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-foreground/70">Email Address *</label>
              <input
                value={form.email}
                onChange={set("email")}
                placeholder="your@email.com"
                type="email"
                className="rounded-xl border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-foreground/70">Your Query *</label>
              <textarea
                value={form.query}
                onChange={set("query")}
                placeholder={`Describe your question or concern about ${category.label.toLowerCase()}…`}
                rows={4}
                className="rounded-xl border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 transition-colors disabled:opacity-60"
            >
              {submitting ? "Sending…" : <><Send className="h-4 w-4" /> Send Message</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function SupportPublicPage() {
  const [active, setActive] = useState<Category | null>(null);
  const navigate = useNavigate();
  const { user } = useSession();

  async function handleClose() {
    setActive(null);
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen bg-[#fdf6ee]">
      {/* Nav */}
      <header className="max-w-7xl mx-auto flex items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="LegacyNest" className="h-10 w-10 object-contain mix-blend-multiply" />
          <span className="text-xl font-bold text-primary">LegacyNest™</span>
        </Link>
        {user ? (
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground font-semibold px-5 py-2.5 text-sm hover:bg-primary/90 transition-colors"
          >
            <LayoutGrid className="h-4 w-4" /> Go to Dashboard
          </Link>
        ) : (
          <Link
            to="/sign-in"
            className="rounded-lg bg-primary-soft hover:bg-primary text-primary-foreground font-semibold px-5 py-2.5 text-sm transition-colors"
          >
            Log In
          </Link>
        )}
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-12 pb-10 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary uppercase tracking-widest mb-5">
          <HeartHandshake className="h-4 w-4" /> We're here for you
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
          How can we help?
        </h1>
        <p className="mt-4 text-base text-muted-foreground max-w-xl mx-auto">
          Choose a topic below. We'll connect you with the right guidance — whether it's legal, financial, medical, or just someone to talk to.
        </p>
      </section>

      {/* Category cards */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActive(cat)}
              className={`text-left rounded-3xl bg-white border-2 ${cat.color} p-6 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 group`}
            >
              <div className="flex items-center justify-between">
                <div className={`h-12 w-12 rounded-2xl ${cat.iconBg} flex items-center justify-center`}>
                  <cat.Icon className="h-6 w-6" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">{cat.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{cat.description}</p>
              </div>
              <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-primary">
                <MessageSquare className="h-4 w-4" /> Get in touch
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Direct contact strip */}
      <section className="bg-white border-t border-primary/10">
        <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-center gap-8 text-center sm:text-left">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-foreground">Prefer to reach us directly?</h3>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="mailto:legacynest.co.in@gmail.com"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-[#fdf6ee] hover:border-primary px-5 py-3 text-sm font-semibold text-foreground transition-colors"
            >
              <Mail className="h-4 w-4 text-primary" />
              legacynest.co.in@gmail.com
            </a>
            <a
              href="https://wa.me/917044063718"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-[#fdf6ee] hover:border-primary px-5 py-3 text-sm font-semibold text-foreground transition-colors"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-[#25D366]" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp Us
            </a>
          </div>
        </div>
      </section>

      {/* Footer strip */}
      <div className="py-6 text-center text-xs bg-primary text-primary-foreground/90">
        <p className="font-medium text-primary-foreground text-sm">Built with love for every family walking this path. 💛</p>
        <p className="mt-1.5 text-primary-foreground/70">
          LegacyNest™ {new Date().getFullYear()} ·{" "}
          <Link to="/" className="underline hover:text-primary-foreground transition-colors">Home</Link>
        </p>
      </div>

      {/* Contact modal */}
      {active && <ContactModal category={active} onClose={handleClose} />}
    </div>
  );
}
