export const DEFAULT_DURATIONS = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
};

const coercePositiveInt = (value, fallback) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
};

export const getModeMinutes = (mode, settings = {}) => {
  if (mode === 'focus') return coercePositiveInt(settings.focusDuration, DEFAULT_DURATIONS.focus);
  if (mode === 'shortBreak') return coercePositiveInt(settings.shortBreakDuration, DEFAULT_DURATIONS.shortBreak);
  if (mode === 'longBreak') return coercePositiveInt(settings.longBreakDuration, DEFAULT_DURATIONS.longBreak);
  return DEFAULT_DURATIONS.focus;
};
