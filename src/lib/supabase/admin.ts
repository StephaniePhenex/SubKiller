import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getSupabaseEnv, getSupabaseSecretKey } from "./env";

/**
 * Supabase client with the secret key. It bypasses row-level security, so it is
 * used for one write only: recording the AI verdict (`recordVerdict`), after the
 * server has confirmed the signed-in owner of the row.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("The Supabase admin client is server-only and must never run in a browser.");
  }
  const { url } = getSupabaseEnv();
  return createClient<Database>(url, getSupabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
