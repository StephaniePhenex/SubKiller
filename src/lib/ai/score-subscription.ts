import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  NotAuthenticatedError,
  VerdictNotRecordedError,
  getSubscription,
  recordVerdict,
} from "@/lib/subscriptions/repository";
import type { Subscription } from "@/lib/subscriptions/types";
import type { VerdictInput, VerdictProvider } from "./provider";
import { InvalidVerdictError, parseVerdictResponse, type AiVerdict } from "./verdict";

type Client = SupabaseClient<Database>;

export type ScoreFailure = "not-authenticated" | "invalid-input" | "not-found" | "invalid-ai-output" | "failed";

export type PreviewResult = { ok: true; verdict: AiVerdict; isMock: boolean } | { ok: false; reason: ScoreFailure };
export type ScoreResult = { ok: true; subscription: Subscription } | { ok: false; reason: ScoreFailure };

const FREQUENCIES = new Set(["weekly", "monthly", "yearly"]);

/** Same limits as the table's check constraints. */
function validInput(input: VerdictInput): VerdictInput | null {
  const name = typeof input?.name === "string" ? input.name.trim() : "";
  const { cost, frequency, feeling } = input ?? {};
  if (!name || name.length > 100) return null;
  if (typeof cost !== "number" || !Number.isFinite(cost) || cost <= 0 || cost >= 1e8) return null;
  if (!FREQUENCIES.has(frequency)) return null;
  if (typeof feeling !== "string" || feeling.length > 1000) return null;
  return { name, cost, frequency, feeling };
}

async function runProvider(provider: VerdictProvider, input: VerdictInput): Promise<AiVerdict | ScoreFailure> {
  let raw: string;
  try {
    raw = await provider.complete(input);
  } catch {
    return "failed";
  }
  try {
    return parseVerdictResponse(raw);
  } catch (error) {
    if (error instanceof InvalidVerdictError) return "invalid-ai-output";
    throw error;
  }
}

/** Scores the confession shown on the Review page. Nothing is stored. */
export async function previewVerdict(
  { userClient, provider }: { userClient: Client; provider: VerdictProvider },
  input: VerdictInput,
): Promise<PreviewResult> {
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) return { ok: false, reason: "not-authenticated" };

  const valid = validInput(input);
  if (!valid) return { ok: false, reason: "invalid-input" };

  const verdict = await runProvider(provider, valid);
  if (typeof verdict === "string") return { ok: false, reason: verdict };
  return { ok: true, verdict, isMock: provider.isMock };
}

/**
 * Scores a filed subscription and stores the result. The row is read as the
 * signed-in user (RLS applies), so nobody can score someone else's row, and
 * the score comes from the stored cost, frequency, and feeling, never from
 * the browser. A row that already has a score keeps it.
 */
export async function scoreStoredSubscription(
  { userClient, adminClient, provider }: { userClient: Client; adminClient: Client; provider: VerdictProvider },
  id: string,
): Promise<ScoreResult> {
  let sub: Subscription | null;
  try {
    sub = await getSubscription(userClient, id);
  } catch (error) {
    if (error instanceof NotAuthenticatedError) return { ok: false, reason: "not-authenticated" };
    return { ok: false, reason: "failed" };
  }
  if (!sub) return { ok: false, reason: "not-found" };
  if (sub.aiScore !== null) return { ok: true, subscription: sub };

  const verdict = await runProvider(provider, {
    name: sub.name,
    cost: sub.cost,
    frequency: sub.frequency,
    feeling: sub.feeling,
  });
  if (typeof verdict === "string") return { ok: false, reason: verdict };

  try {
    return { ok: true, subscription: await recordVerdict(adminClient, { id: sub.id, userId: sub.userId, verdict }) };
  } catch (error) {
    // A parallel request scored the row first. Its score stands; return it rather than a false failure.
    if (error instanceof VerdictNotRecordedError) {
      const current = await getSubscription(userClient, id).catch(() => null);
      if (current?.aiScore != null) return { ok: true, subscription: current };
    }
    return { ok: false, reason: "failed" };
  }
}
