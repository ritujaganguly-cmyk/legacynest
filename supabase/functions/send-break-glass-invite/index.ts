import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BLOCK_LABEL: Record<string, string> = {
  daily_care: "Daily Care",
  medical: "Medical",
  financial: "Financial",
  legal: "Legal",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { to, memberName, block, rank, acceptUrl, inviterName, childName } = await req.json();
    if (!to || !acceptUrl) throw new Error("Missing required fields (to, acceptUrl)");

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not set");

    const label = BLOCK_LABEL[block] ?? block;
    const child = childName || "a child";
    const inviter = inviterName || "A LegacyNest family";
    const greeting = memberName ? memberName.split(" ")[0] : "there";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "LegacyNest <onboarding@resend.dev>",
        to: [to],
        subject: `${inviter} has asked you to help with ${child}'s ${label} care`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #fdf6ee; border-radius: 12px; overflow: hidden;">
            <div style="background: #e07b2a; padding: 24px 32px;">
              <h1 style="color: white; margin: 0; font-size: 20px;">You've been named a trusted caregiver 💛</h1>
            </div>
            <div style="padding: 28px 32px; background: white;">
              <p style="font-size: 15px; color: #1a1a1a; margin: 0 0 16px;">Dear <strong>${greeting}</strong>,</p>
              <p style="font-size: 14px; color: #555; line-height: 1.8; margin: 0 0 16px;">
                <strong>${inviter}</strong> has named you as the <strong>${rank === "backup" ? "backup" : "primary"}</strong>
                caregiver for <strong>${child}'s ${label}</strong> in their LegacyNest emergency plan.
              </p>
              <p style="font-size: 14px; color: #555; line-height: 1.8; margin: 0 0 24px;">
                This means that, in an emergency, you may be relied upon to help with ${child}'s ${label.toLowerCase()} needs.
                Please confirm that you accept this responsibility.
              </p>
              <div style="text-align: center; margin: 0 0 8px;">
                <a href="${acceptUrl}"
                   style="display: inline-block; background: #e07b2a; color: white; text-decoration: none; font-weight: 700; padding: 13px 32px; border-radius: 8px; font-size: 15px;">
                  Review &amp; Respond
                </a>
              </div>
              <p style="font-size: 12px; color: #aaa; text-align: center; margin: 12px 0 0;">
                Or paste this link into your browser:<br>${acceptUrl}
              </p>
            </div>
            <div style="padding: 16px 32px; text-align: center; font-size: 12px; color: white; background: #e07b2a;">
              LegacyNest — Built with love for every family walking this path
            </div>
          </div>
        `,
      }),
    });

    if (!res.ok) throw new Error(`Resend error: ${await res.text()}`);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-break-glass-invite error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
