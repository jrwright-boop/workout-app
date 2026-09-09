export type DayId = string;
export type ExerciseId = string;
export type SessionId = string;
export type ProgramId = string;

export type Unit = 'lbs' | 'kg';

/**
 * How the weight field should be read for this exercise.
 * - external:   weight is the load lifted (barbell, machine, cable). Default.
 * - bodyweight: weight is *added* load (belt, vest); empty means bodyweight only.
 * - assisted:   weight is the *assistance* (band, machine counterweight).
 *               Progress means this number going DOWN, and every place that
 *               reasons about progress (records, charts, progression cue)
 *               flips direction for it. Never store assistance as a negative.
 */
export type LoadType = 'external' | 'bodyweight' | 'assisted';

/** What the "reps" field counts. */
export type Measure = 'reps' | 'seconds';

export interface ExerciseTemplate {
  id: ExerciseId;
  name: string;
  defaultSetCount: number;
  skipped: boolean;
  /** Lower bound of the target rep range. null = no target set. */
  targetRepMin: number | null;
  /** Upper bound of the target rep range. Hitting this on every set signals it's time to add weight. */
  targetRepMax: number | null;
  loadType: LoadType;
  /** Weight shown is per side (dumbbells, some unilateral work). Volume counts both. */
  perSide: boolean;
  measure: Measure;
  /** Weight step for steppers and progression suggestions. null = unit default (5 lbs / 2.5 kg). */
  increment: number | null;
}

export interface DayTemplate {
  id: DayId;
  name: string;
  exerciseOrder: ExerciseId[];
  exercises: Record<ExerciseId, ExerciseTemplate>;
}

export interface SetEntry {
  weight: number | null;
  reps: number | null;
  completed: boolean;
  repsFromLastSession: number | null;
  /** Warm-up sets are excluded from volume, records, and the progression check. */
  warmup: boolean;
  /**
   * Weight this set was pre-filled with at session start (null if none).
   * Lets the carry-forward logic tell an untouched set from a deliberately
   * edited one without re-deriving it from history.
   */
  prefilledWeight: number | null;
  /** True when prefilledWeight is a progression suggestion, not last session's number. */
  suggested: boolean;
}

export interface DropEntry {
  weight: number | null;
  reps: number | null;
}

export interface SessionExercise {
  exerciseId: ExerciseId;
  name: string;
  sets: SetEntry[];
  burndown: { drops: DropEntry[] } | null;
  notes: string;
  skipped: boolean;
  /** Target rep range snapshotted from the template at session start. */
  targetRepMin: number | null;
  targetRepMax: number | null;
  /** Exercise type snapshotted from the template at session start. */
  loadType: LoadType;
  perSide: boolean;
  measure: Measure;
  increment: number | null;
}

export interface WorkoutSession {
  id: SessionId;
  dayId: DayId;
  dayName: string;
  date: string;
  startedAt: string;
  completedAt: string | null;
  exercises: SessionExercise[];
}

/** A saved snapshot of a split (days + exercises), switchable and shareable. */
export interface Program {
  id: ProgramId;
  name: string;
  dayOrder: DayId[];
  days: Record<DayId, DayTemplate>;
  savedAt: string;
}

export interface AppState {
  schemaVersion: number;
  dayOrder: DayId[];
  days: Record<DayId, DayTemplate>;
  activeDayId: DayId | null;
  activeSession: WorkoutSession | null;
  history: WorkoutSession[];
  unit: Unit;
  /** Default rest timer duration in seconds. */
  restSeconds: number;
  /** Bar weight used by the plate calculator, per unit. */
  barWeight: Record<Unit, number>;
  programs: Program[];
}

export interface ExerciseTypeFields {
  loadType: LoadType;
  perSide: boolean;
  measure: Measure;
  increment: number | null;
}

export interface ExerciseFormFields extends ExerciseTypeFields {
  name: string;
  defaultSetCount: number;
  targetRepMin: number | null;
  targetRepMax: number | null;
}

