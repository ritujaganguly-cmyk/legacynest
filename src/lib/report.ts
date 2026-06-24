import { jsPDF } from "jspdf";
import { dataService } from "./data/mock";
import logoSrc from "../assets/LegacyNest_Logo.jpeg";

/* ── colour palette ── */
const C = {
  primary:    [224, 123,  42] as const,
  gold:       [212, 175,  55] as const,
  dark:       [ 30,  20,  10] as const,
  muted:      [110,  90,  70] as const,
  sectionBg:  [254, 248, 240] as const,
  rowAlt:     [250, 244, 236] as const,
  white:      [255, 255, 255] as const,
  border:     [220, 200, 180] as const,
  green:      [ 34, 139,  34] as const,
};

const PAGE_W = 210;
const PAGE_H = 297;
const M      = 14;           // margin
const CW     = PAGE_W - M*2; // content width
const LH     = 6.5;          // line height

/* ── helpers ── */

// jsPDF's built-in Helvetica only supports Latin-1 (U+0000–U+00FF).
// Characters outside that range (superscripts, curly quotes, em-dashes, etc.)
// cause the "every character followed by &" garbling bug.
// This function replaces common offenders with safe ASCII equivalents.
function sanitize(text: string): string {
  return text
    .replace(/¹/g, "1")   // ¹ superscript one
    .replace(/²/g, "2")   // ² superscript two
    .replace(/³/g, "3")   // ³ superscript three
    .replace(/[‘’]/g, "'")  // curly single quotes
    .replace(/[“”]/g, '"')  // curly double quotes
    .replace(/–/g, "-")   // en-dash
    .replace(/—/g, "--")  // em-dash
    .replace(/…/g, "...")  // ellipsis
    .replace(/ /g, " ")   // non-breaking space
    .replace(/[^\x00-\xFF]/g, ""); // drop anything else outside Latin-1
}

function rgb(doc: jsPDF, which: "text"|"fill"|"draw", c: readonly [number,number,number]) {
  if (which === "text")  doc.setTextColor(c[0], c[1], c[2]);
  if (which === "fill")  doc.setFillColor(c[0], c[1], c[2]);
  if (which === "draw")  doc.setDrawColor(c[0], c[1], c[2]);
}

function bold(doc: jsPDF, size: number)   { doc.setFont("helvetica", "bold");   doc.setFontSize(size); }
function normal(doc: jsPDF, size: number) { doc.setFont("helvetica", "normal"); doc.setFontSize(size); }
function italic(doc: jsPDF, size: number) { doc.setFont("helvetica", "italic"); doc.setFontSize(size); }

function pageHeader(doc: jsPDF, section: string, page: number) {
  rgb(doc, "fill", C.primary);
  doc.rect(0, 0, PAGE_W, 11, "F");
  bold(doc, 8);
  rgb(doc, "text", C.white);
  doc.text("LegacyNest  ·  Succession Planning Report", M, 7.5);
  normal(doc, 8);
  doc.text(section, PAGE_W - M, 7.5, { align: "right" });
  // footer line + confidential (page number stamped in post-processing)
  rgb(doc, "draw", C.border);
  doc.setLineWidth(0.2);
  doc.line(M, PAGE_H - 10, PAGE_W - M, PAGE_H - 10);
  normal(doc, 7.5);
  rgb(doc, "text", C.muted);
  doc.text("CONFIDENTIAL", PAGE_W - M, PAGE_H - 6, { align: "right" });
}

function sectionBar(doc: jsPDF, y: number, title: string): number {
  rgb(doc, "fill", C.sectionBg);
  doc.rect(M, y, CW, 7, "F");
  rgb(doc, "fill", C.primary);
  doc.rect(M, y, 2.5, 7, "F");
  bold(doc, 10);
  rgb(doc, "text", C.primary);
  doc.text(title, M + 6, y + 5);
  return y + 10;
}

function kv(doc: jsPDF, y: number, label: string, value: string | undefined | null, lw = 42): number {
  const val = sanitize(value?.trim() || "—");
  bold(doc, 8.5);
  rgb(doc, "text", C.dark);
  doc.text(label, M, y);
  normal(doc, 8.5);
  rgb(doc, "text", val === "—" ? C.muted : C.dark);
  const lines = doc.splitTextToSize(val, CW - lw);
  doc.text(lines, M + lw, y);
  return y + Math.max(LH, lines.length * LH);
}

