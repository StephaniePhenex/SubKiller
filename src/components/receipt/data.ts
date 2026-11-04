import { isMarkedToCancel } from "@/lib/ai/score";
import type { Subscription as StoredSubscription } from "@/lib/subscriptions/types";

export type Frequency = "weekly" | "monthly" | "yearly";

export type Subscription = {
  id: string;
  name: string;
  cost: number;
  frequency: Frequency;
  /** Null until the server has scored the row. */
  aiScore: number | null;
  verdict: string | null;
  killed: boolean;
  feeling?: string;
};

export const INITIAL_SUBSCRIPTIONS: Subscription[] = [
  {
    id: "sub_001",
    name: "Spotify Premium",
    cost: 11.99,
    frequency: "monthly",
    aiScore: 82,
    verdict: "Daily use, four hours a day. This one earns its keep.",
    killed: false,
  },
  {
    id: "sub_002",
    name: "Iron Temple Gym",
    cost: 54.0,
    frequency: "monthly",
    aiScore: 18,
    verdict: "Two visits since January. You are paying $27 per workout.",
    killed: true,
  },
  {
    id: "sub_003",
    name: "Adobe Creative Cloud",
    cost: 659.88,
    frequency: "yearly",
    aiScore: 41,
    verdict: "You open Photoshop to crop screenshots. Your phone does that for free.",
    killed: false,
  },
];

/**
 * A stored row as a Graveyard card. The cancel mark comes from the stored
 * score, so it is the same after a refresh. An unscored row keeps a null
 * score: the card never shows a score the server did not store.
 */
export function fromStoredSubscription(sub: StoredSubscription): Subscription {
  return {
    id: sub.id,
    name: sub.name,
    cost: sub.cost,
    frequency: sub.frequency,
    feeling: sub.feeling,
    aiScore: sub.aiScore,
    verdict: sub.verdict,
    killed: isMarkedToCancel(sub.aiScore),
  };
}

export const toMonthly = (cost: number, frequency: Frequency) => {
  if (frequency === "yearly") return cost / 12;
  if (frequency === "weekly") return (cost * 52) / 12;
  return cost;
};

export const money = (n: number) => `$${n.toFixed(2)}`;
