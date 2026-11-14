import { NextResponse } from "next/server";
import { getHealthReport } from "@/lib/health";

/**
 * GET /api/health: public, no session needed. 200 when the database answered
 * the read-only probe, 503 otherwise. See docs/api/openapi.yaml.
 */
export async function GET() {
  const report = await getHealthReport();
  return NextResponse.json(report, {
    status: report.status === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
