import type { Database } from "@/lib/supabase/database.types";

type Table = Database["public"]["Tables"]["subscriptions"];

/** A `subscriptions` row exactly as Postgres returns it (snake_case). */
export type SubscriptionRow = Table["Row"];
/** The columns a client may insert. The AI score, verdict, id, and created_at are not among them. */
export type SubscriptionInsertRow = Pick<Table["Insert"], "user_id" | "name" | "cost" | "frequency" | "feeling">;
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

/** What a user confesses. The AI score and verdict are added later by the server, never by the client. */
export type NewSubscription = {
  name: string;
  cost: number;
  frequency: Frequency;
  feeling?: string;
};

/** The fields a user may edit after saving. The score, verdict, and owner are fixed. */
export type SubscriptionPatch = Partial<NewSubscription>;
