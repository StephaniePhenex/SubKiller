import { NextResponse } from "next/server";

/** Liveness check. It does not call Supabase. */
export function GET() {
  return NextResponse.json({ ok: true });
}
