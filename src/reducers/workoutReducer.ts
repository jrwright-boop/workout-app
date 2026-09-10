import type {
  AppState, WorkoutAction, WorkoutSession, SessionExercise, SetEntry, DropEntry,
  ExerciseTemplate, ExerciseTypeFields, Unit, Program, DayTemplate,
} from '../types';
import { generateId } from '../utils/id';
import { parseISO, toISODate } from '../utils/date';
import { startOfWeek } from '../utils/calendar';
import { bodyweightOn, upsertBodyweight } from '../utils/bodyweight';
import { findLastForDay, findLastPerformed } from '../utils/exerciseHistory';
import { hitTopOfRange } from '../utils/repRange';
import { workingSets } from '../utils/metrics';
import { convertWeight, defaultIncrement } from '../utils/units';

type PrefillSource = ExerciseTypeFields & { targetRepMax: number | null };

/**
 * Build a fresh set list for an exercise, pre-filled from the last time it
 * was performed. If that session hit the top of the target range on every
 * working set, the weight is nudged by one increment (down for assisted
 * work) and the set is flagged `suggested` so the UI can say why.
 */
function buildSetsFromLast(
  lastEx: SessionExercise | undefined,
  count: number,
  tpl: PrefillSource,
  unit: Unit,
  /** False when the source session was a deload: its numbers pre-fill but never trigger a step up. */
  allowSuggestion = true
): SetEntry[] {
  const lastWorking = lastEx ? workingSets(lastEx) : [];
  const progress = allowSuggestion && !!lastEx && tpl.targetRepMax != null && hitTopOfRange(lastEx);
  const inc = tpl.increment ?? defaultIncrement(unit);

  return Array.from({ length: count }, (_, i) => {
    const lastSet = lastWorking[i];
    const lastWeight = lastSet?.weight ?? null;
    let weight = lastWeight;
    let suggested = false;
    if (progress && lastWeight != null) {
      weight = tpl.loadType === 'assisted' ? Math.max(0, lastWeight - inc) : lastWeight + inc;
      suggested = true;
    }
    return {
      weight,
      reps: null,
      completed: false,
      repsFromLastSession: lastSet?.reps ?? null,
      warmup: false,
      prefilledWeight: weight,
      suggested,
    };
  });
}

function emptySet(): SetEntry {
  return { weight: null, reps: null, completed: false, repsFromLastSession: null, warmup: false, prefilledWeight: null, suggested: false };
}

/**
 * Build a session exercise from a day template. Scheduled exercises pre-fill
 * from the same day's scheduled history first (so a heavy day never inherits
 * a light day's numbers), falling back to any instance. Make-ups (a day's
 * plan pulled into another session) use the most recent instance anywhere.
 */
function sessionExerciseFromTemplate(
  ex: ExerciseTemplate,
  state: AppState,
  dayId: string,
  origin: SessionExercise['origin'],
  history: WorkoutSession[] = state.history
): SessionExercise {
  const last = origin === 'scheduled'
    ? findLastForDay(history, ex.id, ex.name, dayId).last
    : findLastPerformed(history, ex.id, ex.name, { excludeDeload: true }) ?? findLastPerformed(history, ex.id, ex.name);
  return {
    exerciseId: ex.id,
    name: ex.name,
    origin,
    supersetGroup: origin === 'scheduled' ? ex.supersetGroup : null,
    sets: buildSetsFromLast(last?.exercise, ex.defaultSetCount, ex, state.unit, !last?.session.deload),
    burndown: null,
    notes: '',
    skipped: false,
    targetRepMin: ex.targetRepMin,
    targetRepMax: ex.targetRepMax,
    loadType: ex.loadType,
    perSide: ex.perSide,
    measure: ex.measure,
    increment: ex.increment,
  };
}

