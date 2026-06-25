import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing Supabase environment variables. Create a .env.local file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY"
  );
}

// Single client — the ONLY GoTrueClient in the app.
// All auth, storage, and public schema queries go through this.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "legacynest.supabase.auth",
  },
});

// Protected schema client — SPDI data (medical, financial, legal, etc.)
//
// Uses supabase.schema('protected') which returns a PostgrestClient
// that shares the SAME headers object (and therefore the same auth
// token) as the parent supabase client. No second GoTrueClient is
// created — eliminating the "Multiple GoTrueClient instances" warning.
//
// Requires the 'protected' schema to be listed in:
//   Supabase Dashboard → Settings → API → Exposed schemas
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const pdb = (supabase as any).schema("protected");
