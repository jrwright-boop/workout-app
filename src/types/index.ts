export type DayId = string;
export type ExerciseId = string;
export type SessionId = string;

export interface ExerciseTemplate {
  id: ExerciseId;
  name: string;
  defaultSetCount: number;
  skipped: boolean;
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

export interface AppState {
  schemaVersion: number;
  dayOrder: DayId[];
  days: Record<DayId, DayTemplate>;
  activeDayId: DayId | null;
  activeSession: WorkoutSession | null;
  history: WorkoutSession[];
  unit: 'lbs' | 'kg';
}

export type WorkoutAction =
  | { type: 'LOAD_STATE'; payload: AppState }
  | { type: 'ADD_DAY'; payload: { name: string } }
  | { type: 'RENAME_DAY'; payload: { dayId: DayId; name: string } }
  | { type: 'DELETE_DAY'; payload: { dayId: DayId } }
  | { type: 'REORDER_DAYS'; payload: { dayOrder: DayId[] } }
  | { type: 'SET_ACTIVE_DAY'; payload: { dayId: DayId | null } }
  | { type: 'ADD_EXERCISE'; payload: { dayId: DayId; name: string; defaultSetCount: number } }
  | { type: 'EDIT_EXERCISE'; payload: { dayId: DayId; exerciseId: ExerciseId; name: string; defaultSetCount: number } }
  | { type: 'DELETE_EXERCISE'; payload: { dayId: DayId; exerciseId: ExerciseId } }
  | { type: 'REORDER_EXERCISES'; payload: { dayId: DayId; exerciseOrder: ExerciseId[] } }
  | { type: 'TOGGLE_SKIP'; payload: { dayId: DayId; exerciseId: ExerciseId } }
  | { type: 'START_SESSION'; payload: { dayId: DayId } }
  | { type: 'FINISH_SESSION' }
  | { type: 'DISCARD_SESSION' }
  | { type: 'UPDATE_SET'; payload: { exerciseIndex: number; setIndex: number; field: 'weight' | 'reps'; value: number | null } }
  | { type: 'TOGGLE_SET_COMPLETE'; payload: { exerciseIndex: number; setIndex: number } }
  | { type: 'ADD_SET'; payload: { exerciseIndex: number } }
  | { type: 'REMOVE_SET'; payload: { exerciseIndex: number; setIndex: number } }
  | { type: 'UPDATE_BURNDOWN_DROP'; payload: { exerciseIndex: number; dropIndex: number; field: 'weight' | 'reps'; value: number | null } }
  | { type: 'TOGGLE_SESSION_BURNDOWN'; payload: { exerciseIndex: number } }
  | { type: 'SET_SESSION_DROP_COUNT'; payload: { exerciseIndex: number; count: number } }
  | { type: 'UPDATE_EXERCISE_NOTES'; payload: { exerciseIndex: number; notes: string } }
  | { type: 'SET_UNIT'; payload: { unit: 'lbs' | 'kg' } }
  | { type: 'REORDER_SESSION_EXERCISES'; payload: { exercises: SessionExercise[] } }
  | { type: 'TOGGLE_SESSION_EXERCISE_SKIP'; payload: { exerciseIndex: number } };

export const SCHEMA_VERSION = 2;
