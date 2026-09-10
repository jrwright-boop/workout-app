import type { AppState, MuscleGroup, WorkoutSession } from '../types';
import { MUSCLE_GROUPS } from '../types';
import { startOfWeek, addDays } from './calendar';
import { parseISO, toISODate } from './date';
import { workingSets } from './metrics';
import { musclesFor } from './muscles';
import { exerciseKey } from './exerciseKey';

export type MuscleSetCounts = Record<MuscleGroup, number>;

function emptyCounts(): MuscleSetCounts {
  return Object.fromEntries(MUSCLE_GROUPS.map(m => [m, 0])) as MuscleSetCounts;
}

/** Override lookup by exercise id or name across every day template. */
function overrideIndex(state: AppState): Map<string, MuscleGroup[] | null> {
  const byKey = new Map<string, MuscleGroup[] | null>();
  for (const day of Object.values(state.days)) {
    for (const ex of Object.values(day.exercises)) {
      byKey.set(ex.id, ex.muscles);
      byKey.set(exerciseKey(ex.name), ex.muscles);
    }
  }
  return byKey;
}

/**
 * Completed working sets per muscle group. Primary muscles count a full set,
 * secondary muscles half — the usual convention for "sets per muscle per week".
 */
export function muscleSetCounts(sessions: WorkoutSession[], state: AppState): MuscleSetCounts {
  const counts = emptyCounts();
  const overrides = overrideIndex(state);
  for (const session of sessions) {
    for (const ex of session.exercises) {
      if (ex.skipped) continue;
      const override = overrides.get(ex.exerciseId) ?? overrides.get(exerciseKey(ex.name)) ?? null;
      const tags = musclesFor(ex.name, override);
      if (!tags) continue;
      const sets = workingSets(ex).filter(s => s.completed).length;
      if (sets === 0) continue;
      for (const m of tags.primary) counts[m] += sets;
      for (const m of tags.secondary) counts[m] += sets * 0.5;
    }
  }
  return counts;
}

export interface WeeklyVolume {
  thisWeek: MuscleSetCounts;
  /** Average per week over the last 4 weeks including this one. */
  fourWeekAvg: MuscleSetCounts;
  /** Exercises that could not be classified, so the user knows what's missing. */
  untagged: string[];
}

export function weeklyVolume(state: AppState, now: Date = new Date()): WeeklyVolume {
  const weekStart = startOfWeek(now);
  const fourStart = addDays(weekStart, -21);
  const thisWeekKey = toISODate(weekStart);
  const inThisWeek: WorkoutSession[] = [];
  const inFourWeeks: WorkoutSession[] = [];
  for (const s of state.history) {
    const d = parseISO(s.startedAt);
    if (d < fourStart) continue;
    inFourWeeks.push(s);
    if (toISODate(startOfWeek(d)) === thisWeekKey) inThisWeek.push(s);
  }
  const four = muscleSetCounts(inFourWeeks, state);
  const fourWeekAvg = emptyCounts();
  for (const m of MUSCLE_GROUPS) fourWeekAvg[m] = Math.round((four[m] / 4) * 10) / 10;

  const overrides = overrideIndex(state);
  const untagged = new Set<string>();
  for (const s of inFourWeeks) {
    for (const ex of s.exercises) {
      if (ex.skipped) continue;
      const override = overrides.get(ex.exerciseId) ?? overrides.get(exerciseKey(ex.name)) ?? null;
      if (!musclesFor(ex.name, override)) untagged.add(ex.name);
    }
  }

  return { thisWeek: muscleSetCounts(inThisWeek, state), fourWeekAvg, untagged: [...untagged].sort() };
}
