import { createFileRoute } from "@tanstack/react-router";
import { SPDINotice } from "@/components/compliance/SPDINotice";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ChapterBanner } from "@/components/ChapterBanner";
import { Scale, FileText, Landmark, Shield, Loader2, ChevronDown, ChevronUp, Check, Download, BookOpen, Info } from "lucide-react";
import { toast } from "sonner";
import { dataService, type LegalWill, type LegalTrust, type LegalGuardianship, type LegalPoa } from "@/lib/data/mock";
import { generateDraftWill, generateDraftTrust, generateDraftPoa } from "@/lib/legal-documents";

export const Route = createFileRoute("/_app/legal")({
  head: () => ({ meta: [{ title: "Legal Planning -- LegacyNest" }] }),
  component: LegalPage,
});

const INPUT = "w-full rounded-lg border border-border bg-surface-low px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";
const LABEL = "block text-xs font-semibold text-muted-foreground mb-1";
const G2 = "grid sm:grid-cols-2 gap-4";
const G3 = "grid sm:grid-cols-3 gap-4";

const STATUS_COLOR: Record<string, string> = {
  "Not Started":          "bg-surface-low text-muted-foreground",
  "Not Created":          "bg-surface-low text-muted-foreground",
  "Not Initiated":        "bg-surface-low text-muted-foreground",
  "Not Set":              "bg-surface-low text-muted-foreground",
  "Drafted":              "bg-blue-50 text-blue-700",
  "In Progress":          "bg-blue-50 text-blue-700",
  "Registered":           "bg-green-50 text-green-700",
  "Court Order Obtained": "bg-green-50 text-green-700",
  "Active":               "bg-green-50 text-green-700",
  "In Place":             "bg-green-50 text-green-700",
  "Needs Update":         "bg-amber-50 text-amber-700",
};

type SectionKey = "will" | "trust" | "guardianship" | "poa";

function LegalPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState<SectionKey | null>(null);

  const { data: will }         = useQuery({ queryKey: ["legal-will"],         queryFn: () => dataService.getLegalWill() });
  const { data: trust }        = useQuery({ queryKey: ["legal-trust"],        queryFn: () => dataService.getLegalTrust() });
  const { data: guardianship } = useQuery({ queryKey: ["legal-guardianship"], queryFn: () => dataService.getLegalGuardianship() });
  const { data: poa }          = useQuery({ queryKey: ["legal-poa"],          queryFn: () => dataService.getLegalPoa() });

  const { data: childProfile } = useQuery({ queryKey: ["child-profile"], queryFn: () => dataService.getChildProfile() });
  const { data: parentProfile } = useQuery({ queryKey: ["parent-profile"], queryFn: () => dataService.getParentProfile() });

  const [willDraft, setWillDraft]                 = useState<LegalWill>({ willStatus: "Not Started" });
  const [trustDraft, setTrustDraft]               = useState<LegalTrust>({ trustStatus: "Not Created" });
  const [guardDraft, setGuardDraft]               = useState<LegalGuardianship>({ guardianshipStatus: "Not Initiated" });
  const [poaDraft, setPoaDraft]                   = useState<LegalPoa>({ hasPoa: false });
  const [saving, setSaving] = useState<SectionKey | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);

  const parentName = (parentProfile as { fullName?: string } | null)?.fullName || "";
  const childName = childProfile?.name || "";
  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  // Child age for guardianship eligibility check
  const childAge = (() => {
    if (!childProfile?.dateOfBirth) return null;
    const b = new Date(childProfile.dateOfBirth);
    const t = new Date();
    let age = t.getFullYear() - b.getFullYear();
    if (t.getMonth() - b.getMonth() < 0 || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) age--;
    return age;
  })();
  const childUnder18 = childAge !== null && childAge < 18;
  const yearsUntil18 = childAge !== null && childAge < 18 ? 18 - childAge : 0;

  async function generateDoc(type: "will" | "trust" | "poa") {
    setGenerating(type);
    try {
      if (type === "will")   generateDraftWill(willDraft, parentName, childName, today);
      if (type === "trust")  generateDraftTrust(trustDraft, parentName, childName, today);
      if (type === "poa")    generateDraftPoa(poaDraft, parentName, childName, today);
      toast.success("Draft document downloaded. Review with your lawyer before signing.");
    } catch (e) {
      console.error(e);
      toast.error("Could not generate document.");
    } finally {
      setGenerating(null);
    }
  }

  useEffect(() => { if (will)        setWillDraft(will); },        [will]);
  useEffect(() => { if (trust)       setTrustDraft(trust); },       [trust]);
  useEffect(() => { if (guardianship) setGuardDraft(guardianship); }, [guardianship]);
  useEffect(() => { if (poa)         setPoaDraft(poa); },           [poa]);

  async function save(section: SectionKey) {
    setSaving(section);
    try {
      let ok = false;
      if (section === "will")         ok = await dataService.saveLegalWill(willDraft);
      if (section === "trust")        ok = await dataService.saveLegalTrust(trustDraft);
      if (section === "guardianship") ok = await dataService.saveLegalGuardianship(guardDraft);
      if (section === "poa")          ok = await dataService.saveLegalPoa(poaDraft);
      if (ok) {
        void dataService.markSectionComplete("legal");
        qc.invalidateQueries({ queryKey: [`legal-${section}`] });
        toast.success("Saved");
      } else {
        toast.error("Could not save. Please try again.");
      }
    } finally { setSaving(null); }
  }

  const sections: { key: SectionKey; icon: typeof FileText; title: string; badge: string }[] = [
    { key: "will",         icon: FileText, title: "Will and Executor",     badge: willDraft.willStatus },
    { key: "trust",        icon: Landmark, title: "Special Needs Trust",   badge: trustDraft.trustStatus },
    { key: "guardianship", icon: Scale,    title: "Legal Guardianship",    badge: guardDraft.guardianshipStatus },
    { key: "poa",          icon: Shield,   title: "Power of Attorney",     badge: poaDraft.hasPoa ? "In Place" : "Not Set" },
  ];

  return (
    <div className="space-y-4 max-w-4xl">
      <ChapterBanner chapterKey="legal" />
      <SPDINotice section="legal" />
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Scale className="h-6 w-6 text-primary" /> Legal Planning and Asset Protection
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Indian Succession Act � Guardians and Wards Act 1890 � RPWD Act 2016
        </p>
      </div>

      {sections.map(({ key, icon: Icon, title, badge }) => (
        <div key={key} className="legacy-card overflow-hidden">
          <button
            onClick={() => setOpen(o => o === key ? null : key)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-low transition-colors"
          >
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5 text-primary shrink-0" />
              <span className="font-semibold text-foreground">{title}</span>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_COLOR[badge] ?? "bg-surface-low text-muted-foreground"}`}>
                {badge}
              </span>
            </div>
            {open === key ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          {open === key && (
            <div className="border-t border-border px-5 py-5 space-y-4">

              {key === "will" && (
                <>
                  <div className={G2}>
                    <div>
                      <label className={LABEL}>Will Status</label>
                      <select className={INPUT} value={willDraft.willStatus}
                        onChange={e => setWillDraft(d => ({ ...d, willStatus: e.target.value as LegalWill["willStatus"] }))}>
                        {["Not Started","Drafted","Registered","Needs Update"].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={LABEL}>Last Updated Date</label>
                      <input type="date" className={INPUT} value={willDraft.lastUpdatedDate ?? ""}
                        onChange={e => setWillDraft(d => ({ ...d, lastUpdatedDate: e.target.value }))} />
                    </div>
                  </div>
                  <fieldset className="rounded-lg border border-border p-4 space-y-3">
                    <legend className="text-xs font-bold uppercase tracking-widest text-primary px-1">Primary Executor</legend>
                    <div className={G3}>
                      <div><label className={LABEL}>Name</label>
                        <input className={INPUT} value={willDraft.primaryExecutorName ?? ""} placeholder="Full name"
                          onChange={e => setWillDraft(d => ({ ...d, primaryExecutorName: e.target.value }))} /></div>
                      <div><label className={LABEL}>Phone</label>
                        <input className={INPUT} value={willDraft.primaryExecutorPhone ?? ""} placeholder="+91 XXXXX XXXXX"
                          onChange={e => setWillDraft(d => ({ ...d, primaryExecutorPhone: e.target.value }))} /></div>
                      <div><label className={LABEL}>Email</label>
                        <input className={INPUT} value={willDraft.primaryExecutorEmail ?? ""} placeholder="email@example.com"
                          onChange={e => setWillDraft(d => ({ ...d, primaryExecutorEmail: e.target.value }))} /></div>
                    </div>
                  </fieldset>
                  <fieldset className="rounded-lg border border-border p-4 space-y-3">
                    <legend className="text-xs font-bold uppercase tracking-widest text-primary px-1">Alternate Executor</legend>
                    <div className={G3}>
                      <div><label className={LABEL}>Name</label>
                        <input className={INPUT} value={willDraft.alternateExecutorName ?? ""} placeholder="Full name"
                          onChange={e => setWillDraft(d => ({ ...d, alternateExecutorName: e.target.value }))} /></div>
                      <div><label className={LABEL}>Phone</label>
                        <input className={INPUT} value={willDraft.alternateExecutorPhone ?? ""} placeholder="+91 XXXXX XXXXX"
                          onChange={e => setWillDraft(d => ({ ...d, alternateExecutorPhone: e.target.value }))} /></div>
                      <div><label className={LABEL}>Email</label>
                        <input className={INPUT} value={willDraft.alternateExecutorEmail ?? ""} placeholder="email@example.com"
                          onChange={e => setWillDraft(d => ({ ...d, alternateExecutorEmail: e.target.value }))} /></div>
                    </div>
                  </fieldset>
                  <fieldset className="rounded-lg border border-border p-4 space-y-3">
                    <legend className="text-xs font-bold uppercase tracking-widest text-primary px-1">Legal Advisor</legend>
                    <div className={G3}>
                      <div><label className={LABEL}>Name</label>
                        <input className={INPUT} value={willDraft.lawyerName ?? ""} placeholder="Advocate name"
                          onChange={e => setWillDraft(d => ({ ...d, lawyerName: e.target.value }))} /></div>
                      <div><label className={LABEL}>Firm</label>
                        <input className={INPUT} value={willDraft.lawyerFirm ?? ""} placeholder="Law firm"
                          onChange={e => setWillDraft(d => ({ ...d, lawyerFirm: e.target.value }))} /></div>
                      <div><label className={LABEL}>Phone</label>
                        <input className={INPUT} value={willDraft.lawyerPhone ?? ""} placeholder="+91 XXXXX XXXXX"
                          onChange={e => setWillDraft(d => ({ ...d, lawyerPhone: e.target.value }))} /></div>
                    </div>
                  </fieldset>
                  <div><label className={LABEL}>Notes</label>
                    <textarea rows={2} className={`${INPUT} resize-none`} value={willDraft.notes ?? ""}
                      onChange={e => setWillDraft(d => ({ ...d, notes: e.target.value }))} /></div>
                </>
              )}

              {key === "trust" && (
                <>
                  <div className={G2}>
                    <div><label className={LABEL}>Trust Status</label>
                      <select className={INPUT} value={trustDraft.trustStatus}
                        onChange={e => setTrustDraft(d => ({ ...d, trustStatus: e.target.value as LegalTrust["trustStatus"] }))}>
                        {["Not Created","In Progress","Registered","Active"].map(s => <option key={s}>{s}</option>)}
                      </select></div>
                    <div><label className={LABEL}>Trust Type</label>
                      <select className={INPUT} value={trustDraft.trustType ?? ""}
                        onChange={e => setTrustDraft(d => ({ ...d, trustType: e.target.value as LegalTrust["trustType"] }))}>
                        <option value="">Select type</option>
                        {["Private SNT","Public / National Trust","Composite Trust","None"].map(s => <option key={s}>{s}</option>)}
                      </select></div>
                  </div>
                  <div className={G3}>
                    <div><label className={LABEL}>Trust Name</label>
                      <input className={INPUT} value={trustDraft.trustName ?? ""} placeholder="e.g. Sampurna Care Trust"
                        onChange={e => setTrustDraft(d => ({ ...d, trustName: e.target.value }))} /></div>
                    <div><label className={LABEL}>Registration Number</label>
                      <input className={INPUT} value={trustDraft.registrationNumber ?? ""}
                        onChange={e => setTrustDraft(d => ({ ...d, registrationNumber: e.target.value }))} /></div>
                    <div><label className={LABEL}>Registration Date</label>
                      <input type="date" className={INPUT} value={trustDraft.registrationDate ?? ""}
                        onChange={e => setTrustDraft(d => ({ ...d, registrationDate: e.target.value }))} /></div>
                  </div>
                  <div className={G2}>
                    <div><label className={LABEL}>Beneficiary Name</label>
                      <input className={INPUT} value={trustDraft.beneficiaryName ?? ""}
                        onChange={e => setTrustDraft(d => ({ ...d, beneficiaryName: e.target.value }))} /></div>
                    <div><label className={LABEL}>Trust PAN</label>
                      <input className={INPUT} value={trustDraft.panNumber ?? ""} placeholder="XXXXX0000X"
                        onChange={e => setTrustDraft(d => ({ ...d, panNumber: e.target.value }))} /></div>
                  </div>
                  <fieldset className="rounded-lg border border-border p-4 space-y-3">
                    <legend className="text-xs font-bold uppercase tracking-widest text-primary px-1">Trustees</legend>
                    {([
                      ["Managing Trustee",  "managingTrusteeName",  "managingTrusteePhone"],
                      ["Co-Trustee",        "coTrusteeName",        "coTrusteePhone"],
                      ["Successor Trustee", "successorTrusteeName", "successorTrusteePhone"],
                    ] as [string, keyof LegalTrust, keyof LegalTrust][]).map(([role, nameKey, phoneKey]) => (
                      <div key={role} className="grid grid-cols-3 gap-3">
                        <div className="text-xs font-semibold text-muted-foreground flex items-end pb-2">{role}</div>
                        <div><label className={LABEL}>Name</label>
                          <input className={INPUT} value={(trustDraft[nameKey] as string) ?? ""} placeholder="Full name"
                            onChange={e => setTrustDraft(d => ({ ...d, [nameKey]: e.target.value }))} /></div>
                        <div><label className={LABEL}>Phone</label>
                          <input className={INPUT} value={(trustDraft[phoneKey] as string) ?? ""} placeholder="+91"
                            onChange={e => setTrustDraft(d => ({ ...d, [phoneKey]: e.target.value }))} /></div>
                      </div>
                    ))}
                  </fieldset>
                  <div><label className={LABEL}>Notes</label>
                    <textarea rows={2} className={`${INPUT} resize-none`} value={trustDraft.notes ?? ""}
                      onChange={e => setTrustDraft(d => ({ ...d, notes: e.target.value }))} /></div>
                </>
              )}

              {key === "guardianship" && (
                <>
                  {childUnder18 ? (
                    /* Under 18 � show note, no form */
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-5">
                      <div className="flex items-start gap-3">
                        <BookOpen className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-amber-900">Not applicable yet</h4>
                          <p className="text-sm text-amber-800 mt-1">
                            Legal Guardianship under RPWD Act 2016 is applicable <strong>only after your child turns 18</strong>.{" "}
                            {childAge !== null && <span>{childName || "Your child"} is currently <strong>{childAge} years old</strong> � {yearsUntil18} year{yearsUntil18 !== 1 ? "s" : ""} to go.</span>}
                          </p>
                          <p className="text-sm text-amber-800 mt-2">
                            However, you should <strong>start planning now</strong>. Read the step-by-step guidance below so you are ready when the time comes.
                          </p>
                        </div>
                      </div>
                      {/* Guidance steps inline for under-18 */}
                      <div className="mt-4 grid sm:grid-cols-2 gap-3">
                        {([
                          ["01","Choose the right law","RPWD Act 2016 Section 14 (Limited or Plenary Guardianship) applies after age 18. Start researching now."],
                          ["02","Consult a disability lawyer","Contact National Trust (www.thenationaltrust.gov.in) or your District Legal Services Authority (DLSA) for referrals."],
                          ["03","Prepare documents","Gather: UDID card, birth certificate, medical certificate from govt doctor, your ID + address proof."],
                          ["04","File petition after 18","File in the District Court or designated authority under RPWD Act. Timeline: 3�6 months for an uncontested petition."],
                        ] as [string,string,string][]).map(([step,title,body])=>(
                          <div key={step} className="rounded-lg bg-white border border-amber-200 p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="h-6 w-6 rounded-full bg-amber-200 text-amber-800 text-xs font-bold flex items-center justify-center shrink-0">{step}</span>
                              <span className="font-semibold text-xs text-foreground">{title}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{body}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* 18+ � show form + guidance */
                    <>
                      <div className={G2}>
                        <div><label className={LABEL}>Guardianship Status</label>
                          <select className={INPUT} value={guardDraft.guardianshipStatus}
                            onChange={e => setGuardDraft(d => ({ ...d, guardianshipStatus: e.target.value as LegalGuardianship["guardianshipStatus"] }))}>
                            {["Not Initiated","In Progress","Court Order Obtained","Active"].map(s => <option key={s}>{s}</option>)}
                          </select></div>
                        <div><label className={LABEL}>Guardianship Type</label>
                          <select className={INPUT} value={guardDraft.guardianshipType ?? ""}
                            onChange={e => setGuardDraft(d => ({ ...d, guardianshipType: e.target.value as LegalGuardianship["guardianshipType"] }))}>
                            <option value="">Select</option>
                            {["RPWD Act 2016","Guardians and Wards Act 1890","National Trust Act","Other"].map(s => <option key={s}>{s}</option>)}
                          </select></div>
                      </div>
                      <div className={G3}>
                        <div><label className={LABEL}>Guardian Name</label>
                          <input className={INPUT} value={guardDraft.guardianName ?? ""}
                            onChange={e => setGuardDraft(d => ({ ...d, guardianName: e.target.value }))} /></div>
                        <div><label className={LABEL}>Phone</label>
                          <input className={INPUT} value={guardDraft.guardianPhone ?? ""}
                            onChange={e => setGuardDraft(d => ({ ...d, guardianPhone: e.target.value }))} /></div>
                        <div><label className={LABEL}>Relationship to Child</label>
                          <input className={INPUT} value={guardDraft.guardianRelationship ?? ""}
                            onChange={e => setGuardDraft(d => ({ ...d, guardianRelationship: e.target.value }))} /></div>
                      </div>
                      <div className={G3}>
                        <div><label className={LABEL}>Court Order Reference</label>
                          <input className={INPUT} value={guardDraft.courtOrderRef ?? ""}
                            onChange={e => setGuardDraft(d => ({ ...d, courtOrderRef: e.target.value }))} /></div>
                        <div><label className={LABEL}>Court Order Date</label>
                          <input type="date" className={INPUT} value={guardDraft.courtOrderDate ?? ""}
                            onChange={e => setGuardDraft(d => ({ ...d, courtOrderDate: e.target.value }))} /></div>
                        <div><label className={LABEL}>Appointing Court</label>
                          <input className={INPUT} value={guardDraft.appointingCourt ?? ""}
                            onChange={e => setGuardDraft(d => ({ ...d, appointingCourt: e.target.value }))} /></div>
                      </div>
                      <div className={G2}>
                        <div><label className={LABEL}>Next Renewal Date</label>
                          <input type="date" className={INPUT} value={guardDraft.nextRenewalDate ?? ""}
                            onChange={e => setGuardDraft(d => ({ ...d, nextRenewalDate: e.target.value }))} /></div>
                      </div>
                      <div><label className={LABEL}>Notes</label>
                        <textarea rows={2} className={`${INPUT} resize-none`} value={guardDraft.notes ?? ""}
                          onChange={e => setGuardDraft(d => ({ ...d, notes: e.target.value }))} /></div>

                      {/* Guidance shown inline when guardianship not yet obtained */}
                      {!["Court Order Obtained","Active"].includes(guardDraft.guardianshipStatus) && (
                        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-amber-700" />
                            <span className="font-semibold text-sm text-amber-900">How to obtain Legal Guardianship</span>
                          </div>
                          <div className="grid sm:grid-cols-2 gap-3">
                            {([
                              ["01","File under RPWD Act 2016","Section 14 allows 'Limited' or 'Plenary' guardianship. File a petition in the District Court."],
                              ["02","Documents needed","UDID card � Birth certificate � Medical certificate (govt doctor) � Proposed guardian's ID + address proof � Affidavit"],
                              ["03","Court process","The court conducts an inquiry. Uncontested petitions typically take 3�6 months. Engage a disability lawyer."],
                              ["04","After the order","Upload to Digital Vault � Update status to Active above � Record court order reference and renewal date"],
                            ] as [string,string,string][]).map(([step,title,body])=>(
                              <div key={step} className="rounded-lg bg-white border border-amber-200 p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="h-5 w-5 rounded-full bg-amber-200 text-amber-800 text-[10px] font-bold flex items-center justify-center shrink-0">{step}</span>
                                  <span className="font-semibold text-xs">{title}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">{body}</p>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-amber-700">Resources: <span className="font-medium">National Trust</span> (www.thenationaltrust.gov.in) � District Legal Services Authority (DLSA) � State Commissioner for Persons with Disabilities</p>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {key === "poa" && (
                <>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="h-4 w-4 accent-primary" checked={poaDraft.hasPoa}
                      onChange={e => setPoaDraft(d => ({ ...d, hasPoa: e.target.checked }))} />
                    <span className="text-sm font-medium">A Power of Attorney is in place</span>
                  </label>
                  {poaDraft.hasPoa && (
                    <>
                      <div className={G2}>
                        <div><label className={LABEL}>POA Holder Name</label>
                          <input className={INPUT} value={poaDraft.holderName ?? ""}
                            onChange={e => setPoaDraft(d => ({ ...d, holderName: e.target.value }))} /></div>
                        <div><label className={LABEL}>Phone</label>
                          <input className={INPUT} value={poaDraft.holderPhone ?? ""}
                            onChange={e => setPoaDraft(d => ({ ...d, holderPhone: e.target.value }))} /></div>
                      </div>
                      <div className={G3}>
                        <div><label className={LABEL}>Scope</label>
                          <select className={INPUT} value={poaDraft.poaScope ?? ""}
                            onChange={e => setPoaDraft(d => ({ ...d, poaScope: e.target.value as LegalPoa["poaScope"] }))}>
                            <option value="">Select</option>
                            {["Financial","Medical","General","Limited"].map(s => <option key={s}>{s}</option>)}
                          </select></div>
                        <div><label className={LABEL}>Execution Date</label>
                          <input type="date" className={INPUT} value={poaDraft.executionDate ?? ""}
                            onChange={e => setPoaDraft(d => ({ ...d, executionDate: e.target.value }))} /></div>
                        <div><label className={LABEL}>Expiry Date</label>
                          <input type="date" className={INPUT} value={poaDraft.expiryDate ?? ""}
                            onChange={e => setPoaDraft(d => ({ ...d, expiryDate: e.target.value }))} /></div>
                      </div>
                    </>
                  )}
                  <div><label className={LABEL}>Notes</label>
                    <textarea rows={2} className={`${INPUT} resize-none`} value={poaDraft.notes ?? ""}
                      onChange={e => setPoaDraft(d => ({ ...d, notes: e.target.value }))} /></div>
                </>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
                {/* Generate Draft button for Will, Trust, POA */}
                {key === "will" && (
                  <button onClick={() => generateDoc("will")} disabled={!!generating}
                    className="inline-flex items-center gap-2 rounded-lg border border-primary text-primary font-semibold px-4 py-2 text-sm hover:bg-primary/5 disabled:opacity-50 transition-colors">
                    {generating === "will" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Generate Draft Will (PDF)
                  </button>
                )}
                {key === "trust" && (
                  <button onClick={() => generateDoc("trust")} disabled={!!generating}
                    className="inline-flex items-center gap-2 rounded-lg border border-primary text-primary font-semibold px-4 py-2 text-sm hover:bg-primary/5 disabled:opacity-50 transition-colors">
                    {generating === "trust" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Generate Draft Trust Deed (PDF)
                  </button>
                )}
                {key === "poa" && poaDraft.hasPoa && (
                  <button onClick={() => generateDoc("poa")} disabled={!!generating}
                    className="inline-flex items-center gap-2 rounded-lg border border-primary text-primary font-semibold px-4 py-2 text-sm hover:bg-primary/5 disabled:opacity-50 transition-colors">
                    {generating === "poa" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Generate Draft POA (PDF)
                  </button>
                )}
                {!["will","trust","poa"].includes(key) && <span />}

                <button onClick={() => save(key)} disabled={saving === key}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground font-semibold px-5 py-2.5 hover:bg-primary/90 disabled:opacity-60 transition-colors">
                  {saving === key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Save {title}
                </button>
              </div>

              {/* Disclaimer under generate buttons */}
              {(key === "will" || key === "trust" || (key === "poa" && poaDraft.hasPoa)) && (
                <p className="text-xs text-muted-foreground italic">
                  ?? Generated documents are draft templates only. They are not legally binding without review, signing formalities, and registration by a qualified lawyer.
                </p>
              )}
            </div>
          )}
        </div>
      ))}

    </div>
  );
}
