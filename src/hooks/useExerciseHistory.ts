import { useMemo } from 'react';
import { useWorkout } from './useWorkout';
import type { ExerciseId, SessionExercise, WorkoutSession } from '../types';
import { findLastPerformed, wasPerformed } from '../utils/exerciseHistory';

export interface ExerciseHistoryEntry {
  session: WorkoutSession;
  exercise: SessionExercise;
}

export function useExerciseHistory(exerciseId: ExerciseId): ExerciseHistoryEntry[] {
  const { state } = useWorkout();

  return useMemo(() => {
    return state.history
      .map(session => {
        // Ignore entries where the exercise was skipped or left empty — they
        // hold no data for charts or "Last:" displays.
        const exercise = session.exercises.find(e => e.exerciseId === exerciseId && wasPerformed(e));
        if (!exercise) return null;
        return { session, exercise };
      })
      .filter((e): e is ExerciseHistoryEntry => e !== null);
  }, [state.history, exerciseId]);
}

export function useLastSession(exerciseId: ExerciseId, exerciseName?: string): ExerciseHistoryEntry | null {
  const { state } = useWorkout();
  const history = useExerciseHistory(exerciseId);

  // Fall back to name-based lookup for exercises added mid-session (which get
  // a fresh exerciseId and therefore won't match prior template entries).
  return useMemo(() => {
    if (history[0]) return history[0];
    if (!exerciseName) return null;
    return findLastPerformed(state.history, null, exerciseName);
  }, [history, exerciseName, state.history]);
}
