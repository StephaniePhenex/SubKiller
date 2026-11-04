import { createAdminClient } from "@/lib/supabase/admin";

describe("createAdminClient", () => {
  const original = { ...process.env };

  afterAll(() => {
    process.env = original;
  });

  it("refuses to run where `window` exists, so the secret key can never ship to a browser", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SECRET_KEY = "sb_secret_test_value";
    // jsdom provides `window`, like a browser.
    expect(typeof window).toBe("object");

    expect(() => createAdminClient()).toThrow(/server/i);
  });
});
