import type { SessionExercise, SetEntry } from '../types';
import { est1RM, exerciseMetrics, setLoad } from './metrics';
import type { HistoryEntry } from './exerciseHistory';

export interface Records {
  bestWeight: number | null;
  bestE1RM: number | null;
  bestVolume: number | null;
  bestReps: number | null;
  bestSeconds: number | null;
  /** Lowest assistance ever used (assisted exercises: lower is better). */
  minAssistance: number | null;
}

export const EMPTY_RECORDS: Records = {
  bestWeight: null, bestE1RM: null, bestVolume: null, bestReps: null, bestSeconds: null, minAssistance: null,
};

const max = (a: number | null, b: number | null) => (a == null ? b : b == null ? a : Math.max(a, b));
const min = (a: number | null, b: number | null) => (a == null ? b : b == null ? a : Math.min(a, b));

/** Best-ever numbers across performed instances of one exercise. */
export function computeRecords(entries: HistoryEntry[]): Records {
  const r: Records = { ...EMPTY_RECORDS };
  for (const { exercise, session } of entries) {
    const m = exerciseMetrics(exercise, session.bodyweight);
    r.bestWeight = max(r.bestWeight, m.bestWeight);
    r.bestE1RM = max(r.bestE1RM, m.e1rm);
    r.bestVolume = m.volume > 0 ? max(r.bestVolume, m.volume) : r.bestVolume;
    r.bestReps = max(r.bestReps, m.bestReps);
    r.bestSeconds = max(r.bestSeconds, m.bestSeconds);
    r.minAssistance = min(r.minAssistance, m.minAssistance);
  }
  return r;
}

export type RecordKind = 'weight' | 'e1rm' | 'reps' | 'seconds' | 'assistance';

/**
 * Does this completed working set beat a prior record? Returns the kind of
 * record (for the badge) or null. Direction flips for assisted exercises.
 */
export function setRecord(ex: SessionExercise, set: SetEntry, records: Records, bodyweight: number | null = null): RecordKind | null {
  if (!set.completed || set.warmup || set.reps == null || set.reps <= 0) return null;

  if (ex.measure === 'seconds') {
    return records.bestSeconds == null || set.reps > records.bestSeconds ? 'seconds' : null;
  }
  if (ex.loadType === 'assisted') {
    if (set.weight == null) return null;
    return records.minAssistance == null || set.weight < records.minAssistance ? 'assistance' : null;
  }
  if (ex.loadType === 'bodyweight' && set.weight == null) {
    if (records.bestReps == null || set.reps > records.bestReps) return 'reps';
    const e = est1RM(setLoad(ex, null, bodyweight), set.reps);
    return e > 0 && (records.bestE1RM == null || e > records.bestE1RM) ? 'e1rm' : null;
  }
  if (set.weight == null) return null;
  if (records.bestWeight == null || set.weight > records.bestWeight) return 'weight';
  const e = est1RM(setLoad(ex, set.weight, bodyweight), set.reps);
  if (e > 0 && (records.bestE1RM == null || e > records.bestE1RM)) return 'e1rm';
  return null;
}

export function recordLabel(kind: RecordKind): string {
  switch (kind) {
    case 'weight': return 'Heaviest';
    case 'e1rm': return 'Best est. 1RM';
    case 'reps': return 'Most reps';
    case 'seconds': return 'Longest hold';
    case 'assistance': return 'Least assistance';
  }
}

/** Advance running records after a set beat one, so each kind reports once. */
export function applyRecord(running: Records, ex: SessionExercise, set: SetEntry, kind: RecordKind, bodyweight: number | null = null): void {
  if (kind === 'weight') running.bestWeight = set.weight;
  if (kind === 'assistance') running.minAssistance = set.weight;
  if (kind === 'reps') running.bestReps = set.reps;
  if (kind === 'seconds') running.bestSeconds = set.reps;
  if (kind === 'e1rm' || kind === 'weight' || kind === 'reps') {
    const e = est1RM(setLoad(ex, set.weight, bodyweight), set.reps!);
    if (e > 0) running.bestE1RM = Math.max(running.bestE1RM ?? 0, e);
  }
}

/** Records set during one exercise instance, for the workout summary. */
export function exerciseRecordsBeaten(ex: SessionExercise, prior: Records, bodyweight: number | null = null): RecordKind[] {
  const kinds = new Set<RecordKind>();
  const running = { ...prior };
  for (const set of ex.sets) {
    const kind = setRecord(ex, set, running, bodyweight);
    if (!kind) continue;
    kinds.add(kind);
    applyRecord(running, ex, set, kind, bodyweight);
  }
  return [...kinds];
}
