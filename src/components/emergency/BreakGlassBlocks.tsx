import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, HeartPulse, Landmark, Scale, Send, Copy, Trash2, Check, Clock, X, Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { dataService, type BreakGlassBlock, type BreakGlassMember } from "@/lib/data/mock";

const BLOCKS: { key: BreakGlassBlock; label: string; icon: typeof Heart; hint: string }[] = [
  { key: "daily_care", label: "Daily Care", icon: Heart,      hint: "Routine, comfort items, how they communicate, what calms them, what to avoid." },
  { key: "medical",    label: "Medical",    icon: HeartPulse, hint: "Conditions, medications & doses, allergies, treating doctors." },
  { key: "financial",  label: "Financial",  icon: Landmark,   hint: "Where funds are, who to contact, immediate money needs." },
  { key: "legal",      label: "Legal",      icon: Scale,      hint: "Guardianship status, where key documents are, who has authority." },
];

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

  async function sendInvite() {
    if (!emailValid) { toast.error("Enter a valid email first."); return; }
    setBusy(true);
    // ensure saved (so a token exists)
    let m = member;
    if (!m || dirty) {
      m = (await dataService.upsertBreakGlassMember({ block, rank, name: name.trim(), email: email.trim() })) ?? undefined;
      onChanged();
    }
    if (!m) { setBusy(false); toast.error("Could not prepare the invite."); return; }
    const ok = await dataService.sendBreakGlassInvite(m, { inviterName, childName });
    setBusy(false);
    if (ok) { toast.success(`Invite emailed to ${email}.`); onChanged(); }
    else toast.error("Could not send the invite email. Check that Resend is configured.");
  }

  async function copyLink() {
    if (!member?.accessToken) { toast.error("Save the caregiver first to get a link."); return; }
    await navigator.clipboard.writeText(`${window.location.origin}/accept/${member.accessToken}`);
    toast.success("Invite link copied.");
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
        <button onClick={sendInvite} disabled={busy || !emailValid}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold hover:bg-primary/90 disabled:opacity-50">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          {member?.status === "invited" || member?.status === "accepted" ? "Re-send" : "Send invite"}
        </button>
        <button onClick={copyLink} disabled={!member?.accessToken}
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

  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center ring-1 ring-red-100 shrink-0">
          <KeyRound className="h-5 w-5 text-red-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Break-glass information</h2>
          <p className="text-sm text-muted-foreground">
            The four things a trusted person needs in the first hours. For each, name a primary and a backup caregiver and invite them.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {BLOCKS.map(({ key, label, icon: Icon, hint }) => (
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
          </div>
        ))}
      </div>
    </section>
  );
}
