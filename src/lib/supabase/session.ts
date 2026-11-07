import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function publicEnv(): { url: string; publishableKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}

/** Supabase auth cookies are named `sb-<project>-auth-token`, including chunked `.0` names. */
function hasSessionCookie(request: NextRequest) {
  return request.cookies.getAll().some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token"));
}

/**
 * Refreshes a Supabase session and copies any new cookies onto the response.
 * Server Components cannot write cookies, so the proxy calls this on each
 * request that already has an auth cookie. Public pages and a missing env
 * continue without a network call.
 */
export async function refreshSession(request: NextRequest) {
  const env = publicEnv();
  if (!env || !hasSessionCookie(request)) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        // Auth responses must not be cached, or one user's token can be served to another.
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });

  // getUser() validates the JWT and rotates the refresh token when it is due.
  await supabase.auth.getUser();
  return response;
}
