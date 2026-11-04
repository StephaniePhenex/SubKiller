/** A validated AI verdict, in the camelCase the app uses. */
export type AiVerdict = {
  /** Integer importance score from 0 to 100. */
  aiScore: number;
  /** Trimmed, non-empty, at most VERDICT_MAX_LENGTH characters. */
  verdict: string;
};

/** Matches the `verdict` check constraint on public.subscriptions. */
export const VERDICT_MAX_LENGTH = 500;

const ALLOWED_KEYS = new Set(["score", "verdict"]);

export class InvalidVerdictError extends Error {
  constructor(reason: string) {
    super(`Invalid AI verdict: ${reason}`);
    this.name = "InvalidVerdictError";
  }
}

/**
 * Validates raw model output. The contract (PRD US2) is a JSON object with
 * exactly `score` (an integer from 0 to 100) and `verdict` (non-empty text).
 * Anything else is rejected: the output is never trusted as-is.
 *
 * Accepts the raw string, or a value that was already parsed.
 */
export function parseVerdictResponse(raw: unknown): AiVerdict {
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      throw new InvalidVerdictError("not valid JSON");
    }
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new InvalidVerdictError("expected a JSON object");
  }

  const extra = Object.keys(value).filter((key) => !ALLOWED_KEYS.has(key));
  if (extra.length) throw new InvalidVerdictError(`unexpected field ${extra.join(", ")}`);

  const { score, verdict } = value as Record<string, unknown>;

  if (typeof score !== "number" || !Number.isInteger(score)) {
    throw new InvalidVerdictError("score must be an integer");
  }
  if (score < 0 || score > 100) throw new InvalidVerdictError("score must be between 0 and 100");

  if (typeof verdict !== "string") throw new InvalidVerdictError("verdict must be text");
  const text = verdict.trim();
  if (!text) throw new InvalidVerdictError("verdict is empty");
  if (text.length > VERDICT_MAX_LENGTH) {
    throw new InvalidVerdictError(`verdict is longer than ${VERDICT_MAX_LENGTH} characters`);
  }

  return { aiScore: score, verdict: text };
}
