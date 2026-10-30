import {
  NotAuthenticatedError,
  createSubscription,
  deleteSubscription,
  listSubscriptions,
  updateSubscription,
} from "@/lib/subscriptions/repository";

type Client = Parameters<typeof listSubscriptions>[0];
type Call = [method: string, args: unknown[]];

const USER_ID = "11111111-1111-4111-8111-111111111111";
const ROW_ID = "a0000000-0000-4000-8000-000000000001";

const row = {
  id: ROW_ID,
  user_id: USER_ID,
  name: "Netflix",
  cost: 15.99,
  frequency: "monthly",
  feeling: "Kind of guilty.",
  ai_score: 20,
  verdict: "You rewatched one sitcom twice.",
  created_at: "2026-10-30T12:00:00+00:00",
};

/**
 * A stand-in for the Supabase client. Every query-builder call is recorded,
 * and awaiting the builder resolves to `result`.
 */
function fakeClient({
  user = { id: USER_ID } as { id: string } | null,
  result = { data: null as unknown, error: null as { message: string } | null },
} = {}) {
  const calls: Call[] = [];
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "insert", "update", "delete", "eq", "order", "single"]) {
    builder[method] = (...args: unknown[]) => {
      calls.push([method, args]);
      return builder;
    };
  }
  builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);

  const from = jest.fn((table: string) => {
    calls.push(["from", [table]]);
    return builder;
  });
  const getUser = jest.fn(async () => ({
    data: { user },
    error: user ? null : { message: "Auth session missing!" },
  }));

  return { client: { from, auth: { getUser } } as unknown as Client, calls, from };
}

const hasCall = (calls: Call[], method: string, ...args: unknown[]) =>
  calls.some(([m, a]) => m === method && JSON.stringify(a) === JSON.stringify(args));

describe("subscriptions repository", () => {
  describe("without a signed-in user", () => {
    it.each([
      ["listSubscriptions", (c: Client) => listSubscriptions(c)],
      ["createSubscription", (c: Client) => createSubscription(c, { name: "Gym", cost: 54, frequency: "monthly" })],
      ["updateSubscription", (c: Client) => updateSubscription(c, ROW_ID, { name: "Gym" })],
      ["deleteSubscription", (c: Client) => deleteSubscription(c, ROW_ID)],
    ])("%s throws NotAuthenticatedError and sends no query", async (_name, run) => {
      const { client, from } = fakeClient({ user: null });

      await expect(run(client)).rejects.toBeInstanceOf(NotAuthenticatedError);
      expect(from).not.toHaveBeenCalled();
    });
  });

  it("lists only the signed-in user's rows, newest first, in camelCase", async () => {
    const { client, calls } = fakeClient({ result: { data: [row], error: null } });

    const subscriptions = await listSubscriptions(client);

    expect(hasCall(calls, "from", "subscriptions")).toBe(true);
    expect(hasCall(calls, "eq", "user_id", USER_ID)).toBe(true);
    expect(hasCall(calls, "order", "created_at", { ascending: false })).toBe(true);
    expect(subscriptions).toEqual([
      expect.objectContaining({ id: ROW_ID, userId: USER_ID, aiScore: 20, createdAt: row.created_at }),
    ]);
  });

  it("creates a row owned by the signed-in user and returns it in camelCase", async () => {
    const { client, calls } = fakeClient({ result: { data: row, error: null } });

    const created = await createSubscription(client, {
      name: "Netflix",
      cost: 15.99,
      frequency: "monthly",
      feeling: "Kind of guilty.",
    });

    const payload = calls.find(([method]) => method === "insert")?.[1][0];
    expect(payload).toEqual(expect.objectContaining({ user_id: USER_ID, name: "Netflix" }));
    expect(payload).not.toHaveProperty("ai_score");
    expect(payload).not.toHaveProperty("verdict");
    expect(created).toEqual(expect.objectContaining({ id: ROW_ID, userId: USER_ID }));
  });

  it("updates only the user's own row and only the editable fields", async () => {
    const { client, calls } = fakeClient({ result: { data: { ...row, name: "Netflix Premium" }, error: null } });
    const patch = { name: "Netflix Premium", aiScore: 99 } as unknown as Parameters<typeof updateSubscription>[2];

    const updated = await updateSubscription(client, ROW_ID, patch);

    expect(hasCall(calls, "update", { name: "Netflix Premium" })).toBe(true);
    expect(hasCall(calls, "eq", "id", ROW_ID)).toBe(true);
    expect(hasCall(calls, "eq", "user_id", USER_ID)).toBe(true);
    expect(updated.name).toBe("Netflix Premium");
  });

  it("deletes only the user's own row", async () => {
    const { client, calls } = fakeClient({ result: { data: null, error: null } });

    await deleteSubscription(client, ROW_ID);

    expect(hasCall(calls, "delete")).toBe(true);
    expect(hasCall(calls, "eq", "id", ROW_ID)).toBe(true);
    expect(hasCall(calls, "eq", "user_id", USER_ID)).toBe(true);
  });

  it("surfaces database errors to the caller", async () => {
    const { client } = fakeClient({ result: { data: null, error: { message: "permission denied" } } });

    await expect(listSubscriptions(client)).rejects.toThrow("permission denied");
  });
});
