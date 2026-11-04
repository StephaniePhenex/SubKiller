import { fromStoredSubscription } from "@/components/receipt/data";

const base = {
  id: "a0000000-0000-4000-8000-000000000001",
  userId: "11111111-1111-4111-8111-111111111111",
  name: "Iron Temple Gym",
  cost: 54,
  frequency: "monthly" as const,
  feeling: "I never go.",
  createdAt: "2026-11-03T12:00:00+00:00",
};

/**
 * After a refresh the Graveyard rebuilds its list from stored rows, so the
 * cancel mark must come from the stored score, not from client memory.
 */
describe("fromStoredSubscription", () => {
  it("marks a stored score under 30 to cancel", () => {
    expect(fromStoredSubscription({ ...base, aiScore: 18, verdict: "Two visits since January." })).toEqual({
      id: base.id,
      name: "Iron Temple Gym",
      cost: 54,
      frequency: "monthly",
      feeling: "I never go.",
      aiScore: 18,
      verdict: "Two visits since January.",
      killed: true,
    });
  });

  it.each([30, 69, 70, 100])("does not mark a stored score of %d", (aiScore) => {
    expect(fromStoredSubscription({ ...base, aiScore, verdict: "Fine." })?.killed).toBe(false);
  });

  it("returns null for a row that has not been scored yet, so no score is invented", () => {
    expect(fromStoredSubscription({ ...base, aiScore: null, verdict: null })).toBeNull();
  });
});
