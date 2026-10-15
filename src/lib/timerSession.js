import { browserLocalStorage } from './browserStorage';
export const TIMER_SESSION_KEY = 'pomodoro-active-session-v1';

const VALID_MODES = new Set(['focus', 'shortBreak', 'longBreak']);

export const normalizeTimerSession = (value, now = Date.now(), { allowExpired = false } = {}) => {
  if (!value || typeof value !== 'object' || !VALID_MODES.has(value.mode)) return null;

  const isActive = value.isActive === true;
  const endAt = value.endAt;
  const storedRemaining = value.remainingMs;
  if (isActive && (typeof endAt !== 'number' || !Number.isFinite(endAt) || endAt <= 0)) return null;
  if (!isActive && (typeof storedRemaining !== 'number' || !Number.isFinite(storedRemaining))) return null;
  const remainingMs = isActive ? Math.max(0, endAt - now) : Math.max(0, storedRemaining);

  if (remainingMs <= 0 && !(allowExpired && isActive)) return null;

  return {
    ...(typeof value.durationMs === 'number' && Number.isFinite(value.durationMs) && value.durationMs > 0 ? { durationMs: value.durationMs } : {}),
    ...(Number.isInteger(value.completedFocusSessions) && value.completedFocusSessions >= 0 ? { completedFocusSessions: value.completedFocusSessions } : {}),
    mode: value.mode,
    isActive,
    endAt: isActive ? endAt : null,
    remainingMs,
  };
};

export const readTimerSession = (storage, now = Date.now(), options) => {
  try {
    return normalizeTimerSession(JSON.parse((storage ?? browserLocalStorage).getItem(TIMER_SESSION_KEY)), now, options);
  } catch {
    return null;
  }
};

export const writeTimerSession = (session, storage) => {
  try {
    (storage ?? browserLocalStorage).setItem(TIMER_SESSION_KEY, JSON.stringify(session));
    if (!storage && typeof window !== 'undefined') window.webkit?.messageHandlers?.focusTimer?.postMessage(session);
  } catch {
    // Timer persistence must never block the timer.
  }
};

export const clearTimerSession = (storage) => {
  try {
    (storage ?? browserLocalStorage).removeItem(TIMER_SESSION_KEY);
    if (!storage && typeof window !== 'undefined') window.webkit?.messageHandlers?.focusTimer?.postMessage({ mode: 'focus', isActive: false, remainingMs: 0 });
  } catch {
    // Ignore unavailable storage.
  }
};
