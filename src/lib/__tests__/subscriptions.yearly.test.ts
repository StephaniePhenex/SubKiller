import { YEARLY_FACTOR, yearlyCents } from "@/lib/subscriptions/yearly";
import { toMonthly } from "@/components/receipt/data";

describe("yearly normalization", () => {
  it("uses the same rates as the SQL aggregate: weekly x 52, monthly x 12, yearly x 1", () => {
    expect(YEARLY_FACTOR).toEqual({ weekly: 52, monthly: 12, yearly: 1 });
  });

  it.each(["weekly", "monthly", "yearly"] as const)("matches the simulator's toMonthly x 12 for %s", (frequency) => {
    expect(yearlyCents(10, frequency) / 100).toBeCloseTo(toMonthly(10, frequency) * 12, 10);
  });

  it("counts in whole cents, so sums never drift", () => {
    expect(yearlyCents(15, "monthly")).toBe(18_000);
    expect(yearlyCents(10, "weekly")).toBe(52_000);
    expect(yearlyCents(120, "yearly")).toBe(12_000);
    // 15.99 x 52 is 831.4799999... in floating point; in cents it is exact.
    expect(yearlyCents(15.99, "weekly")).toBe(83_148);
    expect([0.1, 0.1, 0.1].reduce((sum, cost) => sum + yearlyCents(cost, "monthly"), 0)).toBe(360);
  });

  it("treats a missing or invalid cost as 0, never NaN", () => {
    expect(yearlyCents(Number.NaN, "monthly")).toBe(0);
    expect(yearlyCents(-5, "monthly")).toBe(0);
  });
});
