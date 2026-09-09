import { useReducer, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { workoutReducer } from '../reducers/workoutReducer';
import { loadState, saveState, subscribeSaveStatus, getSaveFailed } from '../storage/localStorage';
import { WorkoutContext } from './workoutContextValue';

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(workoutReducer, null, loadState);
  const storageError = useSyncExternalStore(subscribeSaveStatus, getSaveFailed);

  useEffect(() => {
    saveState(state);
  }, [state]);

  return (
    <WorkoutContext.Provider value={{ state, dispatch, storageError }}>
      {children}
    </WorkoutContext.Provider>
  );
}