function guard(doc: jsPDF, y: number, needed: number, section: string, pg: { n: number }): number {
  if (y + needed > PAGE_H - 14) {
    doc.addPage();
    pg.n++;
    pageHeader(doc, section, pg.n);
    return 16;
  }
  return y;
}

type Row = string[];
function table(doc: jsPDF, startY: number, headers: string[], rows: Row[], colW: number[], section: string, pg: { n: number }): number {
  let y = startY;
  const rowH = 7;
  // header row
  rgb(doc, "fill", C.primary);
  doc.rect(M, y, CW, rowH, "F");
  bold(doc, 8);
  rgb(doc, "text", C.white);
  let x = M + 2;
  headers.forEach((h, i) => { doc.text(h, x, y + 5); x += colW[i]; });
  y += rowH;

  rows.forEach((row, ri) => {
    y = guard(doc, y, rowH, section, pg);
    if (ri % 2 === 0) {
      rgb(doc, "fill", C.rowAlt);
      doc.rect(M, y, CW, rowH, "F");
    }
    normal(doc, 8);
    rgb(doc, "text", C.dark);
    x = M + 2;
    row.forEach((cell, i) => {
      const lines = doc.splitTextToSize(sanitize(cell || "—"), colW[i] - 3);
      doc.text(lines[0], x, y + 5);  // show first line only in table cells
      x += colW[i];
    });
    // border
    rgb(doc, "draw", C.border);
    doc.setLineWidth(0.1);
    doc.rect(M, y, CW, rowH, "S");
    y += rowH;
  });
  return y + 3;
}

function divider(doc: jsPDF, y: number): number {
  rgb(doc, "draw", C.border);
  doc.setLineWidth(0.2);
  doc.line(M, y, PAGE_W - M, y);
  return y + 4;
}

