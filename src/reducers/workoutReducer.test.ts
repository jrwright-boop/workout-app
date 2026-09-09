import { describe, expect, it } from 'vitest';
import { workoutReducer } from './workoutReducer';
import { getInitialState } from '../storage/localStorage';
import { DEFAULT_TYPE_FIELDS, type AppState, type ExerciseTemplate, type SetEntry, type WorkoutSession } from '../types';

function tpl(id: string, name: string, extra: Partial<ExerciseTemplate> = {}): ExerciseTemplate {
  return { id, name, defaultSetCount: 3, skipped: false, targetRepMin: 8, targetRepMax: 12, ...DEFAULT_TYPE_FIELDS, ...extra };
}

function set(weight: number | null, reps: number | null, extra: Partial<SetEntry> = {}): SetEntry {
  return { weight, reps, completed: true, repsFromLastSession: null, warmup: false, prefilledWeight: null, suggested: false, ...extra };
}

function stateWithDay(): AppState {
  return {
    ...getInitialState(),
    dayOrder: ['d1'],
    days: {
      d1: {
        id: 'd1', name: 'Push', exerciseOrder: ['e1', 'e2'],
        exercises: {
          e1: tpl('e1', 'Bench'),
          e2: tpl('e2', 'Fly', { defaultSetCount: 2, skipped: true, targetRepMin: null, targetRepMax: null }),
        },
      },
    },
    activeDayId: 'd1',
  };
}

function pastSession(sets: SetEntry[], overrides: Partial<WorkoutSession['exercises'][number]> = {}): WorkoutSession {
  return {
    id: 's-old', dayId: 'd1', dayName: 'Push', date: '2026-08-10',
    startedAt: '2026-08-10T17:00:00Z', completedAt: '2026-08-10T18:00:00Z',
    exercises: [{
      exerciseId: 'e1', name: 'Bench', notes: '', skipped: false, burndown: null,
      targetRepMin: 8, targetRepMax: 12, ...DEFAULT_TYPE_FIELDS, sets, ...overrides,
    }],
  };
}

describe('START_SESSION', () => {
  it('skips skipped exercises and pre-fills weight and rep placeholders from history', () => {
    const state = { ...stateWithDay(), history: [pastSession([set(100, 10), set(100, 9), set(105, 8)])] };
    const next = workoutReducer(state, { type: 'START_SESSION', payload: { dayId: 'd1' } });
    const session = next.activeSession!;
    expect(session.exercises.map(e => e.exerciseId)).toEqual(['e1']);
    expect(session.exercises[0].sets.map(s => s.weight)).toEqual([100, 100, 105]);
    expect(session.exercises[0].sets.map(s => s.prefilledWeight)).toEqual([100, 100, 105]);
    expect(session.exercises[0].sets.map(s => s.reps)).toEqual([null, null, null]);
    expect(session.exercises[0].sets.map(s => s.repsFromLastSession)).toEqual([10, 9, 8]);
    expect(session.exercises[0].sets.every(s => !s.suggested)).toBe(true);
  });

  it('pre-fills from a same-named exercise logged under another id', () => {
    const other = pastSession([set(80, 10)]);
    other.exercises[0].exerciseId = 'someone-elses-id';
    const state = { ...stateWithDay(), history: [other] };
    const next = workoutReducer(state, { type: 'START_SESSION', payload: { dayId: 'd1' } });
    expect(next.activeSession!.exercises[0].sets[0].weight).toBe(80);
  });

  it('suggests the next weight up when every working set hit the top of the range', () => {
    const last = pastSession([set(40, 6, { warmup: true }), set(100, 12), set(100, 12), set(100, 12)]);
    const state = { ...stateWithDay(), history: [last] };
    const next = workoutReducer(state, { type: 'START_SESSION', payload: { dayId: 'd1' } });
    const sets = next.activeSession!.exercises[0].sets;
    // Warm-up is ignored for both the check and the index alignment.
    expect(sets.map(s => s.weight)).toEqual([105, 105, 105]);
    expect(sets.every(s => s.suggested)).toBe(true);
    expect(sets[0].prefilledWeight).toBe(105);
  });

  it('suggests LESS assistance for assisted exercises', () => {
    const state = stateWithDay();
    state.days.d1.exercises.e1 = tpl('e1', 'Bench', { loadType: 'assisted', increment: 10 });
    state.history = [pastSession([set(50, 12), set(50, 12), set(50, 12)], { loadType: 'assisted' })];
    const next = workoutReducer(state, { type: 'START_SESSION', payload: { dayId: 'd1' } });
    expect(next.activeSession!.exercises[0].sets.map(s => s.weight)).toEqual([40, 40, 40]);
  });

  it('never suggests negative assistance', () => {
    const state = stateWithDay();
    state.days.d1.exercises.e1 = tpl('e1', 'Bench', { loadType: 'assisted' });
    state.history = [pastSession([set(2, 12), set(2, 12), set(2, 12)], { loadType: 'assisted' })];
    const next = workoutReducer(state, { type: 'START_SESSION', payload: { dayId: 'd1' } });
    expect(next.activeSession!.exercises[0].sets[0].weight).toBe(0);
  });

  it('does not suggest when a working set missed the top of the range', () => {
    const state = { ...stateWithDay(), history: [pastSession([set(100, 12), set(100, 11), set(100, 12)])] };
    const next = workoutReducer(state, { type: 'START_SESSION', payload: { dayId: 'd1' } });
    expect(next.activeSession!.exercises[0].sets.map(s => s.weight)).toEqual([100, 100, 100]);
  });

  it('snapshots the exercise type onto the session', () => {
    const state = stateWithDay();
    state.days.d1.exercises.e1 = tpl('e1', 'Bench', { perSide: true, measure: 'seconds' });
    const next = workoutReducer(state, { type: 'START_SESSION', payload: { dayId: 'd1' } });
    expect(next.activeSession!.exercises[0]).toMatchObject({ perSide: true, measure: 'seconds', loadType: 'external' });
  });
});

