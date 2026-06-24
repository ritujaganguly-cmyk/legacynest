import { jsPDF } from "jspdf";
import { dataService, type EmergencyPlan, type EmergencyBrief } from "./data/mock";

const C = {
  primary: [224, 123, 42] as const,
  dark:    [30, 20, 10] as const,
  muted:   [110, 90, 70] as const,
  red:     [200, 40, 40] as const,
  white:   [255, 255, 255] as const,
  border:  [220, 200, 180] as const,
  soft:    [254, 244, 236] as const,
};
const PW = 210, M = 12, CW = 210 - M * 2;

function sani(t: string): string {
  return (t || "").replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/–/g, "-").replace(/—/g, "--").replace(/[^\x00-\xFF]/g, "");
}

export async function generateEmergencyCard(): Promise<void> {
  const [plan, brief] = await Promise.all([
    dataService.getEmergencyPlan(),
    dataService.getEmergencyBrief(),
  ]) as [EmergencyPlan | null, EmergencyBrief];

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = 0;

  // Red emergency band
  doc.setFillColor(...C.red);
  doc.rect(0, 0, PW, 22, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(...C.white);
  doc.text("EMERGENCY CARE CARD", M, 11);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text(sani(brief.childName), M, 18);
  doc.setFontSize(7.5);
  doc.text("CONFIDENTIAL - For designated caregivers only", PW - M, 18, { align: "right" });
  y = 28;

  const sectionBar = (title: string) => {
    doc.setFillColor(...C.soft); doc.rect(M, y, CW, 6.5, "F");
    doc.setFillColor(...C.primary); doc.rect(M, y, 2, 6.5, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...C.primary);
    doc.text(title, M + 5, y + 4.6);
    y += 9;
  };
  const line = (label: string, value: string) => {
    if (!value) return;
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...C.dark);
    doc.text(sani(label), M, y);
    doc.setFont("helvetica", "normal"); doc.setTextColor(...C.dark);
    const lines = doc.splitTextToSize(sani(value), CW - 38);
    doc.text(lines, M + 36, y);
    y += Math.max(5, lines.length * 4.6);
  };

  // FIRST CALL
  sectionBar("CALL FIRST - Emergency Coordinator");
  if (plan?.coordinatorName) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...C.red);
    doc.text(sani(plan.coordinatorName) + (plan.coordinatorPhone ? "   " + sani(plan.coordinatorPhone) : ""), M, y + 1);
    y += 6;
    if (plan.backupCoordinatorName) {
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...C.muted);
      doc.text("Backup: " + sani(plan.backupCoordinatorName) + (plan.backupCoordinatorPhone ? "  " + sani(plan.backupCoordinatorPhone) : ""), M, y);
      y += 5;
    }
  } else {
    doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(...C.muted);
    doc.text("No coordinator set", M, y); y += 5;
  }
  y += 2;

  // MEDICAL SNAPSHOT
  sectionBar("MEDICAL SNAPSHOT");
  line("Blood Group", brief.bloodGroup);
  line("Allergies", brief.allergies);
  line("Conditions", brief.emergencyMedicalInfo);
  y += 1;

  // MEDICATIONS
  sectionBar("CRITICAL MEDICATIONS");
  if (brief.medications.length) {
    brief.medications.forEach(m => {
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...C.dark);
      doc.text("- " + sani(`${m.name}  ${m.dose}  (${m.frequency})`), M + 2, y); y += 4.8;
    });
  } else { doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(...C.muted); doc.text("None recorded", M + 2, y); y += 5; }
  y += 1;

  // TRIGGERS + COMFORT
  sectionBar("KEEP CALM");
  line("Avoid (triggers)", brief.behavioralTriggers);
  line("Comfort", brief.comfortItems);
  y += 1;

  // TONIGHT
  sectionBar("WHERE THE CHILD SLEEPS TONIGHT");
  if (brief.tonightResidence) {
    const r = brief.tonightResidence;
    line("Residence", `${r.name} (${r.optionType})${r.city ? " - " + r.city : ""}`);
    if (r.caregiverName) line("Caregiver", `${r.caregiverName}${r.caregiverPhone ? "  " + r.caregiverPhone : ""}`);
    line("Ready", `Consent: ${r.hasConsent ? "Yes" : "NO"}   Keys: ${r.hasKeysAccess ? "Yes" : "NO"}`);
  } else { doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(...C.muted); doc.text("Not set - see Residential plan", M + 2, y); y += 5; }
  y += 1;

  // CONTACTS
  sectionBar("NOTIFICATION CHAIN");
  if (brief.emergencyContacts.length) {
    brief.emergencyContacts.forEach(c => {
      doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...C.dark);
      doc.text(sani(c.name), M + 2, y);
      doc.setFont("helvetica", "normal"); doc.setTextColor(...C.muted);
      doc.text(sani(`${c.role} - ${c.phone || c.email || "no contact"}`), M + 55, y);
      y += 4.8;
    });
  } else { doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(...C.muted); doc.text("Mark Care Circle members as emergency contacts", M + 2, y); y += 5; }
  y += 1;

  // DOCTORS
  if (brief.doctors.length) {
    sectionBar("DOCTORS");
    brief.doctors.forEach(d => {
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...C.dark);
      doc.text(sani(`- ${d.name} (${d.role}) ${d.phone}${d.facility ? " - " + d.facility : ""}`), M + 2, y); y += 4.8;
    });
  }

  // Footer
  doc.setDrawColor(...C.border); doc.setLineWidth(0.2);
  doc.line(M, 287, PW - M, 287);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...C.muted);
  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  doc.text(`LegacyNest Emergency Card - generated ${today}`, M, 291);
  doc.text("Keep this card accessible. Review every 6 months.", PW - M, 291, { align: "right" });

  doc.save(`Emergency_Card_${sani(brief.childName).replace(/\s+/g, "_")}.pdf`);
}