/** Immutable helper: apply `fn` to one exercise of the active session. */
function updateSessionExercise(
  state: AppState,
  exerciseIndex: number,
  fn: (ex: SessionExercise) => SessionExercise | null
): AppState {
  if (!state.activeSession) return state;
  const current = state.activeSession.exercises[exerciseIndex];
  if (!current) return state;
  const next = fn(current);
  if (!next || next === current) return state;
  const exercises = [...state.activeSession.exercises];
  exercises[exerciseIndex] = next;
  return { ...state, activeSession: { ...state.activeSession, exercises } };
}

function convertSets(sets: SetEntry[], from: Unit, to: Unit): SetEntry[] {
  return sets.map(s => ({
    ...s,
    weight: s.weight == null ? null : convertWeight(s.weight, from, to),
    prefilledWeight: s.prefilledWeight == null ? null : convertWeight(s.prefilledWeight, from, to),
  }));
}

function convertSession(session: WorkoutSession, from: Unit, to: Unit): WorkoutSession {
  return {
    ...session,
    bodyweight: session.bodyweight == null ? null : convertWeight(session.bodyweight, from, to),
    exercises: session.exercises.map(ex => ({
      ...ex,
      increment: ex.increment == null ? null : convertWeight(ex.increment, from, to),
      sets: convertSets(ex.sets, from, to),
      burndown: ex.burndown
        ? { drops: ex.burndown.drops.map(d => ({ ...d, weight: d.weight == null ? null : convertWeight(d.weight, from, to) })) }
        : null,
    })),
  };
}

