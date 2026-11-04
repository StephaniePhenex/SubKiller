import { scoreBand, type ScoreTone } from "@/lib/ai/score";
import { BLOOD, CHART, INK, MINT, WHITE } from "./palette";

const TONE_COLORS: Record<ScoreTone, { background: string; color: string }> = {
  kill: { background: BLOOD, color: WHITE },
  think: { background: CHART, color: INK },
  keep: { background: MINT, color: INK },
};

/**
 * The read-only AI importance score. "review" is the Review page pill (4px
 * border, 3px hard shadow); "compact" is the smaller Graveyard row pill.
 */
export function ScoreBadge({ score, size = "review" }: { score: number; size?: "review" | "compact" }) {
  const band = scoreBand(score);
  const review = size === "review";

  return (
    <span
      className={
        review
          ? "shrink-0 border-4 border-black rounded-full px-3 py-1 text-lg font-bold leading-none"
          : "shrink-0 border-2 border-black rounded-full px-3 py-1 font-bold leading-none"
      }
      style={{ ...TONE_COLORS[band.tone], ...(review ? { boxShadow: `3px 3px 0 0 ${INK}` } : {}) }}
      title={review ? undefined : band.label}
      role="img"
      aria-label={`Importance score ${score} out of 100`}
    >
      {score}
    </span>
  );
}
