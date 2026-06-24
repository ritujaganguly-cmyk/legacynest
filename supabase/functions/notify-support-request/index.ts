import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface SupportRequest {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  category: string;
  query: string;
  status: string;
  created_at: string;
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: SupportRequest;
  schema: string;
}

serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json();

    // Only handle new support requests
    if (payload.type !== "INSERT" || payload.table !== "support_requests") {
      return new Response("ignored", { status: 200 });
    }

    const r = payload.record;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not set");

    const submittedAt = new Date(r.created_at).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    });

    // Email to LegacyNest team
    const teamEmail = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "LegacyNest Support <onboarding@resend.dev>",
        to: [Deno.env.get("NOTIFY_EMAIL") ?? "legacynest.co.in@gmail.com"],
        subject: `[${r.category}] New Support Request from ${r.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fdf6ee; padding: 0; border-radius: 12px; overflow: hidden;">
            <div style="background: #e07b2a; padding: 24px 32px;">
              <h1 style="color: white; margin: 0; font-size: 20px;">New Support Request</h1>
              <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0; font-size: 13px;">LegacyNest · ${submittedAt} IST</p>
            </div>
            <div style="padding: 28px 32px; background: white;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f0e8de; width: 120px; color: #888; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Category</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f0e8de; font-size: 14px; color: #1a1a1a; font-weight: 700;">${r.category}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f0e8de; color: #888; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Name</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f0e8de; font-size: 14px; color: #1a1a1a;">${r.name}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f0e8de; color: #888; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Email</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f0e8de; font-size: 14px;"><a href="mailto:${r.email}" style="color: #e07b2a;">${r.email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f0e8de; color: #888; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Phone</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f0e8de; font-size: 14px; color: #1a1a1a;">${r.phone ?? "—"}</td>
                </tr>
              </table>
              <div style="margin-top: 20px; background: #fdf6ee; border-left: 4px solid #e07b2a; border-radius: 4px; padding: 16px 20px;">
                <div style="font-size: 12px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Query</div>
                <p style="margin: 0; font-size: 14px; color: #1a1a1a; line-height: 1.6;">${r.query.replace(/\n/g, "<br>")}</p>
              </div>
              <div style="margin-top: 24px; text-align: center;">
                <a href="mailto:${r.email}?subject=Re: Your LegacyNest Support Request [${r.category}]&body=Dear ${r.name},%0A%0AThank you for reaching out to LegacyNest.%0A%0A"
                   style="display: inline-block; background: #e07b2a; color: white; text-decoration: none; font-weight: 700; padding: 12px 28px; border-radius: 8px; font-size: 14px;">
                  Reply to ${r.name.split(" ")[0]}
                </a>
              </div>
            </div>
            <div style="padding: 16px 32px; text-align: center; font-size: 12px; color: #aaa;">
              LegacyNest · Request ID: ${r.id}
            </div>
          </div>
        `,
      }),
    });

    if (!teamEmail.ok) {
      const err = await teamEmail.text();
      throw new Error(`Resend error: ${err}`);
    }

    // Auto-acknowledgement to the person who submitted
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "LegacyNest Support <onboarding@resend.dev>",
        to: [r.email],
        subject: "Your message is with us — LegacyNest",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #fdf6ee; border-radius: 12px; overflow: hidden;">
            <div style="background: #e07b2a; padding: 24px 32px;">
              <h1 style="color: white; margin: 0; font-size: 20px;">We hear you, and we care deeply. 🙏</h1>
            </div>
            <div style="padding: 28px 32px; background: white;">
              <p style="font-size: 15px; color: #1a1a1a; margin: 0 0 16px;">Dear <strong>${r.name.split(" ")[0]}</strong>,</p>
              <p style="font-size: 14px; color: #555; line-height: 1.8; margin: 0 0 16px;">
                Thank you for trusting LegacyNest with something so close to your heart. We understand your world — the hopes, the worries, and the love that drives every decision you make for your child.
              </p>
              <p style="font-size: 14px; color: #555; line-height: 1.8; margin: 0 0 16px;">
                Your <strong>${r.category}</strong> query is now with our team, and we will reach out to you personally and thoughtfully.
              </p>
              <div style="background: #fdf6ee; border-radius: 8px; padding: 14px 18px; margin: 0 0 20px; font-size: 13px; color: #888; line-height: 1.5;">
                <strong style="color: #555;">Your query:</strong><br>${r.query.replace(/\n/g, "<br>")}
              </div>
              <p style="font-size: 13px; color: #888; line-height: 1.8; margin: 0;">
                You can also reach us at
                <a href="mailto:legacynest.co.in@gmail.com" style="color: #e07b2a;">legacynest.co.in@gmail.com</a>
                or call <a href="tel:+917044063379" style="color: #e07b2a;">+91-70440 63379</a>.<br><br>
                Remember — <em>you are not walking this path alone.</em> 💛
              </p>
            </div>
            <div style="padding: 16px 32px; text-align: center; font-size: 12px; color: white; background: #e07b2a;">
              LegacyNest — Built with love for every family walking this path
            </div>
          </div>
        `,
      }),
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-support-request error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
