import type { LoadType, Unit } from '../types';

export const LBS_PER_KG = 2.20462262;

export function defaultIncrement(unit: Unit): number {
  return unit === 'kg' ? 2.5 : 5;
}

/**
 * Round to a display resolution for the unit. 0.1 kg / 0.25 lb is fine enough
 * that common barbell loads survive an lbs -> kg -> lbs round trip unchanged.
 */
export function roundForUnit(value: number, unit: Unit): number {
  const step = unit === 'kg' ? 0.1 : 0.25;
  return Math.round(Math.round(value / step) * step * 100) / 100;
}

export function convertWeight(value: number, from: Unit, to: Unit): number {
  if (from === to) return value;
  const converted = to === 'kg' ? value / LBS_PER_KG : value * LBS_PER_KG;
  return roundForUnit(converted, to);
}

/** Column label for the weight field, by exercise type. */
export function weightLabel(loadType: LoadType, perSide: boolean): string {
  if (loadType === 'assisted') return 'Assist';
  if (loadType === 'bodyweight') return '+Weight';
  return perSide ? 'Each' : 'Weight';
}
