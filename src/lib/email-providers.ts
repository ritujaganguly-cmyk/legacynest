/**
 * Web-compose email helpers — shared by Break-Glass invites and the
 * Emergency Coordinator activation-code email.
 *
 * mailto: links only work if the OS has a desktop mail app registered as the
 * default handler. Most users compose mail in a browser tab (Gmail/Outlook/Yahoo),
 * so mailto: silently does nothing for them. Gmail/Outlook/Yahoo's web "compose"
 * URLs are real pages — they open reliably in a new tab, pre-filled, regardless
 * of OS mail-app configuration. mailto: is kept as a fallback for anyone who does
 * use a desktop client (Outlook desktop, Apple Mail, etc).
 */

export type EmailProvider = "gmail" | "outlook" | "yahoo" | "default";

export type EmailDraft = { to: string; subject: string; body: string };

export const EMAIL_PROVIDERS: { key: EmailProvider; label: string; opensNewTab: boolean }[] = [
  { key: "gmail",   label: "Gmail",           opensNewTab: true },
  { key: "outlook", label: "Outlook",          opensNewTab: true },
  { key: "yahoo",   label: "Yahoo Mail",        opensNewTab: true },
  { key: "default", label: "Default email app", opensNewTab: false },
];

export function buildEmailUrl(provider: EmailProvider, draft: EmailDraft): string {
  const to = encodeURIComponent(draft.to);
  const su = encodeURIComponent(draft.subject);
  const bo = encodeURIComponent(draft.body);
  switch (provider) {
    case "gmail":   return `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}&body=${bo}`;
    case "outlook": return `https://outlook.office.com/mail/deeplink/compose?to=${to}&subject=${su}&body=${bo}`;
    case "yahoo":   return `https://compose.mail.yahoo.com/?to=${to}&subject=${su}&body=${bo}`;
    case "default": return `mailto:${draft.to}?subject=${su}&body=${bo}`;
  }
}

/** Copies text to the clipboard with a fallback for non-secure/iframe contexts where
 *  the async Clipboard API silently throws. Always reports success or failure. */
export async function copyToClipboard(text: string): Promise<boolean> {
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

/** Opens the chosen provider's compose UI for the given draft. For web providers
 *  this opens reliably in a new tab; for "default" it falls back to mailto: and
 *  copies the link/body as a safety net since mailto: success can't be detected. */
export async function sendViaProvider(provider: EmailProvider, draft: EmailDraft, fallbackCopyText?: string): Promise<{ opened: boolean; copied: boolean }> {
  const providerInfo = EMAIL_PROVIDERS.find(p => p.key === provider)!;
  const url = buildEmailUrl(provider, draft);
  if (providerInfo.opensNewTab) {
    window.open(url, "_blank", "noopener,noreferrer");
    return { opened: true, copied: false };
  }
  const copied = fallbackCopyText ? await copyToClipboard(fallbackCopyText) : false;
  window.location.href = url;
  return { opened: true, copied };
}
