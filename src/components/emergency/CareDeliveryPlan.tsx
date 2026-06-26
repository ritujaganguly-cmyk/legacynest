import { useState, useEffect, useCallback } from "react";
import { Heart, Scale, Wallet, Home, AlertTriangle, FileText, Mail, CheckCircle2, Loader2, Copy, Check, ExternalLink, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase, pdb } from "@/integrations/supabase/client";

type CareCircleMember = { id: string; name: string; email: string; phone: string; relationship: string; responsibilities: string[] | null };
type SuccessionGuardian = { id: string; name: string; email: string; phone: string; relationship: string; role: string };
type VaultDoc = { id: string; document_name: string; category: string };
type CategoryComment = { [cat: string]: string };
type Share = {
  caregiver_email: string; caregiver_name: string;
  info_categories: string[]; vault_doc_ids: string[];
  access_token: string; shared_at: string | null;
  share_note: string | null; category_comments: CategoryComment | null;
};

const INFO_CATS = [
  { key: "daily_care", label: "Daily Care",  desc: "Routine, care needs, calming strategies",  icon: Home },
  { key: "medical",    label: "Medical",     desc: "Records, medications, appointments",         icon: Heart },
  { key: "financial",  label: "Financial",   desc: "Assets, insurance, government schemes",      icon: Wallet },
  { key: "legal",      label: "Legal",       desc: "Will, trust, guardianship, POA",             icon: Scale },
  { key: "emergency",  label: "Emergency",   desc: "24-hr plan, contacts, break-glass access",   icon: AlertTriangle },
];

function buildEmailBody(caregiverName: string, parentName: string, childName: string, portalUrl: string, categories: string[], comments: CategoryComment | null, responsibilities: string[] | null, breakGlass: string): string {
  const lines: string[] = [
    `Hi ${caregiverName.split(" ")[0]},`,
    "",
    `This is an automated message from LegacyNest. ${parentName}'s emergency plan for ${childName} has been activated.`,
    "",
  ];
  if (responsibilities?.length) {
    lines.push("YOUR RESPONSIBILITIES:", ...responsibilities.map(r => `• ${r}`), "");
  }
  if (categories.length) {
    lines.push("INFORMATION SHARED WITH YOU:");
    categories.forEach(cat => {
      const c = INFO_CATS.find(x => x.key === cat);
      if (!c) return;
      lines.push(`• ${c.label}: ${c.desc}`);
      if (comments?.[cat]) lines.push(`  Note: ${comments[cat]}`);
    });
    lines.push("");
  }
  if (portalUrl) lines.push("View and download shared documents:", portalUrl, "");
  if (breakGlass) lines.push("ACCESS INSTRUCTIONS:", breakGlass, "");
  lines.push("Act on this immediately. Every hour matters.", "", `— LegacyNest Emergency System`);
  return encodeURIComponent(lines.join("\n"));
}

