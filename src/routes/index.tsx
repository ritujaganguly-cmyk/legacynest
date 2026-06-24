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
      { heading: "Contact for Privacy", content: "To exercise your privacy rights, write to us through the Contact page." },
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
      { heading: "Responsible Disclosure", content: "If you discover a security vulnerability, please contact us immediately through the Contact page. We commit to acknowledging reports within 48 hours and resolving critical issues within 7 days." },
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
      { heading: "2. Your Account", content: "You are responsible for maintaining the confidentiality of your login credentials. Notify us immediately through the Contact page if you suspect unauthorised access." },
      { heading: "3. Your Data is Yours", content: "You retain full ownership of all data you enter into LegacyNest. We act as a data processor on your behalf. You may export or delete your data at any time." },
      { heading: "4. Acceptable Use", content: "You agree not to:\n• Use LegacyNest for any unlawful purpose.\n• Upload false, misleading, or fraudulent documents.\n• Attempt to access another user's data.\n• Reverse-engineer or copy the platform." },
      { heading: "5. Service Availability", content: "We aim for 99.5% uptime but do not guarantee uninterrupted service. Planned maintenance will be communicated in advance." },
      { heading: "6. Limitation of Liability", content: "LegacyNest provides a planning and documentation tool. It does not constitute legal, financial, or medical advice. Always consult qualified professionals for legal and financial decisions." },
      { heading: "7. Governing Law", content: "These terms are governed by the laws of India. Disputes shall be subject to the jurisdiction of courts in West Bengal, India." },
      { heading: "Contact", content: "For any queries regarding these terms, reach us through the Contact page." },
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
            <img src={logo} alt="LegacyNest" className="h-9 w-9 object-contain mix-blend-multiply" />
            <span className="text-lg font-bold text-primary">LegacyNest</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-foreground/70">
            <a href="#problem" className="hover:text-foreground transition-colors">The Problem</a>
            <a href="#features" className="hover:text-foreground transition-colors">What's Covered</a>
            <a href="#how" className="hover:text-foreground transition-colors">How It Works</a>
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm font-semibold text-primary/40 border border-primary/30 rounded-lg px-4 py-2 cursor-not-allowed">
              Log In
            </span>
            <span className="rounded-lg bg-primary/40 text-primary-foreground font-semibold px-5 py-2.5 text-sm cursor-not-allowed shadow-sm">
              Coming Soon
            </span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden min-h-[calc(100vh-64px)] flex items-center">
        <img
          src={hero}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-contain object-right pointer-events-none"
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
                className="inline-flex items-center gap-2 rounded-lg bg-primary/40 text-primary-foreground font-semibold px-6 py-3.5 cursor-not-allowed shadow-md pointer-events-none"
              >
                Coming Soon
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
            <span className="inline-flex items-center gap-2 rounded-xl bg-primary/40 text-primary-foreground font-semibold px-8 py-4 text-base cursor-not-allowed shadow-md">
              Coming Soon <ArrowRight className="h-5 w-5" />
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#C05621] text-white">
        <div className="max-w-7xl mx-auto px-6 pt-10 pb-8 grid md:grid-cols-4 gap-8">

          {/* Brand */}
          <div className="md:col-span-1 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-white flex items-center justify-center shrink-0">
                <img src={logo} alt="LegacyNest" className="h-7 w-7 object-contain" />
              </div>
              <span className="text-lg font-bold text-white">LegacyNest</span>
            </div>
            <p className="text-sm text-white/75 leading-relaxed">
              Helping families of children with special needs secure a dignified, planned future — today.
            </p>
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

          <div className="flex flex-col gap-3">
            <div className="rounded-xl bg-white/15 px-4 py-3 text-xs text-white/80 leading-relaxed">
              Built with care for parents who worry about tomorrow. You are not alone.
            </div>
          </div>
        </div>

        <div className="border-t border-white/10" />

        <div className="bg-[#9A4018]">
          <div className="max-w-7xl mx-auto px-6 py-5 flex flex-wrap items-center justify-between gap-4 text-xs text-white/50">
            <span>LegacyNest TM {new Date().getFullYear()}</span>
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
