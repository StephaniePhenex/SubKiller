"use server";

import { getVerdictProvider, type VerdictInput } from "@/lib/ai/provider";
import {
  previewVerdict as previewWith,
  scoreStoredSubscription,
  type PreviewResult,
  type ScoreResult,
} from "@/lib/ai/score-subscription";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Scores the confession on the Review page for the signed-in user. Nothing is stored. */
export async function previewVerdict(input: VerdictInput): Promise<PreviewResult> {
  try {
    return await previewWith({ userClient: await createClient(), provider: getVerdictProvider() }, input);
  } catch {
    return { ok: false, reason: "failed" };
  }
}

/**
 * Scores a row the user just filed and stores the verdict. The browser sends
 * only the row id; the score is computed here from the stored row.
 */
export async function scoreSubscription(id: string): Promise<ScoreResult> {
  if (typeof id !== "string" || !id) return { ok: false, reason: "invalid-input" };
  try {
    return await scoreStoredSubscription(
      { userClient: await createClient(), adminClient: createAdminClient(), provider: getVerdictProvider() },
      id,
    );
  } catch {
    return { ok: false, reason: "failed" };
  }
}
