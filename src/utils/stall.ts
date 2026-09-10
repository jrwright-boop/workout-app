import type { ExerciseTypeFields, Unit } from '../types';
import type { HistoryEntry } from './exerciseHistory';
import { workingSets } from './metrics';
import { hitTopOfRange } from './repRange';
import { defaultIncrement, roundForUnit } from './units';

export type ProgressAssessment =
  | { kind: 'stalled'; sessions: number; weight: number }
  | { kind: 'regressing'; misses: number; suggestedWeight: number | null }
  | null;

const STALL_SESSIONS = 4;
const REGRESS_MISSES = 2;

/** The load the user is "working at" in a session: top working weight (or lowest assistance). */
function workingLoad(entry: HistoryEntry): number | null {
  const weights = workingSets(entry.exercise).map(s => s.weight).filter((w): w is number => w != null);
  if (weights.length === 0) return null;
  return entry.exercise.loadType === 'assisted' ? Math.min(...weights) : Math.max(...weights);
}

/**
 * Look at recent same-day scheduled history (newest first, deloads already
 * excluded) and say whether the exercise is stuck or sliding.
 *
 * - regressing: the last N sessions each had a working set below the bottom
 *   of the target range → suggest a ~10% drop, rounded to the increment.
 * - stalled: the same load for N+ consecutive sessions without ever hitting
 *   the top of the range.
 */
export function assessProgress(
  entries: HistoryEntry[],
  template: ExerciseTypeFields & { targetRepMin: number | null; targetRepMax: number | null },
  unit: Unit
): ProgressAssessment {
  if (entries.length === 0) return null;
  const inc = template.increment ?? defaultIncrement(unit);

  if (template.targetRepMin != null) {
    let misses = 0;
    for (const e of entries) {
      const sets = workingSets(e.exercise).filter(s => s.completed && s.reps != null);
      if (sets.length === 0) break;
      if (sets.some(s => s.reps! < template.targetRepMin!)) misses++;
      else break;
    }
    if (misses >= REGRESS_MISSES) {
      const load = workingLoad(entries[0]);
      let suggestedWeight: number | null = null;
      if (load != null) {
        const dropped = template.loadType === 'assisted' ? load * 1.1 : load * 0.9;
        suggestedWeight = Math.round(roundForUnit(dropped, unit) / inc) * inc;
        if (suggestedWeight === load) suggestedWeight = template.loadType === 'assisted' ? load + inc : Math.max(0, load - inc);
      }
      return { kind: 'regressing', misses, suggestedWeight };
    }
  }

  const first = workingLoad(entries[0]);
  if (first == null) return null;
  let run = 0;
  for (const e of entries) {
    if (workingLoad(e) !== first) break;
    if (template.targetRepMax != null && hitTopOfRange(e.exercise)) break;
    run++;
  }
  if (run >= STALL_SESSIONS) return { kind: 'stalled', sessions: run, weight: first };
  return null;
}
