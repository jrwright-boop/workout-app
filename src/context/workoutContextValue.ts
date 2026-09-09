import { createContext, type Dispatch } from 'react';
import type { AppState, WorkoutAction } from '../types';

export interface WorkoutContextValue {
  state: AppState;
  dispatch: Dispatch<WorkoutAction>;
  /** True when the last save to localStorage failed (usually quota exhausted). */
  storageError: boolean;
}

export const WorkoutContext = createContext<WorkoutContextValue | null>(null);
