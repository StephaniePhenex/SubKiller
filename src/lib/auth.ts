import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/** Cypress-only stand-in. Production never treats this id as a real user. */
export const E2E_PLACEHOLDER_USER_ID = "e2e-user";

/** Cypress-only opt-out. Honored only while the E2E harness is on. */
const E2E_SIGNED_OUT_COOKIE = "subkiller-e2e-signed-out";

function e2eHarnessSession() {
  return process.env.NODE_ENV !== "production" && process.env.SUBKILLER_E2E_AUTH === "1";
}

async function e2eSignedOut(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(E2E_SIGNED_OUT_COOKIE)?.value === "1";
  } catch {
    return false;
  }
}

/**
 * The signed-in user, confirmed by Supabase. A cookie name is not a session:
 * `getUser()` checks the token, and a missing or rejected user blocks the receipt shell.
 * `SUBKILLER_E2E_AUTH=1` opens the shell only for the Cypress dev server.
 * `subkiller-e2e-signed-out=1` keeps that same server signed out.
 */
export async function getSignedInUser() {
  if (e2eHarnessSession()) {
    if (await e2eSignedOut()) return null;
    return { id: E2E_PLACEHOLDER_USER_ID };
  }

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
