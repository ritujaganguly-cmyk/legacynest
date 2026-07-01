import type { BreakGlassBlock } from "@/lib/data/mock";

export const BREAK_GLASS_BLOCK_LABEL: Record<BreakGlassBlock, string> = {
  daily_care: "Daily Care", medical: "Medical", financial: "Financial", legal: "Legal",
};

/** Builds the invite email (to/subject/body) + accept link for a break-glass caregiver.
 *  Shared by the Emergency page's break-glass blocks and the first-run onboarding wizard,
 *  so the invite a caregiver receives reads identically no matter where it was sent from. */
export function buildBreakGlassInviteText(
  member: { name: string; email: string; block: BreakGlassBlock; rank: "primary" | "backup"; accessToken?: string },
  inviterName: string,
  childName: string,
) {
  const link = `${window.location.origin}/accept/${member.accessToken}`;
  const who = inviterName || "A LegacyNest family";
  const label = BREAK_GLASS_BLOCK_LABEL[member.block];
  const subject = `${who} has asked you to help with ${childName}'s ${label} care`;
  const body =
    `Dear ${member.name ? member.name.split(" ")[0] : "there"},\n\n` +
    `${who} has named you as the ${member.rank === "backup" ? "backup" : "primary"} caregiver for ${childName}'s ${label} ` +
    `in their LegacyNest emergency plan.\n\n` +
    `Please review and respond using the link below:\n${link}\n\n` +
    `Thank you,\n${who}`;
  return { to: member.email, subject, body, link };
}
