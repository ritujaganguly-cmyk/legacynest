import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { token, docId } = await req.json();
    if (!token || !docId) throw new Error("Missing token or docId");

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);
    const adminProtected = createClient(url, serviceKey, { db: { schema: "protected" } });

    // 1. Single source of truth for readiness: the same RPC the accept page uses.
    //    Computes is_active + the per-block release policy (timer / manual review).
    const { data: invite, error: inviteErr } = await admin.rpc("get_break_glass_invite", { p_token: token });
    if (inviteErr || !invite) throw new Error("Invalid or expired invite link.");
    if (invite.status === "declined") throw new Error("This invite has been declined.");
    if (!invite.is_released) {
      throw new Error(
        invite.release_mode === "timer"
          ? "Not available yet — this unlocks automatically on its set timer."
          : "Not available yet — this is pending manual review.",
      );
    }
    const shared: { id: string }[] = invite.shared_files ?? [];
    if (!shared.some(f => f.id === docId)) throw new Error("This document was not shared with your role.");

    // 2. Resolve the member's user_id (public table — safe, token already validated above).
    const { data: member } = await admin
      .from("break_glass_members")
      .select("user_id")
      .eq("access_token", token)
      .maybeSingle();
    if (!member) throw new Error("Invalid or expired invite link.");

    // 3. Resolve the storage path and sign a short-lived URL.
    const { data: doc } = await adminProtected
      .from("digital_vault_documents")
      .select("storage_bucket_path, document_name")
      .eq("id", docId)
      .eq("user_id", member.user_id)
      .maybeSingle();
    if (!doc?.storage_bucket_path) throw new Error("Document not found.");

    const { data: signed, error: signErr } = await admin.storage
      .from("vault-documents")
      .createSignedUrl(doc.storage_bucket_path, 300);
    if (signErr || !signed) throw new Error(signErr?.message ?? "Could not generate a download link.");

    return new Response(JSON.stringify({ url: signed.signedUrl, name: doc.document_name }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("get-break-glass-file error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
