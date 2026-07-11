import { describe, expect, it } from 'vitest';
import { getWeeklyComparison } from './insights';

describe('weekly insights', () => {
  it('compares Monday-based calendar weeks', () => {
    const history = {
      '2026-07-06': [{ duration: 50 }],
      '2026-07-08': [{ duration: 50 }],
      '2026-07-01': [{ duration: 50 }],
    };
    expect(getWeeklyComparison(history, new Date('2026-07-11T12:00:00'))).toEqual({ currentMinutes: 100, previousMinutes: 50, changePercent: 100 });
  });

  it('handles a first active week without division by zero', () => {
    expect(getWeeklyComparison({ '2026-07-06': [{ duration: 25 }] }, new Date('2026-07-11T12:00:00')).changePercent).toBe(100);
  });
});