function convertDays(days: Record<string, DayTemplate>, from: Unit, to: Unit): Record<string, DayTemplate> {
  const out: Record<string, DayTemplate> = {};
  for (const [dayId, day] of Object.entries(days)) {
    const exercises: Record<string, ExerciseTemplate> = {};
    for (const [exId, ex] of Object.entries(day.exercises)) {
      exercises[exId] = { ...ex, increment: ex.increment == null ? null : convertWeight(ex.increment, from, to) };
    }
    out[dayId] = { ...day, exercises };
  }
  return out;
}

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
      const remainingDays = { ...state.days };
      delete remainingDays[dayId];
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
      const { dayId, id, name, defaultSetCount, targetRepMin, targetRepMax, loadType, perSide, measure, increment, cues, muscles } = action.payload;
      const day = state.days[dayId];
      if (!day) return state;
      const exerciseId = id ?? generateId();
      if (day.exercises[exerciseId]) return state;
      return {
        ...state,
        days: {
          ...state.days,
          [dayId]: {
            ...day,
            exerciseOrder: [...day.exerciseOrder, exerciseId],
            exercises: {
              ...day.exercises,
              [exerciseId]: {
                id: exerciseId, name, defaultSetCount, skipped: false,
                targetRepMin, targetRepMax, loadType, perSide, measure, increment,
                cues, muscles, supersetGroup: null,
              },
            },
          },
        },
      };
    }

    case 'EDIT_EXERCISE': {
      const { dayId, exerciseId, name, defaultSetCount, targetRepMin, targetRepMax, loadType, perSide, measure, increment, cues, muscles } = action.payload;
      // Identity-level fields (name, type) belong to the exercise and follow
      // it to every day that includes it; sets and target range stay per day,
      // since a heavy day and a light day can legitimately differ.
      const days: Record<string, DayTemplate> = {};
      for (const [id, day] of Object.entries(state.days)) {
        const ex = day.exercises[exerciseId];
        if (!ex) { days[id] = day; continue; }
        const perDay = id === dayId ? { defaultSetCount, targetRepMin, targetRepMax } : {};
        days[id] = {
          ...day,
          exercises: { ...day.exercises, [exerciseId]: { ...ex, name, loadType, perSide, measure, increment, cues, muscles, ...perDay } },
        };
      }
      return { ...state, days };
    }

    case 'DELETE_EXERCISE': {
      const { dayId, exerciseId } = action.payload;
      const day = state.days[dayId];
      const remainingExercises = { ...day.exercises };
      delete remainingExercises[exerciseId];
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

    case 'COPY_EXERCISE_TO_DAY': {
      const { fromDayId, toDayId, exerciseId } = action.payload;
      const source = state.days[fromDayId]?.exercises[exerciseId];
      const target = state.days[toDayId];
      if (!source || !target || target.exercises[exerciseId]) return state;
      return {
        ...state,
        days: {
          ...state.days,
          [toDayId]: {
            ...target,
            exerciseOrder: [...target.exerciseOrder, exerciseId],
            exercises: { ...target.exercises, [exerciseId]: { ...source, skipped: false, supersetGroup: null } },
          },
        },
      };
    }

    case 'SET_SUPERSET': {
      // Link an exercise with another on the same day (they share a group id)
      // or unlink it (withExerciseId null). Groups are pairs or longer chains;
      // linking to an already-grouped exercise joins that group.
      const { dayId, exerciseId, withExerciseId } = action.payload;
      const day = state.days[dayId];
      const ex = day?.exercises[exerciseId];
      if (!ex) return state;
      const exercises = { ...day.exercises };
      if (!withExerciseId) {
        exercises[exerciseId] = { ...ex, supersetGroup: null };
        // A group of one is no group.
        const remaining = Object.values(exercises).filter(e => e.supersetGroup && e.supersetGroup === ex.supersetGroup);
        if (remaining.length === 1) exercises[remaining[0].id] = { ...remaining[0], supersetGroup: null };
      } else {
        const partner = day.exercises[withExerciseId];
        if (!partner) return state;
        const group = partner.supersetGroup ?? ex.supersetGroup ?? generateId();
        exercises[exerciseId] = { ...ex, supersetGroup: group };
        exercises[withExerciseId] = { ...partner, supersetGroup: group };
        // Keep partners adjacent so the session shows them together.
        const order = day.exerciseOrder.filter(id => id !== exerciseId);
        const at = order.indexOf(withExerciseId);
        order.splice(at + 1, 0, exerciseId);
        return { ...state, days: { ...state.days, [dayId]: { ...day, exercises, exerciseOrder: order } } };
      }
      return { ...state, days: { ...state.days, [dayId]: { ...day, exercises } } };
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
      const { dayId, backdate } = action.payload;
      const day = state.days[dayId];
      // A backdated session starts at local noon on that day and pre-fills
      // only from history that came before it.
      const start = backdate ? new Date(parseISO(backdate).getTime() + 12 * 3600 * 1000) : new Date();
      const startedAt = start.toISOString();
      const date = toISODate(start);
      const history = backdate ? state.history.filter(h => h.startedAt < startedAt) : state.history;
      const weekKey = toISODate(startOfWeek(start));

      const exercises: SessionExercise[] = day.exerciseOrder
        .map(eid => day.exercises[eid])
        .filter(ex => !ex.skipped)
        .map(ex => sessionExerciseFromTemplate(ex, state, dayId, 'scheduled', history));

      const session: WorkoutSession = {
        id: generateId(),
        dayId,
        dayName: day.name,
        date,
        startedAt,
        completedAt: null,
        exercises,
        bodyweight: bodyweightOn(state.bodyweightLog, date),
        deload: state.deloadWeeks.includes(weekKey),
        backdated: !!backdate,
      };

      return { ...state, activeSession: session };
    }

    case 'FINISH_SESSION': {
      if (!state.activeSession) return state;
      const completed: WorkoutSession = {
        ...state.activeSession,
        // A backdated session has no real duration; mark it done at its start.
        completedAt: state.activeSession.backdated ? state.activeSession.startedAt : new Date().toISOString(),
      };
      // History is newest-first; a backdated session slots into place.
      const at = state.history.findIndex(h => h.startedAt <= completed.startedAt);
      const history = [...state.history];
      history.splice(at === -1 ? history.length : at, 0, completed);
      return {
        ...state,
        activeSession: null,
        history,
      };
    }

    case 'DISCARD_SESSION':
      return { ...state, activeSession: null };

    case 'UPDATE_SET': {
      const { exerciseIndex, setIndex, field, value } = action.payload;
      return updateSessionExercise(state, exerciseIndex, ex => {
        const sets = [...ex.sets];
        const current = sets[setIndex];
        if (!current) return null;
        // Editing the weight by hand retires the suggestion hint.
        const suggested = field === 'weight' && value !== current.prefilledWeight ? false : current.suggested;
        sets[setIndex] = { ...current, [field]: value, suggested };
        return { ...ex, sets };
      });
    }

    case 'TOGGLE_SET_COMPLETE': {
      const { exerciseIndex, setIndex } = action.payload;
      return updateSessionExercise(state, exerciseIndex, ex => {
        const sets = [...ex.sets];
        const currentSet = sets[setIndex];
        if (!currentSet) return null;
        const nowCompleting = !currentSet.completed;
        sets[setIndex] = {
          ...currentSet,
          completed: nowCompleting,
          // Auto-fill reps from last session placeholder when completing
          reps: nowCompleting && currentSet.reps === null && currentSet.repsFromLastSession !== null
            ? currentSet.repsFromLastSession
            : currentSet.reps,
        };

        // Carry the completed weight forward: later uncompleted working sets
        // that are still at their pre-filled value (or empty) follow the
        // change, while deliberately edited sets are left alone.
        const completedWeight = sets[setIndex].weight;
        if (nowCompleting && completedWeight != null && !currentSet.warmup) {
          for (let j = setIndex + 1; j < sets.length; j++) {
            const s = sets[j];
            if (s.completed || s.warmup) continue;
            if ((s.weight === null || s.weight === s.prefilledWeight) && s.weight !== completedWeight) {
              sets[j] = { ...s, weight: completedWeight, suggested: false };
            }
          }
        }
        return { ...ex, sets };
      });
    }

    case 'TOGGLE_SET_WARMUP': {
      const { exerciseIndex, setIndex } = action.payload;
      return updateSessionExercise(state, exerciseIndex, ex => {
        const sets = [...ex.sets];
        const current = sets[setIndex];
        if (!current) return null;
        sets[setIndex] = { ...current, warmup: !current.warmup };
        return { ...ex, sets };
      });
    }

    case 'ADD_SET': {
      const { exerciseIndex } = action.payload;
      return updateSessionExercise(state, exerciseIndex, ex => ({ ...ex, sets: [...ex.sets, emptySet()] }));
    }

    case 'REMOVE_SET': {
      const { exerciseIndex, setIndex } = action.payload;
      return updateSessionExercise(state, exerciseIndex, ex => ({ ...ex, sets: ex.sets.filter((_, i) => i !== setIndex) }));
    }

    case 'UPDATE_BURNDOWN_DROP': {
      const { exerciseIndex, dropIndex, field, value } = action.payload;
      return updateSessionExercise(state, exerciseIndex, ex => {
        if (!ex.burndown) return null;
        const drops = [...ex.burndown.drops];
        drops[dropIndex] = { ...drops[dropIndex], [field]: value };
        return { ...ex, burndown: { drops } };
      });
    }

    case 'TOGGLE_SESSION_BURNDOWN': {
      const { exerciseIndex } = action.payload;
      return updateSessionExercise(state, exerciseIndex, ex => ({
        ...ex,
        burndown: ex.burndown
          ? null
          : { drops: Array.from({ length: 3 }, (): DropEntry => ({ weight: null, reps: null })) },
      }));
    }

    case 'SET_SESSION_DROP_COUNT': {
      const { exerciseIndex, count } = action.payload;
      return updateSessionExercise(state, exerciseIndex, ex => {
        if (!ex.burndown) return null;
        const currentDrops = ex.burndown.drops;
        const drops: DropEntry[] = Array.from({ length: count }, (_, i) =>
          i < currentDrops.length ? currentDrops[i] : { weight: null, reps: null }
        );
        return { ...ex, burndown: { drops } };
      });
    }

    case 'UPDATE_EXERCISE_NOTES': {
      const { exerciseIndex, notes } = action.payload;
      return updateSessionExercise(state, exerciseIndex, ex => ({ ...ex, notes }));
    }

    case 'SET_UNIT': {
      const { unit, convert } = action.payload;
      if (unit === state.unit) return state;
      if (!convert) return { ...state, unit };
      const from = state.unit;
      return {
        ...state,
        unit,
        days: convertDays(state.days, from, unit),
        history: state.history.map(s => convertSession(s, from, unit)),
        activeSession: state.activeSession ? convertSession(state.activeSession, from, unit) : null,
        programs: state.programs.map(p => ({ ...p, days: convertDays(p.days, from, unit) })),
        bodyweightLog: state.bodyweightLog.map(e => ({ ...e, weight: convertWeight(e.weight, from, unit) })),
      };
    }

    case 'REORDER_SESSION_EXERCISES': {
      if (!state.activeSession) return state;
      return { ...state, activeSession: { ...state.activeSession, exercises: action.payload.exercises } };
    }

    case 'TOGGLE_SESSION_EXERCISE_SKIP': {
      const { exerciseIndex } = action.payload;
      return updateSessionExercise(state, exerciseIndex, ex => ({ ...ex, skipped: !ex.skipped }));
    }

    case 'ADD_SESSION_EXERCISE': {
      if (!state.activeSession) return state;
      const { exerciseId, name, defaultSetCount } = action.payload;

      // Pre-fill from the last time this exercise was actually performed.
      const lastEntry = findLastPerformed(state.history, exerciseId, name, { excludeDeload: true })
        ?? findLastPerformed(state.history, exerciseId, name);
      const last = lastEntry?.exercise;

      // Inherit type and target range from the matching day template, if any;
      // otherwise from the last logged instance.
      let tpl: ExerciseTemplate | undefined;
      for (const dayId of state.dayOrder) {
        const candidate = exerciseId ? state.days[dayId].exercises[exerciseId] : undefined;
        if (candidate) { tpl = candidate; break; }
      }
      const source: PrefillSource = tpl ?? last ?? {
        loadType: 'external', perSide: false, measure: 'reps', increment: null, targetRepMax: null,
      };

      const newExercise: SessionExercise = {
        exerciseId: exerciseId ?? last?.exerciseId ?? generateId(),
        name,
        origin: 'makeup',
        supersetGroup: null,
        sets: buildSetsFromLast(last, defaultSetCount, source, state.unit, !lastEntry?.session.deload),
        burndown: null,
        notes: '',
        skipped: false,
        targetRepMin: tpl?.targetRepMin ?? last?.targetRepMin ?? null,
        targetRepMax: source.targetRepMax,
        loadType: source.loadType,
        perSide: source.perSide,
        measure: source.measure,
        increment: source.increment,
      };

      return {
        ...state,
        activeSession: {
          ...state.activeSession,
          exercises: [...state.activeSession.exercises, newExercise],
        },
      };
    }

    case 'ADD_DAY_TO_SESSION': {
      if (!state.activeSession) return state;
      const day = state.days[action.payload.dayId];
      if (!day) return state;

      const currentIds = new Set(state.activeSession.exercises.map(e => e.exerciseId));
      const added: SessionExercise[] = day.exerciseOrder
        .map(eid => day.exercises[eid])
        .filter(ex => !ex.skipped && !currentIds.has(ex.id))
        .map(ex => sessionExerciseFromTemplate(ex, state, action.payload.dayId, 'makeup'));

      if (added.length === 0) return state;
      return {
        ...state,
        activeSession: {
          ...state.activeSession,
          exercises: [...state.activeSession.exercises, ...added],
        },
      };
    }

    case 'SET_REST_SECONDS':
      return { ...state, restSeconds: action.payload.seconds };

    case 'SET_BAR_WEIGHT': {
      const { unit, weight } = action.payload;
      return { ...state, barWeight: { ...state.barWeight, [unit]: weight } };
    }

    case 'DELETE_HISTORY_SESSION': {
      const { sessionId } = action.payload;
      return { ...state, history: state.history.filter(s => s.id !== sessionId) };
    }

    case 'UPDATE_HISTORY_SET': {
      const { sessionId, exerciseIndex, setIndex, field, value } = action.payload;
      const history = state.history.map(session => {
        if (session.id !== sessionId) return session;
        const exercises = [...session.exercises];
        const ex = { ...exercises[exerciseIndex] };
        const sets = [...ex.sets];
        sets[setIndex] = { ...sets[setIndex], [field]: value };
        ex.sets = sets;
        exercises[exerciseIndex] = ex;
        return { ...session, exercises };
      });
      return { ...state, history };
    }

    case 'LOG_BODYWEIGHT': {
      const { date, weight } = action.payload;
      if (!(weight > 0)) return state;
      const bodyweightLog = upsertBodyweight(state.bodyweightLog, { date, weight });
      // Today's active session picks up today's entry.
      const activeSession = state.activeSession && state.activeSession.date === date
        ? { ...state.activeSession, bodyweight: weight }
        : state.activeSession;
      return { ...state, bodyweightLog, activeSession };
    }

    case 'DELETE_BODYWEIGHT':
      return { ...state, bodyweightLog: state.bodyweightLog.filter(e => e.date !== action.payload.date) };

    case 'TOGGLE_DELOAD_WEEK': {
      const { weekStart } = action.payload;
      const on = !state.deloadWeeks.includes(weekStart);
      const deloadWeeks = on ? [...state.deloadWeeks, weekStart].sort() : state.deloadWeeks.filter(w => w !== weekStart);
      const inWeek = (s: WorkoutSession) => toISODate(startOfWeek(parseISO(s.startedAt))) === weekStart;
      const flag = (s: WorkoutSession) => (inWeek(s) && s.deload !== on ? { ...s, deload: on } : s);
      return {
        ...state,
        deloadWeeks,
        history: state.history.map(flag),
        activeSession: state.activeSession ? flag(state.activeSession) : null,
      };
    }

    case 'SET_REST_NOTIFICATIONS':
      return { ...state, restNotifications: action.payload.enabled };

    case 'SAVE_PROGRAM': {
      const program: Program = {
        id: generateId(),
        name: action.payload.name,
        dayOrder: [...state.dayOrder],
        days: structuredClone(state.days),
        savedAt: new Date().toISOString(),
      };
      return { ...state, programs: [program, ...state.programs] };
    }

    case 'LOAD_PROGRAM': {
      const program = state.programs.find(p => p.id === action.payload.programId);
      if (!program) return state;
      const days = structuredClone(program.days);
      return {
        ...state,
        dayOrder: [...program.dayOrder],
        days,
        activeDayId: program.dayOrder[0] ?? null,
      };
    }

    case 'DELETE_PROGRAM':
      return { ...state, programs: state.programs.filter(p => p.id !== action.payload.programId) };

    case 'IMPORT_PROGRAM': {
      const incoming = action.payload.program;
      // Fresh ids so an imported program never collides with existing days.
      const dayIdMap = new Map(incoming.dayOrder.map(id => [id, generateId()] as const));
      const days: Record<string, DayTemplate> = {};
      for (const oldId of incoming.dayOrder) {
        const day = incoming.days[oldId];
        const newId = dayIdMap.get(oldId)!;
        days[newId] = structuredClone({ ...day, id: newId });
      }
      const program: Program = {
        id: generateId(),
        name: incoming.name,
        dayOrder: incoming.dayOrder.map(id => dayIdMap.get(id)!),
        days,
        savedAt: new Date().toISOString(),
      };
      return { ...state, programs: [program, ...state.programs] };
    }

    default:
      return state;
  }
}
