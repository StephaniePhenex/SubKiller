/**
 * @jest-environment node
 */
import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { refreshSession } from "@/lib/supabase/session";

jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(),
}));

const URL = "https://example.supabase.co";
const KEY = "sb_publishable_test_value";

function requestWith(cookie?: string) {
  return new NextRequest("http://localhost:3000/confess", {
    headers: cookie ? { cookie } : undefined,
  });
}

describe("refreshSession", () => {
  const original = { ...process.env };

  beforeEach(() => {
    jest.mocked(createServerClient).mockReset();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  });

  afterAll(() => {
    process.env = original;
  });

  it("continues without calling Supabase when the public env is missing", async () => {
    const response = await refreshSession(requestWith("sb-project-auth-token=raw"));

    expect(response.status).toBe(200);
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("skips the network when the request has no Supabase auth cookie", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = URL;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = KEY;

    await refreshSession(requestWith("subkiller-session=signed-in"));

    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("refreshes an auth cookie and writes the new cookies onto the response", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = URL;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = KEY;
    const getUser = jest.fn(async () => ({ data: { user: { id: "user-1" } }, error: null }));
    jest.mocked(createServerClient).mockImplementation((_url, _key, options) => {
      const setAll = options.cookies.setAll;
      if (!setAll) throw new Error("setAll is required");
      getUser.mockImplementation(async () => {
        setAll(
          [{ name: "sb-project-auth-token", value: "refreshed", options: { path: "/" } }],
          { "Cache-Control": "private, no-store" },
        );
        return { data: { user: { id: "user-1" } }, error: null };
      });
      return { auth: { getUser } } as never;
    });

    const response = await refreshSession(requestWith("sb-project-auth-token=expired"));

    expect(createServerClient).toHaveBeenCalledWith(URL, KEY, expect.any(Object));
    expect(getUser).toHaveBeenCalledTimes(1);
    expect(response.cookies.get("sb-project-auth-token")?.value).toBe("refreshed");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
