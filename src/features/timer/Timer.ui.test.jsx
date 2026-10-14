// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Timer from './Timer';

const shared = vi.hoisted(() => ({ roomId: null, isHost: false }));
vi.mock('../../providers/SharedSessionProvider', () => ({ useSharedSession: () => shared }));
vi.mock('../calendar/CalendarActions', () => ({ default: () => null }));

const settings = { focusDuration: 25, shortBreakDuration: 5, longBreakDuration: 15, tickingSound: 'none' };

beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); shared.roomId = null; });
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
