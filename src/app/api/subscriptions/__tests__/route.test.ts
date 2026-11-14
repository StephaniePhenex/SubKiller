/**
 * @jest-environment node
 */
import { createClient } from "@/lib/supabase/server";
import { GET } from "@/app/api/subscriptions/route";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

type Call = [method: string, args: unknown[]];

const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "22222222-2222-4222-8222-222222222222";

const scoredRow = {
  id: "a0000000-0000-4000-8000-000000000001",
  user_id: USER_ID,
  name: "Netflix",
  cost: "15.99",
  frequency: "monthly",
  feeling: "Kind of guilty.",
  ai_score: 20,
  verdict: "You rewatched one sitcom twice.",
  created_at: "2026-10-30T12:00:00+00:00",
};

const unscoredRow = {
  id: "a0000000-0000-4000-8000-000000000002",
  user_id: USER_ID,
  name: "Gym",
  cost: 10,
  frequency: "weekly",
  feeling: "",
  ai_score: null,
  verdict: null,
  created_at: "2026-10-29T12:00:00+00:00",
};

/**
 * A stand-in for the request-scoped Supabase client. Query-builder calls are
 * recorded; awaiting the builder resolves to `rows`, and rpc() to `bleed`.
 */
function fakeClient({
  user = { id: USER_ID } as { id: string } | null,
  rows = { data: [] as unknown[] | null, error: null as { message: string } | null },
  bleed = { data: 0 as unknown, error: null as { message: string } | null },
} = {}) {
  const calls: Call[] = [];
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "order"]) {
    builder[method] = (...args: unknown[]) => {
      calls.push([method, args]);
      return builder;
    };
  }
  builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(rows).then(resolve, reject);

  const from = jest.fn((table: string) => {
    calls.push(["from", [table]]);
    return builder;
  });
  const rpc = jest.fn(async (fn: string, args?: unknown) => {
    calls.push(["rpc", args === undefined ? [fn] : [fn, args]]);
    return bleed;
  });
  const getUser = jest.fn(async () => ({
    data: { user },
    error: user ? null : { message: "Auth session missing!" },
  }));

  const client = { from, rpc, auth: { getUser } };
  jest.mocked(createClient).mockResolvedValue(client as never);
  return { calls, from, rpc, getUser };
}

const hasCall = (calls: Call[], method: string, ...args: unknown[]) =>
  calls.some(([m, a]) => m === method && JSON.stringify(a) === JSON.stringify(args));

async function getSubscriptions(url = "http://localhost:3000/api/subscriptions") {
  const response = await GET(new Request(url));
  const text = await response.text();
  return { response, text, body: JSON.parse(text) };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.mocked(console.error).mockRestore();
});

