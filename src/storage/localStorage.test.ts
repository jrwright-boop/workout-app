import { describe, expect, it } from 'vitest';
import { getInitialState, migrate, validateAppState, validateProgram } from './localStorage';
import { DEFAULT_TYPE_FIELDS, type AppState } from '../types';

function fullState(): AppState {
  return {
    ...getInitialState(),
    dayOrder: ['d1'],
    days: {
      d1: {
        id: 'd1', name: 'Push', exerciseOrder: ['e1'],
        exercises: { e1: { id: 'e1', name: 'Bench', defaultSetCount: 3, skipped: false, targetRepMin: 8, targetRepMax: 12, ...DEFAULT_TYPE_FIELDS } },
      },
    },
    activeDayId: 'd1',
    history: [{
      id: 's1', dayId: 'd1', dayName: 'Push', date: '2026-08-19',
      startedAt: '2026-08-19T21:00:00Z', completedAt: '2026-08-19T22:00:00Z',
      exercises: [{
        exerciseId: 'e1', name: 'Bench', notes: '', skipped: false, burndown: null,
        targetRepMin: 8, targetRepMax: 12, ...DEFAULT_TYPE_FIELDS,
        sets: [{ weight: 100, reps: 10, completed: true, repsFromLastSession: null, warmup: false, prefilledWeight: null, suggested: false }],
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

  it('rejects an unknown unit or load type', () => {
    const s = fullState();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s as any).unit = 'stone';
    expect(validateAppState(s)).toBeNull();
    const t = fullState();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (t.days.d1.exercises.e1 as any).loadType = 'antigravity';
    expect(validateAppState(t)).toBeNull();
  });

  it('validates a shared program on its own', () => {
    const s = fullState();
    expect(validateProgram({ id: 'p', name: 'PPL', dayOrder: s.dayOrder, days: s.days, savedAt: 'x' })).not.toBeNull();
    expect(validateProgram({ id: 'p', name: 'PPL', dayOrder: ['nope'], days: {}, savedAt: 'x' })).toBeNull();
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
    expect(out!.schemaVersion).toBe(5);
    expect(out!.unit).toBe('lbs');
    expect(out!.restSeconds).toBe(90);
    expect(out!.days.d1.exercises.e1.targetRepMin).toBeNull();
    expect(out!.days.d1.exercises.e1.loadType).toBe('external');
    expect(out!.barWeight).toEqual({ lbs: 45, kg: 20 });
    expect(out!.programs).toEqual([]);
    expect('burndown' in out!.days.d1.exercises.e1).toBe(false);
  });

  it('v5 unifies same-named exercises across days and relinks history to one id', () => {
    const v4 = {
      schemaVersion: 4, unit: 'lbs', restSeconds: 90, activeDayId: 'd1', activeSession: null,
      dayOrder: ['d1', 'd2'],
      days: {
        d1: { id: 'd1', name: 'Push', exerciseOrder: ['a'], exercises: { a: { id: 'a', name: 'Bench Press', defaultSetCount: 3, skipped: false, targetRepMin: null, targetRepMax: null } } },
        d2: { id: 'd2', name: 'Upper', exerciseOrder: ['b', 'c'], exercises: {
          b: { id: 'b', name: 'bench  press', defaultSetCount: 4, skipped: false, targetRepMin: null, targetRepMax: null },
          c: { id: 'c', name: 'Row', defaultSetCount: 3, skipped: false, targetRepMin: null, targetRepMax: null },
        } },
      },
      history: [{
        id: 's1', dayId: 'd2', dayName: 'Upper', date: '2026-08-01', startedAt: '2026-08-01T10:00:00Z', completedAt: '2026-08-01T11:00:00Z',
        exercises: [
          { exerciseId: 'b', name: 'bench  press', sets: [{ weight: 100, reps: 5, completed: true, repsFromLastSession: null }], burndown: null, notes: '', skipped: false, targetRepMin: null, targetRepMax: null },
          { exerciseId: 'one-off', name: 'Bench Press', sets: [{ weight: 90, reps: 5, completed: true, repsFromLastSession: null }], burndown: null, notes: '', skipped: false, targetRepMin: null, targetRepMax: null },
        ],
      }],
    };
    const out = validateAppState(migrate(v4))!;
    expect(out).not.toBeNull();
    // Day 2's copy now carries day 1's id; per-day settings are kept.
    expect(out.days.d2.exerciseOrder).toEqual(['a', 'c']);
    expect(out.days.d2.exercises.a.defaultSetCount).toBe(4);
    expect(out.days.d2.exercises.b).toBeUndefined();
    // Every logged instance points at the canonical id.
    expect(out.history[0].exercises.map(e => e.exerciseId)).toEqual(['a', 'a']);
    // New set fields are backfilled.
    expect(out.history[0].exercises[0].sets[0]).toMatchObject({ warmup: false, prefilledWeight: null, suggested: false });
  });

  it('passes non-objects through untouched so validation can reject them', () => {
    expect(migrate(null)).toBeNull();
    expect(migrate(42)).toBe(42);
  });
});
