import type { ExerciseId, ExerciseTypeFields, SessionExercise, WorkoutSession } from '../types';
import { sameExercise } from './exerciseKey';

/**
 * True if this history entry represents an exercise that was actually
 * performed — not skipped, with at least one set holding logged data.
 * Skipped entries are stored in history for record-keeping but must not
 * be used for pre-fill or "Last:" displays.
 */
export function wasPerformed(ex: SessionExercise): boolean {
  return !ex.skipped && ex.sets.some(s => s.weight != null || s.reps != null);
}

export interface HistoryEntry {
  session: WorkoutSession;
  exercise: SessionExercise;
}

/**
 * Every performed instance of an exercise, newest first, matched by id OR
 * normalised name so the same lift on another day (or logged as a one-off)
 * counts. History is already newest-first.
 */
export function findAllPerformed(history: WorkoutSession[], exerciseId: ExerciseId | null, name?: string | null): HistoryEntry[] {
  const out: HistoryEntry[] = [];
  for (const session of history) {
    const exercise = session.exercises.find(e => sameExercise(e, exerciseId, name) && wasPerformed(e));
    if (exercise) out.push({ session, exercise });
  }
  return out;
}

/** Most recent performed entry for an exercise, searching all sessions (any day). */
export function findLastPerformed(
  history: WorkoutSession[],
  exerciseId: ExerciseId | null,
  name?: string | null
): HistoryEntry | null {
  for (const session of history) {
    const exercise = session.exercises.find(e => sameExercise(e, exerciseId, name) && wasPerformed(e));
    if (exercise) return { session, exercise };
  }
  return null;
}

/**
 * Re-read history entries under the exercise's *current* type. Entries
 * snapshot the type at the time they were logged, so sets recorded before an
 * exercise was marked "assisted" (or per-side, or timed) would otherwise be
 * charted and ranked as if they were plain external load.
 */
export function withType(entries: HistoryEntry[], type: ExerciseTypeFields | null | undefined): HistoryEntry[] {
  if (!type) return entries;
  return entries.map(e => {
    const ex = e.exercise;
    if (ex.loadType === type.loadType && ex.perSide === type.perSide && ex.measure === type.measure) return e;
    return { ...e, exercise: { ...ex, loadType: type.loadType, perSide: type.perSide, measure: type.measure } };
  });
}
