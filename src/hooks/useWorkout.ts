import { useContext } from 'react';
import { WorkoutContext } from '../context/WorkoutContext';

export function useWorkout() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error('useWorkout must be used within WorkoutProvider');
  return ctx;
}
