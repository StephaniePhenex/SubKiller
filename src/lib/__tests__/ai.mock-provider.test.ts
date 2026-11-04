import { getVerdictProvider, mockVerdictProvider, type VerdictInput } from "@/lib/ai/provider";
import { parseVerdictResponse } from "@/lib/ai/verdict";

const netflix: VerdictInput = {
  name: "Netflix",
  cost: 15.99,
  frequency: "monthly",
  feeling: "Kind of guilty. I keep it in case.",
};

const score = async (input: VerdictInput) => parseVerdictResponse(await mockVerdictProvider.complete(input)).aiScore;

describe("deterministic mock verdict provider", () => {
  it("identifies itself as a mock, not a real AI model", () => {
    expect(mockVerdictProvider.isMock).toBe(true);
    expect(mockVerdictProvider.id).toMatch(/mock/);
  });

  it("is the provider in use while no AI provider is configured", () => {
    expect(getVerdictProvider()).toBe(mockVerdictProvider);
  });

  it("returns raw JSON that the strict parser accepts", async () => {
    const raw = await mockVerdictProvider.complete(netflix);
    expect(typeof raw).toBe("string");
    const parsed = parseVerdictResponse(raw);
    expect(Number.isInteger(parsed.aiScore)).toBe(true);
    expect(parsed.aiScore).toBeGreaterThanOrEqual(0);
    expect(parsed.aiScore).toBeLessThanOrEqual(100);
    expect(parsed.verdict.length).toBeGreaterThan(0);
  });

  it("is deterministic: the same confession always gets the same verdict", async () => {
    expect(await mockVerdictProvider.complete(netflix)).toBe(await mockVerdictProvider.complete({ ...netflix }));
  });

  it("scores from cost, frequency, and sentiment", async () => {
    expect(await score({ ...netflix, feeling: "I love it and use it every day." })).toBeGreaterThan(
      await score({ ...netflix, feeling: "I forget I even have it. Total waste." }),
    );
    expect(await score({ ...netflix, cost: 2.99 })).toBeGreaterThan(await score({ ...netflix, cost: 89.99 }));
    // $15.99 a week costs far more per year than $15.99 a year.
    expect(await score({ ...netflix, frequency: "yearly" })).toBeGreaterThan(
      await score({ ...netflix, frequency: "weekly" }),
    );
  });

  it("puts an expensive, regretted subscription under 30 and a cheap, loved one at 70 or above", async () => {
    expect(
      await score({ name: "Iron Temple Gym", cost: 54, frequency: "monthly", feeling: "I never go. Total waste." }),
    ).toBeLessThan(30);
    expect(
      await score({ name: "Spotify", cost: 11.99, frequency: "monthly", feeling: "I love it and use it every day." }),
    ).toBeGreaterThanOrEqual(70);
  });
});
