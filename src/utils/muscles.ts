import type { MuscleGroup } from '../types';
import { exerciseKey } from './exerciseKey';

export interface MuscleTags {
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
}

interface Rule {
  test: RegExp;
  primary: MuscleGroup[];
  secondary?: MuscleGroup[];
}

/**
 * Name-based muscle inference. Rules are checked in order and the first
 * match wins, so the specific ones (leg curl, rear delt fly, wrist curl)
 * come before the generic ones (curl, fly). Names are normalised first.
 * This will never be perfect; templates can override with `muscles`.
 */
const RULES: Rule[] = [
  // --- specific compound / named lifts first ---
  { test: /\b(romanian|rdl|stiff[- ]?leg|good ?morning)\b/, primary: ['hamstrings', 'glutes'], secondary: ['back'] },
  { test: /\b(sumo )?deadlift\b|\btrap ?bar\b/, primary: ['hamstrings', 'glutes', 'back'], secondary: ['quads', 'forearms', 'core'] },
  { test: /\bhip ?thrust|glute ?bridge|kick ?back|hip ?extension\b/, primary: ['glutes'], secondary: ['hamstrings'] },
  { test: /\b(leg|lying|seated|nordic|hamstring) ?curl\b/, primary: ['hamstrings'] },
  { test: /\bleg ?(extension|ext)\b/, primary: ['quads'] },
  { test: /\bleg ?press|hack ?squat|pendulum\b/, primary: ['quads', 'glutes'] },
  { test: /\b(bulgarian|split squat|lunge|step[- ]?up|pistol)\b/, primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  { test: /\bsquat\b/, primary: ['quads', 'glutes'], secondary: ['hamstrings', 'core'] },
  { test: /\bcalf|calves\b/, primary: ['calves'] },
  { test: /\b(hyper ?extension|back ?extension|reverse ?hyper)\b/, primary: ['back', 'glutes'], secondary: ['hamstrings'] },
  { test: /\bkettlebell ?swing|kb ?swing\b/, primary: ['glutes', 'hamstrings'], secondary: ['back', 'core'] },
  { test: /\bfarmer|suitcase carry|carry\b/, primary: ['forearms', 'core'], secondary: ['back'] },
  { test: /\b(clean|snatch|thruster)\b/, primary: ['quads', 'glutes', 'shoulders'], secondary: ['back', 'hamstrings'] },

  // --- shoulders (before generic press / fly / raise) ---
  { test: /\b(rear ?delt|reverse ?(fly|flye|pec)|face ?pull)\b/, primary: ['shoulders'], secondary: ['back'] },
  { test: /\b(lateral|side|front) ?raise|\by[- ]?raise\b/, primary: ['shoulders'] },
  { test: /\b(overhead|shoulder|military|ohp|arnold|push ?press|landmine press|viking)\b/, primary: ['shoulders'], secondary: ['triceps'] },
  { test: /\bupright ?row\b/, primary: ['shoulders'], secondary: ['back'] },
  { test: /\bshrug\b/, primary: ['back'] },

  // --- arms (before generic curl / extension) ---
  { test: /\bwrist ?curl|reverse ?curl|forearm\b/, primary: ['forearms'] },
  { test: /\bhammer ?curl\b/, primary: ['biceps'], secondary: ['forearms'] },
  { test: /\bcurl\b/, primary: ['biceps'] },
  { test: /\b(skull ?crusher|pushdown|push ?down|kickback|tricep|triceps|jm press|close[- ]?grip)\b/, primary: ['triceps'], secondary: ['chest'] },
  { test: /\bdip\b/, primary: ['chest', 'triceps'], secondary: ['shoulders'] },

  // --- back ---
  { test: /\b(pull[- ]?up|chin[- ]?up|pulldown|pull ?down|lat)\b/, primary: ['back'], secondary: ['biceps'] },
  { test: /\b(row|pullover|rack pull|t[- ]?bar)\b/, primary: ['back'], secondary: ['biceps'] },

  // --- chest ---
  { test: /\b(fly|flye|flies|pec ?deck|crossover|cross ?over|chest)\b/, primary: ['chest'], secondary: ['shoulders'] },
  { test: /\b(bench|push[- ]?up|press)\b/, primary: ['chest'], secondary: ['triceps', 'shoulders'] },

  // --- core ---
  { test: /\b(plank|crunch|sit[- ]?up|ab |abs|leg ?raise|hanging|dead ?bug|pallof|russian twist|wood ?chop|rollout|hollow|l[- ]?sit)\b/, primary: ['core'] },
  { test: /\b(burpee|mountain climber|sled)\b/, primary: ['quads', 'core'], secondary: ['glutes', 'shoulders'] },
];

export function inferMuscles(name: string): MuscleTags | null {
  const key = exerciseKey(name);
  for (const rule of RULES) {
    if (rule.test.test(key)) return { primary: rule.primary, secondary: rule.secondary ?? [] };
  }
  return null;
}

/** Effective tags for a template: manual override (primary only) or inference. */
export function musclesFor(name: string, override: MuscleGroup[] | null | undefined): MuscleTags | null {
  if (override && override.length > 0) return { primary: override, secondary: [] };
  return inferMuscles(name);
}

export function formatMuscle(m: MuscleGroup): string {
  return m.charAt(0).toUpperCase() + m.slice(1);
}
