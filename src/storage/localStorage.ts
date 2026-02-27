import type { AppState } from '../types';
import { SCHEMA_VERSION } from '../types';

const STORAGE_KEY = 'workout-app-state';

export function getInitialState(): AppState {
  return {
    schemaVersion: SCHEMA_VERSION,
    dayOrder: [],
    days: {},
    activeDayId: null,
    activeSession: null,
    history: [],
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getInitialState();
    const parsed = JSON.parse(raw) as AppState;
    return migrate(parsed);
  } catch {
    return getInitialState();
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable
  }
}

function migrate(state: AppState): AppState {
  // Future migrations go here
  if (!state.schemaVersion) {
    state.schemaVersion = SCHEMA_VERSION;
  }
  return state;
}
