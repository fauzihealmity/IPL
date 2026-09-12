import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service-role client — full read/write access to Storage, bypasses
// Row Level Security. This must NEVER be imported into any file that
// could end up in a client bundle (the `server-only` import above
// makes that a build-time error, not just a convention). Only
// server-side code (Server Actions, Route Handlers, services) may
// import this module.
//
// Lazily instantiated (not created at module load) so that merely
// importing this file never throws just because env vars aren't set
// yet — the error only surfaces when a caller actually tries to touch
// storage, with a clear message pointing at .env.example.
let cachedClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to use file storage. " +
        "Check your .env against .env.example."
    );
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "uploads";
