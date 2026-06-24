/**
 * Caregiver Portal — /c/{token}
 * Public page (no login required). A caregiver visits their unique link
 * and sees all vault documents and information shared with them.
 * One link covers ALL children shared with that caregiver's email.
 */
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, FileText, Download, Heart, Scale, Wallet, Home, AlertTriangle, Loader2, Lock } from "lucide-react";
import logo from "@/assets/LegacyNest_Logo.jpeg";

export const Route = createFileRoute("/c/$token")({
  component: CaregiverPortal,
});

const CATEGORY_ICONS: Record<string, typeof Shield> = {
  medical: Heart, legal: Scale, financial: Wallet,
  daily_care: Home, emergency: AlertTriangle, default: FileText,
};

const CATEGORY_LABEL: Record<string, string> = {
  medical: "Medical", legal: "Legal", financial: "Financial",
  daily_care: "Daily Care", emergency: "Emergency", default: "Document",
};

const INFO_LABELS: Record<string, string> = {
  medical: "Medical records, medications, appointments, therapy",
  legal: "Will, trust, guardianship, power of attorney",
  financial: "Assets, insurance, government schemes, corpus plan",
  daily_care: "Daily routine, care needs, calming strategies",
  emergency: "Emergency contacts, 24-hour plan, break-glass access",
};

type VaultDoc = { id: string; title: string; category: string; file_url: string; notes?: string; created_at: string };
type ChildRecord = { share: { caregiver_name: string; caregiver_type: string; relationship: string; info_categories: string[]; share_note?: string }; child: { name: string; disability_type?: string } | null; parent_name: string | null; vault_docs: VaultDoc[] | null };

function CaregiverPortal() {
  const { token } = useParams({ from: "/c/$token" });
  const [records, setRecords] = useState<ChildRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    async function load() {
      const { data, error: err } = await supabase.rpc("get_caregiver_all_portals", { p_token: token });
      if (err || !data) { setError("This link is invalid or has expired. Please contact the plan owner."); setLoading(false); return; }
      const list = data as ChildRecord[];
      if (!list.length) { setError("No shared records found for this link."); setLoading(false); return; }
      setRecords(list);
      setLoading(false);
    }
    load();
  }, [token]);

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 gap-4">
      <img src={logo} alt="LegacyNest" className="h-12 w-12 rounded-xl object-cover" />
      <Lock className="h-10 w-10 text-muted-foreground" />
      <p className="text-sm text-muted-foreground text-center max-w-sm">{error}</p>
    </div>
  );

  const rec = records[active];
  const share = rec.share;
  const child = rec.child;
  const docs = rec.vault_docs ?? [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="LegacyNest" className="h-8 w-8 rounded-lg object-cover" />
          <div>
            <div className="text-sm font-bold text-foreground">LegacyNest — Caregiver Portal</div>
            <div className="text-xs text-muted-foreground">Secure documents shared with you</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-surface-low px-3 py-1.5 rounded-full">
          <Shield className="h-3 w-3 text-primary" /> Secure access
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Hello, {share.caregiver_name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {rec.parent_name} has shared the following information with you as{" "}
            <span className="font-medium text-foreground">{share.relationship || share.caregiver_type}</span>.
          </p>
          {share.share_note && (
            <div className="mt-3 rounded-xl bg-primary/5 border border-primary/15 px-4 py-3 text-sm text-foreground/80 italic">
              "{share.share_note}"
            </div>
          )}
        </div>

        {/* Child tabs (if multiple children) */}
        {records.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {records.map((r, i) => (
              <button key={i} onClick={() => setActive(i)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                  active === i ? "bg-primary text-primary-foreground" : "bg-surface-low text-foreground hover:bg-surface-container"
                }`}>
                {r.child?.name ?? `Child ${i + 1}`}
              </button>
            ))}
          </div>
        )}

        {/* Child info */}
        <div className="legacy-card p-5 flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 grid place-items-center shrink-0">
            <Heart className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">{child?.name ?? "Child"}</h2>
            {child?.disability_type && <p className="text-sm text-muted-foreground">{child.disability_type}</p>}
          </div>
        </div>

        {/* Info categories shared */}
        {share.info_categories?.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Information Shared With You</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {share.info_categories.map(cat => {
                const Icon = CATEGORY_ICONS[cat] ?? CATEGORY_ICONS.default;
                return (
                  <div key={cat} className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 grid place-items-center shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{CATEGORY_LABEL[cat] ?? cat}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{INFO_LABELS[cat] ?? ""}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Vault documents */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Shared Documents ({docs.length})
          </h3>
          {docs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No vault documents have been shared yet.
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map(doc => {
                const Icon = CATEGORY_ICONS[doc.category] ?? FileText;
                return (
                  <div key={doc.id} className="legacy-card p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-surface-low grid place-items-center shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">{doc.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="capitalize">{doc.category?.replace("_", " ")}</span>
                        <span>·</span>
                        <span>{new Date(doc.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                      </div>
                      {doc.notes && <div className="text-xs text-muted-foreground mt-0.5 truncate">{doc.notes}</div>}
                    </div>
                    {doc.file_url && (
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                        className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold hover:bg-primary-deep transition-colors">
                        <Download className="h-3.5 w-3.5" /> Download
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center pb-4">
          This page is private to you. Do not share this link. Content owned by {rec.parent_name}. Managed by LegacyNest.
        </p>
      </main>
    </div>
  );
}
