import type { AppState, ExerciseId, ExerciseTypeFields, MuscleGroup, SessionExercise } from '../types';
import { DEFAULT_TYPE_FIELDS } from '../types';
import { exerciseKey } from './exerciseKey';
import { wasPerformed } from './exerciseHistory';

/** One known exercise, deduplicated across days and history. */
export interface LibraryEntry extends ExerciseTypeFields {
  id: ExerciseId;
  name: string;
  defaultSetCount: number;
  targetRepMin: number | null;
  targetRepMax: number | null;
  cues: string;
  muscles: MuscleGroup[] | null;
  /** Days whose plan includes this exercise (by id or name). */
  dayNames: string[];
  dayIds: string[];
  /** Most recent performed instance, if any. */
  lastEx: SessionExercise | null;
  lastDate: string | null;
}

/**
 * The exercise library is derived, not stored: every template across all
 * days plus every exercise ever logged, keyed by normalised name. Templates
 * win over history entries for settings; history supplies "last done".
 */
export function buildExerciseLibrary(state: AppState): LibraryEntry[] {
  const byKey = new Map<string, LibraryEntry>();

  for (const dayId of state.dayOrder) {
    const day = state.days[dayId];
    for (const exId of day.exerciseOrder) {
      const ex = day.exercises[exId];
      const key = exerciseKey(ex.name);
      const existing = byKey.get(key);
      if (existing) {
        existing.dayNames.push(day.name);
        existing.dayIds.push(day.id);
        continue;
      }
      byKey.set(key, {
        id: ex.id,
        name: ex.name,
        defaultSetCount: ex.defaultSetCount,
        targetRepMin: ex.targetRepMin,
        targetRepMax: ex.targetRepMax,
        cues: ex.cues,
        muscles: ex.muscles,
        loadType: ex.loadType,
        perSide: ex.perSide,
        measure: ex.measure,
        increment: ex.increment,
        dayNames: [day.name],
        dayIds: [day.id],
        lastEx: null,
        lastDate: null,
      });
    }
  }

  // History is newest-first, so the first hit per key is the latest.
  for (const session of state.history) {
    for (const ex of session.exercises) {
      if (!wasPerformed(ex)) continue;
      const key = exerciseKey(ex.name);
      const existing = byKey.get(key);
      if (existing) {
        if (!existing.lastEx) {
          existing.lastEx = ex;
          existing.lastDate = session.startedAt;
        }
        continue;
      }
      byKey.set(key, {
        id: ex.exerciseId,
        name: ex.name,
        defaultSetCount: ex.sets.length,
        targetRepMin: ex.targetRepMin,
        targetRepMax: ex.targetRepMax,
        cues: '',
        muscles: null,
        loadType: ex.loadType ?? DEFAULT_TYPE_FIELDS.loadType,
        perSide: ex.perSide ?? DEFAULT_TYPE_FIELDS.perSide,
        measure: ex.measure ?? DEFAULT_TYPE_FIELDS.measure,
        increment: ex.increment ?? DEFAULT_TYPE_FIELDS.increment,
        dayNames: [],
        dayIds: [],
        lastEx: ex,
        lastDate: session.startedAt,
      });
    }
  }

  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
}
