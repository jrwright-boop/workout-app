import { describe, expect, it } from 'vitest';
import { weeklyVolume } from './weeklyVolume';
import { getInitialState } from '../storage/localStorage';
import { DEFAULT_TYPE_FIELDS, type AppState, type SessionExercise, type WorkoutSession } from '../types';

function ex(exerciseId: string, name: string, sets: number, completed = true): SessionExercise {
  return {
    exerciseId, name, origin: 'scheduled', supersetGroup: null, burndown: null, notes: '', skipped: false, targetRepMin: null, targetRepMax: null, ...DEFAULT_TYPE_FIELDS,
    sets: Array.from({ length: sets }, () => ({ weight: 100, reps: 10, completed, repsFromLastSession: null, warmup: false, prefilledWeight: null, suggested: false })),
  };
}
function session(id: string, startedAt: string, exercises: SessionExercise[]): WorkoutSession {
  return { id, dayId: 'd', dayName: 'D', date: startedAt.slice(0, 10), startedAt, completedAt: null, exercises, bodyweight: null, deload: false, backdated: false };
}

const NOW = new Date(2026, 8, 9, 12); // Wed Sep 9

describe('weeklyVolume', () => {
  it('counts completed working sets by inferred muscle, primary full and secondary half', () => {
    const state: AppState = {
      ...getInitialState(),
      history: [
        session('a', '2026-09-08T18:00:00', [ex('b', 'Bench Press', 4), ex('r', 'Barbell Row', 3), ex('m', 'Mystery Machine', 3)]),
        session('b', '2026-09-01T18:00:00', [ex('b', 'Bench Press', 2)]),
      ],
    };
    const v = weeklyVolume(state, NOW);
    expect(v.thisWeek.chest).toBe(4);
    expect(v.thisWeek.triceps).toBe(2);   // secondary from bench
    expect(v.thisWeek.back).toBe(3);
    expect(v.thisWeek.biceps).toBe(1.5);  // secondary from row
    expect(v.fourWeekAvg.chest).toBe(1.5); // (4 + 2) / 4
    expect(v.untagged).toEqual(['Mystery Machine']);
  });

  it('respects manual overrides on the template and ignores incomplete sets', () => {
    const state: AppState = {
      ...getInitialState(),
      dayOrder: ['d'],
      days: { d: { id: 'd', name: 'D', exerciseOrder: ['b'], exercises: { b: { id: 'b', name: 'Bench Press', defaultSetCount: 3, skipped: false, targetRepMin: null, targetRepMax: null, cues: '', supersetGroup: null, muscles: ['shoulders'], ...DEFAULT_TYPE_FIELDS } } } },
      history: [session('a', '2026-09-08T18:00:00', [ex('b', 'Bench Press', 3), ex('x', 'Curl', 2, false)])],
    };
    const v = weeklyVolume(state, NOW);
    expect(v.thisWeek.shoulders).toBe(3);
    expect(v.thisWeek.chest).toBe(0);
    expect(v.thisWeek.biceps).toBe(0);
  });
});
