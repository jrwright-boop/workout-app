import { describe, expect, it } from 'vitest';
import { workoutReducer } from './workoutReducer';
import { getInitialState } from '../storage/localStorage';
import type { AppState, WorkoutSession } from '../types';

function stateWithDay(): AppState {
  return {
    ...getInitialState(),
    dayOrder: ['d1'],
    days: {
      d1: {
        id: 'd1', name: 'Push', exerciseOrder: ['e1', 'e2'],
        exercises: {
          e1: { id: 'e1', name: 'Bench', defaultSetCount: 3, skipped: false, targetRepMin: 8, targetRepMax: 12 },
          e2: { id: 'e2', name: 'Fly', defaultSetCount: 2, skipped: true, targetRepMin: null, targetRepMax: null },
        },
      },
    },
    activeDayId: 'd1',
  };
}

function pastSession(weights: number[], reps: number[]): WorkoutSession {
  return {
    id: 's-old', dayId: 'd1', dayName: 'Push', date: '2026-08-10',
    startedAt: '2026-08-10T17:00:00Z', completedAt: '2026-08-10T18:00:00Z',
    exercises: [{
      exerciseId: 'e1', name: 'Bench', notes: '', skipped: false, burndown: null,
      targetRepMin: 8, targetRepMax: 12,
      sets: weights.map((w, i) => ({ weight: w, reps: reps[i], completed: true, repsFromLastSession: null })),
    }],
  };
}

describe('START_SESSION', () => {
  it('skips skipped exercises and pre-fills weight and rep placeholders from history', () => {
    const state = { ...stateWithDay(), history: [pastSession([100, 100, 105], [10, 9, 8])] };
    const next = workoutReducer(state, { type: 'START_SESSION', payload: { dayId: 'd1' } });
    const session = next.activeSession!;
    expect(session.exercises.map(e => e.exerciseId)).toEqual(['e1']);
    expect(session.exercises[0].sets.map(s => s.weight)).toEqual([100, 100, 105]);
    expect(session.exercises[0].sets.map(s => s.reps)).toEqual([null, null, null]);
    expect(session.exercises[0].sets.map(s => s.repsFromLastSession)).toEqual([10, 9, 8]);
  });

  it('pre-fills from a same-named exercise in another day when the id has no history', () => {
    const other = pastSession([80], [12]);
    other.exercises[0].exerciseId = 'someone-elses-id';
    const state = { ...stateWithDay(), history: [other] };
    const next = workoutReducer(state, { type: 'START_SESSION', payload: { dayId: 'd1' } });
    expect(next.activeSession!.exercises[0].sets[0].weight).toBe(80);
  });
});

describe('TOGGLE_SET_COMPLETE', () => {
  it('fills reps from the placeholder and carries the weight to untouched later sets', () => {
    let state = { ...stateWithDay(), history: [pastSession([100, 100, 100], [10, 10, 10])] };
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
});

describe('ADD_DAY_TO_SESSION', () => {
  it('adds only exercises not already in the session and ignores skipped ones', () => {
    let state = stateWithDay();
    state = workoutReducer(state, { type: 'START_SESSION', payload: { dayId: 'd1' } });
    const before = state.activeSession!.exercises.length;
    const next = workoutReducer(state, { type: 'ADD_DAY_TO_SESSION', payload: { dayId: 'd1' } });
    expect(next).toBe(state); // nothing to add -> same reference
    expect(next.activeSession!.exercises.length).toBe(before);
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
