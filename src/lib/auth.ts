"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const LOCAL_SESSION = "subkiller-session";

function hasSupabaseSession(jar: Awaited<ReturnType<typeof cookies>>) {
  return jar.getAll().some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"));
}

export async function getSignedInUser() {
  const jar = await cookies();
  const local = jar.get(LOCAL_SESSION)?.value;
  if (local || hasSupabaseSession(jar)) return { id: local || "supabase" };
  return null;
}

/** Stand-in for supabase.auth.signInWithOAuth until the Google provider is wired. */
export async function enterSignedInShell() {
  const jar = await cookies();
  jar.set(LOCAL_SESSION, "signed-in", { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/confess");
}

/** Stand-in for supabase.auth.signOut. A Supabase auth cookie is left for the provider to clear. */
export async function leaveSignedInShell() {
  const jar = await cookies();
  jar.delete(LOCAL_SESSION);
  redirect("/");
}
