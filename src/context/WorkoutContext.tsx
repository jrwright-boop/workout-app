import { useReducer, useEffect, useSyncExternalStore, useState, useCallback, useRef, type ReactNode } from 'react';
import { workoutReducer } from '../reducers/workoutReducer';
import { loadState, saveState, subscribeSaveStatus, getSaveFailed } from '../storage/localStorage';
import { WorkoutContext, type PendingUndo } from './workoutContextValue';
import type { AppState, WorkoutAction } from '../types';

const UNDO_WINDOW_MS = 6000;

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(workoutReducer, null, loadState);
  const storageError = useSyncExternalStore(subscribeSaveStatus, getSaveFailed);
  const [pendingUndo, setPendingUndo] = useState<PendingUndo | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    saveState(state);
  }, [state]);

  // The reducer's state is immutable, so keeping the previous snapshot for
  // a few seconds costs nothing and makes any delete reversible.
  const stateRef = useRef<AppState>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const dispatchUndoable = useCallback((action: WorkoutAction, label: string) => {
    const before = stateRef.current;
    dispatch(action);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setPendingUndo({
      label,
      undo: () => {
        dispatch({ type: 'LOAD_STATE', payload: before });
        setPendingUndo(null);
        if (timerRef.current) window.clearTimeout(timerRef.current);
      },
    });
    timerRef.current = window.setTimeout(() => setPendingUndo(null), UNDO_WINDOW_MS);
  }, []);

  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current); }, []);

  return (
    <WorkoutContext.Provider value={{ state, dispatch, dispatchUndoable, pendingUndo, storageError }}>
      {children}
    </WorkoutContext.Provider>
  );
}
