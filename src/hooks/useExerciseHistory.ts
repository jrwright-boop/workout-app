import { useMemo } from 'react';
import { useWorkout } from './useWorkout';
import type { ExerciseId, ExerciseTypeFields } from '../types';
import { findAllPerformed, findLastForDay, withType, type HistoryEntry, type HistoryScope, type LastPerformedInfo } from '../utils/exerciseHistory';
import { computeRecords, type Records } from '../utils/records';
import { buildExerciseLibrary } from '../utils/library';

export type ExerciseHistoryEntry = HistoryEntry;

/**
 * All performed instances of an exercise, newest first. Matches by id OR
 * name so the same lift on a different day (or logged as a one-off) counts.
 * Entries are re-read under `type` (the exercise's current type) when given,
 * otherwise under the newest entry's type, so old sets follow a type change.
 */
export function useExerciseHistory(
  exerciseId: ExerciseId | null,
  exerciseName?: string | null,
  type?: ExerciseTypeFields | null,
  scope?: HistoryScope
): ExerciseHistoryEntry[] {
  const { state } = useWorkout();
  const dayId = scope?.dayId ?? null;
  const scheduledOnly = scope?.scheduledOnly ?? false;
  return useMemo(() => {
    const raw = findAllPerformed(state.history, exerciseId, exerciseName, { dayId, scheduledOnly });
    return withType(raw, type ?? raw[0]?.exercise ?? null);
  }, [state.history, exerciseId, exerciseName, type, dayId, scheduledOnly]);
}

/**
 * "Last time" for an exercise as seen from a given day: same-day scheduled
 * history first, any instance as a fallback, plus a newer off-plan instance
 * to mention. Pass no dayId to get plain most-recent.
 */
export function useLastSession(
  exerciseId: ExerciseId | null,
  exerciseName?: string | null,
  dayId?: string | null
): LastPerformedInfo {
  const { state } = useWorkout();
  return useMemo(
    () => findLastForDay(state.history, exerciseId, exerciseName, dayId),
    [state.history, exerciseId, exerciseName, dayId]
  );
}

/** Best-ever numbers for an exercise across all history, under its current type. */
export function useExerciseRecords(
  exerciseId: ExerciseId | null,
  exerciseName: string | null | undefined,
  type: ExerciseTypeFields | null | undefined,
  scope?: HistoryScope
): Records {
  const history = useExerciseHistory(exerciseId, exerciseName, type, scope);
  return useMemo(() => computeRecords(history.map(h => h.exercise)), [history]);
}

export function useExerciseLibrary() {
  const { state } = useWorkout();
  return useMemo(() => buildExerciseLibrary(state), [state]);
}
