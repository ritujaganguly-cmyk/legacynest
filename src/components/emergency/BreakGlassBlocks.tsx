import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, HeartPulse, Landmark, Scale, Mail, Copy, Trash2, Check, Clock, X, Loader2, KeyRound, FileText } from "lucide-react";
import { toast } from "sonner";
import { dataService, type BreakGlassBlock, type BreakGlassMember, type VaultDocument } from "@/lib/data/mock";

const BLOCKS: { key: BreakGlassBlock; label: string; icon: typeof Heart; hint: string; categories: VaultDocument["category"][] }[] = [
  { key: "daily_care", label: "Daily Care", icon: Heart,      hint: "Routine, comfort items, how they communicate, what calms them, what to avoid.", categories: ["Identity", "Disability", "Educational", "Government"] },
  { key: "medical",    label: "Medical",    icon: HeartPulse, hint: "Conditions, medications & doses, allergies, treating doctors.",               categories: ["Medical", "Disability"] },
  { key: "financial",  label: "Financial",  icon: Landmark,   hint: "Where funds are, who to contact, immediate money needs.",                     categories: ["Financial", "Insurance"] },
  { key: "legal",      label: "Legal",      icon: Scale,      hint: "Guardianship status, where key documents are, who has authority.",            categories: ["Legal", "Government", "Identity"] },
];

const BLOCK_LABEL: Record<BreakGlassBlock, string> = {
  daily_care: "Daily Care", medical: "Medical", financial: "Financial", legal: "Legal",
};

/** Copies text to the clipboard with a fallback for non-secure/iframe contexts where
 *  the async Clipboard API silently throws. Always reports success or failure. */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    throw new Error("clipboard API unavailable");
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function buildInviteMailto(member: { name: string; email: string; block: BreakGlassBlock; rank: "primary" | "backup"; accessToken?: string }, inviterName: string, childName: string): string {
  const link = `${window.location.origin}/accept/${member.accessToken}`;
  const who = inviterName || "A LegacyNest family";
  const label = BLOCK_LABEL[member.block];
  const subject = `${who} has asked you to help with ${childName}'s ${label} care`;
  const body =
    `Dear ${member.name ? member.name.split(" ")[0] : "there"},\n\n` +
    `${who} has named you as the ${member.rank === "backup" ? "backup" : "primary"} caregiver for ${childName}'s ${label} ` +
    `in their LegacyNest emergency plan.\n\n` +
    `Please review and respond using the link below:\n${link}\n\n` +
    `Thank you,\n${who}`;
  return `mailto:${member.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const INPUT = "w-full rounded-lg border border-border bg-surface-low px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";

function StatusBadge({ status }: { status: BreakGlassMember["status"] }) {
  const map = {
    draft:    { label: "Not invited", cls: "bg-surface-low text-muted-foreground", Icon: Clock },
    invited:  { label: "Invite sent", cls: "bg-amber-50 text-amber-700", Icon: Clock },
    accepted: { label: "Accepted",    cls: "bg-green-50 text-green-700", Icon: Check },
    declined: { label: "Declined",    cls: "bg-red-50 text-red-700", Icon: X },
  }[status];
  const I = map.Icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${map.cls}`}>
      <I className="h-3 w-3" /> {map.label}
    </span>
  );
}

