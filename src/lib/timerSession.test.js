import { describe, expect, it } from 'vitest';
import { clearTimerSession, normalizeTimerSession, readTimerSession, TIMER_SESSION_KEY, writeTimerSession } from './timerSession';

const createStorage = () => {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
};

describe('timer session persistence', () => {
  it('recalculates a running session from its deadline', () => {
    expect(normalizeTimerSession({ mode: 'focus', isActive: true, endAt: 11_000, remainingMs: 9_000 }, 5_000))
      .toEqual({ mode: 'focus', isActive: true, endAt: 11_000, remainingMs: 6_000 });
  });

  it('keeps paused time and rejects expired or malformed sessions', () => {
    expect(normalizeTimerSession({ mode: 'shortBreak', isActive: false, remainingMs: 45_000 }, 5_000))
      .toEqual({ mode: 'shortBreak', isActive: false, endAt: null, remainingMs: 45_000 });
    expect(normalizeTimerSession({ mode: 'focus', isActive: true, endAt: 4_000 }, 5_000)).toBeNull();
    expect(normalizeTimerSession({ mode: 'invalid', remainingMs: 10_000 }, 5_000)).toBeNull();
  });

  it('reads, writes and clears the versioned storage entry', () => {
    const storage = createStorage();
    writeTimerSession({ mode: 'focus', isActive: false, remainingMs: 10_000 }, storage);
    expect(readTimerSession(storage, 0)?.remainingMs).toBe(10_000);
    clearTimerSession(storage);
    expect(storage.getItem(TIMER_SESSION_KEY)).toBeNull();
  });
});
