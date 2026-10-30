import { toInsertRow, toSubscription, toUpdateRow } from "@/lib/subscriptions/mapper";

const USER_ID = "11111111-1111-4111-8111-111111111111";

describe("toSubscription", () => {
  it("maps every snake_case column to camelCase", () => {
    const row = {
      id: "a0000000-0000-4000-8000-000000000001",
      user_id: USER_ID,
      name: "Netflix",
      cost: 15.99,
      frequency: "monthly" as const,
      feeling: "Kind of guilty.",
      ai_score: 20,
      verdict: "You rewatched one sitcom twice.",
      created_at: "2026-10-30T12:00:00+00:00",
    };

    expect(toSubscription(row)).toEqual({
      id: "a0000000-0000-4000-8000-000000000001",
      userId: USER_ID,
      name: "Netflix",
      cost: 15.99,
      frequency: "monthly",
      feeling: "Kind of guilty.",
      aiScore: 20,
      verdict: "You rewatched one sitcom twice.",
      createdAt: "2026-10-30T12:00:00+00:00",
    });
  });

  it("returns cost as a number even when Postgres numeric arrives as a string", () => {
    const row = {
      id: "a0000000-0000-4000-8000-000000000001",
      user_id: USER_ID,
      name: "Adobe",
      cost: "659.88" as unknown as number,
      frequency: "yearly" as const,
      feeling: "",
      ai_score: null,
      verdict: null,
      created_at: "2026-10-30T12:00:00+00:00",
    };

    const subscription = toSubscription(row);

    expect(subscription.cost).toBe(659.88);
    expect(subscription.aiScore).toBeNull();
    expect(subscription.verdict).toBeNull();
  });
});

describe("toInsertRow", () => {
  it("maps camelCase input to snake_case and sets the owner", () => {
    expect(toInsertRow({ name: "Gym", cost: 54, frequency: "monthly", feeling: "I will go." }, USER_ID)).toEqual({
      user_id: USER_ID,
      name: "Gym",
      cost: 54,
      frequency: "monthly",
      feeling: "I will go.",
    });
  });

  it("defaults feeling to empty", () => {
    expect(toInsertRow({ name: "Gym", cost: 54, frequency: "monthly" }, USER_ID)).toEqual({
      user_id: USER_ID,
      name: "Gym",
      cost: 54,
      frequency: "monthly",
      feeling: "",
    });
  });

  it("never sends a client-supplied AI score or verdict", () => {
    const input = {
      name: "Gym",
      cost: 54,
      frequency: "monthly",
      aiScore: 100,
      verdict: "Keep it.",
    } as unknown as Parameters<typeof toInsertRow>[0];

    const row = toInsertRow(input, USER_ID);

    expect(row).not.toHaveProperty("ai_score");
    expect(row).not.toHaveProperty("verdict");
  });
});

describe("toUpdateRow", () => {
  it("maps only the fields that are present", () => {
    expect(toUpdateRow({ cost: 22.99 })).toEqual({ cost: 22.99 });
  });

  it("drops fields a user may not edit, even if they slip through at runtime", () => {
    const patch = {
      name: "Netflix Premium",
      aiScore: 99,
      verdict: "Totally worth it.",
      userId: "22222222-2222-4222-8222-222222222222",
      createdAt: "2020-01-01T00:00:00+00:00",
    } as unknown as Parameters<typeof toUpdateRow>[0];

    expect(toUpdateRow(patch)).toEqual({ name: "Netflix Premium" });
  });
});
