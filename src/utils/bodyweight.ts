import type { BodyweightEntry } from '../types';

/** Bodyweight in effect on a date: the latest entry at or before it, else the earliest entry, else null. */
export function bodyweightOn(log: BodyweightEntry[], date: string): number | null {
  if (log.length === 0) return null;
  // Log is newest-first.
  for (const entry of log) {
    if (entry.date <= date) return entry.weight;
  }
  return log[log.length - 1].weight;
}

/** Insert or replace an entry for a date, keeping newest-first order. */
export function upsertBodyweight(log: BodyweightEntry[], entry: BodyweightEntry): BodyweightEntry[] {
  const rest = log.filter(e => e.date !== entry.date);
  return [...rest, entry].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
