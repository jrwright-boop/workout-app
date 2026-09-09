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

/** How wide a net a history read casts. */
export interface HistoryScope {
  /** Only instances performed in sessions of this day. */
  dayId?: string | null;
  /** Only instances that were on the plan (not make-ups). */
  scheduledOnly?: boolean;
}

function inScope(session: WorkoutSession, exercise: SessionExercise, scope?: HistoryScope): boolean {
  if (!scope) return true;
  if (scope.dayId && session.dayId !== scope.dayId) return false;
  if (scope.scheduledOnly && exercise.origin === 'makeup') return false;
  return true;
}

/**
 * Every performed instance of an exercise, newest first, matched by id OR
 * normalised name so the same lift on another day (or logged as a one-off)
 * counts. History is already newest-first.
 */
export function findAllPerformed(
  history: WorkoutSession[],
  exerciseId: ExerciseId | null,
  name?: string | null,
  scope?: HistoryScope
): HistoryEntry[] {
  const out: HistoryEntry[] = [];
  for (const session of history) {
    const exercise = session.exercises.find(e => sameExercise(e, exerciseId, name) && wasPerformed(e) && inScope(session, e, scope));
    if (exercise) out.push({ session, exercise });
  }
  return out;
}

/** Most recent performed entry for an exercise within a scope (default: any session). */
export function findLastPerformed(
  history: WorkoutSession[],
  exerciseId: ExerciseId | null,
  name?: string | null,
  scope?: HistoryScope
): HistoryEntry | null {
  for (const session of history) {
    const exercise = session.exercises.find(e => sameExercise(e, exerciseId, name) && wasPerformed(e) && inScope(session, e, scope));
    if (exercise) return { session, exercise };
  }
  return null;
}

export interface LastPerformedInfo {
  /** The entry pre-fill and "Last:" should use. */
  last: HistoryEntry | null;
  /** True when `last` came from the same day's scheduled history rather than a fallback. */
  sameDay: boolean;
  /** A more recent instance from outside the same-day scope (another day or a make-up), if any. */
  newer: HistoryEntry | null;
}

/**
 * The lookup order every "what did I do last time" question uses:
 *   1. last scheduled instance on the same day (Monday bench pre-fills from
 *      last Monday, not from Thursday's light bench or a Wednesday make-up);
 *   2. otherwise the most recent instance anywhere.
 * Also reports a newer instance outside that scope so the UI can mention it.
 */
export function findLastForDay(
  history: WorkoutSession[],
  exerciseId: ExerciseId | null,
  name: string | null | undefined,
  dayId: string | null | undefined
): LastPerformedInfo {
  const any = findLastPerformed(history, exerciseId, name);
  if (!dayId) return { last: any, sameDay: false, newer: null };
  const scoped = findLastPerformed(history, exerciseId, name, { dayId, scheduledOnly: true });
  if (!scoped) return { last: any, sameDay: false, newer: null };
  const newer = any && any.session.id !== scoped.session.id ? any : null;
  return { last: scoped, sameDay: true, newer };
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
