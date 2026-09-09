import type { LoadType, Measure, SessionExercise } from '../types';
import { workingSets } from './metrics';

/** Formats a target rep range for display, e.g. "8–12", "8+", or "≤12". */
export function formatRepRange(min: number | null, max: number | null, measure: Measure = 'reps'): string | null {
  const suffix = measure === 'seconds' ? 's' : '';
  if (min != null && max != null) return min === max ? `${min}${suffix}` : `${min}–${max}${suffix}`;
  if (min != null) return `${min}${suffix}+`;
  if (max != null) return `≤${max}${suffix}`;
  return null;
}

/** True when a single completed set reached the top of the target range. */
export function setHitTop(reps: number | null, completed: boolean, targetRepMax: number | null): boolean {
  return completed && targetRepMax != null && reps != null && reps >= targetRepMax;
}

/**
 * True when every working set of the exercise is completed AND hit the top of
 * the target range — the signal that it's time to progress next session.
 */
export function hitTopOfRange(exercise: SessionExercise): boolean {
  if (exercise.skipped) return false;
  if (exercise.targetRepMax == null) return false;
  const sets = workingSets(exercise);
  if (sets.length === 0) return false;
  return sets.every(s => setHitTop(s.reps, s.completed, exercise.targetRepMax));
}

/** What "progress" means for this exercise type, for the cue banner. */
export function progressionHint(loadType: LoadType, measure: Measure): string {
  if (loadType === 'assisted') return 'reduce the assistance next time!';
  if (loadType === 'bodyweight') return 'add some weight next time!';
  if (measure === 'seconds') return 'add weight or time next time!';
  return 'increase the weight next time!';
}