describe('UPDATE_SET', () => {
  it('clears the suggestion flag when the weight is edited by hand', () => {
    let state = { ...stateWithDay(), history: [pastSession([set(100, 12), set(100, 12), set(100, 12)])] };
    state = workoutReducer(state, { type: 'START_SESSION', payload: { dayId: 'd1' } });
    expect(state.activeSession!.exercises[0].sets[0].suggested).toBe(true);
    state = workoutReducer(state, { type: 'UPDATE_SET', payload: { exerciseIndex: 0, setIndex: 0, field: 'weight', value: 102.5 } });
    expect(state.activeSession!.exercises[0].sets[0].suggested).toBe(false);
  });
});

describe('TOGGLE_SET_COMPLETE', () => {
  it('fills reps from the placeholder and carries the weight to untouched later sets', () => {
    let state = { ...stateWithDay(), history: [pastSession([set(100, 10), set(100, 10), set(100, 10)])] };
    state = workoutReducer(state, { type: 'START_SESSION', payload: { dayId: 'd1' } });
    // User bumps set 1 to 105 and deliberately sets set 3 to 95.
    state = workoutReducer(state, { type: 'UPDATE_SET', payload: { exerciseIndex: 0, setIndex: 0, field: 'weight', value: 105 } });
    state = workoutReducer(state, { type: 'UPDATE_SET', payload: { exerciseIndex: 0, setIndex: 2, field: 'weight', value: 95 } });
    state = workoutReducer(state, { type: 'TOGGLE_SET_COMPLETE', payload: { exerciseIndex: 0, setIndex: 0 } });

    const sets = state.activeSession!.exercises[0].sets;
    expect(sets[0]).toMatchObject({ completed: true, reps: 10, weight: 105 });
    expect(sets[1].weight).toBe(105); // still at pre-fill -> follows
    expect(sets[2].weight).toBe(95);  // deliberately edited -> left alone
  });

  it('does not carry a warm-up weight forward', () => {
    let state = stateWithDay();
    state = workoutReducer(state, { type: 'START_SESSION', payload: { dayId: 'd1' } });
    state = workoutReducer(state, { type: 'TOGGLE_SET_WARMUP', payload: { exerciseIndex: 0, setIndex: 0 } });
    state = workoutReducer(state, { type: 'UPDATE_SET', payload: { exerciseIndex: 0, setIndex: 0, field: 'weight', value: 45 } });
    state = workoutReducer(state, { type: 'TOGGLE_SET_COMPLETE', payload: { exerciseIndex: 0, setIndex: 0 } });
    expect(state.activeSession!.exercises[0].sets[1].weight).toBeNull();
  });
});

