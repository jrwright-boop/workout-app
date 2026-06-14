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
    unit: 'lbs',
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
  if (!state.schemaVersion) {
    state.schemaVersion = 1;
  }

  if (state.schemaVersion < 2) {
    // Strip burndown from all ExerciseTemplates
    for (const dayId of Object.keys(state.days)) {
      const day = state.days[dayId];
      for (const exId of Object.keys(day.exercises)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (day.exercises[exId] as any).burndown;
      }
    }

    // Add unit if missing
    if (!state.unit) {
      state.unit = 'lbs';
    }

    // Add notes to any active session exercises and repsFromLastSession to sets
    if (state.activeSession) {
      for (const ex of state.activeSession.exercises) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((ex as any).notes === undefined) {
          ex.notes = '';
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((ex as any).skipped === undefined) {
          ex.skipped = false;
        }
        for (const set of ex.sets) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((set as any).repsFromLastSession === undefined) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (set as any).repsFromLastSession = null;
          }
        }
      }
    }

    state.schemaVersion = 2;
  }

  if (state.schemaVersion < 3) {
    // Add target rep range fields (default: no target) to all templates.
    for (const dayId of Object.keys(state.days)) {
      const day = state.days[dayId];
      for (const exId of Object.keys(day.exercises)) {
        const ex = day.exercises[exId];
        if (ex.targetRepMin === undefined) ex.targetRepMin = null;
        if (ex.targetRepMax === undefined) ex.targetRepMax = null;
      }
    }

    // Backfill the active session's exercises too.
    if (state.activeSession) {
      for (const ex of state.activeSession.exercises) {
        if (ex.targetRepMin === undefined) ex.targetRepMin = null;
        if (ex.targetRepMax === undefined) ex.targetRepMax = null;
      }
    }

    state.schemaVersion = 3;
  }

  return state;
}