describe("GET /api/subscriptions", () => {
  describe("authentication", () => {
    it("returns 401 with a JSON error when there is no session", async () => {
      const { from, rpc } = fakeClient({ user: null });

      const { response, body } = await getSubscriptions();

      expect(response.status).toBe(401);
      expect(response.headers.get("content-type")).toMatch(/application\/json/);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(body).toEqual({
        error: { code: "not_authenticated", message: "Sign in to view your subscriptions." },
      });
      expect(from).not.toHaveBeenCalled();
      expect(rpc).not.toHaveBeenCalled();
    });

    it("verifies the session with Supabase getUser() instead of trusting a cookie", async () => {
      const { getUser } = fakeClient();

      await getSubscriptions();

      expect(createClient).toHaveBeenCalledTimes(1);
      expect(getUser).toHaveBeenCalled();
    });
  });

  describe("authenticated", () => {
    it("returns the signed-in user's subscriptions in camelCase with the yearly_bleed summary", async () => {
      fakeClient({
        rows: { data: [scoredRow, unscoredRow], error: null },
        bleed: { data: "711.88", error: null },
      });

      const { response, body } = await getSubscriptions();

      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(body).toEqual({
        subscriptions: [
          {
            id: scoredRow.id,
            userId: USER_ID,
            name: "Netflix",
            cost: 15.99,
            frequency: "monthly",
            feeling: "Kind of guilty.",
            aiScore: 20,
            verdict: "You rewatched one sitcom twice.",
            createdAt: scoredRow.created_at,
          },
          {
            id: unscoredRow.id,
            userId: USER_ID,
            name: "Gym",
            cost: 10,
            frequency: "weekly",
            feeling: "",
            aiScore: null,
            verdict: null,
            createdAt: unscoredRow.created_at,
          },
        ],
        summary: { count: 2, yearlyBleed: 711.88, currency: "USD" },
      });
    });

    it("scopes the list to the signed-in user and sums with yearly_bleed() without passing a user id", async () => {
      const { calls } = fakeClient({ rows: { data: [scoredRow], error: null }, bleed: { data: 191.88, error: null } });

      await getSubscriptions();

      expect(hasCall(calls, "from", "subscriptions")).toBe(true);
      expect(hasCall(calls, "eq", "user_id", USER_ID)).toBe(true);
      expect(hasCall(calls, "rpc", "yearly_bleed")).toBe(true);
    });

    it("returns an empty list and a zero summary when the user has no subscriptions", async () => {
      fakeClient({ rows: { data: [], error: null }, bleed: { data: 0, error: null } });

      const { response, body } = await getSubscriptions();

      expect(response.status).toBe(200);
      expect(body).toEqual({ subscriptions: [], summary: { count: 0, yearlyBleed: 0, currency: "USD" } });
    });

    it("drops a foreign row even if one slips past the query", async () => {
      fakeClient({
        rows: { data: [scoredRow, { ...unscoredRow, user_id: OTHER_USER_ID }], error: null },
        bleed: { data: 191.88, error: null },
      });

      const { body } = await getSubscriptions();

      expect(body.subscriptions.map((s: { userId: string }) => s.userId)).toEqual([USER_ID]);
      expect(body.summary.count).toBe(1);
    });
  });

  describe("caller cannot pick the account", () => {
    it.each(["user_id", "userId"])("rejects a %s query parameter with 400", async (param) => {
      const { from, rpc } = fakeClient();

      const { response, body } = await getSubscriptions(
        `http://localhost:3000/api/subscriptions?${param}=${OTHER_USER_ID}`,
      );

      expect(response.status).toBe(400);
      expect(body).toEqual({
        error: {
          code: "unsupported_parameter",
          message: "This endpoint always returns the signed-in user's subscriptions. Remove the user id parameter.",
        },
      });
      expect(from).not.toHaveBeenCalled();
      expect(rpc).not.toHaveBeenCalled();
    });
  });

  describe("errors", () => {
    it("returns 500 without database details when the list query fails", async () => {
      fakeClient({
        rows: { data: null, error: { message: 'relation "public.subscriptions" does not exist' } },
      });

      const { response, body, text } = await getSubscriptions();

      expect(response.status).toBe(500);
      expect(body).toEqual({ error: { code: "internal_error", message: "Could not load subscriptions." } });
      expect(text).not.toContain("relation");
      expect(text).not.toContain("public.subscriptions");
    });

    it("returns 500 when yearly_bleed() fails", async () => {
      fakeClient({
        rows: { data: [scoredRow], error: null },
        bleed: { data: null, error: { message: "permission denied for function yearly_bleed" } },
      });

      const { response, body, text } = await getSubscriptions();

      expect(response.status).toBe(500);
      expect(body.error.code).toBe("internal_error");
      expect(text).not.toContain("permission denied");
    });

    it("returns 500 when yearly_bleed() returns an invalid amount", async () => {
      fakeClient({ rows: { data: [scoredRow], error: null }, bleed: { data: "not a number", error: null } });

      const { response, body } = await getSubscriptions();

      expect(response.status).toBe(500);
      expect(body.error.code).toBe("internal_error");
    });

    it("returns 500 without leaking configuration when the Supabase client cannot be created", async () => {
      jest
        .mocked(createClient)
        .mockRejectedValue(new Error("Missing NEXT_PUBLIC_SUPABASE_URL. Add it to .env.local (see .env.example)."));

      const { response, body, text } = await getSubscriptions();

      expect(response.status).toBe(500);
      expect(body.error.code).toBe("internal_error");
      expect(text).not.toContain("NEXT_PUBLIC_SUPABASE_URL");
    });
  });
});
