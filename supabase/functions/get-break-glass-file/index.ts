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

    // 1. Resolve the invite token to a member (no auth — token IS the credential).
    const { data: member } = await admin
      .from("break_glass_members")
      .select("user_id, block, status")
      .eq("access_token", token)
      .maybeSingle();
    if (!member) throw new Error("Invalid or expired invite link.");
    if (member.status === "declined") throw new Error("This invite has been declined.");

    // 2. Only share documents while the emergency is actually active (break-glass).
    const { data: plan } = await adminProtected
      .from("emergency_plan")
      .select("activation_status, break_glass_files")
      .eq("user_id", member.user_id)
      .maybeSingle();
    if (!plan || plan.activation_status !== "Active") {
      throw new Error("Not available yet — documents unlock only during an active emergency.");
    }

    // 3. The doc must be explicitly enabled for this caregiver's block.
    const allowed: string[] = (plan.break_glass_files?.[member.block] ?? []) as string[];
    if (!allowed.includes(docId)) throw new Error("This document was not shared with your role.");

    // 4. Resolve the storage path and sign a short-lived URL.
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
