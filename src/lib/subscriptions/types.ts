import type { Database } from "@/lib/supabase/database.types";

type Table = Database["public"]["Tables"]["subscriptions"];

/** A `subscriptions` row exactly as Postgres returns it (snake_case). */
export type SubscriptionRow = Table["Row"];
export type SubscriptionInsertRow = Table["Insert"];
export type SubscriptionUpdateRow = Pick<Table["Update"], "name" | "cost" | "frequency" | "feeling">;

export type Frequency = "weekly" | "monthly" | "yearly";

/** A subscription as React components see it (camelCase). */
export type Subscription = {
  id: string;
  userId: string;
  name: string;
  cost: number;
  frequency: Frequency;
  feeling: string;
  /** The AI's 0-100 importance score. Read-only; null until the row is scored. */
  aiScore: number | null;
  verdict: string | null;
  createdAt: string;
};

export type NewSubscription = {
  name: string;
  cost: number;
  frequency: Frequency;
  feeling?: string;
  aiScore?: number | null;
  verdict?: string | null;
};

/** The fields a user may edit after saving. The score, verdict, and owner are fixed. */
export type SubscriptionPatch = Partial<Pick<NewSubscription, "name" | "cost" | "frequency" | "feeling">>;
