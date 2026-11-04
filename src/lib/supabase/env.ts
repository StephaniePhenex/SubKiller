export type SupabaseEnv = {
  url: string;
  publishableKey: string;
};

/**
 * Reads the public Supabase settings. Each variable is read by its literal
 * name so Next.js can inline it into the browser bundle at build time.
 */
export function getSupabaseEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL. Add it to .env.local (see .env.example).");
  }
  if (!publishableKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Add it to .env.local (see .env.example).");
  }

  return { url, publishableKey };
}

/**
 * Server-only secret key for the trusted scoring write (Issue #9). It has no
 * NEXT_PUBLIC_ prefix, so Next.js never puts it in the browser bundle.
 */
export function getSupabaseSecretKey(): string {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing SUPABASE_SECRET_KEY. Add it to .env.local for server-side scoring (see .env.example).");
  }
  return key;
}
