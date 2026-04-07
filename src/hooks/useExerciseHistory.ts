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

export function useLastSession(exerciseId: ExerciseId, exerciseName?: string): ExerciseHistoryEntry | null {
  const { state } = useWorkout();
  const history = useExerciseHistory(exerciseId);

  // Fallback: search by name if no history found by ID (e.g. exercise added mid-session)
  return useMemo(() => {
    if (history[0]) return history[0];
    if (!exerciseName) return null;
    const nameLower = exerciseName.toLowerCase();
    for (const session of state.history) {
      const exercise = session.exercises.find(e => e.name.toLowerCase() === nameLower);
      if (exercise) return { session, exercise };
    }
    return null;
  }, [history, exerciseName, state.history]);
}