export function CareDeliveryPlan() {
  const [careCircle, setCareCircle] = useState<CareCircleMember[]>([]);
  const [guardians, setGuardians] = useState<SuccessionGuardian[]>([]);
  const [vaultDocs, setVaultDocs] = useState<VaultDoc[]>([]);
  const [shares, setShares] = useState<Record<string, Share>>({});
  const [parentName, setParentName] = useState("");
  const [childName, setChildName] = useState("");
  const [breakGlass, setBreakGlass] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [commentEdit, setCommentEdit] = useState<Record<string, CategoryComment>>({});

  const load = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Care circle
      const { data: cc } = await supabase.from("care_circle").select("id,name,email,phone,relationship").eq("user_id", user.id).order("created_at");
      setCareCircle((cc ?? []) as CareCircleMember[]);

      // Succession guardians (2-step)
      const { data: plans } = await pdb.from("succession_plans").select("id").eq("user_id", user.id);
      if (plans?.length) {
        const { data: gdata } = await pdb.from("succession_guardians").select("id,name,email,phone,relationship,role").in("plan_id", plans.map((p: {id:string}) => p.id)).order("order_index");
        setGuardians((gdata ?? []) as SuccessionGuardian[]);
      }

      // Vault docs — column is document_name
      const { data: vd } = await pdb.from("digital_vault_documents").select("id,document_name,category").eq("user_id", user.id).order("category");
      setVaultDocs((vd ?? []) as VaultDoc[]);

      // Names + break-glass instructions
      const [pp, cp, ep] = await Promise.all([
        pdb.from("parent_profile").select("full_name").eq("user_id", user.id).maybeSingle(),
        pdb.from("child_profile").select("name").eq("user_id", user.id).maybeSingle(),
        pdb.from("emergency_plan").select("break_glass_instructions,coordinator_name,coordinator_phone").eq("user_id", user.id).maybeSingle(),
      ]);
      setParentName((pp.data as {full_name:string}|null)?.full_name ?? "");
      setChildName((cp.data as {name:string}|null)?.name ?? "your child");
      setBreakGlass((ep.data as {break_glass_instructions:string}|null)?.break_glass_instructions ?? "");

      // Shares (table may not exist yet)
      try {
        const { data: sh } = await supabase.from("caregiver_shares").select("*").eq("user_id", user.id);
        if (sh) {
          const map: Record<string, Share> = {};
          (sh as Share[]).forEach(s => { map[s.caregiver_email] = s; });
          setShares(map);
        }
      } catch { /* ignore if table not yet available */ }
    } catch (e) {
      console.error("CareDeliveryPlan:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveShare(email: string, name: string, patch: Partial<Share>) {
    setSaving(email);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(null); return; }
    const existing = shares[email];
    // Always omit category_comments from base payload — save it separately to handle missing column
    const { category_comments: catCommentsPatch, ...patchWithout } = patch as Partial<Share>;
    const payload = {
      user_id: user.id, caregiver_email: email, caregiver_name: name,
      info_categories: existing?.info_categories ?? [],
      vault_doc_ids: existing?.vault_doc_ids ?? [],
      share_note: existing?.share_note ?? null,
      ...patchWithout, updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("caregiver_shares").upsert(payload, { onConflict: "user_id,caregiver_email" });
    // Try to save category_comments separately (column may not exist)
    if (!error && (catCommentsPatch !== undefined || patch.category_comments !== undefined)) {
      try {
        await supabase.from("caregiver_shares")
          .update({ category_comments: catCommentsPatch ?? patch.category_comments })
          .eq("user_id", user.id).eq("caregiver_email", email);
      } catch { /* ignore if column doesn't exist */ }
    }
    if (!error) await load();
    else toast.error(`Save failed: ${error.message}`);
    setSaving(null);
  }

  async function toggleCat(email: string, name: string, cat: string) {
    const cats = shares[email]?.info_categories ?? [];
    await saveShare(email, name, { info_categories: cats.includes(cat) ? cats.filter(c=>c!==cat) : [...cats,cat] });
  }

  async function toggleDoc(email: string, name: string, docId: string) {
    const ids = shares[email]?.vault_doc_ids ?? [];
    await saveShare(email, name, { vault_doc_ids: ids.includes(docId) ? ids.filter(i=>i!==docId) : [...ids,docId] });
  }

  async function saveCatComment(email: string, name: string, cat: string, text: string) {
    const comments = { ...(shares[email]?.category_comments ?? {}), [cat]: text };
    await saveShare(email, name, { category_comments: comments });
  }

  async function markShared(email: string, name: string) {
    await saveShare(email, name, { shared_at: new Date().toISOString() });
  }

  function portalUrl(share?: Share) {
    return share?.access_token ? `${window.location.origin}/c/${share.access_token}` : "";
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  // Combine + deduplicate by email
  const seen = new Set<string>();
  const caregivers = [
    ...careCircle.filter(m=>m.email).map(m=>({ key:m.email, name:m.name, email:m.email, phone:m.phone, relationship:m.relationship, role:"Care Circle", type:"care_circle" as const, responsibilities: m.responsibilities ?? [] })),
    ...guardians.filter(g=>g.email).map(g=>({ key:g.email, name:g.name, email:g.email, phone:g.phone, relationship:g.relationship, role:g.role||"Successor", type:"succession" as const, responsibilities: [] as string[] })),
  ].filter(c=>{ if(seen.has(c.email)) return false; seen.add(c.email); return true; });

  if (!caregivers.length) return (
    <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-2">
      <Users className="h-8 w-8 text-muted-foreground mx-auto" />
      <p className="text-sm text-muted-foreground">No caregivers with email addresses found.</p>
      <p className="text-xs text-muted-foreground">Add emails in <a href="/care-circle" className="text-primary underline">Care Circle</a> and <a href="/caregiver" className="text-primary underline">Succession Plan</a>.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {caregivers.map(cg => {
        const share = shares[cg.email];
        const cats = share?.info_categories ?? [];
        const docIds = share?.vault_doc_ids ?? [];
        const catComments = share?.category_comments ?? {};
        const localComments = commentEdit[cg.email] ?? catComments;
        const isExp = expanded === cg.email;
        const purl = portalUrl(share);
        const isShared = !!share?.shared_at;

        return (
          <div key={cg.email} className={`rounded-xl border transition-all ${isShared ? "border-success/30 bg-success/5" : "border-border bg-card"}`}>
            {/* Header */}
            <button type="button" onClick={() => setExpanded(isExp ? null : cg.email)}
              className="w-full flex items-center justify-between gap-3 p-4 text-left">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`h-9 w-9 shrink-0 rounded-full grid place-items-center text-sm font-bold text-white ${cg.type==="succession" ? "bg-gold" : "bg-primary"}`}>
                  {cg.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{cg.name}</span>
                    <span className="text-xs text-muted-foreground px-2 py-0.5 bg-surface-low rounded-full">{cg.role}</span>
                    {isShared && <span className="text-xs text-success font-semibold flex items-center gap-1"><CheckCircle2 className="h-3 w-3"/>Shared</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">{cg.email}{cg.phone ? ` · ${cg.phone}` : ""}</div>
                  {cg.responsibilities?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {cg.responsibilities.map(r => <span key={r} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">{r}</span>)}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
                {cats.length > 0 && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">{cats.length} categories</span>}
                {docIds.length > 0 && <span className="bg-surface-container text-muted-foreground px-2 py-0.5 rounded-full">{docIds.length} docs</span>}
                <span>{isExp ? "▲" : "▼"}</span>
              </div>
            </button>

            {isExp && (
              <div className="border-t border-border px-4 pb-5 space-y-5 pt-4">
                {/* Info categories with per-category comments */}
                <div>
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">1. Information to share via email</div>
                  <div className="space-y-2">
                    {INFO_CATS.map(cat => {
                      const Icon = cat.icon;
                      const on = cats.includes(cat.key);
                      const comment = localComments[cat.key] ?? "";
                      return (
                        <div key={cat.key} className={`rounded-xl border transition-all ${on ? "border-primary/30 bg-primary/5" : "border-border"}`}>
                          <button type="button" onClick={() => toggleCat(cg.email, cg.name, cat.key)} disabled={saving===cg.email}
                            className="w-full flex items-center gap-3 p-3 text-left">
                            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${on ? "bg-primary text-primary-foreground" : "bg-surface-low text-muted-foreground"}`}>
                              {on ? <CheckCircle2 className="h-4 w-4"/> : <Icon className="h-4 w-4"/>}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-foreground">{cat.label}</span>
                              <span className="block text-xs text-muted-foreground">{cat.desc}</span>
                            </span>
                          </button>
                          <div className="px-3 pb-3">
                            <input
                              type="text"
                              placeholder={on ? `Note for ${cg.name.split(" ")[0]} about ${cat.label.toLowerCase()}… (optional)` : `Select ${cat.label} to add a note`}
                              value={comment}
                              disabled={!on}
                              onChange={e => setCommentEdit(prev => ({ ...prev, [cg.email]: { ...(prev[cg.email] ?? catComments), [cat.key]: e.target.value }}))}
                              onBlur={() => on && saveCatComment(cg.email, cg.name, cat.key, comment)}
                              className={`w-full rounded-lg border border-border px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 ${on ? "bg-white" : "bg-surface-low text-muted-foreground cursor-not-allowed"}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Vault docs */}
                <div>
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">2. Vault documents (secure portal access)</div>
                  {vaultDocs.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No vault documents yet. <a href="/vault" className="text-primary underline">Upload to vault →</a></p>
                  ) : (
                    <div className="space-y-1.5">
                      {vaultDocs.map(doc => {
                        const on = docIds.includes(doc.id);
                        return (
                          <label key={doc.id} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${on ? "border-primary/30 bg-primary/5" : "border-border hover:bg-surface-low"}`}>
                            <input type="checkbox" checked={on} onChange={() => toggleDoc(cg.email, cg.name, doc.id)} className="h-4 w-4 rounded text-primary"/>
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0"/>
                            <span className="text-sm text-foreground flex-1 truncate">{doc.document_name}</span>
                            <span className="text-xs text-muted-foreground capitalize shrink-0">{doc.category}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3 pt-1 border-t border-border">
                  {cats.length > 0 && (
                    <a href={`mailto:${cg.email}?subject=URGENT%3A+Emergency+Plan+Activated+for+${encodeURIComponent(childName)}&body=${buildEmailBody(cg.name, parentName, childName, purl, cats, localComments, cg.responsibilities, breakGlass)}`}
                      onClick={() => markShared(cg.email, cg.name)}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary-deep transition-colors">
                      <Mail className="h-4 w-4"/> Send Email
                    </a>
                  )}
                  {docIds.length > 0 && share?.access_token && (
                    <button onClick={() => { navigator.clipboard.writeText(purl); setCopied(cg.email); setTimeout(()=>setCopied(null),2000); markShared(cg.email, cg.name); }}
                      className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-low transition-colors">
                      {copied===cg.email ? <Check className="h-4 w-4 text-success"/> : <Copy className="h-4 w-4"/>}
                      {copied===cg.email ? "Copied!" : "Copy Portal Link"}
                    </button>
                  )}
                  {purl && (
                    <a href={purl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-low transition-colors text-muted-foreground">
                      <ExternalLink className="h-4 w-4"/> Preview portal
                    </a>
                  )}
                </div>

                {purl && docIds.length > 0 && (
                  <div className="rounded-lg bg-surface-low border border-border px-3 py-2">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Portal URL</div>
                    <div className="font-mono text-xs text-primary break-all">{purl}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
