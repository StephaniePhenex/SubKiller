export type Frequency = "weekly" | "monthly" | "yearly";

export type Subscription = {
  id: string;
  name: string;
  cost: number;
  frequency: Frequency;
  aiScore: number;
  verdict: string;
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

export const toMonthly = (cost: number, frequency: Frequency) => {
  if (frequency === "yearly") return cost / 12;
  if (frequency === "weekly") return (cost * 52) / 12;
  return cost;
};

export const money = (n: number) => `$${n.toFixed(2)}`;
