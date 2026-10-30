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
