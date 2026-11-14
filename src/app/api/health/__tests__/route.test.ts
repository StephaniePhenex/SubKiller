/**
 * @jest-environment node
 */
import { createClient } from "@supabase/supabase-js";
import { GET } from "@/app/api/health/route";

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));

const SUPABASE_URL = "https://secret-project-ref.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_do-not-leak-this-key";

const rpc = jest.fn();
const abortSignal = jest.fn();
const throwOnError = jest.fn();

/**
 * rpc("db_health") returns a chainable builder; awaiting it settles like
 * `result`. With throwOnError(), postgrest-js rejects with a PostgrestError
 * for an error response and rethrows network and abort errors as they are.
 */
function mockRpcResult(result: Promise<unknown>) {
  result.catch(() => {});
  const builder = {
    abortSignal: abortSignal.mockImplementation(() => builder),
    throwOnError: throwOnError.mockImplementation(() => builder),
    then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => result.then(resolve, reject),
  };
  rpc.mockReturnValue(builder);
}

function postgrestError(message: string, code: string) {
  return Object.assign(new Error(message), { name: "PostgrestError", code, details: "", hint: "" });
}

const originalEnv = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = {
    ...originalEnv,
    NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE_KEY,
  };
  jest.mocked(createClient).mockReturnValue({ rpc } as never);
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  process.env = originalEnv;
  jest.mocked(console.error).mockRestore();
});

async function getHealth() {
  const response = await GET();
  const text = await response.text();
  return { response, text, body: JSON.parse(text) };
}

function expectNoSecrets(text: string) {
  expect(text).not.toContain(SUPABASE_URL);
  expect(text).not.toContain("secret-project-ref");
  expect(text).not.toContain(PUBLISHABLE_KEY);
  expect(text).not.toMatch(/stack|at Object\.|\.ts:\d+/i);
}

describe("GET /api/health", () => {
  it("reports ok with 200 after a real round trip to the database", async () => {
    mockRpcResult(Promise.resolve({ data: true, error: null }));

    const { response, body, text } = await getHealth();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/application\/json/);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toEqual({
      status: "ok",
      checks: {
        database: { status: "ok", latencyMs: expect.any(Number) },
        auth: { status: "not_checked" },
      },
      checkedAt: expect.any(String),
    });
    expect(Number.isNaN(Date.parse(body.checkedAt))).toBe(false);
    expectNoSecrets(text);
  });

  it("checks the database anonymously with the read-only db_health function", async () => {
    mockRpcResult(Promise.resolve({ data: true, error: null }));

    await getHealth();

    expect(createClient).toHaveBeenCalledWith(
      SUPABASE_URL,
      PUBLISHABLE_KEY,
      expect.objectContaining({ auth: expect.objectContaining({ persistSession: false }) }),
    );
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("db_health");
    expect(abortSignal).toHaveBeenCalledWith(expect.any(AbortSignal));
    expect(throwOnError).toHaveBeenCalled();
  });

  it("does not report the database healthy when the check returns something other than true", async () => {
    mockRpcResult(Promise.resolve({ data: null, error: null }));

    const { response, body } = await getHealth();

    expect(response.status).toBe(503);
    expect(body.status).toBe("unavailable");
    expect(body.checks.database).toEqual({ status: "error", reason: "query_failed" });
  });

  it("returns 503 without internal details when the query fails", async () => {
    mockRpcResult(Promise.reject(postgrestError(`connection refused at ${SUPABASE_URL} password=hunter2`, "PGRST000")));

    const { response, body, text } = await getHealth();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toEqual({
      status: "unavailable",
      checks: {
        database: { status: "error", reason: "query_failed" },
        auth: { status: "not_checked" },
      },
      checkedAt: expect.any(String),
    });
    expect(text).not.toContain("hunter2");
    expect(text).not.toContain("connection refused");
    expectNoSecrets(text);
  });

  it("returns 503 when the database cannot be reached at all", async () => {
    mockRpcResult(Promise.reject(new TypeError(`fetch failed: getaddrinfo ENOTFOUND ${SUPABASE_URL}`)));

    const { response, body, text } = await getHealth();

    expect(response.status).toBe(503);
    expect(body.checks.database).toEqual({ status: "error", reason: "unreachable" });
    expect(text).not.toContain("ENOTFOUND");
    expectNoSecrets(text);
  });

  it.each(["TimeoutError", "AbortError"])("returns 503 with reason timeout on %s", async (name) => {
    mockRpcResult(Promise.reject(new DOMException("The operation timed out.", name)));

    const { response, body } = await getHealth();

    expect(response.status).toBe(503);
    expect(body.checks.database).toEqual({ status: "error", reason: "timeout" });
  });

  it("returns 503 with reason query_failed when the probe function is missing", async () => {
    mockRpcResult(Promise.reject(postgrestError("Could not find the function public.db_health", "PGRST202")));

    const { response, body, text } = await getHealth();

    expect(response.status).toBe(503);
    expect(body.checks.database).toEqual({ status: "error", reason: "query_failed" });
    expect(text).not.toContain("public.db_health");
  });

  it("returns 503 with reason not_configured when the Supabase settings are missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const { response, body, text } = await getHealth();

    expect(response.status).toBe(503);
    expect(body.checks.database).toEqual({ status: "error", reason: "not_configured" });
    expect(createClient).not.toHaveBeenCalled();
    expect(text).not.toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(text).not.toContain(".env.local");
  });

  it("never sends a user session to the database check", async () => {
    mockRpcResult(Promise.resolve({ data: true, error: null }));

    await getHealth();

    const options = jest.mocked(createClient).mock.calls[0][2] as { auth?: Record<string, unknown> };
    expect(options.auth).toMatchObject({ persistSession: false, autoRefreshToken: false });
  });
});
