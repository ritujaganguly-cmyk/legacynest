import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  PlayCircle,
  Check,
  Home,
  Users,
  Wallet,
  Scale,
  ArrowRight,
  FolderOpen,
  UserCheck,
  Zap,
  Mail,
  MapPin,
  Heart,
  FileText,
  HeartHandshake,
  Lock,
  Bell,
} from "lucide-react";
import { useState } from "react";

const LEGAL: Record<string, { title: string; sections: { heading: string; content: string }[] }> = {
  privacy: {
    title: "Privacy Policy",
    sections: [
      { heading: "", content: "Last updated: June 2026\n\nLegacyNest ('we', 'our') is committed to protecting the privacy of families who use our platform. This policy explains how we collect, use, and safeguard your personal information." },
      { heading: "What We Collect", content: "We collect only what is necessary: your name, email address, and the care-planning data you choose to enter (medical, financial, legal, and family information). We do not sell or rent your data to any third party." },
      { heading: "How We Use Your Data", content: "Your data is used solely to provide LegacyNest services — storing your continuity plan, enabling your care circle to collaborate, and sending you reminders you request. We never use your data for advertising." },
      { heading: "Data Storage & Security", content: "All data is encrypted at rest (AES-256) and in transit (TLS 1.3). We use Supabase (hosted on AWS Mumbai region) to ensure your data stays within India where possible." },
      { heading: "DPDP Act 2023 Compliance", content: "We comply with India's Digital Personal Data Protection Act 2023. You have the right to access, correct, or request deletion of your personal data at any time by writing to us." },
      { heading: "Sensitive Data", content: "Information such as UDID numbers, Aadhaar, PAN, disability certificates, and medical records is treated as sensitive personal data and subject to additional protection measures." },
      { heading: "Your Rights", content: "• Access: Request a copy of all data we hold about you.\n• Correction: Update inaccurate information.\n• Deletion: Request permanent deletion of your account and data.\n• Portability: Export your data in a machine-readable format." },
      { heading: "Contact for Privacy", content: "Email: legacynest.co.in@gmail.com\nPhone: +91-70440 63379" },
    ],
  },
  security: {
    title: "Security",
    sections: [
      { heading: "", content: "We take the security of your family's most sensitive data seriously. Here is how we protect it." },
      { heading: "Encryption", content: "• All data encrypted at rest using AES-256.\n• All data in transit protected by TLS 1.3.\n• Vault documents stored in encrypted Supabase Storage buckets." },
      { heading: "Access Control", content: "• Row-Level Security (RLS) enforced at the database level — you can only access your own data.\n• Authentication via Supabase Auth with industry-standard JWT tokens.\n• Session tokens expire automatically; sign-out clears all local state." },
      { heading: "Infrastructure", content: "• Hosted on Supabase (backed by AWS), with data residency options in the Asia-Pacific region.\n• No shared database tables — each user's data is logically isolated.\n• Regular automated backups." },
      { heading: "What We Do Not Do", content: "• We never store passwords in plain text.\n• We never log sensitive fields (Aadhaar, PAN, medical records).\n• We never share credentials or data with third parties without explicit consent." },
      { heading: "Responsible Disclosure", content: "If you discover a security vulnerability, please email us immediately at legacynest.co.in@gmail.com. We commit to acknowledging reports within 48 hours and resolving critical issues within 7 days." },
    ],
  },
  compliance: {
    title: "Compliance",
    sections: [
      { heading: "", content: "We are built for India's regulatory environment for disability and special-needs planning." },
      { heading: "RPWD Act 2016", content: "LegacyNest tracks all 21 disability categories recognised under the RPWD Act 2016. Our platform supports documentation of disability certificates, certifying authorities, and percentage of disability as required for government benefit eligibility." },
      { heading: "UDID", content: "We help families track UDID numbers, certificate expiry, and renewal timelines as mandated by the Department of Empowerment of Persons with Disabilities (DEPwD)." },
      { heading: "National Trust Act 1999", content: "Our Care Circle and Guardian Designation features align with the legal framework for appointing Local Level Committees (LLCs) and guardians under the National Trust Act for persons with Autism, Cerebral Palsy, Mental Retardation, and Multiple Disabilities." },
      { heading: "Niramaya Health Insurance", content: "We remind families about Niramaya scheme renewals (₹1,00,000/year for UDID holders) administered by the National Trust." },
      { heading: "DPDP Act 2023", content: "• Data collected only with explicit user consent.\n• Purpose limitation: data used only for services described.\n• Data minimisation: we collect only what is needed.\n• Right to erasure honoured within 30 days of request.\n• Data Fiduciary obligations fully acknowledged." },
    ],
  },
  terms: {
    title: "Terms of Use",
    sections: [
      { heading: "", content: "Effective: June 2026\n\nBy using LegacyNest you agree to these terms." },
      { heading: "1. Who May Use LegacyNest", content: "LegacyNest is intended for parents, guardians, and authorised care-circle members of individuals with special needs. You must be 18 years or older to create an account." },
      { heading: "2. Your Account", content: "You are responsible for maintaining the confidentiality of your login credentials. Notify us immediately at legacynest.co.in@gmail.com if you suspect unauthorised access." },
      { heading: "3. Your Data is Yours", content: "You retain full ownership of all data you enter into LegacyNest. We act as a data processor on your behalf. You may export or delete your data at any time." },
      { heading: "4. Acceptable Use", content: "You agree not to:\n• Use LegacyNest for any unlawful purpose.\n• Upload false, misleading, or fraudulent documents.\n• Attempt to access another user's data.\n• Reverse-engineer or copy the platform." },
      { heading: "5. Service Availability", content: "We aim for 99.5% uptime but do not guarantee uninterrupted service. Planned maintenance will be communicated in advance." },
      { heading: "6. Limitation of Liability", content: "LegacyNest provides a planning and documentation tool. It does not constitute legal, financial, or medical advice. Always consult qualified professionals for legal and financial decisions." },
      { heading: "7. Governing Law", content: "These terms are governed by the laws of India. Disputes shall be subject to the jurisdiction of courts in West Bengal, India." },
      { heading: "Contact", content: "Email: legacynest.co.in@gmail.com\nPhone: +91-70440 63379" },
    ],
  },
};

