import { describe, expect, it } from 'vitest';
import { formatDate, parseISO, toISODate } from './date';

describe('toISODate', () => {
  it('uses the local calendar date, not UTC', () => {
    // 23:30 local on the 19th; in UTC this may already be the 20th.
    const d = new Date(2026, 7, 19, 23, 30);
    expect(toISODate(d)).toBe('2026-08-19');
  });

  it('zero-pads month and day', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('parseISO / formatDate', () => {
  it('reads date-only strings as local dates so the day never shifts', () => {
    const d = parseISO('2026-08-19');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(19);
    expect(formatDate('2026-08-19')).toBe('Aug 19');
  });

  it('still parses full timestamps normally', () => {
    const d = parseISO('2026-08-19T21:00:00Z');
    expect(d.getTime()).toBe(Date.UTC(2026, 7, 19, 21));
  });
});
