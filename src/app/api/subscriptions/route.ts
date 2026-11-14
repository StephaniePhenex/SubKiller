import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { NotAuthenticatedError, getYearlyBleed, listSubscriptions } from "@/lib/subscriptions/repository";

const HEADERS = { "Cache-Control": "private, no-store" };

/** Query parameters that would let a caller name another account. Rejected, never read. */
const USER_ID_PARAMS = ["user_id", "userId"];

function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: HEADERS });
}

/**
 * GET /api/subscriptions: the signed-in user's subscriptions (camelCase) and
 * their `yearly_bleed()` total. The user comes only from the Supabase session
 * in the request cookies; RLS and the repository's user_id filter scope every
 * query. See docs/api/openapi.yaml.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (USER_ID_PARAMS.some((param) => searchParams.has(param))) {
    return apiError(
      400,
      "unsupported_parameter",
      "This endpoint always returns the signed-in user's subscriptions. Remove the user id parameter.",
    );
  }

  try {
    const client = await createClient();
    const subscriptions = await listSubscriptions(client);
    const yearlyBleed = await getYearlyBleed(client);
    return NextResponse.json(
      { subscriptions, summary: { count: subscriptions.length, yearlyBleed, currency: "USD" } },
      { headers: HEADERS },
    );
  } catch (error) {
    if (error instanceof NotAuthenticatedError) {
      return apiError(401, "not_authenticated", "Sign in to view your subscriptions.");
    }
    console.error("GET /api/subscriptions failed", error instanceof Error ? error.name : typeof error);
    return apiError(500, "internal_error", "Could not load subscriptions.");
  }
}
