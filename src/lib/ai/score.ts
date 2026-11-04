export type ScoreTone = "kill" | "think" | "keep";

/** Scores below this are marked to cancel when they reach the Graveyard. */
export const CANCEL_BELOW = 30;

/** Prototype bands: 0-29 "Kill it", 30-69 "Think hard", 70-100 "Keep it". */
export function scoreBand(score: number): { tone: ScoreTone; label: string } {
  if (score < CANCEL_BELOW) return { tone: "kill", label: "Kill it" };
  if (score < 70) return { tone: "think", label: "Think hard" };
  return { tone: "keep", label: "Keep it" };
}

/** A stored score under 30 opens in the Graveyard already marked to cancel. Unscored rows are never marked. */
export function isMarkedToCancel(score: number | null): boolean {
  return score !== null && score < CANCEL_BELOW;
}
