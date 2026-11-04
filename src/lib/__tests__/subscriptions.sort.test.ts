import { sortByScore } from "@/lib/subscriptions/sort";

type Item = { id: string; name: string; aiScore: number | null };

const item = (id: string, name: string, aiScore: number | null): Item => ({ id, name, aiScore });
const names = (list: Item[]) => list.map((s) => s.name);

describe("sortByScore", () => {
  it("puts the weakest subscriptions first", () => {
    const list = [
      item("4", "Cloud Storage", 91),
      item("2", "Streaming Service", 28),
      item("1", "Unused Gym", 12),
      item("3", "Music Service", 65),
    ];

    expect(names(sortByScore(list))).toEqual(["Unused Gym", "Streaming Service", "Music Service", "Cloud Storage"]);
  });

  it("compares scores as numbers, not as text", () => {
    const list = [item("a", "Hundred", 100), item("b", "Nine", 9), item("c", "Ten", 10)];

    expect(names(sortByScore(list))).toEqual(["Nine", "Ten", "Hundred"]);
  });

  it("treats 0 as a real score and puts it first", () => {
    const list = [item("a", "Five", 5), item("b", "Zero", 0), item("c", "Unscored", null)];

    expect(names(sortByScore(list))).toEqual(["Zero", "Five", "Unscored"]);
  });

  it("puts unscored subscriptions after every scored one", () => {
    const list = [item("a", "Unscored A", null), item("b", "High", 99), item("c", "Unscored B", null), item("d", "Low", 1)];

    expect(names(sortByScore(list))).toEqual(["Low", "High", "Unscored A", "Unscored B"]);
  });

  it("orders equal scores by name, then by id, so ties never shuffle", () => {
    const list = [item("2", "netflix", 40), item("9", "Adobe", 40), item("1", "Netflix", 40), item("5", "Zed", 39)];

    expect(sortByScore(list).map((s) => s.id)).toEqual(["5", "9", "1", "2"]);
    expect(sortByScore([...list].reverse()).map((s) => s.id)).toEqual(["5", "9", "1", "2"]);
  });

  it("returns an empty list for an empty list", () => {
    expect(sortByScore([])).toEqual([]);
  });

  it("does not mutate the records it was given", () => {
    const list = [item("a", "High", 90), item("b", "Low", 10)];
    const before = structuredClone(list);

    const sorted = sortByScore(list);

    expect(list).toEqual(before);
    expect(sorted).not.toBe(list);
  });
});
