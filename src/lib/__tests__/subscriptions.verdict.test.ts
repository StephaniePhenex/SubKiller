import { getSubscription, recordVerdict, VerdictNotRecordedError } from "@/lib/subscriptions/repository";
import { previewVerdict, scoreStoredSubscription } from "@/lib/ai/score-subscription";
import type { VerdictProvider } from "@/lib/ai/provider";

type Client = Parameters<typeof getSubscription>[0];
type Call = [method: string, args: unknown[]];
type Result = { data: unknown; error: { message: string; code?: string } | null };

const USER_ID = "11111111-1111-4111-8111-111111111111";
const ROW_ID = "a0000000-0000-4000-8000-000000000001";

const unscoredRow = {
  id: ROW_ID,
  user_id: USER_ID,
  name: "Iron Temple Gym",
  cost: 54,
  frequency: "monthly",
  feeling: "I never go.",
  ai_score: null,
  verdict: null,
  created_at: "2026-11-03T12:00:00+00:00",
};
const VERDICT = "Two visits since January. You are paying $27 per workout.";
const scoredRow = { ...unscoredRow, ai_score: 18, verdict: VERDICT };

/** Records every query-builder call; awaiting the builder resolves to the next queued result. */
function fakeClient({ user = { id: USER_ID } as { id: string } | null, results = [] as Result[] } = {}) {
  const calls: Call[] = [];
  const queue = [...results];
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "insert", "update", "delete", "eq", "is", "order", "single", "maybeSingle"]) {
    builder[method] = (...args: unknown[]) => {
      calls.push([method, args]);
      return builder;
    };
  }
  builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(queue.shift() ?? { data: null, error: null }).then(resolve, reject);
  const from = jest.fn((table: string) => {
    calls.push(["from", [table]]);
    return builder;
  });
  const getUser = jest.fn(async () => ({ data: { user }, error: user ? null : { message: "Auth session missing!" } }));
  return { client: { from, auth: { getUser } } as unknown as Client, calls, from };
}

const hasCall = (calls: Call[], method: string, ...args: unknown[]) =>
  calls.some(([m, a]) => m === method && JSON.stringify(a) === JSON.stringify(args));

function provider(raw: string): VerdictProvider & { complete: jest.Mock } {
  return { id: "test-provider", isMock: true, complete: jest.fn(async () => raw) };
}

describe("recordVerdict (trusted server write)", () => {
  it("writes only ai_score and verdict to that row, for that user, and only while it is unscored", async () => {
    const { client, calls } = fakeClient({ results: [{ data: scoredRow, error: null }] });

    const saved = await recordVerdict(client, { id: ROW_ID, userId: USER_ID, verdict: { aiScore: 18, verdict: VERDICT } });

    expect(hasCall(calls, "from", "subscriptions")).toBe(true);
    expect(hasCall(calls, "update", { ai_score: 18, verdict: VERDICT })).toBe(true);
    expect(hasCall(calls, "eq", "id", ROW_ID)).toBe(true);
    expect(hasCall(calls, "eq", "user_id", USER_ID)).toBe(true);
    expect(hasCall(calls, "is", "ai_score", null)).toBe(true);
    expect(saved).toMatchObject({ id: ROW_ID, userId: USER_ID, aiScore: 18, verdict: VERDICT });
  });

  it("refuses to overwrite: when no unscored row matches, it throws instead of writing silently", async () => {
    const { client } = fakeClient({ results: [{ data: null, error: null }] });

    await expect(
      recordVerdict(client, { id: ROW_ID, userId: USER_ID, verdict: { aiScore: 90, verdict: "Overwrite attempt." } }),
    ).rejects.toThrow(VerdictNotRecordedError);
  });

  it("surfaces a database error", async () => {
    const { client } = fakeClient({ results: [{ data: null, error: { message: "boom" } }] });

    await expect(
      recordVerdict(client, { id: ROW_ID, userId: USER_ID, verdict: { aiScore: 18, verdict: VERDICT } }),
    ).rejects.toThrow("boom");
  });
});

describe("getSubscription", () => {
  it("reads one row by id for the signed-in user", async () => {
    const { client, calls } = fakeClient({ results: [{ data: unscoredRow, error: null }] });

    const sub = await getSubscription(client, ROW_ID);

    expect(hasCall(calls, "eq", "id", ROW_ID)).toBe(true);
    expect(hasCall(calls, "eq", "user_id", USER_ID)).toBe(true);
    expect(sub).toMatchObject({ id: ROW_ID, name: "Iron Temple Gym", aiScore: null });
  });

  it("returns null when the row is not the user's or does not exist", async () => {
    const { client } = fakeClient({ results: [{ data: null, error: null }] });
    await expect(getSubscription(client, ROW_ID)).resolves.toBeNull();
  });
});

