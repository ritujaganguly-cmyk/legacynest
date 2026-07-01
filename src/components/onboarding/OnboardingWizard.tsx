/**
 * OnboardingWizard — a warm, guided first-run setup.
 *
 * Shown after login when the two most critical safety pieces are missing:
 * the "Call First" emergency coordinator, and the Daily Care break-glass
 * summary + primary caregiver. Both live under Emergency, but new parents
 * (especially those raising a child with special needs, often exhausted
 * and time-poor) shouldn't have to discover that on their own.
 *
 * Four screens: Welcome → Call First → Daily Care → Well done.
 * Can be closed at any time ("I'll finish this later") — it will simply
 * reappear next login until both pieces are actually filled in.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Heart, Phone, ShieldAlert, PartyPopper, ArrowRight, ArrowLeft, X,
  Loader2, Sparkles, KeyRound, ChevronRight, Mail, Copy, ChevronDown,
  ExternalLink, Smartphone, CheckCircle2, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { dataService, type BreakGlassMember } from "@/lib/data/mock";
import { EMAIL_PROVIDERS, type EmailProvider, sendViaProvider, copyToClipboard } from "@/lib/email-providers";
import { buildBreakGlassInviteText } from "@/lib/break-glass-invite";

const INPUT = "w-full rounded-xl border border-border bg-surface-low px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary";
const LABEL = "block text-sm font-semibold text-foreground mb-1.5";

type Step = 0 | 1 | 2 | 3;

interface Props {
  onClose: () => void;
  onFinished: () => void;
}

export function OnboardingWizard({ onClose, onFinished }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(0);
  const [saving, setSaving] = useState(false);

  // ── Step 1: Call First coordinator ──────────────────────────────────────
  const [coordName, setCoordName] = useState("");
  const [coordPhone, setCoordPhone] = useState("");
  const [coordRelationship, setCoordRelationship] = useState("");

  // ── Step 2: Daily Care break-glass ──────────────────────────────────────
  const [dailyCareText, setDailyCareText] = useState("");
  const [caregiverName, setCaregiverName] = useState("");
  const [caregiverEmail, setCaregiverEmail] = useState("");

  // ── Step 3: who to send the Daily Care invite to ────────────────────────
  const [dailyCareMember, setDailyCareMember] = useState<BreakGlassMember | null>(null);
  const [childName, setChildName] = useState("your child");
  const [inviterName, setInviterName] = useState("");

  useEffect(() => {
    // Prefill from any partial data already saved, so re-opening isn't a blank slate.
    dataService.getEmergencyPlan().then(p => {
      if (p?.coordinatorName) setCoordName(p.coordinatorName);
      if (p?.coordinatorPhone) setCoordPhone(p.coordinatorPhone);
      if (p?.coordinatorRelationship) setCoordRelationship(p.coordinatorRelationship);
    });
    dataService.getBreakGlassBlocks().then(b => {
      if (b?.daily_care) setDailyCareText(b.daily_care);
    });
    dataService.listBreakGlassMembers().then(members => {
      const primary = members.find(m => m.block === "daily_care" && m.rank === "primary");
      if (primary) {
        setCaregiverName(primary.name);
        setCaregiverEmail(primary.email);
        setDailyCareMember(primary);
      }
    });
    dataService.getChildProfile().then(c => { if (c?.name) setChildName(c.name); });
    dataService.getParentProfile().then(p => {
      const name = (p as { fullName?: string } | null)?.fullName;
      if (name) setInviterName(name);
    });
  }, []);

  async function saveCoordinatorAndNext() {
    if (!coordName.trim() || !coordPhone.trim()) {
      toast.error("Please add a name and phone number — this is who gets called first.");
      return;
    }
    setSaving(true);
    const ok = await dataService.saveEmergencyPlan({
      coordinatorName: coordName.trim(),
      coordinatorPhone: coordPhone.trim(),
      coordinatorRelationship: coordRelationship.trim(),
    });
    setSaving(false);
    if (!ok) { toast.error("Could not save. Please try again."); return; }
    setStep(2);
  }

  async function saveDailyCareAndNext() {
    if (!dailyCareText.trim()) {
      toast.error("Add a few lines about your child's daily routine — even a short note helps.");
      return;
    }
    setSaving(true);
    try {
      const blocks = await dataService.getBreakGlassBlocks();
      await dataService.saveBreakGlassBlocks({ ...blocks, daily_care: dailyCareText.trim() });
      if (caregiverName.trim() && caregiverEmail.trim()) {
        const member = await dataService.upsertBreakGlassMember({
          block: "daily_care", rank: "primary",
          name: caregiverName.trim(), email: caregiverEmail.trim(),
        });
        if (member) setDailyCareMember(member);
      }
      setStep(3);
    } catch {
      toast.error("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function finish() {
    onFinished();
    navigate({ to: "/dashboard" });
  }

  function goToEmergency() {
    onFinished();
    navigate({ to: "/emergency" });
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-card border border-border rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Progress + close */}
        <div className="px-6 pt-5 pb-3 flex items-center gap-3 shrink-0">
          <div className="flex-1 flex gap-1.5">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-surface-container"}`} />
            ))}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:bg-surface-low hover:text-foreground transition-colors"
            aria-label="I'll finish this later"
            title="I'll finish this later"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-7 pb-7 overflow-y-auto flex-1">
          {step === 0 && <WelcomeStep onNext={() => setStep(1)} />}
          {step === 1 && (
            <CallFirstStep
              name={coordName} setName={setCoordName}
              phone={coordPhone} setPhone={setCoordPhone}
              relationship={coordRelationship} setRelationship={setCoordRelationship}
              saving={saving}
              onBack={() => setStep(0)}
              onNext={saveCoordinatorAndNext}
            />
          )}
          {step === 2 && (
            <DailyCareStep
              text={dailyCareText} setText={setDailyCareText}
              caregiverName={caregiverName} setCaregiverName={setCaregiverName}
              caregiverEmail={caregiverEmail} setCaregiverEmail={setCaregiverEmail}
              saving={saving}
              onBack={() => setStep(1)}
              onNext={saveDailyCareAndNext}
            />
          )}
          {step === 3 && (
            <WellDoneStep
              dailyCareMember={dailyCareMember}
              childName={childName}
              inviterName={inviterName}
              onMemberSaved={setDailyCareMember}
              onFinish={finish}
              onGoToEmergency={goToEmergency}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step 0: Welcome ──────────────────────────────────────────────────────────

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center space-y-5 pt-2">
      <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
        <Heart className="h-8 w-8 text-primary" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-foreground">Welcome to LegacyNest 💛</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-md mx-auto">
          You're raising a child who needs a little more thought, a little more planning — and that takes real
          strength. We're here to help you carry some of that weight.
        </p>
      </div>

      <div className="rounded-2xl bg-surface-low border border-border p-5 text-left space-y-3">
        <p className="text-sm font-semibold text-foreground">
          Before anything else, let's set up two things that matter most in an emergency:
        </p>
        <div className="flex items-start gap-3">
          <span className="h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
          <div>
            <p className="text-sm font-medium text-foreground">Who to call first</p>
            <p className="text-xs text-muted-foreground">A trusted person who can step in immediately if something happens to you.</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
          <div>
            <p className="text-sm font-medium text-foreground">Your child's daily care basics</p>
            <p className="text-xs text-muted-foreground">Routine, comfort, and what a caregiver needs to know right away.</p>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">This takes about 3 minutes. You can always finish the rest later.</p>

      <button
        onClick={onNext}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold py-3.5 text-[15px] hover:bg-primary/90 transition-colors"
      >
        Let's begin <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ── Step 1: Call First coordinator ───────────────────────────────────────────

function CallFirstStep({
  name, setName, phone, setPhone, relationship, setRelationship, saving, onBack, onNext,
}: {
  name: string; setName: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  relationship: string; setRelationship: (v: string) => void;
  saving: boolean; onBack: () => void; onNext: () => void;
}) {
  return (
    <div className="space-y-5 pt-2">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
          <Phone className="h-5 w-5 text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Call First — Emergency Coordinator</h2>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            If something ever happens to you, this is the one person your family calls first — before anyone
            else. Choose someone dependable who lives nearby or can act quickly: a spouse, sibling, close
            relative, or trusted friend.
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-green-50/60 border border-green-100 px-4 py-3 flex items-start gap-2.5">
        <Sparkles className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
        <p className="text-xs text-green-800 leading-relaxed">
          It's okay if you're not 100% sure yet — you can change this anytime from the Emergency page.
          Just start with someone you trust today.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className={LABEL}>Their name *</label>
          <input className={INPUT} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Priya Sharma" />
        </div>
        <div>
          <label className={LABEL}>Their phone number *</label>
          <input className={INPUT} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" type="tel" />
        </div>
        <div>
          <label className={LABEL}>How are they related to you?</label>
          <input className={INPUT} value={relationship} onChange={e => setRelationship(e.target.value)} placeholder="e.g. Spouse, Sister, Close friend" />
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-3 text-sm font-semibold text-muted-foreground hover:bg-surface-low transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button
          onClick={onNext}
          disabled={saving}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold py-3 text-[15px] hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          Save &amp; continue
        </button>
      </div>
    </div>
  );
}

// ── Step 2: Daily Care break-glass ───────────────────────────────────────────

function DailyCareStep({
  text, setText, caregiverName, setCaregiverName, caregiverEmail, setCaregiverEmail, saving, onBack, onNext,
}: {
  text: string; setText: (v: string) => void;
  caregiverName: string; setCaregiverName: (v: string) => void;
  caregiverEmail: string; setCaregiverEmail: (v: string) => void;
  saving: boolean; onBack: () => void; onNext: () => void;
}) {
  return (
    <div className="space-y-5 pt-2">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
          <Heart className="h-5 w-5 text-rose-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Daily Care — the everyday essentials</h2>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            If someone unfamiliar had to step in tomorrow, what would they absolutely need to know? Think
            routine, comfort items, how your child communicates, what soothes them, and what to avoid.
          </p>
        </div>
      </div>

      <div>
        <label className={LABEL}>A few lines about their daily care *</label>
        <textarea
          rows={5}
          className={`${INPUT} resize-none`}
          placeholder={"e.g. Wakes at 7am, needs the weighted blanket to settle. Gets overwhelmed by loud noises — use noise-cancelling headphones. Loves the blue elephant toy. Speaks a few words, mostly uses the picture cards on the fridge."}
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <p className="text-xs text-muted-foreground mt-1.5">Don't worry about getting it perfect — you can refine this anytime.</p>
      </div>

      <div className="rounded-xl border border-border bg-surface-low p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" /> Who should see this in an emergency?
        </p>
        <p className="text-xs text-muted-foreground -mt-1">
          Name a primary caregiver — someone who can act on this information immediately. Optional for now.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <input className={INPUT} placeholder="Caregiver's name" value={caregiverName} onChange={e => setCaregiverName(e.target.value)} />
          <input className={INPUT} placeholder="Caregiver's email" type="email" value={caregiverEmail} onChange={e => setCaregiverEmail(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-3 text-sm font-semibold text-muted-foreground hover:bg-surface-low transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button
          onClick={onNext}
          disabled={saving}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold py-3 text-[15px] hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          Save &amp; continue
        </button>
      </div>
    </div>
  );
}

// ── Step 3: Well done — activate Daily Care by inviting the caregiver ────────

function ActivateDailyCareCard({
  member, childName, inviterName, onMemberSaved,
}: {
  member: BreakGlassMember | null; childName: string; inviterName: string;
  onMemberSaved: (m: BreakGlassMember) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(member?.name ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const emailValid = /\S+@\S+\.\S+/.test(email);

  async function ensureSaved(): Promise<BreakGlassMember | undefined> {
    if (member && member.name === name.trim() && member.email === email.trim()) return member;
    const m = (await dataService.upsertBreakGlassMember({
      block: "daily_care", rank: "primary", name: name.trim(), email: email.trim(),
    })) ?? undefined;
    if (m) onMemberSaved(m);
    return m;
  }

  async function sendVia(provider: EmailProvider) {
    if (!emailValid) { toast.error("Add the caregiver's email first."); return; }
    setMenuOpen(false);
    setBusy(true);
    const m = await ensureSaved();
    setBusy(false);
    if (!m?.accessToken) { toast.error("Could not prepare the invite link."); return; }

    const t = buildBreakGlassInviteText(m, inviterName, childName);
    const providerInfo = EMAIL_PROVIDERS.find(p => p.key === provider)!;
    const { copied } = await sendViaProvider(provider, t, t.link);
    toast.success(
      providerInfo.opensNewTab
        ? `Opening ${providerInfo.label} with the invite ready to send…`
        : copied ? "Opening your default email app… link also copied." : "Opening your default email app…",
      { duration: 4000 },
    );
    if (m.status === "draft") {
      const ok = await dataService.markBreakGlassInviteSent(m.id);
      if (ok) onMemberSaved({ ...m, status: "invited" });
    }
  }

  async function copyLink() {
    setBusy(true);
    const m = await ensureSaved();
    setBusy(false);
    if (!m?.accessToken) { toast.error("Add the caregiver's name and email first."); return; }
    const link = `${window.location.origin}/accept/${m.accessToken}`;
    const ok = await copyToClipboard(link);
    if (ok) toast.success("Invite link copied.");
    else toast.error(`Could not copy automatically. Link: ${link}`);
  }

  const statusLabel = member?.status === "accepted"
    ? { text: "Accepted — Daily Care is active", cls: "text-green-700", Icon: CheckCircle2 }
    : member?.status === "invited"
      ? { text: "Invite sent — waiting for them to accept", cls: "text-amber-700", Icon: Clock }
      : null;

  return (
    <div className="rounded-2xl border-2 border-rose-200 bg-rose-50/40 p-5 text-left space-y-3">
      <p className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Heart className="h-4 w-4 text-rose-500" /> Activate Daily Care
      </p>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Daily Care isn't active until your named caregiver accepts. Send them an email, or copy the link and
        share it however you like (WhatsApp, SMS). The moment they accept, Daily Care turns on.
      </p>

      {statusLabel && (
        <div className={`flex items-center gap-1.5 text-xs font-semibold ${statusLabel.cls}`}>
          <statusLabel.Icon className="h-3.5 w-3.5" /> {statusLabel.text}
        </div>
      )}

      {member?.status !== "accepted" && (
        <>
          {!member && (
            <div className="grid sm:grid-cols-2 gap-2">
              <input className={INPUT.replace("py-3", "py-2.5")} placeholder="Caregiver's name" value={name} onChange={e => setName(e.target.value)} />
              <input className={INPUT.replace("py-3", "py-2.5")} placeholder="Caregiver's email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <button onClick={() => setMenuOpen(o => !o)} disabled={busy || !emailValid}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-xs font-semibold hover:bg-primary/90 disabled:opacity-50">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                {member?.status === "invited" ? "Re-send invite" : "Send invite"}
                <ChevronDown className="h-3 w-3" />
              </button>
              {menuOpen && (
                <div className="absolute z-20 top-full left-0 mt-1 w-44 rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                  {EMAIL_PROVIDERS.map(p => (
                    <button key={p.key} onClick={() => sendVia(p.key)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-left hover:bg-surface-low transition-colors">
                      <span>{p.label}</span>
                      {p.opensNewTab ? <ExternalLink className="h-3 w-3 text-muted-foreground" /> : <Smartphone className="h-3 w-3 text-muted-foreground" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={copyLink} disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-surface-low disabled:opacity-50">
              <Copy className="h-3.5 w-3.5" /> Copy link
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function WellDoneStep({
  dailyCareMember, childName, inviterName, onMemberSaved, onFinish, onGoToEmergency,
}: {
  dailyCareMember: BreakGlassMember | null; childName: string; inviterName: string;
  onMemberSaved: (m: BreakGlassMember) => void;
  onFinish: () => void; onGoToEmergency: () => void;
}) {
  return (
    <div className="text-center space-y-5 pt-2">
      <div className="h-16 w-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto">
        <PartyPopper className="h-8 w-8 text-green-600" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-foreground">Well done — you're covered! 🎉</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-md mx-auto">
          You've just done something many families put off for years. Your child now has someone who'd know
          what to do, even on the hardest day.
        </p>
      </div>

      <ActivateDailyCareCard
        member={dailyCareMember}
        childName={childName}
        inviterName={inviterName}
        onMemberSaved={onMemberSaved}
      />

      <div className="rounded-2xl bg-surface-low border border-border p-5 text-left space-y-4">
        <div>
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary" /> Three more break-glass topics, whenever you're ready
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            On the <strong>Emergency</strong> page you'll also find <strong>Medical</strong>,{" "}
            <strong>Financial</strong>, and <strong>Legal</strong> — the same simple format: a short note, plus
            a caregiver who should see it. Add them at your own pace.
          </p>
        </div>
        <div className="border-t border-border pt-4">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" /> Why set up the Emergency Activation Protocol?
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            It lets your coordinators formally confirm a real emergency — so LegacyNest knows to release the
            right information to the right people at the right time, safely and only when it's truly needed.
            You'll find it further down the Emergency page.
          </p>
        </div>
      </div>

      <div className="space-y-2.5 pt-1">
        <button
          onClick={onGoToEmergency}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-primary/30 text-primary font-semibold py-3 text-[15px] hover:bg-primary/5 transition-colors"
        >
          Set up the rest now <ChevronRight className="h-4 w-4" />
        </button>
        <button
          onClick={onFinish}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold py-3 text-[15px] hover:bg-primary/90 transition-colors"
        >
          Take me to my Dashboard
        </button>
      </div>
    </div>
  );
}
