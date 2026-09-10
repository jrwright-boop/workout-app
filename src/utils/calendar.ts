import type { WorkoutSession } from '../types';
import { parseISO, toISODate } from './date';

/** Monday-based start of the week containing `d`, at local midnight. */
export function startOfWeek(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (out.getDay() + 6) % 7; // Mon=0 .. Sun=6
  out.setDate(out.getDate() - day);
  return out;
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/** Local calendar date (YYYY-MM-DD) a session belongs to. */
export function sessionDate(session: WorkoutSession): string {
  return toISODate(parseISO(session.startedAt));
}

export interface TrainingStats {
  thisWeek: number;
  /** Average sessions per week over the last 4 complete-or-current weeks. */
  avgPerWeek: number;
  /** Consecutive weeks (ending this week or last) with at least one session. */
  streakWeeks: number;
  totalSessions: number;
}

export function trainingStats(history: WorkoutSession[], now: Date = new Date()): TrainingStats {
  const weekStart = startOfWeek(now);
  const countsByWeek = new Map<string, number>();
  for (const s of history) {
    const key = toISODate(startOfWeek(parseISO(s.startedAt)));
    countsByWeek.set(key, (countsByWeek.get(key) ?? 0) + 1);
  }

  const weekKey = (offset: number) => toISODate(addDays(weekStart, -7 * offset));
  const thisWeek = countsByWeek.get(weekKey(0)) ?? 0;

  let recent = 0;
  for (let i = 0; i < 4; i++) recent += countsByWeek.get(weekKey(i)) ?? 0;

  // A streak is still alive during a week you haven't trained yet.
  let streak = 0;
  let offset = thisWeek > 0 ? 0 : 1;
  while ((countsByWeek.get(weekKey(offset)) ?? 0) > 0) {
    streak++;
    offset++;
  }

  return { thisWeek, avgPerWeek: Math.round((recent / 4) * 10) / 10, streakWeeks: streak, totalSessions: history.length };
}

export interface CalendarCell {
  date: string;        // YYYY-MM-DD
  day: number;         // 1..31
  inMonth: boolean;
  sessions: WorkoutSession[];
}

/** 6 rows × 7 columns (Mon..Sun) covering the month of `year`/`month` (0-based). */
export function monthGrid(year: number, month: number, history: WorkoutSession[]): CalendarCell[] {
  const byDate = new Map<string, WorkoutSession[]>();
  for (const s of history) {
    const key = sessionDate(s);
    const list = byDate.get(key) ?? [];
    list.push(s);
    byDate.set(key, list);
  }
  const first = new Date(year, month, 1);
  const start = startOfWeek(first);
  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = addDays(start, i);
    const key = toISODate(d);
    cells.push({ date: key, day: d.getDate(), inMonth: d.getMonth() === month, sessions: byDate.get(key) ?? [] });
  }
  return cells;
}