/* ══════════════════════════════════════════════════
   MAIN EXPORT
══════════════════════════════════════════════════ */
export async function generateSuccessionReport(): Promise<void> {
  /* 1. Fetch all data in parallel */
  const [
    child, parent, careMembers, plans, emergency,
    medications, contacts, records, disabilityDocs,
    insurance, assets, legalInfo, residential,
  ] = await Promise.all([
    dataService.getChildProfile(),
    dataService.getParentProfile(),
    dataService.listCareCircle(),
    dataService.listSuccessionPlans(),
    dataService.getEmergencyBrief(),
    dataService.listMedications(),
    dataService.listHealthContacts(),
    dataService.listMedicalRecords(),
    dataService.listDisabilityDocuments(),
    dataService.listInsurancePolicies(),
    dataService.listFinancialAssets(),
    dataService.getLegalInfo(),
    dataService.listResidential(),
  ]);

  const guardians = plans.length > 0
    ? await dataService.listSuccessionGuardians(plans[0].id)
    : [];

  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const childName = child?.name || "Your Child";
  const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0);
  const activeMedications = medications.filter(m =>
    !m.tillDate || new Date(m.tillDate) >= todayDate
  );

  /* 2. Load logo */
  const logoImg = new Image();
  logoImg.src = logoSrc;
  await new Promise<void>(resolve => { logoImg.onload = () => resolve(); logoImg.onerror = () => resolve(); });

  /* 3. Create PDF */
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pg = { n: 1 };
  const SEC = "Succession Planning Report"; // used in all page headers after cover

  /* ── COVER PAGE ── */
  // compact top band (40mm instead of 70mm)
  rgb(doc, "fill", C.primary);
  doc.rect(0, 0, PAGE_W, 40, "F");
  rgb(doc, "fill", C.gold);
  doc.rect(0, 38.5, PAGE_W, 1.5, "F");

  // logo
  try { doc.addImage(logoImg, "JPEG", M, 7, 20, 20); } catch (_) { /* skip if logo fails */ }

  bold(doc, 22);
  rgb(doc, "text", C.white);
  doc.text("LegacyNest", M + 24, 18);
  normal(doc, 9);
  rgb(doc, "text", [255, 220, 180]);
  doc.text("Legacy Secured  ·  Planning with Love, Protecting with Purpose", M + 24, 25);

  // title block — personalised
  bold(doc, 24);
  rgb(doc, "text", C.dark);
  doc.text(`${childName}'s`, M, 60);
  bold(doc, 20);
  rgb(doc, "text", C.primary);
  doc.text("Complete Care & Legacy Blueprint", M, 72);

  rgb(doc, "fill", C.gold);
  doc.rect(M, 76, CW, 1, "F");

  normal(doc, 10);
  rgb(doc, "text", C.muted);
  doc.text("A confidential guide for designated guardians, trustees, and", M, 84);
  doc.text(`care partners — to ensure ${childName} is loved and protected, always.`, M, 91);

  // info box
  rgb(doc, "fill", C.sectionBg);
  doc.rect(M, 104, CW, 42, "F");
  rgb(doc, "draw", C.border);
  doc.setLineWidth(0.3);
  doc.rect(M, 104, CW, 42, "S");

  bold(doc, 9);
  rgb(doc, "text", C.muted);
  doc.text("PREPARED FOR", M + 6, 113);
  bold(doc, 14);
  rgb(doc, "text", C.dark);
  doc.text(childName, M + 6, 122);
  if (child?.dateOfBirth) {
    normal(doc, 9);
    rgb(doc, "text", C.muted);
    doc.text(`Date of Birth: ${new Date(child.dateOfBirth).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`, M + 6, 129);
  }
  if (child?.disabilityType) {
    normal(doc, 9);
    rgb(doc, "text", C.muted);
    doc.text(`Disability: ${child.disabilityType}`, M + 6, 136);
  }

  bold(doc, 9);
  rgb(doc, "text", C.muted);
  doc.text("GENERATED ON", PAGE_W - M - 50, 113);
  normal(doc, 10);
  rgb(doc, "text", C.dark);
  doc.text(today, PAGE_W - M - 50, 122);

  // confidential notice — dynamic height so text never overflows
  const confBody = "This document contains sensitive personal and legal information. Share only with designated guardians, legal representatives, and trusted family members.";
  normal(doc, 8);
  const confLines = doc.splitTextToSize(confBody, CW - 10);
  const confH = 8 + confLines.length * LH + 4;
  rgb(doc, "fill", [255, 240, 230]);
  doc.rect(M, 158, CW, confH, "F");
  bold(doc, 9);
  rgb(doc, "text", C.primary);
  doc.text("CONFIDENTIAL", M + 4, 164);
  normal(doc, 8);
  rgb(doc, "text", C.muted);
  doc.text(confLines, M + 4, 164 + LH);

  // cover footer — page number stamped in post-processing
  rgb(doc, "draw", C.border);
  doc.setLineWidth(0.2);
  doc.line(M, PAGE_H - 10, PAGE_W - M, PAGE_H - 10);
  normal(doc, 7.5);
  rgb(doc, "text", C.muted);
  doc.text("CONFIDENTIAL", PAGE_W - M, PAGE_H - 6, { align: "right" });

  /* ── CONTENT PAGES (flow continuously) ── */
  doc.addPage(); pg.n++;
  pageHeader(doc, SEC, pg.n);
  let y = 16;

  y = sectionBar(doc, y, "Child Information");
  y = kv(doc, y, "Full Name", child?.name);
  y = kv(doc, y, "Date of Birth", child?.dateOfBirth ? new Date(child.dateOfBirth).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : null);
  y = kv(doc, y, "Blood Group", child?.bloodGroup);
  y = kv(doc, y, "Allergies", child?.allergies);
  y = kv(doc, y, "Current Medications", child?.currentMedications);
  y = kv(doc, y, "UDID Number", child?.udidNumber);
  y = kv(doc, y, "UDID Validity", child?.udidValidity);
  y += 2;

  y = sectionBar(doc, y, "Disability & Special Needs");
  y = kv(doc, y, "Disability Type", child?.disabilityType);
  y = kv(doc, y, "Disability %", child?.disabilityPercentage ? `${child.disabilityPercentage}%` : null);
  y = kv(doc, y, "Communication Style", child?.communicationStyle);
  y = kv(doc, y, "Behavioral Triggers", child?.behavioralTriggers);
  y = kv(doc, y, "Comfort Items", child?.comfortItems);
  y = kv(doc, y, "Dietary Requirements", child?.dietaryRequirements);
  y += 2;

  y = sectionBar(doc, y, "Education & Therapy");
  y = kv(doc, y, "Current School", child?.currentSchool);
  y = kv(doc, y, "Therapy Providers", child?.therapyProviders);
  y = kv(doc, y, "IEP Details", child?.iepDetails);
  y += 2;

  y = sectionBar(doc, y, "Emergency Medical Info");
  y = kv(doc, y, "Emergency Info", child?.emergencyMedicalInfo);

  y = guard(doc, y + 5, 35, SEC, pg);
  y = sectionBar(doc, y, "Primary Parent / Guardian");
  if (parent) {
    y = kv(doc, y, "Full Name", (parent as Record<string, string>).name || (parent as Record<string, string>).fullName);
    y = kv(doc, y, "Email", (parent as Record<string, string>).email);
    y = kv(doc, y, "Phone", (parent as Record<string, string>).phone);
    y = kv(doc, y, "Address", (parent as Record<string, string>).address);
    y = kv(doc, y, "Occupation", (parent as Record<string, string>).occupation);
    y = kv(doc, y, "PAN Number", (parent as Record<string, string>).panNumber);
    y = kv(doc, y, "Aadhaar Number", (parent as Record<string, string>).aadhaarNumber);
  } else {
    italic(doc, 9); rgb(doc, "text", C.muted);
    doc.text("Parent profile not yet completed.", M, y); y += LH;
  }

  y = guard(doc, y + 5, 35, SEC, pg);
  y = sectionBar(doc, y, `Care Circle Members (${careMembers.length})`);

  if (careMembers.length > 0) {
    y = table(
      doc, y,
      ["Name", "Role", "Relation", "Responsibilities", "Contact"],
      careMembers.map(m => [
        m.name,
        m.role,
        m.relation,
        (m.responsibilities ?? []).join(", ") || "—",
        m.phone || m.email || "—",
      ]),
      [38, 38, 28, 52, 24],
      SEC, pg
    );
  } else {
    italic(doc, 9); rgb(doc, "text", C.muted);
    doc.text("No Care Circle members added yet.", M, y); y += LH;
  }

  y = guard(doc, y, 20, SEC, pg);
  y += 4;
  y = sectionBar(doc, y, "Care Notes");
  careMembers.filter(m => m.notes).forEach(m => {
    y = guard(doc, y, 14, SEC, pg);
    bold(doc, 8.5); rgb(doc, "text", C.dark);
    doc.text(m.name, M, y); y += LH - 1;
    normal(doc, 8); rgb(doc, "text", C.muted);
    const lines = doc.splitTextToSize(m.notes!, CW - 4);
    doc.text(lines, M + 3, y);
    y += lines.length * LH + 2;
  });
  if (!careMembers.some(m => m.notes)) {
    italic(doc, 9); rgb(doc, "text", C.muted);
    doc.text("No care notes recorded.", M, y); y += LH;
  }

  y = guard(doc, y + 5, 35, SEC, pg);
  y = sectionBar(doc, y, `Succession Guardians (${guardians.length})`);

  if (guardians.length > 0) {
    y = table(
      doc, y,
      ["Name", "Role", "Relationship", "Responsibilities", "Phone"],
      guardians.map(g => [
        g.name,
        g.role,
        g.relationship || "—",
        (g.responsibilities ?? []).join(", ") || "—",
        g.phone || "—",
      ]),
      [35, 42, 25, 55, 23],
      SEC, pg
    );
  } else {
    italic(doc, 9); rgb(doc, "text", C.muted);
    doc.text("No succession guardians designated yet.", M, y); y += LH;
  }

  y = guard(doc, y + 5, 35, SEC, pg);
  y = sectionBar(doc, y, `Current Medications (${activeMedications.length})`);
  if (activeMedications.length > 0) {
    y = table(
      doc, y,
      ["Medication", "Dose", "Frequency", "Till Date"],
      activeMedications.map(m => [
        m.name,
        m.dose || "—",
        m.frequency || "—",
        m.tillDate || "Ongoing",
      ]),
      [50, 38, 42, 40],
      SEC, pg
    );
  } else {
    italic(doc, 9); rgb(doc, "text", C.muted);
    doc.text("No active medications.", M, y); y += LH;
  }

  y = guard(doc, y + 3, 25, SEC, pg);
  y = sectionBar(doc, y, `Health Contacts (${contacts.length})`);
  if (contacts.length > 0) {
    y = table(
      doc, y,
      ["Name", "Role", "Facility", "Phone"],
      contacts.map(c => [c.name, c.role || "—", c.facility || "—", c.phone || "—"]),
      [40, 40, 60, 40],
      SEC, pg
    );
  } else {
    italic(doc, 9); rgb(doc, "text", C.muted);
    doc.text("No health contacts recorded.", M, y); y += LH;
  }

  y = guard(doc, y + 5, 35, SEC, pg);
  y = sectionBar(doc, y, `Financial Assets (${assets.length})`);
  if (assets.length > 0) {
    y = table(
      doc, y,
      ["Asset Name", "Type", "Value", "Nominee", "Notes"],
      assets.map(a => [
        a.assetName || "—",
        a.assetType || "—",
        a.currentValue != null ? `₹${a.currentValue.toLocaleString("en-IN")}` : "—",
        a.nomineeName || "—",
        a.notes || "—",
      ]),
      [40, 30, 35, 35, 40],
      SEC, pg
    );
  } else {
    italic(doc, 9); rgb(doc, "text", C.muted);
    doc.text("No financial assets recorded.", M, y); y += LH;
  }

  y = guard(doc, y + 3, 25, SEC, pg);
  y = sectionBar(doc, y, `Insurance Policies (${insurance.length})`);
  if (insurance.length > 0) {
    y = table(
      doc, y,
      ["Type", "Provider", "Policy No.", "Coverage", "Nominee"],
      insurance.map(p => [
        p.policyType || "—",
        p.providerName || "—",
        p.policyNumber || "—",
        p.coverageAmount != null ? `₹${p.coverageAmount.toLocaleString("en-IN")}` : "—",
        p.nomineeName || "—",
      ]),
      [40, 35, 35, 32, 38],
      SEC, pg
    );
  } else {
    italic(doc, 9); rgb(doc, "text", C.muted);
    doc.text("No insurance policies recorded.", M, y); y += LH;
  }

  y = guard(doc, y + 5, 35, SEC, pg);
  y = sectionBar(doc, y, "Legal Information");
  if (legalInfo) {
    const li = legalInfo as Record<string, string>;
    y = kv(doc, y, "Will Status", li.willStatus);
    y = kv(doc, y, "Trust Name", li.trustName || li.specialNeedsTrustName);
    y = kv(doc, y, "Trust Status", li.trustStatus);
    y = kv(doc, y, "Trustee", li.trusteeName || li.trustee);
    y = kv(doc, y, "Power of Attorney", li.powerOfAttorney);
    y = kv(doc, y, "Legal Notes", li.notes || li.legalNotes);
  } else {
    italic(doc, 9); rgb(doc, "text", C.muted);
    doc.text("Legal information not yet completed.", M, y); y += LH;
  }

  y = guard(doc, y + 3, 25, SEC, pg);
  y = sectionBar(doc, y, `Residential Properties (${residential.length})`);
  if (residential.length > 0) {
    residential.forEach(p => {
      y = guard(doc, y, 20, SEC, pg);
      y = kv(doc, y, "Property", p.name);
      y = kv(doc, y, "Address", p.address);
      y = kv(doc, y, "Legal Status", p.legalStatus);
      y = kv(doc, y, "Strategy", p.propertyStrategy || "Not set");
      y = kv(doc, y, "Accessibility", p.accessibility);
      y = divider(doc, y);
    });
  } else {
    italic(doc, 9); rgb(doc, "text", C.muted);
    doc.text("No residential properties recorded.", M, y); y += LH;
  }

  y = guard(doc, y + 5, 35, SEC, pg);
  y = sectionBar(doc, y, "Emergency Contacts");
  const emergencyContacts = careMembers.filter(m => m.isEmergencyContact);
  if (emergencyContacts.length > 0) {
    emergencyContacts.forEach(ec => {
      y = guard(doc, y, 16, SEC, pg);
      bold(doc, 10); rgb(doc, "text", C.primary);
      doc.text(`${ec.name}  ·  ${ec.role}`, M, y); y += LH;
      normal(doc, 8.5); rgb(doc, "text", C.dark);
      if (ec.phone) doc.text(`Phone: ${ec.phone}`, M + 3, y);
      if (ec.email) doc.text(`  Email: ${ec.email}`, M + 50, y);
      y += LH;
      y = divider(doc, y);
    });
  } else {
    italic(doc, 9); rgb(doc, "text", C.muted);
    doc.text("No emergency contacts designated.", M, y); y += LH;
  }

  if (emergency) {
    y += 2;
    y = sectionBar(doc, y, "Medical Emergency Info");
    if (emergency.medications?.length > 0) {
      bold(doc, 9); rgb(doc, "text", C.dark);
      doc.text("Critical Medications:", M, y); y += LH;
      emergency.medications.forEach((m) => {
        normal(doc, 8.5); rgb(doc, "text", C.dark);
        doc.text(`• ${m.name}  ${m.dose}  —  ${m.frequency}`, M + 4, y); y += LH;
      });
    }
    if (emergency.behavioralTriggers) {
      y += 2;
      bold(doc, 9); rgb(doc, "text", C.dark);
      doc.text("Sensory Triggers to Avoid:", M, y); y += LH;
      normal(doc, 8.5); rgb(doc, "text", C.muted);
      const tLines = doc.splitTextToSize(emergency.behavioralTriggers, CW - 8);
      doc.text(tLines, M + 4, y); y += tLines.length * LH;
    }
    if (emergency.comfortItems) {
      y += 2;
      bold(doc, 9); rgb(doc, "text", C.dark);
      doc.text("Comfort Routines:", M, y); y += LH;
      normal(doc, 8.5); rgb(doc, "text", C.muted);
      const cLines = doc.splitTextToSize(emergency.comfortItems, CW - 8);
      doc.text(cLines, M + 4, y); y += cLines.length * LH;
    }
  }

  /* ── PARENTAL GUIDE (flows on same pages) ── */
  y = guard(doc, y + 5, 35, SEC, pg);

  // Intro
  italic(doc, 9);
  rgb(doc, "text", C.muted);
  const guideIntro = `This guide is for parents of ${childName} and for designated guardians. It outlines what needs to be done now, what to review regularly, and how to step into care when the time comes.`;
  const introLines = doc.splitTextToSize(guideIntro, CW);
  doc.text(introLines, M, y); y += introLines.length * LH + 5;

  // helper — draw filled square bullet
  function bullet(bx: number, by: number, filled: boolean) {
    rgb(doc, filled ? "fill" : "draw", C.primary);
    doc.setLineWidth(0.3);
    filled ? doc.rect(bx, by - 2.8, 2.8, 2.8, "F") : doc.rect(bx, by - 2.8, 2.8, 2.8, "S");
  }

  // ── Section 1: Do This Now ─────────────────────────────────
  y = guard(doc, y, 40, SEC, pg);
  y = sectionBar(doc, y, "Do This Now  -  Immediate Actions for Parents");
  const doNow: [string, string][] = [
    ["Register UDID", "Ensure your child's Unique Disability ID is registered and valid. Carry a copy in the emergency kit."],
    ["Share this document", "Give a copy to your designated Primary Guardian. Walk them through the Care Circle and Medical sections."],
    ["Open a Special Needs Trust", "Consult a lawyer to register a Special Needs Trust so assets do not disqualify the child from government schemes."],
    ["Secure digital copies", "Upload this PDF and all key documents (Will, UDID, medical records) to the Digital Vault."],
    ["Verify nominations", "Ensure all financial accounts, insurance policies, and provident fund nominations are updated to the Trust or guardian."],
    ["Inform your employer", "Update your company's emergency contact and group insurance beneficiary to the designated guardian."],
  ];
  doNow.forEach(([title, desc]) => {
    normal(doc, 8); // measure desc height first
    const dLines = doc.splitTextToSize(desc, CW - 8);
    const blockH = LH + dLines.length * LH + 3;
    y = guard(doc, y, blockH, SEC, pg);
    bullet(M, y, true);
    bold(doc, 8.5); rgb(doc, "text", C.primary);
    doc.text(title, M + 5, y);
    y += LH - 1;
    normal(doc, 8); rgb(doc, "text", C.muted);
    doc.text(dLines, M + 5, y);
    y += dLines.length * LH + 2.5;
  });

  y += 2;
  // ── Section 2: Annual Review ───────────────────────────────
  y = guard(doc, y, 40, SEC, pg);
  y = sectionBar(doc, y, "Review Every Year  -  Annual Checklist");
  const annual = [
    "Update the medication list and share with all caregivers",
    "Review insurance policy expiry dates and sum assured adequacy",
    "Check corpus fund progress and whether it is on track to meet the target",
    "Confirm all guardians are still willing and reachable",
    "Re-read Care Circle notes and update care approach if needed",
    "Review government scheme enrollments for any new benefits available",
    "Update the Digital Vault with new documents such as assessments, IEP, and therapy reports",
    "Revisit residential options - waitlists, availability, new facilities",
  ];
  annual.forEach(item => {
    const iLines = doc.splitTextToSize(item, CW - 8);
    y = guard(doc, y, iLines.length * LH + 2, SEC, pg);
    bullet(M, y, false);
    normal(doc, 8.5); rgb(doc, "text", C.dark);
    doc.text(iLines, M + 5, y);
    y += iLines.length * LH + 1.5;
  });

  y += 2;
  // ── Section 3: For the Guardian ───────────────────────────
  y = guard(doc, y, 40, SEC, pg);
  y = sectionBar(doc, y, "For the Designated Guardian  -  When the Time Comes");
  const guardianSteps: [string, string][] = [
    ["Step 1 - Contact the Trustee", "Reach out to the designated legal trustee immediately. Refer to the Legal section of this document for details."],
    ["Step 2 - Access the Digital Vault", "All critical documents are stored in the LegacyNest Digital Vault. Login credentials are with the primary trustee."],
    ["Step 3 - Connect with the Medical Team", "Reach out to the health contacts listed in the Medical section. Maintain all existing treatment schedules."],
    ["Step 4 - Maintain School and Therapy", `Do not disrupt ${childName}'s school and therapy schedule. Consistency is critical for children with special needs.`],
    ["Step 5 - Follow the Daily Routine", `Refer to the Care Circle notes for how ${childName} communicates, what triggers to avoid, and what brings comfort.`],
    ["Step 6 - Activate Residential Plan", `If ${childName} needs residential care, refer to the Residential Planning section for shortlisted options and strategies.`],
  ];
  guardianSteps.forEach(([title, desc]) => {
    normal(doc, 8);
    const gLines = doc.splitTextToSize(desc, CW - 8);
    const blockH = LH + gLines.length * LH + 3;
    y = guard(doc, y, blockH, SEC, pg);
    bullet(M, y, true);
    bold(doc, 8.5); rgb(doc, "text", C.dark);
    doc.text(title, M + 5, y);
    y += LH - 1;
    normal(doc, 8); rgb(doc, "text", C.muted);
    doc.text(gLines, M + 5, y);
    y += gLines.length * LH + 2.5;
  });

  y += 2;
  // ── Section 4: Communicating with Child ───────────────────
  y = guard(doc, y, 30, SEC, pg);
  y = sectionBar(doc, y, `Communicating with ${childName}  -  What Every Caregiver Must Know`);
  if (child?.communicationStyle) {
    const cLines = doc.splitTextToSize(child.communicationStyle, CW - 8);
    y = guard(doc, y, LH + cLines.length * LH + 3, SEC, pg);
    bold(doc, 8.5); rgb(doc, "text", C.dark);
    doc.text("Communication Style:", M, y); y += LH;
    normal(doc, 8); rgb(doc, "text", C.muted);
    doc.text(cLines, M + 5, y); y += cLines.length * LH + 2;
  }
  if (child?.behavioralTriggers) {
    const tLines = doc.splitTextToSize(child.behavioralTriggers, CW - 8);
    y = guard(doc, y, LH + tLines.length * LH + 3, SEC, pg);
    bold(doc, 8.5); rgb(doc, "text", C.dark);
    doc.text("Triggers to Avoid:", M, y); y += LH;
    normal(doc, 8); rgb(doc, "text", C.muted);
    doc.text(tLines, M + 5, y); y += tLines.length * LH + 2;
  }
  if (child?.comfortItems) {
    const coLines = doc.splitTextToSize(child.comfortItems, CW - 8);
    y = guard(doc, y, LH + coLines.length * LH + 3, SEC, pg);
    bold(doc, 8.5); rgb(doc, "text", C.dark);
    doc.text("What Brings Comfort:", M, y); y += LH;
    normal(doc, 8); rgb(doc, "text", C.muted);
    doc.text(coLines, M + 5, y); y += coLines.length * LH + 2;
  }
  if (!child?.communicationStyle && !child?.behavioralTriggers && !child?.comfortItems) {
    italic(doc, 9); rgb(doc, "text", C.muted);
    doc.text("Complete the Child Profile to add communication and behavioral guidance.", M, y); y += LH;
  }

  /* ── CLOSING PAGE ── */
  doc.addPage(); pg.n++;
  pageHeader(doc, "Closing", pg.n);
  y = 40;

  rgb(doc, "fill", C.primary);
  doc.rect(M, y, CW, 50, "F");
  bold(doc, 18);
  rgb(doc, "text", C.white);
  doc.text("Planning with Love,", PAGE_W / 2, y + 18, { align: "center" });
  doc.text("Protecting with Purpose.", PAGE_W / 2, y + 30, { align: "center" });
  normal(doc, 10);
  rgb(doc, "text", [255, 220, 180]);
  doc.text(`Every step taken for ${childName} matters.`, PAGE_W / 2, y + 42, { align: "center" });

  y += 68;
  italic(doc, 9);
  rgb(doc, "text", C.muted);
  const closing = [
    "This document is a living record. Please review and update it annually or whenever",
    "significant life changes occur — change of guardians, financial updates, or medical changes.",
    "",
    `Generated by LegacyNest on ${today}.`,
    "Keep this document securely stored and share only with designated individuals.",
  ];
  closing.forEach(line => { doc.text(line, PAGE_W / 2, y, { align: "center" }); y += LH; });

  // Legal disclaimer box at bottom of closing page
  y = PAGE_H - 58;
  rgb(doc, "fill", [248, 244, 238]);
  doc.rect(M, y, CW, 42, "F");
  rgb(doc, "draw", C.border);
  doc.setLineWidth(0.3);
  doc.rect(M, y, CW, 42, "S");
  bold(doc, 8);
  rgb(doc, "text", C.dark);
  doc.text("LEGAL DISCLAIMER", M + 4, y + 7);
  normal(doc, 7.5);
  rgb(doc, "text", C.muted);
  const disclaimer = [
    "1. FOR PLANNING PURPOSES ONLY: This report is a personal planning document created to assist families in",
    "   organising care and succession information. It does not constitute a legal document of any kind.",
    "2. NOT A LEGAL INSTRUMENT: This report cannot be produced, submitted, or relied upon as a will, trust deed,",
    "   power of attorney, guardianship order, or any other legally binding instrument in any court or authority.",
    "3. SEEK PROFESSIONAL ADVICE: All legal, financial, and medical matters referenced in this report should be",
    "   formally executed with the assistance of qualified legal, financial, and medical professionals.",
    "4. NO LIABILITY: LegacyNest and its operators assume no liability for decisions made based on this document.",
    "   Information herein must be independently verified and kept current by the family.",
  ];
  disclaimer.forEach((line, i) => { doc.text(line, M + 4, y + 13 + i * 4); });

  /* 3. Stamp "Page X of Y" on every page */
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    // white rectangle to cover any previously drawn page number area
    rgb(doc, "fill", C.white);
    doc.rect(M, PAGE_H - 9, CW - 30, 7, "F");
    normal(doc, 7.5);
    rgb(doc, "text", C.muted);
    doc.text(`Page ${i} of ${totalPages}`, PAGE_W / 2, PAGE_H - 6, { align: "center" });
  }

  /* 4. Download */
  const filename = `LegacyNest_CareLegacyBlueprint_${childName.replace(/\s+/g, "_")}_${new Date().getFullYear()}.pdf`;
  doc.save(filename);
}
