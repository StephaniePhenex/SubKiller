import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiVerdict } from "@/lib/ai/verdict";
import type { Database } from "@/lib/supabase/database.types";
import { toInsertRow, toSubscription, toUpdateRow, toVerdictRow } from "./mapper";
import type { NewSubscription, Subscription, SubscriptionPatch } from "./types";

type Client = SupabaseClient<Database>;

export class NotAuthenticatedError extends Error {
  constructor() {
    super("Sign in to manage your subscriptions.");
    this.name = "NotAuthenticatedError";
  }
}

export class SubscriptionNotDeletedError extends Error {
  constructor() {
    super("No matching subscription was deleted.");
    this.name = "SubscriptionNotDeletedError";
  }
}

export class VerdictNotRecordedError extends Error {
  constructor() {
    super("No unscored subscription matched, so the verdict was not recorded.");
    this.name = "VerdictNotRecordedError";
  }
}

/**
 * Every query names the signed-in user explicitly, on top of RLS, so no
 * application query runs without the user's context.
 */
async function requireUserId(client: Client): Promise<string> {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new NotAuthenticatedError();
  return data.user.id;
}

function fail(error: { message: string }): never {
  throw new Error(`Subscriptions query failed: ${error.message}`, { cause: error });
}

export async function listSubscriptions(client: Client): Promise<Subscription[]> {
  const userId = await requireUserId(client);
  const { data, error } = await client
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) fail(error);
  // RLS and the filter above already scope the rows; this keeps a foreign row out of the UI regardless.
  return (data ?? []).filter((row) => row.user_id === userId).map(toSubscription);
}

/** One of the signed-in user's subscriptions, or null if it does not exist or is someone else's. */
export async function getSubscription(client: Client, id: string): Promise<Subscription | null> {
  const userId = await requireUserId(client);
  const { data, error } = await client
    .from("subscriptions")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) fail(error);
  return data ? toSubscription(data) : null;
}

/**
 * Records the AI verdict on a row. Trusted server path only: `client` must be
 * the secret-key admin client, because the column grants stop signed-in users
 * from writing these columns. The caller passes the owner it already verified,
 * and the write only matches a row that is still unscored, so an existing
 * score is never overwritten.
 */
export async function recordVerdict(
  client: Client,
  { id, userId, verdict }: { id: string; userId: string; verdict: AiVerdict },
): Promise<Subscription> {
  const { data, error } = await client
    .from("subscriptions")
    .update(toVerdictRow(verdict))
    .eq("id", id)
    .eq("user_id", userId)
    .is("ai_score", null)
    .select("*")
    .maybeSingle();
  if (error) fail(error);
  if (!data) throw new VerdictNotRecordedError();
  return toSubscription(data);
}

export async function createSubscription(client: Client, input: NewSubscription): Promise<Subscription> {
  const userId = await requireUserId(client);
  const { data, error } = await client
    .from("subscriptions")
    .insert(toInsertRow(input, userId))
    .select("*")
    .single();
  if (error) fail(error);
  return toSubscription(data);
}

export async function updateSubscription(
  client: Client,
  id: string,
  patch: SubscriptionPatch,
): Promise<Subscription> {
  const userId = await requireUserId(client);
  const { data, error } = await client
    .from("subscriptions")
    .update(toUpdateRow(patch))
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) fail(error);
  return toSubscription(data);
}

/**
 * Permanently removes one of the user's rows. Throws SubscriptionNotDeletedError
 * when nothing matched, so a caller never hides a row that is still stored.
 */
export async function deleteSubscription(client: Client, id: string): Promise<void> {
  const userId = await requireUserId(client);
  const { data, error } = await client
    .from("subscriptions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");
  if (error) fail(error);
  if (!data?.length) throw new SubscriptionNotDeletedError();
}
