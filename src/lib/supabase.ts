// Supabase client singleton.
// Reads env vars (Vite injects anything prefixed with VITE_ into the client bundle).
// The anon/publishable key is safe to ship publicly — Row-Level Security enforces
// per-user access on the database side.

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !key) {
  // eslint-disable-next-line no-console
  console.error(
    "Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local (local dev) and Netlify env (production).",
  );
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // required for magic-link auth callbacks
  },
});
