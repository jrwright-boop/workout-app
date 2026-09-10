import { describe, expect, it } from 'vitest';
import { findAllPerformed, findLastForDay, findLastPerformed } from './exerciseHistory';
import { DEFAULT_TYPE_FIELDS, type ExerciseOrigin, type SessionExercise, type WorkoutSession } from '../types';

function ex(exerciseId: string, name: string, weight: number, origin: ExerciseOrigin = 'scheduled'): SessionExercise {
  return {
    exerciseId, name, origin, supersetGroup: null, notes: '', skipped: false, burndown: null, targetRepMin: null, targetRepMax: null, ...DEFAULT_TYPE_FIELDS,
    sets: [{ weight, reps: 10, completed: true, repsFromLastSession: null, warmup: false, prefilledWeight: null, suggested: false }],
  };
}

function session(id: string, dayId: string, date: string, exercises: SessionExercise[]): WorkoutSession {
  return { id, dayId, dayName: dayId === 'push' ? 'Push' : dayId === 'pull' ? 'Pull' : 'Upper', date, startedAt: `${date}T17:00:00Z`, completedAt: null, exercises, bodyweight: null, deload: false, backdated: false };
}

// Newest first, like state.history.
const history: WorkoutSession[] = [
  session('s4', 'pull', '2026-09-10', [ex('bench', 'Bench Press', 150, 'makeup')]),   // make-up on Pull day
  session('s3', 'upper', '2026-09-08', [ex('bench', 'Bench Press', 120)]),           // light day
  session('s2', 'push', '2026-09-05', [ex('bench', 'Bench Press', 185)]),            // heavy day
  session('s1', 'push', '2026-09-01', [ex('bench', 'Bench Press', 180)]),
];

describe('scoped history reads', () => {
  it('filters by day and by scheduled-only', () => {
    expect(findAllPerformed(history, 'bench', null).map(h => h.session.id)).toEqual(['s4', 's3', 's2', 's1']);
    expect(findAllPerformed(history, 'bench', null, { dayId: 'push' }).map(h => h.session.id)).toEqual(['s2', 's1']);
    expect(findAllPerformed(history, 'bench', null, { scheduledOnly: true }).map(h => h.session.id)).toEqual(['s3', 's2', 's1']);
    expect(findLastPerformed(history, 'bench', null, { dayId: 'pull', scheduledOnly: true })).toBeNull();
  });
});

describe('findLastForDay', () => {
  it('prefers same-day scheduled history and reports the newer off-plan instance', () => {
    const info = findLastForDay(history, 'bench', 'Bench Press', 'push');
    expect(info.last?.session.id).toBe('s2');       // heavy day, not the newer light day or make-up
    expect(info.sameDay).toBe(true);
    expect(info.newer?.session.id).toBe('s4');      // the most recent instance anywhere, for display only
  });

  it('falls back to any instance when the day has no scheduled history', () => {
    const info = findLastForDay(history, 'bench', 'Bench Press', 'legs');
    expect(info.last?.session.id).toBe('s4');
    expect(info.sameDay).toBe(false);
    expect(info.newer).toBeNull();
  });

  it('does not report "newer" when the same-day entry is already the latest', () => {
    const info = findLastForDay(history.slice(2), 'bench', 'Bench Press', 'push');
    expect(info.last?.session.id).toBe('s2');
    expect(info.newer).toBeNull();
  });

  it('is plain most-recent without a day', () => {
    expect(findLastForDay(history, 'bench', 'Bench Press', null).last?.session.id).toBe('s4');
  });
});
