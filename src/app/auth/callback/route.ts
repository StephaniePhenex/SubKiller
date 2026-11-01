import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const RECEIPT_PATHS = new Set(["/confess", "/review", "/graveyard"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next");
  const nextPath = nextParam && RECEIPT_PATHS.has(nextParam) ? nextParam : "/confess";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(nextPath, url.origin));
  }

  return NextResponse.redirect(new URL("/", url.origin));
}
