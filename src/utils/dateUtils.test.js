import { describe, expect, it } from 'vitest';
import { daysBetween, getLocalDateKey, parseLocalDateKey } from './dateUtils';

describe('dateUtils', () => {
  it('formats local date keys as YYYY-MM-DD', () => {
    const date = new Date(2026, 1, 5, 14, 30, 0); // Feb 5, 2026 local time
    expect(getLocalDateKey(date)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(getLocalDateKey(date)).toBe('2026-02-05');
  });

  it('parses local date keys into local midnight dates', () => {
    const parsed = parseLocalDateKey('2026-02-05');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(1);
    expect(parsed.getDate()).toBe(5);
    expect(parsed.getHours()).toBe(0);
    expect(parsed.getMinutes()).toBe(0);
  });

  it('calculates day differences consistently', () => {
    expect(daysBetween('2026-02-01', '2026-02-05')).toBe(4);
    expect(daysBetween('2026-02-05', '2026-02-01')).toBe(4);
    expect(daysBetween('2026-02-05', '2026-02-05')).toBe(0);
  });
});
