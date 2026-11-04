import type { Frequency } from "@/lib/subscriptions/types";
import { YEARLY_FACTOR } from "@/lib/subscriptions/yearly";

/** What the scorer sees: the confession's cost, frequency, and sentiment. */
export type VerdictInput = {
  name: string;
  cost: number;
  frequency: Frequency;
  feeling: string;
};

/**
 * Produces the raw model output for one confession. The caller always runs it
 * through `parseVerdictResponse`; a provider is never trusted to return valid JSON.
 */
export type VerdictProvider = {
  id: string;
  /** True for the built-in rules below. The UI says so instead of calling it AI. */
  isMock: boolean;
  complete(input: VerdictInput): Promise<string>;
};

const NEGATIVE = ["never", "forget", "forgot", "guilty", "waste", "rarely", "barely", "hate", "don't use", "regret", "useless", "unused"];
const POSITIVE = ["love", "daily", "every day", "use it", "need", "essential", "worth", "favorite", "all the time", "for work"];

/** +15 per positive phrase, -15 per negative one, capped at ±30. Negative phrases are removed first so "don't use it" is not also read as "use it". */
function sentiment(feeling: string): number {
  let text = feeling.toLowerCase();
  let points = 0;
  for (const phrase of NEGATIVE) {
    if (text.includes(phrase)) {
      points -= 15;
      text = text.split(phrase).join(" ");
    }
  }
  for (const phrase of POSITIVE) if (text.includes(phrase)) points += 15;
  return Math.max(-30, Math.min(30, points));
}

const money = (n: number) => `$${n.toFixed(2)}`;

/**
 * DETERMINISTIC MOCK, NOT AN AI MODEL. No AI provider is configured yet, so the
 * score comes from fixed rules: start at 60, subtract up to 40 for the yearly
 * cost ($15 a year per point), and move up to 30 either way for the feeling.
 * It returns JSON in the same `{ score, verdict }` shape a model must return.
 */
export const mockVerdictProvider: VerdictProvider = {
  id: "deterministic-mock",
  isMock: true,
  async complete({ name, cost, frequency, feeling }) {
    const yearly = cost * YEARLY_FACTOR[frequency];
    const raw = 60 - Math.min(40, Math.round(yearly / 15)) + sentiment(feeling);
    const score = Math.max(0, Math.min(100, raw));

    const perYear = `${money(yearly)} a year`;
    const verdict =
      score < 30
        ? `${name} costs ${perYear} for very little return. Cut it.`
        : score < 70
          ? `${name} costs ${perYear}. Decide whether it still earns that.`
          : `${name} costs ${perYear} and you clearly use it. Keep it.`;

    return JSON.stringify({ score, verdict });
  },
};

/** The provider the app uses. Swap in a real model here once one is configured. */
export function getVerdictProvider(): VerdictProvider {
  return mockVerdictProvider;
}
