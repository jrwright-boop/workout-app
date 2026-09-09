import { useMemo } from 'react';
import { useWorkout } from './useWorkout';
import type { ExerciseId, ExerciseTypeFields } from '../types';
import { findAllPerformed, withType, type HistoryEntry } from '../utils/exerciseHistory';
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
  type?: ExerciseTypeFields | null
): ExerciseHistoryEntry[] {
  const { state } = useWorkout();
  return useMemo(() => {
    const raw = findAllPerformed(state.history, exerciseId, exerciseName);
    return withType(raw, type ?? raw[0]?.exercise ?? null);
  }, [state.history, exerciseId, exerciseName, type]);
}

export function useLastSession(exerciseId: ExerciseId | null, exerciseName?: string | null): ExerciseHistoryEntry | null {
  const history = useExerciseHistory(exerciseId, exerciseName);
  return history[0] ?? null;
}

/** Best-ever numbers for an exercise across all history, under its current type. */
export function useExerciseRecords(
  exerciseId: ExerciseId | null,
  exerciseName: string | null | undefined,
  type: ExerciseTypeFields | null | undefined
): Records {
  const history = useExerciseHistory(exerciseId, exerciseName, type);
  return useMemo(() => computeRecords(history.map(h => h.exercise)), [history]);
}

export function useExerciseLibrary() {
  const { state } = useWorkout();
  return useMemo(() => buildExerciseLibrary(state), [state]);
}