describe('ADD_EXERCISE / EDIT_EXERCISE / COPY_EXERCISE_TO_DAY', () => {
  const fields = { name: 'Row', defaultSetCount: 3, targetRepMin: null, targetRepMax: null, ...DEFAULT_TYPE_FIELDS };

  it('reuses a supplied id and refuses a duplicate on the same day', () => {
    let state = stateWithDay();
    state = workoutReducer(state, { type: 'ADD_EXERCISE', payload: { dayId: 'd1', id: 'lib-1', ...fields } });
    expect(state.days.d1.exerciseOrder).toContain('lib-1');
    const again = workoutReducer(state, { type: 'ADD_EXERCISE', payload: { dayId: 'd1', id: 'lib-1', ...fields } });
    expect(again).toBe(state);
  });

  it('copies an exercise to another day with the same identity', () => {
    let state = stateWithDay();
    state = workoutReducer(state, { type: 'ADD_DAY', payload: { name: 'Upper' } });
    const d2 = state.dayOrder[1];
    state = workoutReducer(state, { type: 'COPY_EXERCISE_TO_DAY', payload: { fromDayId: 'd1', toDayId: d2, exerciseId: 'e1' } });
    expect(state.days[d2].exercises.e1.name).toBe('Bench');
    expect(state.days[d2].exerciseOrder).toEqual(['e1']);
  });

  it('propagates name and type to every day sharing the exercise, but keeps sets per day', () => {
    let state = stateWithDay();
    state = workoutReducer(state, { type: 'ADD_DAY', payload: { name: 'Upper' } });
    const d2 = state.dayOrder[1];
    state = workoutReducer(state, { type: 'COPY_EXERCISE_TO_DAY', payload: { fromDayId: 'd1', toDayId: d2, exerciseId: 'e1' } });
    state = workoutReducer(state, {
      type: 'EDIT_EXERCISE',
      payload: { dayId: 'd1', exerciseId: 'e1', name: 'Bench Press', defaultSetCount: 5, targetRepMin: 3, targetRepMax: 5, loadType: 'external', perSide: false, measure: 'reps', increment: 2.5 },
    });
    expect(state.days[d2].exercises.e1.name).toBe('Bench Press');
    expect(state.days[d2].exercises.e1.increment).toBe(2.5);
    expect(state.days[d2].exercises.e1.defaultSetCount).toBe(3); // per-day, untouched
    expect(state.days.d1.exercises.e1.defaultSetCount).toBe(5);
  });
});

describe('SET_UNIT', () => {
  it('converts every stored weight when asked, rounding to plate resolution', () => {
    let state = { ...stateWithDay(), history: [pastSession([set(135, 5), set(135, 5, { prefilledWeight: 135 })])] };
    state.history[0].exercises[0].burndown = { drops: [{ weight: 90, reps: 10 }] };
    state = workoutReducer(state, { type: 'SET_UNIT', payload: { unit: 'kg', convert: true } });
    expect(state.unit).toBe('kg');
    const ex = state.history[0].exercises[0];
    expect(ex.sets[0].weight).toBe(61.2);
    expect(ex.sets[1].prefilledWeight).toBe(61.2);
    expect(ex.burndown!.drops[0].weight).toBe(40.8);
    // Round trip lands back on the original.
    state = workoutReducer(state, { type: 'SET_UNIT', payload: { unit: 'lbs', convert: true } });
    expect(state.history[0].exercises[0].sets[0].weight).toBe(135);
  });

  it('only relabels when convert is false', () => {
    let state = { ...stateWithDay(), history: [pastSession([set(135, 5)])] };
    state = workoutReducer(state, { type: 'SET_UNIT', payload: { unit: 'kg', convert: false } });
    expect(state.history[0].exercises[0].sets[0].weight).toBe(135);
  });
});

describe('programs', () => {
  it('saves, loads, and imports with fresh ids', () => {
    let state = stateWithDay();
    state = workoutReducer(state, { type: 'SAVE_PROGRAM', payload: { name: 'PPL' } });
    expect(state.programs).toHaveLength(1);
    const saved = state.programs[0];

    state = workoutReducer(state, { type: 'DELETE_DAY', payload: { dayId: 'd1' } });
    expect(state.dayOrder).toEqual([]);
    state = workoutReducer(state, { type: 'LOAD_PROGRAM', payload: { programId: saved.id } });
    expect(state.dayOrder).toEqual(['d1']);
    expect(state.days.d1.exercises.e1.name).toBe('Bench');
    expect(state.activeDayId).toBe('d1');

    state = workoutReducer(state, { type: 'IMPORT_PROGRAM', payload: { program: saved } });
    const imported = state.programs[0];
    expect(imported.id).not.toBe(saved.id);
    expect(imported.dayOrder[0]).not.toBe('d1');
    expect(imported.days[imported.dayOrder[0]].id).toBe(imported.dayOrder[0]);
  });
});

describe('ADD_DAY_TO_SESSION', () => {
  it('adds only exercises not already in the session and ignores skipped ones', () => {
    let state = stateWithDay();
    state = workoutReducer(state, { type: 'START_SESSION', payload: { dayId: 'd1' } });
    const next = workoutReducer(state, { type: 'ADD_DAY_TO_SESSION', payload: { dayId: 'd1' } });
    expect(next).toBe(state); // nothing to add -> same reference
  });
});

describe('FINISH_SESSION', () => {
  it('moves the session to the front of history with a completion time', () => {
    let state = stateWithDay();
    state = workoutReducer(state, { type: 'START_SESSION', payload: { dayId: 'd1' } });
    const id = state.activeSession!.id;
    state = workoutReducer(state, { type: 'FINISH_SESSION' });
    expect(state.activeSession).toBeNull();
    expect(state.history[0].id).toBe(id);
    expect(state.history[0].completedAt).not.toBeNull();
  });
});
