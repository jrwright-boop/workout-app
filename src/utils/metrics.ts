import type { SessionExercise, SetEntry, WorkoutSession } from '../types';

/** Sets that count: not warm-ups. */
export function workingSets(ex: SessionExercise): SetEntry[] {
  return ex.sets.filter(s => !s.warmup);
}

export function est1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  return Math.round(weight * (1 + reps / 30));
}

/**
 * Load moved in one set for volume purposes. Assistance is not load, so
 * assisted sets contribute nothing; bodyweight counts only the added weight
 * (we don't know the user's bodyweight); per-side doubles.
 */
export function setLoad(ex: Pick<SessionExercise, 'loadType' | 'perSide'>, weight: number | null): number {
  if (ex.loadType === 'assisted') return 0;
  const w = weight ?? 0;
  return ex.perSide ? w * 2 : w;
}

export function exerciseVolume(ex: SessionExercise): number {
  if (ex.skipped || ex.measure === 'seconds') return 0;
  let volume = 0;
  for (const set of workingSets(ex)) {
    if (set.weight != null && set.reps != null) volume += setLoad(ex, set.weight) * set.reps;
  }
  if (ex.burndown) {
    for (const drop of ex.burndown.drops) {
      if (drop.weight != null && drop.reps != null) volume += setLoad(ex, drop.weight) * drop.reps;
    }
  }
  return volume;
}

export function sessionVolume(session: WorkoutSession): number {
  return session.exercises.reduce((sum, ex) => sum + exerciseVolume(ex), 0);
}

/** Per-exercise-instance summary numbers; null when the metric doesn't apply. */
export interface ExerciseMetrics {
  /** Best estimated one-rep max (external / weighted bodyweight, rep-based only). */
  e1rm: number | null;
  volume: number;
  /** Highest weight (or added weight) in any working set with reps. */
  bestWeight: number | null;
  /** Lowest assistance used in any working set with reps. */
  minAssistance: number | null;
  bestReps: number | null;
  totalReps: number;
  bestSeconds: number | null;
}

export function exerciseMetrics(ex: SessionExercise): ExerciseMetrics {
  const m: ExerciseMetrics = {
    e1rm: null, volume: exerciseVolume(ex), bestWeight: null, minAssistance: null,
    bestReps: null, totalReps: 0, bestSeconds: null,
  };
  if (ex.skipped) return m;

  for (const set of workingSets(ex)) {
    if (set.reps == null) continue;
    if (ex.measure === 'seconds') {
      m.bestSeconds = Math.max(m.bestSeconds ?? 0, set.reps);
      continue;
    }
    m.totalReps += set.reps;
    m.bestReps = Math.max(m.bestReps ?? 0, set.reps);
    if (set.weight == null) continue;
    if (ex.loadType === 'assisted') {
      m.minAssistance = m.minAssistance == null ? set.weight : Math.min(m.minAssistance, set.weight);
    } else {
      m.bestWeight = Math.max(m.bestWeight ?? 0, set.weight);
      const e = est1RM(setLoad(ex, set.weight), set.reps);
      if (e > (m.e1rm ?? 0)) m.e1rm = e;
    }
  }
  return m;
}
