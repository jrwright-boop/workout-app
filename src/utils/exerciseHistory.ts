import type { ExerciseId, SessionExercise, WorkoutSession } from '../types';

/**
 * True if this history entry represents an exercise that was actually
 * performed — not skipped, with at least one set holding logged data.
 * Skipped entries are stored in history for record-keeping but must not
 * be used for pre-fill or "Last:" displays.
 */
export function wasPerformed(ex: SessionExercise): boolean {
  return !ex.skipped && ex.sets.some(s => s.weight != null || s.reps != null);
}

/**
 * Most recent performed entry for an exercise, searching all sessions
 * (any day — so a workout done on an off-day still counts). Prefers the
 * stable exerciseId match, falling back to a case-insensitive name match
 * for exercises that were added mid-session under a fresh id.
 */
export function findLastPerformed(
  history: WorkoutSession[],
  exerciseId: ExerciseId | null,
  name?: string
): { session: WorkoutSession; exercise: SessionExercise } | null {
  if (exerciseId) {
    for (const session of history) {
      const exercise = session.exercises.find(e => e.exerciseId === exerciseId && wasPerformed(e));
      if (exercise) return { session, exercise };
    }
  }
  if (name) {
    const nameLower = name.toLowerCase();
    for (const session of history) {
      const exercise = session.exercises.find(e => e.name.toLowerCase() === nameLower && wasPerformed(e));
      if (exercise) return { session, exercise };
    }
  }
  return null;
}
