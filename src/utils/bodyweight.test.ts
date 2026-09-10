import { describe, expect, it } from 'vitest';
import { bodyweightOn, upsertBodyweight } from './bodyweight';
import { exerciseMetrics, exerciseVolume, setLoad } from './metrics';
import { DEFAULT_TYPE_FIELDS, type SessionExercise, type SetEntry } from '../types';

function set(weight: number | null, reps: number): SetEntry {
  return { weight, reps, completed: true, repsFromLastSession: null, warmup: false, prefilledWeight: null, suggested: false };
}
function ex(sets: SetEntry[], extra: Partial<SessionExercise>): SessionExercise {
  return { exerciseId: 'e', name: 'X', origin: 'scheduled', supersetGroup: null, sets, burndown: null, notes: '', skipped: false, targetRepMin: null, targetRepMax: null, ...DEFAULT_TYPE_FIELDS, ...extra };
}

describe('bodyweight log', () => {
  it('keeps newest-first order and replaces same-day entries', () => {
    let log = upsertBodyweight([], { date: '2026-09-01', weight: 180 });
    log = upsertBodyweight(log, { date: '2026-09-08', weight: 179 });
    log = upsertBodyweight(log, { date: '2026-09-01', weight: 181 });
    expect(log).toEqual([{ date: '2026-09-08', weight: 179 }, { date: '2026-09-01', weight: 181 }]);
  });

  it('resolves the weight in effect on a date', () => {
    const log = [{ date: '2026-09-08', weight: 179 }, { date: '2026-09-01', weight: 181 }];
    expect(bodyweightOn(log, '2026-09-10')).toBe(179);
    expect(bodyweightOn(log, '2026-09-05')).toBe(181);
    expect(bodyweightOn(log, '2026-08-01')).toBe(181); // before any entry: earliest known
    expect(bodyweightOn([], '2026-09-01')).toBeNull();
  });
});

describe('bodyweight-aware load', () => {
  it('counts bodyweight plus added, and bodyweight minus assistance', () => {
    const bw = 180;
    expect(setLoad({ loadType: 'bodyweight', perSide: false }, 25, bw)).toBe(205);
    expect(setLoad({ loadType: 'bodyweight', perSide: false }, null, bw)).toBe(180);
    expect(setLoad({ loadType: 'assisted', perSide: false }, 40, bw)).toBe(140);
    expect(setLoad({ loadType: 'assisted', perSide: false }, 40, null)).toBe(0);
    expect(setLoad({ loadType: 'bodyweight', perSide: false }, null, null)).toBe(0);
  });

  it('gives assisted and bodyweight work real volume and est. 1RM once bodyweight is known', () => {
    const pullups = ex([set(40, 10)], { loadType: 'assisted' });
    expect(exerciseVolume(pullups)).toBe(0);
    expect(exerciseVolume(pullups, 180)).toBe(1400);
    expect(exerciseMetrics(pullups, 180).e1rm).toBe(Math.round(140 * (1 + 10 / 30)));
    expect(exerciseMetrics(pullups, 180).minAssistance).toBe(40);

    const dips = ex([set(null, 12)], { loadType: 'bodyweight' });
    expect(exerciseVolume(dips)).toBe(0);
    expect(exerciseVolume(dips, 180)).toBe(2160);
  });
});
