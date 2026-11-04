import type { Frequency } from "./types";

/**
 * Billing periods per year. The yearly_bleed SQL function uses the same
 * factors, and they match the simulator's toMonthly x 12.
 */
export const YEARLY_FACTOR: Record<Frequency, number> = { weekly: 52, monthly: 12, yearly: 1 };

/** A subscription's yearly cost in whole cents, so sums of many rows never drift. Invalid costs count as 0. */
export function yearlyCents(cost: number, frequency: Frequency): number {
  if (!Number.isFinite(cost) || cost <= 0) return 0;
  return Math.round(cost * 100) * YEARLY_FACTOR[frequency];
}