export type WorkoutAction =
  | { type: 'LOAD_STATE'; payload: AppState }
  | { type: 'ADD_DAY'; payload: { name: string } }
  | { type: 'RENAME_DAY'; payload: { dayId: DayId; name: string } }
  | { type: 'DELETE_DAY'; payload: { dayId: DayId } }
  | { type: 'REORDER_DAYS'; payload: { dayOrder: DayId[] } }
  | { type: 'SET_ACTIVE_DAY'; payload: { dayId: DayId | null } }
  /** `id` reuses an existing exercise identity (picked from the library) so history follows it. */
  | { type: 'ADD_EXERCISE'; payload: ExerciseFormFields & { dayId: DayId; id?: ExerciseId } }
  | { type: 'EDIT_EXERCISE'; payload: ExerciseFormFields & { dayId: DayId; exerciseId: ExerciseId } }
  | { type: 'DELETE_EXERCISE'; payload: { dayId: DayId; exerciseId: ExerciseId } }
  /** Copy an exercise (same identity) from one day to another. */
  | { type: 'COPY_EXERCISE_TO_DAY'; payload: { fromDayId: DayId; toDayId: DayId; exerciseId: ExerciseId } }
  | { type: 'REORDER_EXERCISES'; payload: { dayId: DayId; exerciseOrder: ExerciseId[] } }
  | { type: 'TOGGLE_SKIP'; payload: { dayId: DayId; exerciseId: ExerciseId } }
  | { type: 'START_SESSION'; payload: { dayId: DayId } }
  | { type: 'FINISH_SESSION' }
  | { type: 'DISCARD_SESSION' }
  | { type: 'UPDATE_SET'; payload: { exerciseIndex: number; setIndex: number; field: 'weight' | 'reps'; value: number | null } }
  | { type: 'TOGGLE_SET_COMPLETE'; payload: { exerciseIndex: number; setIndex: number } }
  | { type: 'TOGGLE_SET_WARMUP'; payload: { exerciseIndex: number; setIndex: number } }
  | { type: 'ADD_SET'; payload: { exerciseIndex: number } }
  | { type: 'REMOVE_SET'; payload: { exerciseIndex: number; setIndex: number } }
  | { type: 'UPDATE_BURNDOWN_DROP'; payload: { exerciseIndex: number; dropIndex: number; field: 'weight' | 'reps'; value: number | null } }
  | { type: 'TOGGLE_SESSION_BURNDOWN'; payload: { exerciseIndex: number } }
  | { type: 'SET_SESSION_DROP_COUNT'; payload: { exerciseIndex: number; count: number } }
  | { type: 'UPDATE_EXERCISE_NOTES'; payload: { exerciseIndex: number; notes: string } }
  /** `convert` rewrites every stored weight into the new unit; otherwise only the label changes. */
  | { type: 'SET_UNIT'; payload: { unit: Unit; convert: boolean } }
  | { type: 'REORDER_SESSION_EXERCISES'; payload: { exercises: SessionExercise[] } }
  | { type: 'TOGGLE_SESSION_EXERCISE_SKIP'; payload: { exerciseIndex: number } }
  | { type: 'ADD_SESSION_EXERCISE'; payload: { exerciseId: ExerciseId | null; name: string; defaultSetCount: number } }
  | { type: 'ADD_DAY_TO_SESSION'; payload: { dayId: DayId } }
  | { type: 'SET_REST_SECONDS'; payload: { seconds: number } }
  | { type: 'SET_BAR_WEIGHT'; payload: { unit: Unit; weight: number } }
  | { type: 'DELETE_HISTORY_SESSION'; payload: { sessionId: SessionId } }
  | { type: 'UPDATE_HISTORY_SET'; payload: { sessionId: SessionId; exerciseIndex: number; setIndex: number; field: 'weight' | 'reps'; value: number | null } }
  | { type: 'SAVE_PROGRAM'; payload: { name: string } }
  | { type: 'LOAD_PROGRAM'; payload: { programId: ProgramId } }
  | { type: 'DELETE_PROGRAM'; payload: { programId: ProgramId } }
  | { type: 'IMPORT_PROGRAM'; payload: { program: Program } };

export const SCHEMA_VERSION = 5;

export const DEFAULT_TYPE_FIELDS: ExerciseTypeFields = {
  loadType: 'external',
  perSide: false,
  measure: 'reps',
  increment: null,
};

export const DEFAULT_BAR_WEIGHT: Record<Unit, number> = { lbs: 45, kg: 20 };
