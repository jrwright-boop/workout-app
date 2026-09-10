/**
 * Exercises are identified by id, but ids only line up when an exercise was
 * added through the library (or unified by the v5 migration). The normalised
 * name is the fallback identity so "Bench Press" logged on any day, under any
 * id, still counts as the same lift.
 */
export function exerciseKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function sameExercise(
  a: { exerciseId?: string; id?: string; name: string },
  id: string | null,
  name: string | null | undefined
): boolean {
  const aId = a.exerciseId ?? a.id;
  if (id && aId === id) return true;
  if (name && exerciseKey(a.name) === exerciseKey(name)) return true;
  return false;
}
