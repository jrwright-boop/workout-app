export type DayId = string;
export type ExerciseId = string;
export type SessionId = string;

export interface BurndownConfig {
  enabled: boolean;
  dropCount: number;
}

export interface ExerciseTemplate {
  id: ExerciseId;
  name: string;
  defaultSetCount: number;
  burndown: BurndownConfig | null;
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
}

export type WorkoutAction =
  | { type: 'LOAD_STATE'; payload: AppState }
  | { type: 'ADD_DAY'; payload: { name: string } }
  | { type: 'RENAME_DAY'; payload: { dayId: DayId; name: string } }
  | { type: 'DELETE_DAY'; payload: { dayId: DayId } }
  | { type: 'REORDER_DAYS'; payload: { dayOrder: DayId[] } }
  | { type: 'SET_ACTIVE_DAY'; payload: { dayId: DayId | null } }
  | { type: 'ADD_EXERCISE'; payload: { dayId: DayId; name: string; defaultSetCount: number; burndown: BurndownConfig | null } }
  | { type: 'EDIT_EXERCISE'; payload: { dayId: DayId; exerciseId: ExerciseId; name: string; defaultSetCount: number; burndown: BurndownConfig | null } }
  | { type: 'DELETE_EXERCISE'; payload: { dayId: DayId; exerciseId: ExerciseId } }
  | { type: 'REORDER_EXERCISES'; payload: { dayId: DayId; exerciseOrder: ExerciseId[] } }
  | { type: 'TOGGLE_SKIP'; payload: { dayId: DayId; exerciseId: ExerciseId } }
  | { type: 'TOGGLE_BURNDOWN'; payload: { dayId: DayId; exerciseId: ExerciseId } }
  | { type: 'SET_DROP_COUNT'; payload: { dayId: DayId; exerciseId: ExerciseId; count: number } }
  | { type: 'START_SESSION'; payload: { dayId: DayId } }
  | { type: 'FINISH_SESSION' }
  | { type: 'DISCARD_SESSION' }
  | { type: 'UPDATE_SET'; payload: { exerciseIndex: number; setIndex: number; field: 'weight' | 'reps'; value: number | null } }
  | { type: 'TOGGLE_SET_COMPLETE'; payload: { exerciseIndex: number; setIndex: number } }
  | { type: 'ADD_SET'; payload: { exerciseIndex: number } }
  | { type: 'REMOVE_SET'; payload: { exerciseIndex: number; setIndex: number } }
  | { type: 'UPDATE_BURNDOWN_DROP'; payload: { exerciseIndex: number; dropIndex: number; field: 'weight' | 'reps'; value: number | null } };

export const SCHEMA_VERSION = 1;
