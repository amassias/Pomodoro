import { describe, expect, it } from 'vitest';
import { getModeMinutes } from '../../lib/timer';

describe('timer durations', () => {
  it('uses configured positive whole-minute durations', () => {
    const settings = { focusDuration: 50, shortBreakDuration: 10, longBreakDuration: 30 };
    expect(getModeMinutes('focus', settings)).toBe(50);
    expect(getModeMinutes('shortBreak', settings)).toBe(10);
    expect(getModeMinutes('longBreak', settings)).toBe(30);
  });

  it('falls back for invalid or unknown durations', () => {
    expect(getModeMinutes('focus', { focusDuration: 0 })).toBe(25);
    expect(getModeMinutes('shortBreak', { shortBreakDuration: 'nope' })).toBe(5);
    expect(getModeMinutes('unknown', {})).toBe(25);
  });
});
