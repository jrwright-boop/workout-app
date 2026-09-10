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
        exercises: { e1: { id: 'e1', name: 'Bench', defaultSetCount: 3, skipped: false, targetRepMin: 8, targetRepMax: 12, cues: '', supersetGroup: null, muscles: null, ...DEFAULT_TYPE_FIELDS } },
      },
    },
    activeDayId: 'd1',
    history: [{
      id: 's1', dayId: 'd1', dayName: 'Push', date: '2026-08-19',
      startedAt: '2026-08-19T21:00:00Z', completedAt: '2026-08-19T22:00:00Z', bodyweight: null, deload: false, backdated: false,
      exercises: [{
        exerciseId: 'e1', name: 'Bench', origin: 'scheduled', supersetGroup: null, notes: '', skipped: false, burndown: null,
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
    expect(out!.schemaVersion).toBe(7);
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

describe('migrate v6 (origin tags)', () => {
  function v5(): unknown {
    return {
      schemaVersion: 5, unit: 'lbs', restSeconds: 90, activeDayId: 'd1', barWeight: { lbs: 45, kg: 20 }, programs: [],
      dayOrder: ['d1'],
      days: { d1: { id: 'd1', name: 'Push', exerciseOrder: ['e1'], exercises: { e1: { id: 'e1', name: 'Bench', defaultSetCount: 3, skipped: false, targetRepMin: null, targetRepMax: null, ...DEFAULT_TYPE_FIELDS } } } },
      activeSession: null,
      history: [
        { id: 's1', dayId: 'd1', dayName: 'Push', date: '2026-09-01', startedAt: '2026-09-01T17:00:00Z', completedAt: '2026-09-01T18:00:00Z', exercises: [
          { exerciseId: 'e1', name: 'Bench', sets: [{ weight: 100, reps: 5, completed: true, repsFromLastSession: null, warmup: false, prefilledWeight: null, suggested: false }], burndown: null, notes: 'felt good', skipped: false, targetRepMin: null, targetRepMax: null, ...DEFAULT_TYPE_FIELDS },
          { exerciseId: 'x9', name: 'Curl', sets: [{ weight: 30, reps: 12, completed: true, repsFromLastSession: null, warmup: false, prefilledWeight: null, suggested: false }], burndown: null, notes: '', skipped: false, targetRepMin: null, targetRepMax: null, ...DEFAULT_TYPE_FIELDS },
        ] },
        { id: 's0', dayId: 'gone', dayName: 'Old Day', date: '2026-08-01', startedAt: '2026-08-01T17:00:00Z', completedAt: '2026-08-01T18:00:00Z', exercises: [
          { exerciseId: 'e1', name: 'Bench', sets: [{ weight: 90, reps: 5, completed: true, repsFromLastSession: null, warmup: false, prefilledWeight: null, suggested: false }], burndown: null, notes: '', skipped: false, targetRepMin: null, targetRepMax: null, ...DEFAULT_TYPE_FIELDS },
        ] },
      ],
    };
  }

  it('tags scheduled vs make-up from the day plan and defaults to scheduled when the day is gone', () => {
    const out = validateAppState(migrate(v5()))!;
    expect(out.schemaVersion).toBe(7);
    expect(out.history[0].exercises.map(e => e.origin)).toEqual(['scheduled', 'makeup']);
    expect(out.history[1].exercises[0].origin).toBe('scheduled');
  });

  it('changes nothing else: stripping the added fields gives back the original data', () => {
    const before = JSON.parse(JSON.stringify(v5()));
    const out = JSON.parse(JSON.stringify(migrate(v5())));
    // Fields added by v6 and v7 — everything else must be untouched.
    for (const s of out.history) {
      delete s.bodyweight; delete s.deload; delete s.backdated;
      for (const e of s.exercises) { delete e.origin; delete e.supersetGroup; }
    }
    for (const d of Object.values(out.days) as { exercises: Record<string, Record<string, unknown>> }[]) {
      for (const e of Object.values(d.exercises)) { delete e.cues; delete e.supersetGroup; delete e.muscles; }
    }
    delete out.bodyweightLog; delete out.deloadWeeks; delete out.restNotifications;
    out.schemaVersion = 5;
    expect(out).toEqual(before);
  });

  it('v7 fills defaults that the UI relies on', () => {
    const out = validateAppState(migrate(v5()))!;
    expect(out.days.d1.exercises.e1).toMatchObject({ cues: '', supersetGroup: null, muscles: null });
    expect(out.history[0]).toMatchObject({ bodyweight: null, deload: false, backdated: false });
    expect(out.history[0].exercises[0].supersetGroup).toBeNull();
    expect(out.bodyweightLog).toEqual([]);
    expect(out.deloadWeeks).toEqual([]);
    expect(out.restNotifications).toBe(false);
  });

  it('does not overwrite an origin that is already set', () => {
    const data = v5() as { history: { exercises: { origin?: string }[] }[]; schemaVersion: number };
    data.history[0].exercises[0].origin = 'makeup';
    data.schemaVersion = 5;
    const out = validateAppState(migrate(data))!;
    expect(out.history[0].exercises[0].origin).toBe('makeup');
  });
});
