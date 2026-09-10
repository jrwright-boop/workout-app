import { describe, expect, it } from 'vitest';
import { exerciseMetrics, exerciseVolume } from './metrics';
import { computeRecords, exerciseRecordsBeaten, setRecord } from './records';
import { DEFAULT_TYPE_FIELDS, type SessionExercise, type SetEntry, type WorkoutSession } from '../types';

const SESSION: WorkoutSession = { id: 's', dayId: 'd', dayName: 'D', date: '2026-01-01', startedAt: '2026-01-01T10:00:00Z', completedAt: null, exercises: [], bodyweight: null, deload: false, backdated: false };
const entries = (...exs: SessionExercise[]) => exs.map(exercise => ({ session: SESSION, exercise }));

function set(weight: number | null, reps: number | null, extra: Partial<SetEntry> = {}): SetEntry {
  return { weight, reps, completed: true, repsFromLastSession: null, warmup: false, prefilledWeight: null, suggested: false, ...extra };
}

function ex(sets: SetEntry[], extra: Partial<SessionExercise> = {}): SessionExercise {
  return { exerciseId: 'e', name: 'X', origin: 'scheduled', supersetGroup: null, sets, burndown: null, notes: '', skipped: false, targetRepMin: null, targetRepMax: null, ...DEFAULT_TYPE_FIELDS, ...extra };
}

describe('volume and metrics', () => {
  it('excludes warm-ups, doubles per-side, ignores assistance', () => {
    expect(exerciseVolume(ex([set(45, 10, { warmup: true }), set(100, 10)]))).toBe(1000);
    expect(exerciseVolume(ex([set(30, 10)], { perSide: true }))).toBe(600);
    expect(exerciseVolume(ex([set(40, 10)], { loadType: 'assisted' }))).toBe(0);
    expect(exerciseVolume(ex([set(100, 30)], { measure: 'seconds' }))).toBe(0);
  });

  it('computes the right headline number per exercise type', () => {
    expect(exerciseMetrics(ex([set(100, 10), set(110, 5)])).e1rm).toBe(Math.round(100 * (1 + 10 / 30)));
    expect(exerciseMetrics(ex([set(40, 8), set(30, 6)], { loadType: 'assisted' })).minAssistance).toBe(30);
    expect(exerciseMetrics(ex([set(null, 12), set(null, 15)], { loadType: 'bodyweight' })).bestReps).toBe(15);
    expect(exerciseMetrics(ex([set(null, 45), set(null, 60)], { measure: 'seconds' })).bestSeconds).toBe(60);
  });
});

describe('records', () => {
  it('flags a heavier set, and least assistance for assisted work', () => {
    const prior = computeRecords(entries(ex([set(100, 10)])));
    expect(setRecord(ex([]), set(105, 5), prior)).toBe('weight');
    expect(setRecord(ex([]), set(100, 5), prior)).toBeNull();
    expect(setRecord(ex([]), set(100, 13), prior)).toBe('e1rm');

    const assisted = ex([], { loadType: 'assisted' });
    const priorA = computeRecords(entries(ex([set(40, 8)], { loadType: 'assisted' })));
    expect(setRecord(assisted, set(35, 6), priorA)).toBe('assistance');
    expect(setRecord(assisted, set(45, 12), priorA)).toBeNull();
  });

  it('ignores warm-ups, incomplete sets, and empty history counts as a record', () => {
    const prior = computeRecords(entries(ex([set(100, 10)])));
    expect(setRecord(ex([]), set(200, 5, { warmup: true }), prior)).toBeNull();
    expect(setRecord(ex([]), set(200, 5, { completed: false }), prior)).toBeNull();
    expect(setRecord(ex([]), set(50, 5), computeRecords([]))).toBe('weight');
  });

  it('reports each record kind once per exercise', () => {
    const prior = computeRecords(entries(ex([set(100, 10)])));
    const today = ex([set(105, 8), set(110, 6), set(110, 6)]);
    expect(exerciseRecordsBeaten(today, prior)).toEqual(['weight']);
  });
});

describe('withType', () => {
  it('re-reads old external-typed history as assisted so records flip direction', async () => {
    const { withType } = await import('./exerciseHistory');
    const session = SESSION;
    const old = [{ session, exercise: ex([set(60, 10)]) }, { session, exercise: ex([set(40, 12)]) }];
    const reread = withType(old, { loadType: 'assisted', perSide: false, measure: 'reps', increment: null });
    const r = computeRecords(reread);
    expect(r.minAssistance).toBe(40);
    expect(r.bestWeight).toBeNull();
    // Unchanged entries keep their identity (no needless re-renders).
    expect(withType(old, DEFAULT_TYPE_FIELDS)[0]).toBe(old[0]);
  });
});
