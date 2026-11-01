import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getSignedInUser } from "@/lib/auth";

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

const USER_ID = "user-1";
const getUser = jest.fn();

function setCookieJar(jar: { name: string; value: string }[]) {
  jest.mocked(cookies).mockResolvedValue({
    get: (name: string) => jar.find((cookie) => cookie.name === name),
    getAll: () => jar,
    set: jest.fn(),
    delete: jest.fn(),
  } as never);
}

/**
 * The signed-in layout renders the receipt shell only when getSignedInUser()
 * returns a user. Confess, Review, and Graveyard all sit behind that check.
 */
describe("financial page access", () => {
  beforeEach(() => {
    getUser.mockReset();
    jest.mocked(createClient).mockReset().mockResolvedValue({
      auth: { getUser },
    } as never);
  });

  it("blocks /confess, /review, and /graveyard until Supabase confirms a user", async () => {
    setCookieJar([]);
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(getSignedInUser()).resolves.toBeNull();
    expect(getUser).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["local stand-in cookie", [{ name: "subkiller-session", value: "signed-in" }]],
    ["sb-*-auth-token cookie", [{ name: "sb-project-auth-token", value: "raw-token" }]],
  ])("blocks the receipt shell for a %s when Supabase has no user", async (_label, jar) => {
    setCookieJar(jar);
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(getSignedInUser()).resolves.toBeNull();
    expect(getUser).toHaveBeenCalledTimes(1);
  });

  it("admits a signed-in Supabase user to the receipt shell", async () => {
    setCookieJar([]);
    getUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });

    const user = await getSignedInUser();

    expect(getUser).toHaveBeenCalledTimes(1);
    expect(user).toMatchObject({ id: USER_ID });
  });
});
