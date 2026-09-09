import type { SessionExercise, SetEntry } from '../types';
import { est1RM, exerciseMetrics, setLoad } from './metrics';

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

/** Best-ever numbers across a list of performed instances of one exercise. */
export function computeRecords(entries: SessionExercise[]): Records {
  const r: Records = { ...EMPTY_RECORDS };
  for (const ex of entries) {
    const m = exerciseMetrics(ex);
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
export function setRecord(ex: SessionExercise, set: SetEntry, records: Records): RecordKind | null {
  if (!set.completed || set.warmup || set.reps == null || set.reps <= 0) return null;

  if (ex.measure === 'seconds') {
    return records.bestSeconds == null || set.reps > records.bestSeconds ? 'seconds' : null;
  }
  if (ex.loadType === 'assisted') {
    if (set.weight == null) return null;
    return records.minAssistance == null || set.weight < records.minAssistance ? 'assistance' : null;
  }
  if (ex.loadType === 'bodyweight' && set.weight == null) {
    return records.bestReps == null || set.reps > records.bestReps ? 'reps' : null;
  }
  if (set.weight == null) return null;
  if (records.bestWeight == null || set.weight > records.bestWeight) return 'weight';
  const e = est1RM(setLoad(ex, set.weight), set.reps);
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

/** Records set during one exercise instance, for the workout summary. */
export function exerciseRecordsBeaten(ex: SessionExercise, prior: Records): RecordKind[] {
  const kinds = new Set<RecordKind>();
  // Walk sets in order, updating the running records so a single exercise
  // reports each kind at most once.
  const running = { ...prior };
  for (const set of ex.sets) {
    const kind = setRecord(ex, set, running);
    if (!kind) continue;
    kinds.add(kind);
    if (kind === 'weight') running.bestWeight = set.weight;
    if (kind === 'assistance') running.minAssistance = set.weight;
    if (kind === 'reps') running.bestReps = set.reps;
    if (kind === 'seconds') running.bestSeconds = set.reps;
    if (kind === 'e1rm' || kind === 'weight') {
      running.bestE1RM = Math.max(running.bestE1RM ?? 0, est1RM(setLoad(ex, set.weight!), set.reps!));
    }
  }
  return [...kinds];
}
