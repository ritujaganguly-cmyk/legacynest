import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing Supabase environment variables. Create a .env.local file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY"
  );
}

// Base client — auth, storage, RPC, and public schema queries
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "legacynest.supabase.auth",
  },
});

// Protected schema client — SPDI data (medical, financial, legal, etc.)
// anon role has zero access; authenticated users see only their own rows via RLS
export const pdb = supabase.schema("protected");