describe("scoreStoredSubscription", () => {
  const validRaw = JSON.stringify({ score: 18, verdict: VERDICT });

  it("refuses a signed-out request and touches nothing", async () => {
    const user = fakeClient({ user: null });
    const admin = fakeClient();
    const ai = provider(validRaw);

    const result = await scoreStoredSubscription({ userClient: user.client, adminClient: admin.client, provider: ai }, ROW_ID);

    expect(result).toEqual({ ok: false, reason: "not-authenticated" });
    expect(ai.complete).not.toHaveBeenCalled();
    expect(admin.from).not.toHaveBeenCalled();
  });

  it("refuses a row the user cannot read (RLS hides other users' rows)", async () => {
    const user = fakeClient({ results: [{ data: null, error: null }] });
    const admin = fakeClient();
    const ai = provider(validRaw);

    const result = await scoreStoredSubscription({ userClient: user.client, adminClient: admin.client, provider: ai }, ROW_ID);

    expect(result).toEqual({ ok: false, reason: "not-found" });
    expect(ai.complete).not.toHaveBeenCalled();
    expect(admin.from).not.toHaveBeenCalled();
  });

  it("scores from the stored row, not from anything the browser sends, and saves it to that row", async () => {
    const user = fakeClient({ results: [{ data: unscoredRow, error: null }] });
    const admin = fakeClient({ results: [{ data: scoredRow, error: null }] });
    const ai = provider(validRaw);

    const result = await scoreStoredSubscription({ userClient: user.client, adminClient: admin.client, provider: ai }, ROW_ID);

    expect(ai.complete).toHaveBeenCalledWith({ name: "Iron Temple Gym", cost: 54, frequency: "monthly", feeling: "I never go." });
    expect(hasCall(admin.calls, "update", { ai_score: 18, verdict: VERDICT })).toBe(true);
    expect(hasCall(admin.calls, "eq", "id", ROW_ID)).toBe(true);
    expect(hasCall(admin.calls, "eq", "user_id", USER_ID)).toBe(true);
    expect(result).toEqual({ ok: true, subscription: expect.objectContaining({ id: ROW_ID, aiScore: 18, verdict: VERDICT }) });
  });

  it("does not save anything when the AI output fails validation", async () => {
    const user = fakeClient({ results: [{ data: unscoredRow, error: null }] });
    const admin = fakeClient();

    const result = await scoreStoredSubscription(
      { userClient: user.client, adminClient: admin.client, provider: provider('{"score": 140, "verdict": "Nope."}') },
      ROW_ID,
    );

    expect(result).toEqual({ ok: false, reason: "invalid-ai-output" });
    expect(admin.from).not.toHaveBeenCalled();
  });

  it("keeps an existing score: an already scored row is returned unchanged and never re-scored", async () => {
    const user = fakeClient({ results: [{ data: scoredRow, error: null }] });
    const admin = fakeClient();
    const ai = provider(JSON.stringify({ score: 95, verdict: "A second opinion." }));

    const result = await scoreStoredSubscription({ userClient: user.client, adminClient: admin.client, provider: ai }, ROW_ID);

    expect(result).toEqual({ ok: true, subscription: expect.objectContaining({ aiScore: 18, verdict: VERDICT }) });
    expect(ai.complete).not.toHaveBeenCalled();
    expect(admin.from).not.toHaveBeenCalled();
  });
});

describe("previewVerdict", () => {
  const input = { name: "Netflix", cost: 15.99, frequency: "monthly" as const, feeling: "Kind of guilty." };

  it("returns the validated verdict for a signed-in user and says whether it came from the mock", async () => {
    const user = fakeClient();
    const ai = provider(JSON.stringify({ score: 25, verdict: "Costs more than it gives." }));

    await expect(previewVerdict({ userClient: user.client, provider: ai }, input)).resolves.toEqual({
      ok: true,
      verdict: { aiScore: 25, verdict: "Costs more than it gives." },
      isMock: true,
    });
    expect(ai.complete).toHaveBeenCalledWith(input);
  });

  it("refuses a signed-out request", async () => {
    const ai = provider("{}");
    await expect(previewVerdict({ userClient: fakeClient({ user: null }).client, provider: ai }, input)).resolves.toEqual({
      ok: false,
      reason: "not-authenticated",
    });
    expect(ai.complete).not.toHaveBeenCalled();
  });

  it.each([
    ["an empty name", { ...input, name: "  " }],
    ["a zero cost", { ...input, cost: 0 }],
    ["a NaN cost", { ...input, cost: Number.NaN }],
    ["an unknown frequency", { ...input, frequency: "daily" as never }],
  ])("refuses %s without calling the AI", async (_label, bad) => {
    const ai = provider("{}");
    await expect(previewVerdict({ userClient: fakeClient().client, provider: ai }, bad)).resolves.toEqual({
      ok: false,
      reason: "invalid-input",
    });
    expect(ai.complete).not.toHaveBeenCalled();
  });

  it("reports invalid AI output instead of passing it through", async () => {
    await expect(
      previewVerdict({ userClient: fakeClient().client, provider: provider("not json") }, input),
    ).resolves.toEqual({ ok: false, reason: "invalid-ai-output" });
  });
});
