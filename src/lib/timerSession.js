export const TIMER_SESSION_KEY = 'pomodoro-active-session-v1';

const VALID_MODES = new Set(['focus', 'shortBreak', 'longBreak']);

export const normalizeTimerSession = (value, now = Date.now()) => {
  if (!value || typeof value !== 'object' || !VALID_MODES.has(value.mode)) return null;

  const isActive = value.isActive === true;
  const endAt = Number(value.endAt);
  const storedRemaining = Number(value.remainingMs);
  const remainingMs = isActive && Number.isFinite(endAt)
    ? Math.max(0, endAt - now)
    : Math.max(0, Number.isFinite(storedRemaining) ? storedRemaining : 0);

  if (remainingMs <= 0) return null;

  return {
    mode: value.mode,
    isActive,
    endAt: isActive ? endAt : null,
    remainingMs,
  };
};

export const readTimerSession = (storage = globalThis.localStorage, now = Date.now()) => {
  try {
    return normalizeTimerSession(JSON.parse(storage.getItem(TIMER_SESSION_KEY)), now);
  } catch {
    return null;
  }
};

export const writeTimerSession = (session, storage = globalThis.localStorage) => {
  try {
    storage.setItem(TIMER_SESSION_KEY, JSON.stringify(session));
  } catch {
    // Timer persistence must never block the timer.
  }
};

export const clearTimerSession = (storage = globalThis.localStorage) => {
  try {
    storage.removeItem(TIMER_SESSION_KEY);
  } catch {
    // Ignore unavailable storage.
  }
};
