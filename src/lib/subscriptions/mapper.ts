import type {
  Frequency,
  NewSubscription,
  Subscription,
  SubscriptionInsertRow,
  SubscriptionPatch,
  SubscriptionRow,
  SubscriptionUpdateRow,
} from "./types";

export function toSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    // Postgres numeric can arrive as a string; the UI does math on it.
    cost: Number(row.cost),
    // The table's check constraint limits frequency to these three values.
    frequency: row.frequency as Frequency,
    feeling: row.feeling,
    aiScore: row.ai_score,
    verdict: row.verdict,
    createdAt: row.created_at,
  };
}

/** Copies only the insertable fields; the database rejects a client-supplied score anyway. */
export function toInsertRow(input: NewSubscription, userId: string): SubscriptionInsertRow {
  return {
    user_id: userId,
    name: input.name,
    cost: input.cost,
    frequency: input.frequency,
    feeling: input.feeling ?? "",
  };
}

/** Copies only the editable fields, so a stray aiScore or userId never reaches the query. */
export function toUpdateRow(patch: SubscriptionPatch): SubscriptionUpdateRow {
  const row: SubscriptionUpdateRow = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.cost !== undefined) row.cost = patch.cost;
  if (patch.frequency !== undefined) row.frequency = patch.frequency;
  if (patch.feeling !== undefined) row.feeling = patch.feeling;
  return row;
}
