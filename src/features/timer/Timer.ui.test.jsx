// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Timer from './Timer';

const shared = vi.hoisted(() => ({ roomId: null, isHost: false, remoteTimerState: null, publishTimerState: vi.fn(), sendRoomEvent: vi.fn() }));
vi.mock('../../providers/SharedSessionProvider', () => ({ useSharedSession: () => shared }));
vi.mock('../calendar/CalendarActions', () => ({ default: () => null }));

const settings = { focusDuration: 25, shortBreakDuration: 5, longBreakDuration: 15, tickingSound: 'none' };

beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); shared.roomId = null; shared.isHost = false; shared.remoteTimerState = null; });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('timer session controls', () => {
  it('preserves elapsed time through pause, unrelated settings, reload and resume', () => {
    const props = { settings, updateSettings: vi.fn() };
    const view = render(<React.StrictMode><Timer {...props} /></React.StrictMode>);
    fireEvent.click(screen.getByRole('button', { name: 'Start focus' }));
    act(() => vi.advanceTimersByTime(65_000));
    fireEvent.click(screen.getByRole('button', { name: 'Pause session' }));
    act(() => vi.advanceTimersByTime(1000));
    expect(view.container.querySelector('.time-display').textContent).toBe('23:55');
    view.rerender(<React.StrictMode><Timer {...props} settings={{ ...settings, alarmVolume: 0 }} /></React.StrictMode>);
    act(() => vi.advanceTimersByTime(1000));
    expect(view.container.querySelector('.time-display').textContent).toBe('23:55');
    view.unmount();
    const restored = render(<Timer {...props} />);
    expect(restored.container.querySelector('.time-display').textContent).toBe('23:55');
    fireEvent.click(screen.getByRole('button', { name: 'Start focus' }));
    act(() => vi.advanceTimersByTime(1000));
    expect(restored.container.querySelector('.time-display').textContent).toBe('23:54');
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(restored.container.querySelector('.time-display').textContent).toBe('25:00');
  });
});


it('keeps a guest timer locked when global timer events are dispatched', () => {
  shared.roomId = 'guest-room';
  localStorage.setItem('pomodoro-active-session-v1', JSON.stringify({ mode: 'focus', isActive: false, remainingMs: 60_000 }));
  const view = render(<Timer settings={settings} updateSettings={vi.fn()} />);
  expect(screen.getByRole('button', { name: 'Host controls timer' }).disabled).toBe(true);
  act(() => {
    window.dispatchEvent(new CustomEvent('timer-toggle'));
    window.dispatchEvent(new CustomEvent('timer-reset'));
    vi.advanceTimersByTime(1000);
  });
  expect(view.container.querySelector('.time-display').textContent).toBe('01:00');
});

it('applies a changed idle duration while keeping elapsed time when settings change during a run', () => {
  const props = { settings, updateSettings: vi.fn() };
  const view = render(<Timer {...props} />);
  view.rerender(<Timer {...props} settings={{ ...settings, focusDuration: 50 }} />);
  act(() => vi.advanceTimersByTime(1));
  expect(view.container.querySelector('.time-display').textContent).toBe('50:00');
  fireEvent.click(screen.getByRole('button', { name: 'Start focus' }));
  act(() => vi.advanceTimersByTime(60_000));
  view.rerender(<Timer {...props} settings={{ ...settings, focusDuration: 90 }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Pause session' }));
  act(() => vi.advanceTimersByTime(1000));
  expect(view.container.querySelector('.time-display').textContent).toBe('49:00');
});

it('records the selected duration plus extensions, once, even when settings change mid-session', () => {
  const complete = vi.fn();
  window.addEventListener('pomodoroCompleted', complete);
  try {
    const props = { settings: { ...settings, focusDuration: 1, alarmRepeat: 0 }, updateSettings: vi.fn() };
    const view = render(<Timer {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start focus' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add 5 min' }));
    view.rerender(<Timer {...props} settings={{ ...props.settings, focusDuration: 25 }} />);
    act(() => vi.advanceTimersByTime(360_000));
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete.mock.calls[0][0].detail.duration).toBe(6);
  } finally { window.removeEventListener('pomodoroCompleted', complete); }
});

it('does not let a pending automatic transition override a user reset', () => {
  const view = render(<Timer settings={{ ...settings, focusDuration: 1, alarmRepeat: 0, autoStartBreaks: true }} updateSettings={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Start focus' }));
  act(() => vi.advanceTimersByTime(60_000));
  fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
  act(() => vi.advanceTimersByTime(2000));
  expect(screen.queryByRole('button', { name: 'Start focus' })).toBeTruthy();
  expect(view.container.querySelector('.time-display').textContent).toBe('01:00');
});

it('recovers an overdue session once after reload and keeps the fourth-session long break', () => {
  const complete = vi.fn();
  window.addEventListener('pomodoroCompleted', complete);
  try {
    localStorage.setItem('pomodoro-active-session-v1', JSON.stringify({ mode: 'focus', isActive: true, endAt: Date.now() - 1000, remainingMs: 60_000, durationMs: 60_000, completedFocusSessions: 3 }));
    const view = render(<React.StrictMode><Timer settings={{ ...settings, focusDuration: 1, alarmRepeat: 0 }} updateSettings={vi.fn()} /></React.StrictMode>);
    act(() => vi.advanceTimersByTime(1001));
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete.mock.calls[0][0].detail.duration).toBe(1);
    expect(screen.getByRole('button', { name: 'Start break' })).toBeTruthy();
    expect(view.container.querySelector('.time-display').textContent).toBe('15:00');
  } finally { window.removeEventListener('pomodoroCompleted', complete); }
});


it('keeps the host duration and break cycle when a guest takes over', () => {
  shared.roomId = 'handoff-room';
  shared.remoteTimerState = { mode: 'focus', isActive: true, endAt: Date.now() + 60_000, remainingMs: 60_000, durationMs: 300_000, completedFocusSessions: 3 };
  const props = { settings: { ...settings, focusDuration: 1, alarmRepeat: 0 }, updateSettings: vi.fn() };
  const view = render(<Timer {...props} />);
  act(() => vi.advanceTimersByTime(1));
  shared.isHost = true;
  view.rerender(<Timer {...props} />);
  const complete = vi.fn(); window.addEventListener('pomodoroCompleted', complete);
  try {
    act(() => vi.advanceTimersByTime(60_000));
    expect(complete.mock.calls[0][0].detail.duration).toBe(5);
    act(() => vi.advanceTimersByTime(1000));
    expect(view.container.querySelector('.time-display').textContent).toBe('15:00');
  } finally { window.removeEventListener('pomodoroCompleted', complete); }
});
