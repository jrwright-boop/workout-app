import { describe, expect, it } from 'vitest';
import { monthGrid, startOfWeek, trainingStats } from './calendar';
import { formatDuration, formatRelativeDay } from './date';
import type { WorkoutSession } from '../types';

function session(startedAt: string): WorkoutSession {
  return { id: startedAt, dayId: 'd', dayName: 'Push', date: startedAt.slice(0, 10), startedAt, completedAt: null, exercises: [], bodyweight: null, deload: false, backdated: false };
}

// Wednesday 2026-09-09 local noon.
const NOW = new Date(2026, 8, 9, 12);

describe('startOfWeek', () => {
  it('is Monday at local midnight', () => {
    const s = startOfWeek(NOW);
    expect(s.getDay()).toBe(1);
    expect(s.getDate()).toBe(7);
    expect(startOfWeek(new Date(2026, 8, 6)).getDate()).toBe(31); // Sunday -> previous Monday
  });
});

describe('trainingStats', () => {
  it('counts this week, averages four weeks, and keeps a streak alive during the current week', () => {
    const history = [
      session('2026-09-08T18:00:00'), // this week
      session('2026-09-02T18:00:00'), session('2026-08-31T18:00:00'), // last week (2)
      session('2026-08-26T18:00:00'), // 2 weeks ago
      session('2026-08-12T18:00:00'), // 4 weeks ago (outside the 4-week avg window, breaks streak after 3)
    ];
    const s = trainingStats(history, NOW);
    expect(s.thisWeek).toBe(1);
    expect(s.avgPerWeek).toBe(1);   // (1 + 2 + 1 + 0) / 4
    expect(s.streakWeeks).toBe(3);  // this, last, 2 weeks ago; gap at 3 weeks ago
    expect(s.totalSessions).toBe(5);

    // Nothing yet this week: streak counts from last week and is still alive.
    const quiet = trainingStats(history.slice(1), NOW);
    expect(quiet.thisWeek).toBe(0);
    expect(quiet.streakWeeks).toBe(2);
  });
});

describe('monthGrid', () => {
  it('lays out 42 cells starting on the Monday before the 1st and attaches sessions', () => {
    const cells = monthGrid(2026, 8, [session('2026-09-09T18:00:00')]);
    expect(cells).toHaveLength(42);
    expect(cells[0].date).toBe('2026-08-31');
    expect(cells[0].inMonth).toBe(false);
    const day9 = cells.find(c => c.date === '2026-09-09')!;
    expect(day9.sessions).toHaveLength(1);
    expect(day9.inMonth).toBe(true);
  });
});

describe('relative day and duration', () => {
  it('formats relative days', () => {
    expect(formatRelativeDay('2026-09-09T06:00:00', NOW)).toBe('Today');
    expect(formatRelativeDay('2026-09-08T23:30:00', NOW)).toBe('Yesterday');
    expect(formatRelativeDay('2026-09-05T12:00:00', NOW)).toBe('4d ago');
    expect(formatRelativeDay('2026-08-20T12:00:00', NOW)).toBe('2w ago');
    expect(formatRelativeDay('2026-06-01T12:00:00', NOW)).toBe('3mo ago');
  });

  it('formats durations', () => {
    expect(formatDuration('2026-09-09T10:00:00', '2026-09-09T10:52:30')).toBe('53m');
    expect(formatDuration('2026-09-09T10:00:00', '2026-09-09T11:05:00')).toBe('1h 05m');
  });
});
