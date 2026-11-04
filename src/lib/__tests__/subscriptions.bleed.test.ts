import { InvalidAggregateError, NotAuthenticatedError, getYearlyBleed } from "@/lib/subscriptions/repository";

type Client = Parameters<typeof getYearlyBleed>[0];

const USER_ID = "11111111-1111-4111-8111-111111111111";

function fakeClient(result: { data: unknown; error: { message: string } | null }, user: { id: string } | null = { id: USER_ID }) {
  const rpc = jest.fn(async () => result);
  const from = jest.fn();
  const getUser = jest.fn(async () => ({ data: { user }, error: user ? null : { message: "Auth session missing!" } }));
  return { client: { rpc, from, auth: { getUser } } as unknown as Client, rpc, from };
}

describe("getYearlyBleed (SQL SUM baseline)", () => {
  it("calls the yearly_bleed aggregate with no arguments: the database picks the user from the session", async () => {
    const { client, rpc, from } = fakeClient({ data: 820, error: null });

    await expect(getYearlyBleed(client)).resolves.toBe(820);

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("yearly_bleed");
    // The baseline is the database's SUM, not a sum of rows fetched into the browser.
    expect(from).not.toHaveBeenCalled();
  });

  it("refuses to run without a signed-in user", async () => {
    const { client, rpc } = fakeClient({ data: 820, error: null }, null);

    await expect(getYearlyBleed(client)).rejects.toBeInstanceOf(NotAuthenticatedError);
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["a number", 820, 820],
    ["a numeric string", "820.00", 820],
    ["a string with cents", "835.08", 835.08],
    ["zero for an empty account", 0, 0],
    ["the string zero", "0", 0],
  ])("accepts %s", async (_label, data, expected) => {
    await expect(getYearlyBleed(fakeClient({ data, error: null }).client)).resolves.toBe(expected);
  });

  it("rounds to whole cents", async () => {
    await expect(getYearlyBleed(fakeClient({ data: "831.479999", error: null }).client)).resolves.toBe(831.48);
  });

  it.each([
    ["null", null],
    ["text", "a lot"],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["a negative total", -1],
    ["an object", { total: 820 }],
    ["an empty string", ""],
  ])("rejects %s instead of showing a wrong total", async (_label, data) => {
    await expect(getYearlyBleed(fakeClient({ data, error: null }).client)).rejects.toBeInstanceOf(InvalidAggregateError);
  });

  it("surfaces a database error", async () => {
    await expect(getYearlyBleed(fakeClient({ data: null, error: { message: "function missing" } }).client)).rejects.toThrow(
      "function missing",
    );
  });
});
