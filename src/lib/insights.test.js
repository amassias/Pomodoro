import { describe, expect, it } from 'vitest';
import { getProductivityPatterns, getWeeklyComparison } from './insights';

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

describe('getProductivityPatterns', () => {
  it('finds productive periods and completion rate from reflected sessions', () => {
    const history = {
      '2026-07-06': [
        { duration: 25, timestamp: '2026-07-06T09:00:00', result: 'completed' },
        { duration: 25, timestamp: '2026-07-06T09:30:00', result: 'blocked' },
      ],
      '2026-07-07': [{ duration: 50, timestamp: '2026-07-07T09:00:00', result: 'completed' }],
    };

    expect(getProductivityPatterns(history)).toMatchObject({
      totalSessions: 3,
      completionRate: 67,
      abandoned: 1,
      bestHour: { hour: 9, minutes: 100 },
    });
  });
});