function MemberRow({
  block, rank, member, childName, inviterName, onChanged,
}: {
  block: BreakGlassBlock; rank: "primary" | "backup";
  member?: BreakGlassMember; childName: string; inviterName: string; onChanged: () => void;
}) {
  const [name, setName] = useState(member?.name ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => { setName(member?.name ?? ""); setEmail(member?.email ?? ""); }, [member?.id, member?.name, member?.email]);

  const dirty = name !== (member?.name ?? "") || email !== (member?.email ?? "");
  const emailValid = /\S+@\S+\.\S+/.test(email);

  async function save() {
    if (!emailValid || !dirty) return;
    setBusy(true);
    const ok = await dataService.upsertBreakGlassMember({ block, rank, name: name.trim(), email: email.trim() });
    setBusy(false);
    if (ok) onChanged();
    else toast.error("Could not save caregiver.");
  }

  async function ensureSaved(): Promise<BreakGlassMember | undefined> {
    if (member && !dirty) return member;
    const m = (await dataService.upsertBreakGlassMember({ block, rank, name: name.trim(), email: email.trim() })) ?? undefined;
    if (m) onChanged();
    return m;
  }

  async function openEmail() {
    if (!emailValid) { toast.error("Enter a valid email first."); return; }
    setBusy(true);
    const m = await ensureSaved();
    setBusy(false);
    if (!m?.accessToken) { toast.error("Could not prepare the invite link."); return; }
    window.open(buildInviteMailto(m, inviterName, childName), "_blank");
    if (m.status === "draft") {
      const ok = await dataService.markBreakGlassInviteSent(m.id);
      if (ok) onChanged();
    }
  }

  async function copyLink() {
    setBusy(true);
    const m = await ensureSaved();
    setBusy(false);
    if (!m?.accessToken) { toast.error("Save the caregiver first to get a link."); return; }
    const link = `${window.location.origin}/accept/${m.accessToken}`;
    const ok = await copyToClipboard(link);
    if (ok) toast.success("Invite link copied.");
    else toast.error(`Could not copy automatically. Link: ${link}`);
  }

  async function remove() {
    if (!member) { setName(""); setEmail(""); return; }
    if (!confirm("Remove this caregiver?")) return;
    setBusy(true);
    await dataService.deleteBreakGlassMember(member.id);
    setBusy(false);
    onChanged();
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-primary">{rank === "primary" ? "Primary" : "Backup"}</span>
        {member && <StatusBadge status={member.status} />}
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        <input className={INPUT} placeholder="Name" value={name} onChange={e => setName(e.target.value)} onBlur={save} />
        <input className={INPUT} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} onBlur={save} />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={openEmail} disabled={busy || !emailValid}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold hover:bg-primary/90 disabled:opacity-50">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
          {member?.status === "invited" || member?.status === "accepted" ? "Re-open email" : "Open email to invite"}
        </button>
        <button onClick={copyLink} disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-low disabled:opacity-50">
          <Copy className="h-3.5 w-3.5" /> Copy link
        </button>
        {member && (
          <button onClick={remove} disabled={busy}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-50">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export function BreakGlassBlocks() {
  const qc = useQueryClient();
  const { data: members = [] } = useQuery({ queryKey: ["bg-members"], queryFn: () => dataService.listBreakGlassMembers() });
  const { data: blocks = {} as Record<BreakGlassBlock, string> } = useQuery({ queryKey: ["bg-blocks"], queryFn: () => dataService.getBreakGlassBlocks() });
  const { data: child } = useQuery({ queryKey: ["child-profile"], queryFn: () => dataService.getChildProfile() });
  const { data: parent } = useQuery({ queryKey: ["parent-profile"], queryFn: () => dataService.getParentProfile() });

  const { data: vaultDocs = [] } = useQuery({ queryKey: ["vault"], queryFn: () => dataService.listVaultDocuments() });
  const { data: bgFiles = {} as Record<BreakGlassBlock, string[]> } = useQuery({ queryKey: ["bg-files"], queryFn: () => dataService.getBreakGlassFiles() });

  const [text, setText] = useState<Record<string, string>>({});
  useEffect(() => { setText(blocks as Record<string, string>); }, [blocks]);

  const childName = child?.name || "your child";
  const inviterName = (parent as { fullName?: string } | null)?.fullName || "";

  const refetchMembers = () => qc.invalidateQueries({ queryKey: ["bg-members"] });

  async function saveBlockText(key: BreakGlassBlock) {
    const next = { ...(blocks as Record<BreakGlassBlock, string>), ...(text as Record<BreakGlassBlock, string>) };
    await dataService.saveBreakGlassBlocks(next);
    qc.invalidateQueries({ queryKey: ["bg-blocks"] });
  }

  async function toggleFile(block: BreakGlassBlock, docId: string) {
    const current = (bgFiles as Record<BreakGlassBlock, string[]>)[block] ?? [];
    const next = current.includes(docId) ? current.filter(id => id !== docId) : [...current, docId];
    const nextFiles = { ...(bgFiles as Record<BreakGlassBlock, string[]>), [block]: next };
    qc.setQueryData(["bg-files"], nextFiles); // optimistic
    const ok = await dataService.saveBreakGlassFiles(nextFiles);
    if (!ok) { toast.error("Could not update document sharing."); qc.invalidateQueries({ queryKey: ["bg-files"] }); }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center ring-1 ring-red-100 shrink-0">
          <KeyRound className="h-5 w-5 text-red-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Break-glass information</h2>
          <p className="text-sm text-muted-foreground">
            The four things a trusted person needs in the first hours. For each: write the summary, name a primary and a backup caregiver, and choose which Digital Vault documents to share.
            Invites open in your own email app (Gmail, Outlook, etc.) — or copy the link and send it however you like.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {BLOCKS.map(({ key, label, icon: Icon, hint, categories }) => {
          const blockDocs = vaultDocs.filter(d => categories.includes(d.category));
          const sharedIds = (bgFiles as Record<BreakGlassBlock, string[]>)[key] ?? [];
          return (
            <div key={key} className="rounded-2xl border border-border bg-surface-low p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-primary shrink-0" />
                <h3 className="font-semibold text-foreground">{label}</h3>
              </div>
              <textarea
                rows={3}
                className={`${INPUT} resize-none bg-card`}
                placeholder={hint}
                value={text[key] ?? ""}
                onChange={e => setText(t => ({ ...t, [key]: e.target.value }))}
                onBlur={() => saveBlockText(key)}
              />
              <div className="space-y-2">
                <MemberRow block={key} rank="primary" member={members.find(m => m.block === key && m.rank === "primary")} childName={childName} inviterName={inviterName} onChanged={refetchMembers} />
                <MemberRow block={key} rank="backup" member={members.find(m => m.block === key && m.rank === "backup")} childName={childName} inviterName={inviterName} onChanged={refetchMembers} />
              </div>

              {/* Vault documents shared with this block's caregivers */}
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Vault documents to share {sharedIds.length > 0 && `(${sharedIds.length} on)`}
                  </span>
                </div>
                {blockDocs.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No matching {label.toLowerCase()} documents in your Digital Vault yet.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {blockDocs.map(doc => {
                      const on = sharedIds.includes(doc.id);
                      return (
                        <li key={doc.id} className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm text-foreground truncate">{doc.name}</div>
                            <div className="text-[10px] text-muted-foreground">{doc.category}</div>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={on}
                            onClick={() => toggleFile(key, doc.id)}
                            title={on ? "Sharing on — click to disable" : "Sharing off — click to enable"}
                            className={`relative h-5 w-9 rounded-full shrink-0 transition-colors ${on ? "bg-primary" : "bg-surface-container"}`}
                          >
                            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${on ? "translate-x-4" : "translate-x-0.5"}`} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