import logo from "@/assets/LegacyNest_Logo.jpeg";
import hero from "@/assets/landing_page_hero.png";
import introVideo from "@/assets/LegacyNest_Lifetime_Care.mp4";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LegacyNest — Secure Your Child's Future" },
      { name: "description", content: "Create a lifetime care, financial, legal, and residential plan for your special-needs child. India's first continuity planning platform for special-needs families." },
      { property: "og:title", content: "LegacyNest — Secure Your Child's Future" },
      { property: "og:description", content: "A lifetime continuity plan for families raising special-needs children. Free forever." },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { Icon: FileText, label: "Medical Records", desc: "Therapies, medications, diagnoses — all in one vault." },
  { Icon: Scale, label: "Legal & Will", desc: "Special needs trust, guardianship, RPWD documentation." },
  { Icon: Wallet, label: "Financial Planning", desc: "Corpus, Niramaya, PPF, government scheme tracking." },
  { Icon: Home, label: "Residential Plan", desc: "Housing and care arrangements for the long term." },
  { Icon: HeartHandshake, label: "Care Circle", desc: "Designate and manage your trusted successor network." },
  { Icon: Bell, label: "Smart Reminders", desc: "UDID renewals, insurance, legal reviews — never missed." },
  { Icon: Lock, label: "Digital Vault", desc: "Encrypted document storage — accessible when needed most." },
  { Icon: Users, label: "Succession Plan", desc: "Documented handover so care continues without disruption." },
];

