import type { AppState, WorkoutAction, WorkoutSession, SessionExercise, SetEntry, DropEntry } from '../types';
import { generateId } from '../utils/id';
import { toISODate } from '../utils/date';

export function workoutReducer(state: AppState, action: WorkoutAction): AppState {
  switch (action.type) {
    case 'LOAD_STATE':
      return action.payload;

    case 'ADD_DAY': {
      const id = generateId();
      return {
        ...state,
        dayOrder: [...state.dayOrder, id],
        days: {
          ...state.days,
          [id]: { id, name: action.payload.name, exerciseOrder: [], exercises: {} },
        },
        activeDayId: state.activeDayId ?? id,
      };
    }

    case 'RENAME_DAY': {
      const { dayId, name } = action.payload;
      return {
        ...state,
        days: {
          ...state.days,
          [dayId]: { ...state.days[dayId], name },
        },
      };
    }

    case 'DELETE_DAY': {
      const { dayId } = action.payload;
      const { [dayId]: _, ...remainingDays } = state.days;
      const newOrder = state.dayOrder.filter(id => id !== dayId);
      return {
        ...state,
        dayOrder: newOrder,
        days: remainingDays,
        activeDayId: state.activeDayId === dayId ? (newOrder[0] ?? null) : state.activeDayId,
      };
    }

    case 'REORDER_DAYS':
      return { ...state, dayOrder: action.payload.dayOrder };

    case 'SET_ACTIVE_DAY':
      return { ...state, activeDayId: action.payload.dayId };

    case 'ADD_EXERCISE': {
      const { dayId, name, defaultSetCount } = action.payload;
      const exerciseId = generateId();
      const day = state.days[dayId];
      return {
        ...state,
        days: {
          ...state.days,
          [dayId]: {
            ...day,
            exerciseOrder: [...day.exerciseOrder, exerciseId],
            exercises: {
              ...day.exercises,
              [exerciseId]: { id: exerciseId, name, defaultSetCount, skipped: false },
            },
          },
        },
      };
    }

    case 'EDIT_EXERCISE': {
      const { dayId, exerciseId, name, defaultSetCount } = action.payload;
      const day = state.days[dayId];
      return {
        ...state,
        days: {
          ...state.days,
          [dayId]: {
            ...day,
            exercises: {
              ...day.exercises,
              [exerciseId]: { ...day.exercises[exerciseId], name, defaultSetCount },
            },
          },
        },
      };
    }

    case 'DELETE_EXERCISE': {
      const { dayId, exerciseId } = action.payload;
      const day = state.days[dayId];
      const { [exerciseId]: _, ...remainingExercises } = day.exercises;
      return {
        ...state,
        days: {
          ...state.days,
          [dayId]: {
            ...day,
            exerciseOrder: day.exerciseOrder.filter(id => id !== exerciseId),
            exercises: remainingExercises,
          },
        },
      };
    }

    case 'REORDER_EXERCISES': {
      const { dayId, exerciseOrder } = action.payload;
      return {
        ...state,
        days: {
          ...state.days,
          [dayId]: { ...state.days[dayId], exerciseOrder },
        },
      };
    }

    case 'TOGGLE_SKIP': {
      const { dayId, exerciseId } = action.payload;
      const day = state.days[dayId];
      const ex = day.exercises[exerciseId];
      return {
        ...state,
        days: {
          ...state.days,
          [dayId]: {
            ...day,
            exercises: { ...day.exercises, [exerciseId]: { ...ex, skipped: !ex.skipped } },
          },
        },
      };
    }

    case 'START_SESSION': {
      const { dayId } = action.payload;
      const day = state.days[dayId];
      const now = new Date().toISOString();

      // Find last session for this day to pre-fill weights and reps
      const lastSession = state.history.find(s => s.dayId === dayId);

      const exercises: SessionExercise[] = day.exerciseOrder
        .map(eid => day.exercises[eid])
        .filter(ex => !ex.skipped)
        .map(ex => {
          const lastEx = lastSession?.exercises.find(e => e.exerciseId === ex.id);

          const sets: SetEntry[] = Array.from({ length: ex.defaultSetCount }, (_, i) => {
            const lastSet = lastEx?.sets[i];
            return {
              weight: lastSet?.weight ?? null,
              reps: null,
              completed: false,
              repsFromLastSession: lastSet?.reps ?? null,
            };
          });

          return { exerciseId: ex.id, name: ex.name, sets, burndown: null, notes: '', skipped: false };
        });

      const session: WorkoutSession = {
        id: generateId(),
        dayId,
        dayName: day.name,
        date: toISODate(),
        startedAt: now,
        completedAt: null,
        exercises,
      };

      return { ...state, activeSession: session };
    }

    case 'FINISH_SESSION': {
      if (!state.activeSession) return state;
      const completed: WorkoutSession = {
        ...state.activeSession,
        completedAt: new Date().toISOString(),
      };
      return {
        ...state,
        activeSession: null,
        history: [completed, ...state.history],
      };
    }

    case 'DISCARD_SESSION':
      return { ...state, activeSession: null };

    case 'UPDATE_SET': {
      if (!state.activeSession) return state;
      const { exerciseIndex, setIndex, field, value } = action.payload;
      const exercises = [...state.activeSession.exercises];
      const ex = { ...exercises[exerciseIndex] };
      const sets = [...ex.sets];
      sets[setIndex] = { ...sets[setIndex], [field]: value };
      ex.sets = sets;
      exercises[exerciseIndex] = ex;
      return { ...state, activeSession: { ...state.activeSession, exercises } };
    }

    case 'TOGGLE_SET_COMPLETE': {
      if (!state.activeSession) return state;
      const { exerciseIndex, setIndex } = action.payload;
      const exercises = [...state.activeSession.exercises];
      const ex = { ...exercises[exerciseIndex] };
      const sets = [...ex.sets];
      const currentSet = sets[setIndex];
      const nowCompleting = !currentSet.completed;
      sets[setIndex] = {
        ...currentSet,
        completed: nowCompleting,
        // Auto-fill reps from last session placeholder when completing
        reps: nowCompleting && currentSet.reps === null && currentSet.repsFromLastSession !== null
          ? currentSet.repsFromLastSession
          : currentSet.reps,
      };
      ex.sets = sets;
      exercises[exerciseIndex] = ex;
      return { ...state, activeSession: { ...state.activeSession, exercises } };
    }

    case 'ADD_SET': {
      if (!state.activeSession) return state;
      const { exerciseIndex } = action.payload;
      const exercises = [...state.activeSession.exercises];
      const ex = { ...exercises[exerciseIndex] };
      ex.sets = [...ex.sets, { weight: null, reps: null, completed: false, repsFromLastSession: null }];
      exercises[exerciseIndex] = ex;
      return { ...state, activeSession: { ...state.activeSession, exercises } };
    }

    case 'REMOVE_SET': {
      if (!state.activeSession) return state;
      const { exerciseIndex, setIndex } = action.payload;
      const exercises = [...state.activeSession.exercises];
      const ex = { ...exercises[exerciseIndex] };
      ex.sets = ex.sets.filter((_, i) => i !== setIndex);
      exercises[exerciseIndex] = ex;
      return { ...state, activeSession: { ...state.activeSession, exercises } };
    }

    case 'UPDATE_BURNDOWN_DROP': {
      if (!state.activeSession) return state;
      const { exerciseIndex, dropIndex, field, value } = action.payload;
      const exercises = [...state.activeSession.exercises];
      const ex = { ...exercises[exerciseIndex] };
      if (!ex.burndown) return state;
      const drops = [...ex.burndown.drops];
      drops[dropIndex] = { ...drops[dropIndex], [field]: value };
      ex.burndown = { drops };
      exercises[exerciseIndex] = ex;
      return { ...state, activeSession: { ...state.activeSession, exercises } };
    }

    case 'TOGGLE_SESSION_BURNDOWN': {
      if (!state.activeSession) return state;
      const { exerciseIndex } = action.payload;
      const exercises = [...state.activeSession.exercises];
      const ex = { ...exercises[exerciseIndex] };
      if (ex.burndown) {
        ex.burndown = null;
      } else {
        ex.burndown = {
          drops: Array.from({ length: 3 }, (): DropEntry => ({ weight: null, reps: null })),
        };
      }
      exercises[exerciseIndex] = ex;
      return { ...state, activeSession: { ...state.activeSession, exercises } };
    }

    case 'SET_SESSION_DROP_COUNT': {
      if (!state.activeSession) return state;
      const { exerciseIndex, count } = action.payload;
      const exercises = [...state.activeSession.exercises];
      const ex = { ...exercises[exerciseIndex] };
      if (!ex.burndown) return state;
      const currentDrops = ex.burndown.drops;
      const newDrops: DropEntry[] = Array.from({ length: count }, (_, i) =>
        i < currentDrops.length ? currentDrops[i] : { weight: null, reps: null }
      );
      ex.burndown = { drops: newDrops };
      exercises[exerciseIndex] = ex;
      return { ...state, activeSession: { ...state.activeSession, exercises } };
    }

    case 'UPDATE_EXERCISE_NOTES': {
      if (!state.activeSession) return state;
      const { exerciseIndex, notes } = action.payload;
      const exercises = [...state.activeSession.exercises];
      exercises[exerciseIndex] = { ...exercises[exerciseIndex], notes };
      return { ...state, activeSession: { ...state.activeSession, exercises } };
    }

    case 'SET_UNIT':
      return { ...state, unit: action.payload.unit };

    case 'REORDER_SESSION_EXERCISES': {
      if (!state.activeSession) return state;
      return { ...state, activeSession: { ...state.activeSession, exercises: action.payload.exercises } };
    }

    case 'TOGGLE_SESSION_EXERCISE_SKIP': {
      if (!state.activeSession) return state;
      const { exerciseIndex } = action.payload;
      const exercises = [...state.activeSession.exercises];
      exercises[exerciseIndex] = { ...exercises[exerciseIndex], skipped: !exercises[exerciseIndex].skipped };
      return { ...state, activeSession: { ...state.activeSession, exercises } };
    }

    default:
      return state;
  }
}
