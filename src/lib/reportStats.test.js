import { describe, expect, it } from 'vitest';
import { computeReportStats } from './reportStats';

const today = new Date(2026, 8, 22);

describe('computeReportStats', () => {
  it('returns empty totals for missing history', () => {
    expect(computeReportStats(null, null, today)).toEqual({
      totalHours: '0.0', pomodorosCompleted: 0, currentStreak: 0, weeklyData: {}, archivedTasks: [],
    });
  });

  it('sums durations and defaults missing durations to 25 minutes', () => {
    const stats = computeReportStats({ '2026-09-20': [{ duration: 50 }, {}] }, [], today);
    expect(stats.totalHours).toBe('1.3');
    expect(stats.pomodorosCompleted).toBe(2);
    expect(stats.weeklyData).toEqual({ 'Sun 20': 75 / 60 });
  });

  it('keeps a streak alive when today has no sessions yet', () => {
    const history = { '2026-09-21': [{ duration: 25 }], '2026-09-20': [{ duration: 25 }], '2026-09-18': [{ duration: 25 }] };
    expect(computeReportStats(history, [], today).currentStreak).toBe(2);
  });

  it('counts today in the streak', () => {
    const history = { '2026-09-22': [{ duration: 25 }], '2026-09-21': [{ duration: 25 }] };
    expect(computeReportStats(history, [], today).currentStreak).toBe(2);
  });
});

it('ignores empty and malformed history days instead of inventing a streak or crashing', () => {
  const stats = computeReportStats({ '2026-09-22': [], '2026-09-21': [null], '2026-09-20': 'broken', '2026-09-19': [{ duration: 25 }] }, [], today);
  expect(stats.currentStreak).toBe(0);
  expect(stats.pomodorosCompleted).toBe(1);
});

it('keeps a current streak beyond 100 days', () => {
  const history = Object.fromEntries(Array.from({ length: 101 }, (_, index) => [new Date(2026, 0, index + 1).toLocaleDateString('en-CA'), [{ duration: 25 }]]));
  expect(computeReportStats(history, [], new Date(2026, 3, 11)).currentStreak).toBe(101);
});
