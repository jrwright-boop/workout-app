import { useReducer, useEffect, type ReactNode } from 'react';
import { workoutReducer } from '../reducers/workoutReducer';
import { loadState, saveState } from '../storage/localStorage';
import { WorkoutContext } from './workoutContextValue';

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
