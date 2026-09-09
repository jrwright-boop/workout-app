import { describe, expect, it } from 'vitest';
import { getInitialState, migrate, validateAppState } from './localStorage';
import type { AppState } from '../types';

function fullState(): AppState {
  return {
    ...getInitialState(),
    dayOrder: ['d1'],
    days: {
      d1: {
        id: 'd1', name: 'Push', exerciseOrder: ['e1'],
        exercises: { e1: { id: 'e1', name: 'Bench', defaultSetCount: 3, skipped: false, targetRepMin: 8, targetRepMax: 12 } },
      },
    },
    activeDayId: 'd1',
    history: [{
      id: 's1', dayId: 'd1', dayName: 'Push', date: '2026-08-19',
      startedAt: '2026-08-19T21:00:00Z', completedAt: '2026-08-19T22:00:00Z',
      exercises: [{
        exerciseId: 'e1', name: 'Bench', notes: '', skipped: false, burndown: null,
        targetRepMin: 8, targetRepMax: 12,
        sets: [{ weight: 100, reps: 10, completed: true, repsFromLastSession: null }],
      }],
    }],
  };
}

describe('validateAppState', () => {
  it('accepts the initial state and a populated state', () => {
    expect(validateAppState(getInitialState())).not.toBeNull();
    expect(validateAppState(fullState())).not.toBeNull();
  });

  it('rejects non-objects and the old three-field spot check false positives', () => {
    expect(validateAppState(null)).toBeNull();
    expect(validateAppState('{}')).toBeNull();
    // Has schemaVersion/days/history but days is malformed — this used to import and then crash on load.
    expect(validateAppState({ schemaVersion: 4, days: { d1: {} }, dayOrder: ['d1'], history: [] })).toBeNull();
  });

  it('rejects a day whose exerciseOrder references a missing exercise', () => {
    const s = fullState();
    s.days.d1.exerciseOrder.push('ghost');
    expect(validateAppState(s)).toBeNull();
  });

  it('rejects history sessions with malformed sets', () => {
    const s = fullState();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s.history[0].exercises[0].sets as any) = [{ weight: '100' }];
    expect(validateAppState(s)).toBeNull();
  });

  it('rejects an unknown unit', () => {
    const s = fullState();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s as any).unit = 'stone';
    expect(validateAppState(s)).toBeNull();
  });
});

describe('migrate', () => {
  it('brings a schema-less v1 blob up to the current version', () => {
    const v1 = {
      dayOrder: ['d1'],
      days: { d1: { id: 'd1', name: 'Push', exerciseOrder: ['e1'], exercises: { e1: { id: 'e1', name: 'Bench', defaultSetCount: 3, skipped: false, burndown: { drops: 2 } } } } },
      activeDayId: 'd1',
      activeSession: null,
      history: [],
    };
    const out = validateAppState(migrate(v1));
    expect(out).not.toBeNull();
    expect(out!.schemaVersion).toBe(4);
    expect(out!.unit).toBe('lbs');
    expect(out!.restSeconds).toBe(90);
    expect(out!.days.d1.exercises.e1.targetRepMin).toBeNull();
    expect('burndown' in out!.days.d1.exercises.e1).toBe(false);
  });

  it('passes non-objects through untouched so validation can reject them', () => {
    expect(migrate(null)).toBeNull();
    expect(migrate(42)).toBe(42);
  });
});
