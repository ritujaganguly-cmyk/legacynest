import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing Supabase environment variables. Create a .env.local file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY"
  );
}

// Primary client — auth, storage, RPC, and public schema queries.
// This is the single source of truth for authentication.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "legacynest.supabase.auth",
  },
});

// Protected schema client — SPDI data (medical, financial, legal, etc.)
// Does NOT create a new GoTrueClient (persistSession: false, autoRefreshToken: false).
// Auth token is synced from the primary `supabase` client via onAuthStateChange.
// This avoids the "Multiple GoTrueClient instances" conflict.
export const pdb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  db: { schema: "protected" },
});

// Keep pdb's auth token in sync with the primary supabase client.
// This runs once on module load and stays active for the app lifetime.
supabase.auth.onAuthStateChange((_event, session) => {
  if (session) {
    pdb.auth.setSession(session);
  } else {
    pdb.auth.signOut();
  }
});

// Also sync the current session immediately (in case user is already logged in).
supabase.auth.getSession().then(({ data }) => {
  if (data.session) {
    pdb.auth.setSession(data.session);
  }
});
