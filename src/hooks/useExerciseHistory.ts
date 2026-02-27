import { useMemo } from 'react';
import { useWorkout } from './useWorkout';
import type { ExerciseId, SessionExercise, WorkoutSession } from '../types';

export interface ExerciseHistoryEntry {
  session: WorkoutSession;
  exercise: SessionExercise;
}

export function useExerciseHistory(exerciseId: ExerciseId): ExerciseHistoryEntry[] {
  const { state } = useWorkout();

  return useMemo(() => {
    return state.history
      .map(session => {
        const exercise = session.exercises.find(e => e.exerciseId === exerciseId);
        if (!exercise) return null;
        return { session, exercise };
      })
      .filter((e): e is ExerciseHistoryEntry => e !== null);
  }, [state.history, exerciseId]);
}

export function useLastSession(exerciseId: ExerciseId): ExerciseHistoryEntry | null {
  const history = useExerciseHistory(exerciseId);
  return history[0] ?? null;
}
