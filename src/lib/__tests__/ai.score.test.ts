import { isMarkedToCancel, scoreBand } from "@/lib/ai/score";

describe("scoreBand", () => {
  it.each([
    [0, "kill", "Kill it"],
    [12, "kill", "Kill it"],
    [29, "kill", "Kill it"],
    [30, "think", "Think hard"],
    [45, "think", "Think hard"],
    [69, "think", "Think hard"],
    [70, "keep", "Keep it"],
    [82, "keep", "Keep it"],
    [100, "keep", "Keep it"],
  ])("puts %d in the %s band (%s)", (score, tone, label) => {
    expect(scoreBand(score)).toEqual({ tone, label });
  });
});

describe("isMarkedToCancel", () => {
  it.each([0, 18, 29])("marks a score of %d for cancellation", (score) => {
    expect(isMarkedToCancel(score)).toBe(true);
  });

  it.each([30, 41, 69, 70, 100])("does not mark a score of %d", (score) => {
    expect(isMarkedToCancel(score)).toBe(false);
  });

  it("does not mark a subscription that has no score yet", () => {
    expect(isMarkedToCancel(null)).toBe(false);
  });
});
