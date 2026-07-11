import { createContext, type Dispatch } from 'react';
import type { AppState, WorkoutAction } from '../types';

export interface WorkoutContextValue {
  state: AppState;
  dispatch: Dispatch<WorkoutAction>;
}

export const WorkoutContext = createContext<WorkoutContextValue | null>(null);
