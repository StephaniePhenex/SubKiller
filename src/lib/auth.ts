import { createClient } from "@/lib/supabase/server";

/** Cypress-only stand-in. Production never treats this id as a real user. */
export const E2E_PLACEHOLDER_USER_ID = "e2e-user";

function e2eHarnessSession() {
  return process.env.NODE_ENV !== "production" && process.env.SUBKILLER_E2E_AUTH === "1";
}

/**
 * The signed-in user, confirmed by Supabase. A cookie name is not a session:
 * `getUser()` checks the token, and a missing or rejected user blocks the receipt shell.
 * `SUBKILLER_E2E_AUTH=1` opens the shell only for the Cypress dev server.
 */
export async function getSignedInUser() {
  if (e2eHarnessSession()) return { id: E2E_PLACEHOLDER_USER_ID };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return { id: data.user.id };
  } catch {
    return null;
  }
}

/** The cookie stand-in is gone. Sign-in is Google OAuth only. */
export async function enterSignedInShell(): Promise<never> {
  throw new Error("Sign in with Google. A local session cookie is not a session.");
}
