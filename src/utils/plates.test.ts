import { describe, expect, it } from 'vitest';
import { DEFAULT_PLATES, formatPlates, platesPerSide } from './plates';
import { convertWeight, roundForUnit } from './units';

describe('platesPerSide', () => {
  it('breaks a barbell load into per-side plates', () => {
    const r = platesPerSide(225, 45, DEFAULT_PLATES.lbs);
    expect(r.perSide).toEqual([45, 45]);
    expect(r.remainder).toBe(0);
  });

  it('reports what it could not make with standard plates', () => {
    const r = platesPerSide(137.5, 45, DEFAULT_PLATES.lbs); // needs 46.25 per side
    expect(r.perSide).toEqual([45]);
    expect(r.achieved).toBe(135);
    expect(r.remainder).toBe(2.5);
  });

  it('handles kg and an empty bar', () => {
    expect(platesPerSide(100, 20, DEFAULT_PLATES.kg).perSide).toEqual([25, 15]);
    expect(platesPerSide(20, 20, DEFAULT_PLATES.kg).perSide).toEqual([]);
    expect(platesPerSide(10, 20, DEFAULT_PLATES.kg).perSide).toEqual([]);
  });

  it('formats repeated plates compactly', () => {
    expect(formatPlates([45, 45, 10])).toBe('45 ×2, 10');
    expect(formatPlates([])).toBe('empty bar');
  });
});

describe('unit conversion', () => {
  it('rounds to plate resolution and round-trips common loads', () => {
    expect(roundForUnit(61.23, 'kg')).toBe(61.2);
    expect(roundForUnit(135.3, 'lbs')).toBe(135.25);
    for (const lbs of [45, 95, 135, 185, 225, 315, 405]) {
      expect(convertWeight(convertWeight(lbs, 'lbs', 'kg'), 'kg', 'lbs')).toBe(lbs);
    }
    for (const kg of [20, 60, 62.5, 100, 140]) {
      expect(convertWeight(convertWeight(kg, 'kg', 'lbs'), 'lbs', 'kg')).toBe(kg);
    }
    expect(convertWeight(100, 'kg', 'kg')).toBe(100);
  });
});
