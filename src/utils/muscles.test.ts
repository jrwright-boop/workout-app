import { describe, expect, it } from 'vitest';
import { inferMuscles, musclesFor } from './muscles';

const cases: [string, string[]][] = [
  ['Bench Press', ['chest']],
  ['Incline Dumbbell Press', ['chest']],
  ['Overhead Press', ['shoulders']],
  ['Seated Shoulder Press', ['shoulders']],
  ['Lateral Raise', ['shoulders']],
  ['Rear Delt Fly', ['shoulders']],
  ['Cable Fly', ['chest']],
  ['Barbell Row', ['back']],
  ['Lat Pulldown', ['back']],
  ['Assisted Pull-up', ['back']],
  ['Chin Up', ['back']],
  ['Face Pull', ['shoulders']],
  ['Shrug', ['back']],
  ['Bicep Curl', ['biceps']],
  ['Hammer Curl', ['biceps']],
  ['Wrist Curl', ['forearms']],
  ['Tricep Pushdown', ['triceps']],
  ['Skull Crusher', ['triceps']],
  ['Close-Grip Bench', ['triceps']],
  ['Dip', ['chest', 'triceps']],
  ['Back Squat', ['quads', 'glutes']],
  ['Hack Squat', ['quads', 'glutes']],
  ['Leg Press', ['quads', 'glutes']],
  ['Leg Extension', ['quads']],
  ['Lying Leg Curl', ['hamstrings']],
  ['Romanian Deadlift', ['hamstrings', 'glutes']],
  ['Deadlift', ['hamstrings', 'glutes', 'back']],
  ['Hip Thrust', ['glutes']],
  ['Walking Lunge', ['quads', 'glutes']],
  ['Standing Calf Raise', ['calves']],
  ['Plank', ['core']],
  ['Hanging Leg Raise', ['core']],
  ['Back Extension', ['back', 'glutes']],
];

describe('inferMuscles', () => {
  it.each(cases)('%s → %s', (name, primary) => {
    expect(inferMuscles(name)?.primary).toEqual(primary);
  });

  it('returns null for names it cannot place', () => {
    expect(inferMuscles('Mystery Machine 3000')).toBeNull();
  });

  it('is case and spacing insensitive', () => {
    expect(inferMuscles('  BENCH   press ')?.primary).toEqual(['chest']);
  });
});

describe('musclesFor', () => {
  it('prefers a manual override and treats an empty override as auto', () => {
    expect(musclesFor('Bench Press', ['shoulders'])).toEqual({ primary: ['shoulders'], secondary: [] });
    expect(musclesFor('Bench Press', [])?.primary).toEqual(['chest']);
    expect(musclesFor('Bench Press', null)?.secondary).toEqual(['triceps', 'shoulders']);
  });
});
