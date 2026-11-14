import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** How long the health probe waits for Postgres before calling it a timeout. */
export const DATABASE_CHECK_TIMEOUT_MS = 3000;

export type DatabaseFailure = "not_configured" | "unreachable" | "timeout" | "query_failed";

export type DatabaseCheck =
  | { status: "ok"; latencyMs: number }
  | { status: "error"; reason: DatabaseFailure };

export type HealthReport = {
  /** Overall service health: "ok" only when every check that ran passed. */
  status: "ok" | "unavailable";
  checks: {
    database: DatabaseCheck;
    /** This endpoint never looks at a session or the Supabase Auth service. */
    auth: { status: "not_checked" };
  };
  checkedAt: string;
};

function errorName(error: unknown): string | undefined {
  // By name, not instanceof: a DOMException can come from another realm.
  return typeof error === "object" && error !== null && "name" in error ? String(error.name) : undefined;
}

function isAbort(error: unknown): boolean {
  const name = errorName(error);
  return name === "AbortError" || name === "TimeoutError";
}

/**
 * Round-trips to Postgres through PostgREST as the anonymous role by calling
 * `public.db_health()`, a STABLE function that reads no table. It never uses a
 * user session or the secret key. Only a literal `true` from the database
 * counts as healthy; failure details stay in the server log.
 */
export async function checkDatabase(): Promise<DatabaseCheck> {
  // Read by literal name so Next.js can inline them, as in getSupabaseEnv().
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return { status: "error", reason: "not_configured" };

  const client = createClient<Database>(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const started = performance.now();
  try {
    // throwOnError(): an error response rejects as a PostgrestError, and a
    // network or abort error is rethrown as is, so the cases stay distinct.
    const { data } = await client
      .rpc("db_health")
      .abortSignal(AbortSignal.timeout(DATABASE_CHECK_TIMEOUT_MS))
      .throwOnError();
    if (data !== true) {
      console.error("Health check: db_health() did not return true");
      return { status: "error", reason: "query_failed" };
    }
    return { status: "ok", latencyMs: Math.round(performance.now() - started) };
  } catch (error) {
    if (isAbort(error)) return { status: "error", reason: "timeout" };
    if (errorName(error) === "PostgrestError") {
      console.error("Health check: database query failed", (error as { code?: string }).code);
      return { status: "error", reason: "query_failed" };
    }
    console.error("Health check: database unreachable", errorName(error) ?? typeof error);
    return { status: "error", reason: "unreachable" };
  }
}

export async function getHealthReport(): Promise<HealthReport> {
  const database = await checkDatabase();
  return {
    status: database.status === "ok" ? "ok" : "unavailable",
    checks: { database, auth: { status: "not_checked" } },
    checkedAt: new Date().toISOString(),
  };
}
