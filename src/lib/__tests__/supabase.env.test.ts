import { getSupabaseEnv } from "@/lib/supabase/env";

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
