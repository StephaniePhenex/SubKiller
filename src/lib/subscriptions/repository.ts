import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { toInsertRow, toSubscription, toUpdateRow } from "./mapper";
import type { NewSubscription, Subscription, SubscriptionPatch } from "./types";

type Client = SupabaseClient<Database>;

export class NotAuthenticatedError extends Error {
  constructor() {
    super("Sign in to manage your subscriptions.");
    this.name = "NotAuthenticatedError";
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
  return (data ?? []).map(toSubscription);
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

export async function deleteSubscription(client: Client, id: string): Promise<void> {
  const userId = await requireUserId(client);
  const { error } = await client.from("subscriptions").delete().eq("id", id).eq("user_id", userId);
  if (error) fail(error);
}
