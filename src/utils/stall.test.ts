import { describe, expect, it } from 'vitest';
import { assessProgress } from './stall';
import { DEFAULT_TYPE_FIELDS, type SessionExercise, type SetEntry, type WorkoutSession } from '../types';
import type { HistoryEntry } from './exerciseHistory';

const SESSION: WorkoutSession = { id: 's', dayId: 'd', dayName: 'D', date: '2026-01-01', startedAt: '2026-01-01T10:00:00Z', completedAt: null, exercises: [], bodyweight: null, deload: false, backdated: false };
const tpl = { ...DEFAULT_TYPE_FIELDS, targetRepMin: 8, targetRepMax: 12 };

function set(weight: number, reps: number): SetEntry {
  return { weight, reps, completed: true, repsFromLastSession: null, warmup: false, prefilledWeight: null, suggested: false };
}
function entry(sets: SetEntry[], loadType: SessionExercise['loadType'] = 'external'): HistoryEntry {
  return { session: SESSION, exercise: { exerciseId: 'e', name: 'X', origin: 'scheduled', supersetGroup: null, sets, burndown: null, notes: '', skipped: false, targetRepMin: 8, targetRepMax: 12, ...DEFAULT_TYPE_FIELDS, loadType } };
}

describe('assessProgress', () => {
  it('flags a stall after four sessions at the same load without hitting the top', () => {
    const history = Array.from({ length: 4 }, () => entry([set(185, 9), set(185, 8), set(185, 8)]));
    expect(assessProgress(history, tpl, 'lbs')).toEqual({ kind: 'stalled', sessions: 4, weight: 185 });
    expect(assessProgress(history.slice(0, 3), tpl, 'lbs')).toBeNull();
  });

  it('does not count a stall when the load changed or the top was hit', () => {
    const changed = [entry([set(190, 8)]), entry([set(185, 8)]), entry([set(185, 8)]), entry([set(185, 8)])];
    expect(assessProgress(changed, tpl, 'lbs')).toBeNull();
    const hit = [entry([set(185, 12)]), entry([set(185, 9)]), entry([set(185, 9)]), entry([set(185, 9)])];
    expect(assessProgress(hit, tpl, 'lbs')).toBeNull();
  });

  it('flags regression after two straight sessions below the bottom of the range, with a ~10% drop', () => {
    const history = [entry([set(185, 6), set(185, 5)]), entry([set(185, 7), set(185, 6)]), entry([set(185, 9)])];
    expect(assessProgress(history, tpl, 'lbs')).toEqual({ kind: 'regressing', misses: 2, suggestedWeight: 165 });
  });

  it('suggests MORE assistance for a regressing assisted exercise', () => {
    const history = [entry([set(40, 6)], 'assisted'), entry([set(40, 7)], 'assisted')];
    expect(assessProgress(history, { ...tpl, loadType: 'assisted' }, 'lbs')).toEqual({ kind: 'regressing', misses: 2, suggestedWeight: 45 });
  });

  it('is quiet with no history or no target range', () => {
    expect(assessProgress([], tpl, 'lbs')).toBeNull();
    const history = Array.from({ length: 5 }, () => entry([set(100, 5)]));
    expect(assessProgress(history, { ...tpl, targetRepMin: null, targetRepMax: null }, 'lbs')).toEqual({ kind: 'stalled', sessions: 5, weight: 100 });
  });
});
