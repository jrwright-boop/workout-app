import type { AppState, ExerciseId, Program, SessionExercise, SetEntry } from '../types';
import { DEFAULT_BAR_WEIGHT, DEFAULT_TYPE_FIELDS, SCHEMA_VERSION } from '../types';
import { exerciseKey, sameExercise } from '../utils/exerciseKey';

export const STORAGE_KEY = 'workout-app-state';

export function getInitialState(): AppState {
  return {
    schemaVersion: SCHEMA_VERSION,
    dayOrder: [],
    days: {},
    activeDayId: null,
    activeSession: null,
    history: [],
    unit: 'lbs',
    restSeconds: 90,
    barWeight: { ...DEFAULT_BAR_WEIGHT },
    programs: [],
    bodyweightLog: [],
    deloadWeeks: [],
    restNotifications: false,
  };
}

/** Thrown when stored data exists but can't be understood. The error boundary
 *  turns this into a recovery screen instead of a blank page. */
export class CorruptStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CorruptStateError';
  }
}

export function loadState(): AppState {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return getInitialState();
  }
  if (!raw) return getInitialState();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new CorruptStateError('Saved data is not valid JSON.');
  }
  const state = validateAppState(migrate(parsed));
  if (!state) throw new CorruptStateError('Saved data has an unexpected shape.');
  return state;
}

// Save status is exposed as a tiny external store so React can subscribe with
// useSyncExternalStore instead of mirroring it into state from an effect.
let lastSaveFailed = false;
const saveListeners = new Set<() => void>();

export function subscribeSaveStatus(listener: () => void): () => void {
  saveListeners.add(listener);
  return () => { saveListeners.delete(listener); };
}

export function getSaveFailed(): boolean {
  return lastSaveFailed;
}

function setSaveFailed(failed: boolean): void {
  if (failed === lastSaveFailed) return;
  lastSaveFailed = failed;
  for (const l of saveListeners) l();
}

/** Returns false when the write failed (typically storage quota exhausted). */
export function saveState(state: AppState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setSaveFailed(false);
    return true;
  } catch {
    setSaveFailed(true);
    return false;
  }
}

