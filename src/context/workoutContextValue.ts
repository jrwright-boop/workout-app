import { createContext, type Dispatch } from 'react';
import type { AppState, WorkoutAction } from '../types';

export interface PendingUndo {
  label: string;
  /** Restore the state from before the destructive action. */
  undo: () => void;
}

export interface WorkoutContextValue {
  state: AppState;
  dispatch: Dispatch<WorkoutAction>;
  /**
   * Dispatch a destructive action with a short undo window. The previous
   * state snapshot is kept until the toast expires or another undoable
   * action replaces it.
   */
  dispatchUndoable: (action: WorkoutAction, label: string) => void;
  pendingUndo: PendingUndo | null;
  /** True when the last save to localStorage failed (usually quota exhausted). */
  storageError: boolean;
}

export const WorkoutContext = createContext<WorkoutContextValue | null>(null);
