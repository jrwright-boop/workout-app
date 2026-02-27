import { createContext, useReducer, useEffect, type ReactNode } from 'react';
import type { AppState, WorkoutAction } from '../types';
import { workoutReducer } from '../reducers/workoutReducer';
import { loadState, saveState } from '../storage/localStorage';

interface WorkoutContextValue {
  state: AppState;
  dispatch: React.Dispatch<WorkoutAction>;
}

export const WorkoutContext = createContext<WorkoutContextValue | null>(null);

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(workoutReducer, null, loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  return (
    <WorkoutContext.Provider value={{ state, dispatch }}>
      {children}
    </WorkoutContext.Provider>
  );
}
