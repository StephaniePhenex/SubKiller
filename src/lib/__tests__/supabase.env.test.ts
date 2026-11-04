import { getSupabaseEnv, getSupabaseSecretKey } from "@/lib/supabase/env";

const URL = "https://example.supabase.co";
const KEY = "sb_publishable_test_value";

describe("getSupabaseEnv", () => {
  const original = { ...process.env };

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  afterAll(() => {
    process.env = original;
  });

  it("returns the project URL and publishable key", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = URL;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = KEY;

    expect(getSupabaseEnv()).toEqual({ url: URL, publishableKey: KEY });
  });

  it("names the missing URL variable", () => {
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = KEY;

    expect(() => getSupabaseEnv()).toThrow("NEXT_PUBLIC_SUPABASE_URL");
  });

  it("names the missing publishable key variable", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = URL;

    expect(() => getSupabaseEnv()).toThrow("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  });

  it("does not fall back to the legacy anon key name", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = KEY;

    expect(() => getSupabaseEnv()).toThrow("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  });
});

describe("getSupabaseSecretKey", () => {
  const original = { ...process.env };

  beforeEach(() => {
    delete process.env.SUPABASE_SECRET_KEY;
  });

  afterAll(() => {
    process.env = original;
  });

  it("returns the server-only secret key", () => {
    process.env.SUPABASE_SECRET_KEY = "sb_secret_test_value";

    expect(getSupabaseSecretKey()).toBe("sb_secret_test_value");
  });

  it("names the missing variable", () => {
    expect(() => getSupabaseSecretKey()).toThrow("SUPABASE_SECRET_KEY");
  });

  it("does not accept the public publishable key in its place", () => {
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = KEY;

    expect(() => getSupabaseSecretKey()).toThrow("SUPABASE_SECRET_KEY");
  });
});
