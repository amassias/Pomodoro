import { getLocalDateKey } from './date';
import { normalizeTasks, normalizeArchivedTasks, normalizeHistory, publicSettings } from './userState';

const isRecord = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const validTask = task => isRecord(task) && (typeof task.id === 'string' || typeof task.id === 'number') && typeof task.text === 'string'
  && (task.subtasks == null || (Array.isArray(task.subtasks) && task.subtasks.every(subtask => isRecord(subtask) && typeof subtask.text === 'string')));

export const createBackup = (data) => ({
  version: 1,
  exportedAt: new Date().toISOString(),
  tasks: data.tasks,
  archivedTasks: data.archivedTasks,
  pomodoroHistory: data.pomodoroHistory,
  settings: publicSettings(data.settings),
  city: data.city,
  favoriteCities: data.favoriteCities,
  customLocations: data.customLocations,
});

export const parseBackup = (text) => {
  const data = JSON.parse(text);
  if (!isRecord(data) || data.version !== 1 || !Array.isArray(data.tasks) || !data.tasks.every(validTask)
    || !Array.isArray(data.archivedTasks) || !data.archivedTasks.every(validTask)
    || !isRecord(data.pomodoroHistory) || !isRecord(data.settings)) throw new Error('Unsupported backup');
  const taskIds = [...data.tasks, ...data.archivedTasks].map(task => String(task.id));
  if (new Set(taskIds).size !== taskIds.length) throw new Error('Duplicate task IDs');
  for (const [date, sessions] of Object.entries(data.pomodoroHistory)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || getLocalDateKey(new Date(`${date}T00:00:00`)) !== date || !Array.isArray(sessions)
      || sessions.some(session => !isRecord(session) || (session.duration != null && (!Number.isFinite(Number(session.duration)) || Number(session.duration) <= 0)))) throw new Error('Invalid session history');
  }
  for (const key of ['focusDuration', 'shortBreakDuration', 'longBreakDuration', 'dailyGoal', 'weeklyGoal']) {
    if (data.settings[key] != null && (!Number.isInteger(Number(data.settings[key])) || Number(data.settings[key]) <= 0)) throw new Error('Invalid duration');
  }
  for (const key of ['alarmVolume', 'tickingVolume']) {
    if (data.settings[key] != null && (!Number.isFinite(Number(data.settings[key])) || Number(data.settings[key]) < 0 || Number(data.settings[key]) > 100)) throw new Error('Invalid volume');
  }
  if (data.settings.alarmRepeat != null && (!Number.isInteger(Number(data.settings.alarmRepeat)) || Number(data.settings.alarmRepeat) < 1 || Number(data.settings.alarmRepeat) > 10)) throw new Error('Invalid alarm repeat');
  for (const key of ['customPresets', 'atmosphereCollections', 'routines']) {
    if (data.settings[key] != null && (!Array.isArray(data.settings[key]) || data.settings[key].some(item => !isRecord(item) || typeof item.id !== 'string' || typeof item.name !== 'string'))) throw new Error('Invalid preferences');
  }
  if (data.settings.routines?.some(routine => !Array.isArray(routine.tasks) || routine.tasks.some(task => !isRecord(task) || typeof task.text !== 'string' || (task.subtasks != null && !Array.isArray(task.subtasks))))) throw new Error('Invalid routines');
  if (data.settings.customPresets?.some(preset => ['focusDuration', 'shortBreakDuration', 'longBreakDuration'].some(key => !Number.isInteger(Number(preset[key])) || Number(preset[key]) <= 0))) throw new Error('Invalid presets');
  if (data.favoriteCities != null && (!Array.isArray(data.favoriteCities) || data.favoriteCities.some(id => typeof id !== 'string'))) throw new Error('Invalid favorites');
  if (data.customLocations != null && (!isRecord(data.customLocations) || Object.values(data.customLocations).some(location => !isRecord(location) || typeof location.id !== 'string' || typeof location.name !== 'string'))) throw new Error('Invalid locations');
  return {
    ...data,
    tasks: normalizeTasks(data.tasks),
    archivedTasks: normalizeArchivedTasks(data.archivedTasks),
    pomodoroHistory: normalizeHistory(data.pomodoroHistory),
    settings: publicSettings(data.settings),
  };
};
