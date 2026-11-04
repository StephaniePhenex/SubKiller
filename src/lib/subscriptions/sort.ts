type Sortable = { id: string; name: string; aiScore: number | null };

/**
 * Weakest first: ascending AI score, compared as numbers, so 0 comes first.
 * Unscored rows go after every scored one. Ties sort by name (case-insensitive),
 * then by id, so the order never depends on how the rows arrived.
 * Returns a new array; the input is not changed.
 */
export function sortByScore<T extends Sortable>(list: readonly T[]): T[] {
  return [...list].sort((a, b) => {
    if (a.aiScore !== b.aiScore) {
      if (a.aiScore === null) return 1;
      if (b.aiScore === null) return -1;
      return a.aiScore - b.aiScore;
    }
    const byName = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    if (byName !== 0) return byName;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}