/** Raw stored string, for the "download your data" escape hatch. */
export function getRawState(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // nothing to do
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNumOrNull = (v: unknown): v is number | null => v === null || typeof v === 'number';

function isSetEntry(v: unknown): boolean {
  return isObj(v) && isNumOrNull(v.weight) && isNumOrNull(v.reps) && typeof v.completed === 'boolean';
}

function isSessionExercise(v: unknown): boolean {
  if (!isObj(v) || !isStr(v.exerciseId) || !isStr(v.name) || !Array.isArray(v.sets)) return false;
  if (!v.sets.every(isSetEntry)) return false;
  if (v.origin !== undefined && !ORIGINS.has(v.origin as string)) return false;
  if (v.burndown !== null && !(isObj(v.burndown) && Array.isArray(v.burndown.drops))) return false;
  return true;
}

function isSession(v: unknown): boolean {
  return isObj(v) && isStr(v.id) && isStr(v.dayId) && isStr(v.dayName) && isStr(v.startedAt)
    && Array.isArray(v.exercises) && v.exercises.every(isSessionExercise);
}

const LOAD_TYPES = new Set(['external', 'bodyweight', 'assisted']);
const MEASURES = new Set(['reps', 'seconds']);
const ORIGINS = new Set(['scheduled', 'makeup']);

function isTemplate(v: unknown): boolean {
  if (!isObj(v) || !isStr(v.id) || !isStr(v.name) || typeof v.defaultSetCount !== 'number') return false;
  if (v.loadType !== undefined && !LOAD_TYPES.has(v.loadType as string)) return false;
  if (v.measure !== undefined && !MEASURES.has(v.measure as string)) return false;
  return true;
}

function isDay(v: unknown): boolean {
  if (!isObj(v) || !isStr(v.id) || !isStr(v.name) || !Array.isArray(v.exerciseOrder) || !isObj(v.exercises)) return false;
  const exercises = v.exercises;
  return v.exerciseOrder.every(id => isStr(id) && isTemplate(exercises[id]));
}

function isProgram(v: unknown): boolean {
  if (!isObj(v) || !isStr(v.id) || !isStr(v.name) || !Array.isArray(v.dayOrder) || !isObj(v.days)) return false;
  const days = v.days;
  return v.dayOrder.every(id => isStr(id) && isDay(days[id]));
}

/** Validate a shared/imported program on its own. */
export function validateProgram(v: unknown): Program | null {
  if (!isProgram(v)) return null;
  const out: unknown = v;
  return out as Program;
}

/**
 * Structural check for anything about to become AppState (a stored blob or an
 * imported backup). Returns the value typed as AppState, or null if a render
 * would crash on it.
 */
export function validateAppState(v: unknown): AppState | null {
  if (!isObj(v)) return null;
  if (typeof v.schemaVersion !== 'number') return null;
  if (!Array.isArray(v.dayOrder) || !isObj(v.days)) return null;
  const days = v.days;
  if (!v.dayOrder.every(id => isStr(id) && isDay(days[id]))) return null;
  if (!Array.isArray(v.history) || !v.history.every(isSession)) return null;
  if (v.activeSession !== null && !isSession(v.activeSession)) return null;
  if (v.unit !== 'lbs' && v.unit !== 'kg') return null;
  if (typeof v.restSeconds !== 'number') return null;
  if (!isObj(v.barWeight) || typeof v.barWeight.lbs !== 'number' || typeof v.barWeight.kg !== 'number') return null;
  if (!Array.isArray(v.programs) || !v.programs.every(isProgram)) return null;
  if (!Array.isArray(v.bodyweightLog) || !v.bodyweightLog.every(e => isObj(e) && isStr(e.date) && typeof e.weight === 'number')) return null;
  if (!Array.isArray(v.deloadWeeks) || !v.deloadWeeks.every(isStr)) return null;
  if (typeof v.restNotifications !== 'boolean') return null;
  const out: unknown = v;
  return out as AppState;
}

// ---------------------------------------------------------------------------
// Migrations
// ---------------------------------------------------------------------------

// Exported so backup imports run through the same migrations as loads.
// Accepts unknown because pre-validation data is exactly what needs migrating.
export function migrate(input: unknown): unknown {
  if (!isObj(input)) return input;
  // Legacy blobs are structurally close to AppState; validated after this runs.
  const state = input as unknown as AppState;

  if (!state.schemaVersion) {
    state.schemaVersion = 1;
  }

  if (state.schemaVersion < 2) {
    // Strip burndown from all ExerciseTemplates
    for (const dayId of Object.keys(state.days ?? {})) {
      const day = state.days[dayId];
      for (const exId of Object.keys(day.exercises ?? {})) {
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
    for (const dayId of Object.keys(state.days ?? {})) {
      const day = state.days[dayId];
      for (const exId of Object.keys(day.exercises ?? {})) {
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

  if (state.schemaVersion < 4) {
    // Add configurable rest timer duration.
    if (state.restSeconds === undefined) state.restSeconds = 90;

    state.schemaVersion = 4;
  }

  if (state.schemaVersion < 5) {
    migrateToV5(state);
    state.schemaVersion = 5;
  }

  if (state.schemaVersion < 6) {
    migrateToV6(state);
    state.schemaVersion = 6;
  }

  if (state.schemaVersion < 7) {
    migrateToV7(state);
    state.schemaVersion = 7;
  }

  return state;
}

/**
 * v7: cues, supersets, muscle overrides on templates; superset group on
 * logged exercises; bodyweight / deload / backdated on sessions; bodyweight
 * log, deload weeks, and rest notifications on state. Additive only.
 */
function migrateToV7(state: AppState): void {
  for (const day of Object.values(state.days ?? {})) {
    for (const ex of Object.values(day.exercises ?? {})) {
      if (ex.cues === undefined) ex.cues = '';
      if (ex.supersetGroup === undefined) ex.supersetGroup = null;
      if (ex.muscles === undefined) ex.muscles = null;
    }
  }
  for (const program of state.programs ?? []) {
    for (const day of Object.values(program.days ?? {})) {
      for (const ex of Object.values(day.exercises ?? {})) {
        if (ex.cues === undefined) ex.cues = '';
        if (ex.supersetGroup === undefined) ex.supersetGroup = null;
        if (ex.muscles === undefined) ex.muscles = null;
      }
    }
  }
  const fillSession = (session: WorkoutSessionLike) => {
    if (session.bodyweight === undefined) session.bodyweight = null;
    if (session.deload === undefined) session.deload = false;
    if (session.backdated === undefined) session.backdated = false;
    for (const ex of session.exercises ?? []) {
      if (ex.supersetGroup === undefined) ex.supersetGroup = null;
    }
  };
  for (const session of state.history ?? []) fillSession(session);
  if (state.activeSession) fillSession(state.activeSession);
  if (state.bodyweightLog === undefined) state.bodyweightLog = [];
  if (state.deloadWeeks === undefined) state.deloadWeeks = [];
  if (state.restNotifications === undefined) state.restNotifications = false;
}

type WorkoutSessionLike = {
  bodyweight?: number | null;
  deload?: boolean;
  backdated?: boolean;
  exercises: SessionExercise[];
};

/**
 * v6: tag every logged exercise with its origin. Purely additive — nothing
 * else is touched. An exercise counts as scheduled when its session's day
 * plan (as it exists now) includes it; if the day has since been deleted we
 * can't tell, so it defaults to scheduled, which is what most entries are.
 */
function migrateToV6(state: AppState): void {
  const tag = (session: { dayId: string; exercises: SessionExercise[] }) => {
    const day = state.days?.[session.dayId];
    for (const ex of session.exercises ?? []) {
      if (ex.origin !== undefined) continue;
      if (!day) { ex.origin = 'scheduled'; continue; }
      const onPlan = day.exerciseOrder.some(id => sameExercise(day.exercises[id], ex.exerciseId, ex.name));
      ex.origin = onPlan ? 'scheduled' : 'makeup';
    }
  };
  for (const session of state.history ?? []) tag(session);
  if (state.activeSession) tag(state.activeSession);
}

/**
 * v5: exercise types (load type, per-side, measure, increment), warm-up and
 * pre-fill fields on sets, plate-calculator bar weight, saved programs, and
 * one identity per exercise name across days and history.
 */
function migrateToV5(state: AppState): void {
  const fillSet = (set: SetEntry) => {
    if (set.warmup === undefined) set.warmup = false;
    if (set.prefilledWeight === undefined) set.prefilledWeight = null;
    if (set.suggested === undefined) set.suggested = false;
  };
  const fillSessionExercise = (ex: SessionExercise) => {
    if (ex.loadType === undefined) ex.loadType = DEFAULT_TYPE_FIELDS.loadType;
    if (ex.perSide === undefined) ex.perSide = DEFAULT_TYPE_FIELDS.perSide;
    if (ex.measure === undefined) ex.measure = DEFAULT_TYPE_FIELDS.measure;
    if (ex.increment === undefined) ex.increment = DEFAULT_TYPE_FIELDS.increment;
    for (const set of ex.sets ?? []) fillSet(set);
  };

  // Canonical id per normalised name: first occurrence in day order wins.
  const canonical = new Map<string, ExerciseId>();
  for (const dayId of state.dayOrder ?? []) {
    const day = state.days[dayId];
    if (!day) continue;
    const renames = new Map<ExerciseId, ExerciseId>();
    for (const exId of day.exerciseOrder ?? []) {
      const ex = day.exercises[exId];
      if (!ex) continue;
      if (ex.loadType === undefined) ex.loadType = DEFAULT_TYPE_FIELDS.loadType;
      if (ex.perSide === undefined) ex.perSide = DEFAULT_TYPE_FIELDS.perSide;
      if (ex.measure === undefined) ex.measure = DEFAULT_TYPE_FIELDS.measure;
      if (ex.increment === undefined) ex.increment = DEFAULT_TYPE_FIELDS.increment;

      const key = exerciseKey(ex.name);
      const canon = canonical.get(key);
      if (!canon) {
        canonical.set(key, ex.id);
      } else if (canon !== ex.id) {
        renames.set(ex.id, canon);
      }
    }
    for (const [oldId, newId] of renames) {
      const ex = day.exercises[oldId];
      delete day.exercises[oldId];
      day.exercises[newId] = { ...ex, id: newId };
      day.exerciseOrder = day.exerciseOrder.map(id => (id === oldId ? newId : id));
    }
  }

  // Point every logged exercise at the canonical id for its name.
  const relink = (ex: SessionExercise) => {
    const canon = canonical.get(exerciseKey(ex.name));
    if (canon) ex.exerciseId = canon;
  };
  for (const session of state.history ?? []) {
    for (const ex of session.exercises ?? []) {
      fillSessionExercise(ex);
      relink(ex);
    }
  }
  if (state.activeSession) {
    for (const ex of state.activeSession.exercises ?? []) {
      fillSessionExercise(ex);
      relink(ex);
    }
  }

  if (state.barWeight === undefined) state.barWeight = { ...DEFAULT_BAR_WEIGHT };
  if (state.programs === undefined) state.programs = [];
}

// ---------------------------------------------------------------------------
// Backup bookkeeping (lives outside AppState so it isn't itself part of the
// exported backup and survives a data import)
// ---------------------------------------------------------------------------

const LAST_BACKUP_KEY = 'workout-app-last-backup';

export function getLastBackupDate(): string | null {
  try {
    return localStorage.getItem(LAST_BACKUP_KEY);
  } catch {
    return null;
  }
}

export function recordBackup(): void {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
  } catch {
    // Storage unavailable
  }
}

const BACKUP_OVERDUE_DAYS = 30;

/** True when the user has meaningful data and hasn't exported it recently. */
export function isBackupOverdue(historyLength: number): boolean {
  if (historyLength < 3) return false;
  const last = getLastBackupDate();
  if (!last) return true;
  const ageMs = Date.now() - new Date(last).getTime();
  return ageMs > BACKUP_OVERDUE_DAYS * 24 * 60 * 60 * 1000;
}
