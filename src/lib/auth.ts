import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in user, confirmed by Supabase. A cookie name is not a session:
 * `getUser()` checks the token, and a missing or rejected user blocks the receipt shell.
 */
export async function getSignedInUser() {
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
