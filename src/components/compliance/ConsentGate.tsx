/**
 * ConsentGate — blocks access until the user explicitly accepts SPDI consent.
 * Shown once per consent version after first login.
 * DPDP Act 2023 s.6 — consent must be free, specific, informed, unconditional.
 */
import { useState } from "react";
import { Shield, FileText, Lock, Heart, Landmark, AlertCircle } from "lucide-react";
import { recordConsent, SPDI_CONSENT_TEXT } from "@/lib/compliance";
import { toast } from "sonner";

interface Props {
  onAccepted: () => void;
}

const DATA_CATEGORIES = [
  { icon: Heart,    label: "Health & Medical",   desc: "Records, medications, therapies, diagnoses" },
  { icon: Landmark, label: "Financial",           desc: "Assets, income, insurance policies" },
  { icon: FileText, label: "Legal Documents",     desc: "Will, trust, guardianship, POA" },
  { icon: Shield,   label: "Disability & Identity", desc: "UDID, disability certificate (Aadhaar last-4 only)" },
  { icon: Lock,     label: "Emergency Plan",      desc: "Contacts, protocols, coordinators" },
];

export function ConsentGate({ onAccepted }: Props) {
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function handleAccept() {
    if (!checked) return;
    setSaving(true);
    try {
      await recordConsent();
      onAccepted();
    } catch {
      toast.error("Could not save consent. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl overflow-hidden">

        {/* Header */}
        <div className="bg-primary px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 grid place-items-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Your Data, Your Rights</h2>
              <p className="text-sm text-white/70">Before you begin — please read this carefully</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">

          {/* What we collect */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-3">
              LegacyNest will store the following <span className="text-primary">Sensitive Personal Data</span> about your family:
            </p>
            <div className="space-y-2">
              {DATA_CATEGORIES.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-3 rounded-lg bg-surface-low p-3">
                  <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Purpose */}
          <div className="rounded-lg border border-border p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Purpose of Collection</p>
            <p className="text-sm text-foreground">
              Solely to build your child's lifetime care, financial, legal, and succession plan — and to enable trusted
              caregivers to act on your behalf when needed.
            </p>
          </div>

          {/* Your rights */}
          <div className="rounded-lg border border-border p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Rights (DPDP Act 2023)</p>
            <ul className="text-sm text-foreground space-y-1">
              <li className="flex items-center gap-2"><span className="text-primary">→</span> Access all data we hold about you</li>
              <li className="flex items-center gap-2"><span className="text-primary">→</span> Correct any inaccurate information</li>
              <li className="flex items-center gap-2"><span className="text-primary">→</span> Export your data at any time</li>
              <li className="flex items-center gap-2"><span className="text-primary">→</span> Delete your account and all data permanently</li>
              <li className="flex items-center gap-2"><span className="text-primary">→</span> Withdraw this consent at any time</li>
            </ul>
          </div>

          {/* Full consent text (expandable) */}
          <div>
            <button
              type="button"
              onClick={() => setExpanded(e => !e)}
              className="text-xs text-primary underline underline-offset-2"
            >
              {expanded ? "Hide" : "Read"} full consent statement
            </button>
            {expanded && (
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed border border-border rounded-lg p-3">
                {SPDI_CONSENT_TEXT}
              </p>
            )}
          </div>

          {/* Law reference */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <AlertCircle className="h-4 w-4 shrink-0 text-primary/60 mt-0.5" />
            <span>
              This consent is obtained under the IT (Sensitive Personal Data) Rules 2011 and the
              Digital Personal Data Protection Act 2023.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 border-t border-border space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={checked}
              onChange={e => setChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
            />
            <span className="text-sm text-foreground leading-snug">
              I have read and understood the above. I give my explicit consent for LegacyNest to collect and
              store my family's sensitive personal data for the stated purpose.
            </span>
          </label>

          <button
            type="button"
            disabled={!checked || saving}
            onClick={handleAccept}
            className="w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold disabled:opacity-40 transition-opacity"
          >
            {saving ? "Saving consent…" : "I Consent — Continue to LegacyNest"}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            You can withdraw consent and delete all data from{" "}
            <span className="text-primary">Settings → Data & Privacy</span>
          </p>
        </div>
      </div>
    </div>
  );
}