function LegalModal({ legalKey, onClose }: { legalKey: string; onClose: () => void }) {
  const legal = LEGAL[legalKey];
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogTitle className="text-xl font-bold border-b border-border pb-4 mb-2">{legal.title}</DialogTitle>
        <div className="flex flex-col gap-5">
          {legal.sections.map((s, i) => (
            <div key={i}>
              {s.heading && <h3 className="text-sm font-bold text-foreground mb-1.5">{s.heading}</h3>}
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{s.content}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Landing() {
  const [showIntro, setShowIntro] = useState(false);
  const [legalKey, setLegalKey] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background">

      {/* Sticky Nav */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="LegacyNest" className="h-12 w-12 object-contain mix-blend-multiply" />
            <span className="text-xl font-bold text-primary">LegacyNest™</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-foreground/70">
            <a href="#problem" className="hover:text-foreground transition-colors">The Problem</a>
            <a href="#features" className="hover:text-foreground transition-colors">What's Covered</a>
            <a href="#how" className="hover:text-foreground transition-colors">How It Works</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              to="/sign-in"
              className="rounded-lg bg-primary text-primary-foreground font-semibold px-5 py-2.5 text-sm hover:bg-primary/90 transition-colors shadow-sm"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden min-h-[calc(100vh-64px)] flex items-center">
        <img
          src={hero}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-[85%] h-[85%] my-auto ml-auto object-contain object-right pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 py-10 relative w-full">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-surface-container px-4 py-1.5 text-sm text-primary font-medium">
              <ShieldCheck className="h-4 w-4" />
              The Eternal Banyan Approach
            </div>
            <h1 className="mt-4 text-4xl md:text-5xl font-bold leading-[1.08] tracking-tight text-foreground">
              Who Will Care for<br />My Child After Me?
            </h1>
            <p className="mt-3 text-base text-muted-foreground max-w-md leading-relaxed">
              Create a lifetime care, financial, legal, and residential plan for your child — so their
              future remains secure, no matter what happens.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to="/sign-in"
                className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground font-semibold px-6 py-3.5 hover:bg-primary/90 transition-colors shadow-md"
              >
                Start Your Legacy Plan
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => setShowIntro(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/80 backdrop-blur-sm px-5 py-3.5 text-sm font-medium hover:bg-card transition-colors"
              >
                <PlayCircle className="h-5 w-5 text-primary" /> Watch Introduction
              </button>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                {["A", "B", "C"].map((l) => (
                  <div key={l} className="h-8 w-8 rounded-full bg-primary/20 ring-2 ring-background flex items-center justify-center text-[10px] font-bold text-primary">
                    {l}
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">Trusted by families across India</p>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section id="problem" className="bg-card">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center">
            <span className="inline-block rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-primary mb-3">
              The Reality
            </span>
            <h2 className="text-2xl md:text-3xl font-bold">The Unspoken Worry</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              India has over 2.68 crore persons with disabilities. Most families have no documented plan — leaving their child's future to chance.
            </p>
          </div>

          <div className="mt-8 grid md:grid-cols-3 gap-5">
            <div className="md:row-span-2 rounded-2xl bg-surface-low p-6 border border-border">
              <div className="text-4xl font-bold text-primary">80%+</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Of all caregiving for persons with disabilities in India falls on immediate family — with no backup plan, no documentation, and no successor named.
              </p>
              <hr className="my-6 border-border" />
              <h3 className="text-lg font-semibold">The Planning Gap</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Fewer than 5% of families with a special-needs child have a written succession plan. When a primary caregiver passes away unexpectedly, the child's care often falls to the state — or collapses entirely.
              </p>
              <div className="mt-6 rounded-xl bg-primary/8 border border-primary/15 p-4 text-sm text-foreground/80 leading-relaxed italic">
                "I worry every day — what happens to my child when I'm no longer there?"
              </div>
            </div>

            {[
              { icon: Home, title: "Where will they live?", text: "Group homes and care facilities have waitlists of 5–10 years. Planning must start now, not later.", tone: "gold" },
              { icon: Users, title: "Who will take care?", text: "Without a named guardian and documented care routine, strangers make decisions for your child.", tone: "orange" },
              { icon: Wallet, title: "Will funds last?", text: "A child with special needs may require ₹2–4 crore over a lifetime. Most families haven't calculated this.", tone: "gold" },
              { icon: Scale, title: "Is the Trust in place?", text: "Assets left directly to a disabled child can disqualify them from government schemes. A Special Needs Trust changes that.", tone: "muted" },
            ].map((c, i) => (
              <div
                key={i}
                className={`rounded-2xl bg-card p-6 border border-border ${c.tone === "gold" ? "legacy-card-gold-top" : c.tone === "orange" ? "legacy-card-accent-top" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${c.tone === "gold" ? "bg-gold-soft text-foreground" : c.tone === "orange" ? "bg-surface-container text-primary" : "bg-surface-low text-muted-foreground"}`}>
                    <c.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">{c.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{c.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features strip */}
      <section id="features" className="bg-background border-y border-border">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="text-center mb-7">
            <span className="inline-block rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-primary mb-3">
              What's Covered
            </span>
            <h2 className="text-2xl md:text-3xl font-bold">Everything your child's future needs</h2>
            <p className="mt-2 text-muted-foreground max-w-xl mx-auto text-sm">Eight pillars of a complete continuity plan — all in one place, secured for life.</p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {FEATURES.map(({ Icon, label, desc }) => (
              <div key={label} className="rounded-2xl bg-card border border-border p-4 flex flex-col gap-2.5 hover:border-primary/40 hover:shadow-sm transition-all duration-200">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-foreground">{label}</div>
                  <div className="mt-1 text-xs text-muted-foreground leading-relaxed">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="bg-surface-low">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="text-center max-w-2xl mx-auto">
            <span className="inline-block rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-primary mb-3">
              How It Works
            </span>
            <h2 className="text-2xl md:text-3xl font-bold">
              A continuity plan, built like a banyan tree.
            </h2>
            <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
              Deep roots, generational shade. Every branch of your child's future — planned,
              documented, and ready to activate.
            </p>
          </div>

          <div className="mt-8 relative">
            <div className="hidden md:block absolute top-10 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px bg-gradient-to-r from-primary/20 via-primary/50 to-primary/20" />

            <div className="grid md:grid-cols-3 gap-5">
              {[
                {
                  step: "01",
                  Icon: FolderOpen,
                  title: "Document",
                  text: "Capture medical, financial, legal, and daily-care details in an encrypted, secure vault — accessible only to you and your trusted circle.",
                  bullets: ["Medical history & medications", "Financial assets & nominees", "Legal documents & will"],
                },
                {
                  step: "02",
                  Icon: UserCheck,
                  title: "Designate",
                  text: "Assign trustees, guardians, and a layered succession of caregivers — each with documented responsibilities and verified consent.",
                  bullets: ["Care circle & trustees", "Guardian succession plan", "Consent & role clarity"],
                },
                {
                  step: "03",
                  Icon: Zap,
                  title: "Activate",
                  text: "Smart triggers ensure a seamless, dignified handover — so your child's care continues without disruption, exactly as you planned.",
                  bullets: ["Automatic reminders", "Emergency access", "Handover ready"],
                },
              ].map((s) => (
                <div
                  key={s.step}
                  className="relative rounded-3xl bg-white/70 backdrop-blur-sm ring-1 ring-primary/15 p-6 flex flex-col gap-3 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-sm">
                      <s.Icon className="h-6 w-6" />
                    </div>
                    <span className="text-4xl font-black text-primary/8 select-none leading-none">{s.step}</span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.text}</p>
                  <div className="h-px bg-primary/10" />
                  <ul className="space-y-1.5">
                    {s.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2.5 text-sm text-foreground/75">
                        <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3 text-primary" />
                        </span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Emotional CTA */}
      <section className="bg-primary/5 border-y border-primary/10">
        <div className="max-w-3xl mx-auto px-6 py-12 text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-primary/10 mb-4">
            <Heart className="h-6 w-6 text-primary fill-primary/20" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            You've already done the hardest part.
          </h2>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Raising a child with special needs takes boundless love and courage. LegacyNest
            helps you turn that love into a plan — so your child is protected, long after you.
          </p>
          <p className="mt-2 text-sm text-muted-foreground italic">
            You are not walking this path alone.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-4">
            <Link
              to="/sign-in"
              className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold px-8 py-4 text-base hover:bg-primary/90 transition-colors shadow-md"
            >
              Start Building Your Plan <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/support"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-7 py-4 text-base font-medium hover:border-primary/40 transition-colors"
            >
              <HeartHandshake className="h-5 w-5 text-primary" /> Message to Us
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#C05621] text-white">
        <div className="max-w-7xl mx-auto px-6 pt-10 pb-8 grid md:grid-cols-4 gap-8">

          {/* Brand */}
          <div className="md:col-span-1 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <img src={logo} alt="LegacyNest" className="h-10 w-10 object-contain brightness-0 invert shrink-0" />
              <span className="text-lg font-bold text-white">LegacyNest™</span>
            </div>
            <p className="text-sm text-white/75 leading-relaxed">
              Helping families of children with special needs secure a dignified, planned future — today.
            </p>
          </div>

          {/* Platform */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white/50">Platform</h4>
            {[
              { label: "Dashboard", to: "/dashboard" },
              { label: "Medical Records", to: "/medical" },
              { label: "Financial Planning", to: "/financial" },
              { label: "Legal Vault", to: "/legal" },
              { label: "Care Circle", to: "/care-circle" },
              { label: "Insurance", to: "/insurance-policies" },
              { label: "Support & Contact", to: "/support" },
            ].map((l) => (
              <Link key={l.label} to={l.to} className="text-sm text-white/75 hover:text-white transition-colors">
                {l.label}
              </Link>
            ))}
          </div>

          {/* India Resources */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white/50">India Resources</h4>
            {[
              { label: "RPWD Act 2016", url: "https://depwd.gov.in/rpwd-act/" },
              { label: "UDID Portal", url: "https://www.swavlambancard.gov.in/" },
              { label: "DEPwD — Disability Affairs", url: "https://depwd.gov.in/" },
            ].map((r) => (
              <a
                key={r.label}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-white/75 hover:text-white transition-colors flex items-center gap-1 group"
              >
                {r.label}
                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 -rotate-45 transition-all" />
              </a>
            ))}
          </div>

          {/* Contact */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white/50">Contact Us</h4>
            <a href="mailto:legacynest.co.in@gmail.com" className="flex items-start gap-2 text-sm text-white/75 hover:text-white transition-colors">
              <Mail className="h-4 w-4 mt-0.5 shrink-0" />
              <span>legacynest.co.in@gmail.com</span>
            </a>
            <a
              href="https://wa.me/917044063718"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 text-sm text-white/75 hover:text-white transition-colors"
            >
              <svg className="h-4 w-4 mt-0.5 shrink-0 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <span>WhatsApp Us</span>
            </a>
            <a
              href="https://www.google.com/maps/place/AB+3%2F6,+Deshbandhu+Nagar+Rd,+Desh+Bandhu+Nagar,+Baguiati,+West+Bengal+700059/@22.6154271,88.4238521,20z/data=!4m6!3m5!1s0x39f89e2103a29a9b:0xae4843736049707a!8m2!3d22.6154271!4d88.4238521!16s%2Fg%2F11c447ntkx?entry=ttu&g_ep=EgoyMDI2MDYxNi4wIKXMDSoASAFQAw%3D%3D"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 text-sm text-white/75 hover:text-white transition-colors"
            >
              <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Kolkata, India</span>
            </a>
            <div className="mt-2 rounded-xl bg-white/15 px-4 py-3 text-xs text-white/80 leading-relaxed">
              Built with care for parents who worry about tomorrow. You are not alone.
            </div>
          </div>
        </div>

        <div className="border-t border-white/10" />

        <div className="bg-[#9A4018]">
          <div className="max-w-7xl mx-auto px-6 py-5 flex flex-wrap items-center justify-between gap-4 text-xs text-white/50">
            <span>LegacyNest™ {new Date().getFullYear()}</span>
            <div className="flex flex-wrap items-center gap-5">
              {[
                { label: "Privacy Policy", key: "privacy" },
                { label: "Security", key: "security" },
                { label: "Compliance", key: "compliance" },
                { label: "Terms of Use", key: "terms" },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setLegalKey(item.key)}
                  className="hover:text-white transition-colors underline-offset-2 hover:underline"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* Intro video dialog */}
      <Dialog open={showIntro} onOpenChange={setShowIntro}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black">
          <DialogTitle className="sr-only">LegacyNest Introduction</DialogTitle>
          {showIntro && <video src={introVideo} controls autoPlay className="w-full h-auto" />}
        </DialogContent>
      </Dialog>

      {/* Legal dialogs */}
      {legalKey && <LegalModal legalKey={legalKey} onClose={() => setLegalKey(null)} />}
    </div>
  );
}
