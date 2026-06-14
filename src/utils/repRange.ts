import type { SessionExercise } from '../types';

/** Formats a target rep range for display, e.g. "8–12", "8+", or "≤12". */
export function formatRepRange(min: number | null, max: number | null): string | null {
  if (min != null && max != null) return min === max ? `${min}` : `${min}–${max}`;
  if (min != null) return `${min}+`;
  if (max != null) return `≤${max}`;
  return null;
}

/** True when a single completed set reached the top of the target range. */
export function setHitTop(reps: number | null, completed: boolean, targetRepMax: number | null): boolean {
  return completed && targetRepMax != null && reps != null && reps >= targetRepMax;
}

/**
 * True when every working set of the exercise is completed AND hit the top of
 * the target range — the signal that it's time to increase weight next session.
 */
export function hitTopOfRange(exercise: SessionExercise): boolean {
  if (exercise.skipped) return false;
  if (exercise.targetRepMax == null) return false;
  if (exercise.sets.length === 0) return false;
  return exercise.sets.every(s => setHitTop(s.reps, s.completed, exercise.targetRepMax));
}
