import type { Unit } from '../types';

export const DEFAULT_PLATES: Record<Unit, number[]> = {
  lbs: [45, 35, 25, 10, 5, 2.5],
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
};

export const BAR_OPTIONS: Record<Unit, number[]> = {
  lbs: [45, 35, 25, 15],
  kg: [20, 15, 10, 7.5],
};

export interface PlateBreakdown {
  /** Plates to load on ONE side, heaviest first. */
  perSide: number[];
  /** Total the bar actually comes to (may be below target if plates can't make it). */
  achieved: number;
  /** Target minus achieved; 0 when exact. */
  remainder: number;
}

/** Greedy per-side breakdown. Assumes the plate list is sorted descending. */
export function platesPerSide(target: number, bar: number, plates: number[]): PlateBreakdown {
  const perSide: number[] = [];
  let remaining = Math.max(0, (target - bar) / 2);
  for (const plate of plates) {
    while (remaining >= plate - 1e-9) {
      perSide.push(plate);
      remaining -= plate;
    }
  }
  const achieved = bar + 2 * perSide.reduce((a, b) => a + b, 0);
  return { perSide, achieved, remainder: Math.round((target - achieved) * 100) / 100 };
}

/** "45, 25, 10" or "45 ×2, 10" style compact list. */
export function formatPlates(perSide: number[]): string {
  if (perSide.length === 0) return 'empty bar';
  const counts = new Map<number, number>();
  for (const p of perSide) counts.set(p, (counts.get(p) ?? 0) + 1);
  return [...counts.entries()].map(([p, n]) => (n > 1 ? `${p} ×${n}` : `${p}`)).join(', ');
}
