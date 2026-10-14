import { getLocalDateKey } from './date';

const normalizeTask = (task) => {
  if (!task || typeof task !== 'object') return null;
  const id =
    typeof task.id === 'string'
      ? task.id
      : typeof task.id === 'number'
        ? String(task.id)
        : null;
  if (!id) return null;

  return {
    id,
    text: typeof task.text === 'string' ? task.text : '',
    completed: typeof task.completed === 'boolean' ? task.completed : false,
    estimatedPomodoros: Number.isInteger(Number(task.estimatedPomodoros)) && Number(task.estimatedPomodoros) > 0 ? Number(task.estimatedPomodoros) : 1,
    completedPomodoros: Number.isInteger(Number(task.completedPomodoros)) && Number(task.completedPomodoros) >= 0 ? Number(task.completedPomodoros) : 0,
    dueDate: typeof task.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate) ? task.dueDate : null,
    subtasks: Array.isArray(task.subtasks)
      ? task.subtasks.filter((subtask) => subtask && typeof subtask.text === 'string').map((subtask) => ({
        id: typeof subtask.id === 'string' ? subtask.id : crypto.randomUUID(),
        text: subtask.text,
        completed: subtask.completed === true,
      }))
      : [],
    createdAt: typeof task.createdAt === 'string' ? task.createdAt : null,
  };
};

export const normalizeTasks = (maybeTasks) => {
  if (!Array.isArray(maybeTasks)) return [];
  return maybeTasks.map(normalizeTask).filter(Boolean);
};

const normalizeArchivedTask = (task) => {
  const normalized = normalizeTask(task);
  if (!normalized) return null;
  const archivedAt = typeof task.archivedAt === 'string' ? task.archivedAt : null;
  return {
    ...normalized,
    archivedAt,
  };
};

export const normalizeArchivedTasks = (maybeTasks) => {
  if (!Array.isArray(maybeTasks)) return [];
  return maybeTasks.map(normalizeArchivedTask).filter(Boolean);
};

// Browser/account data enters the UI through this normalization interface.
export const normalizeHistory = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const history = {};
  for (const [date, sessions] of Object.entries(value)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Array.isArray(sessions)) continue;
    const parsedDate = new Date(`${date}T00:00:00`);
    if (Number.isNaN(parsedDate.valueOf()) || getLocalDateKey(parsedDate) !== date) continue;
    const valid = sessions.filter(session => session && typeof session === 'object' && !Array.isArray(session))
      .filter(session => session.duration == null || (Number.isFinite(Number(session.duration)) && Number(session.duration) > 0))
      .map(session => ({
        ...session,
        duration: session.duration == null ? 25 : Number(session.duration),
        taskName: typeof session.taskName === 'string' ? session.taskName : undefined,
        timestamp: typeof session.timestamp === 'string' ? session.timestamp : undefined,
      }));
    if (valid.length) history[date] = valid;
  }
  return history;
};

export const publicSettings = (settings) => {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return {};
  const { spotifyToken: _token, spotifyRefreshToken: _refresh, spotifyTokenExpiresAt: _expires, ...preferences } = settings || {};
  for (const key of ['focusDuration', 'shortBreakDuration', 'longBreakDuration', 'dailyGoal', 'weeklyGoal']) {
    if (preferences[key] != null && (!Number.isInteger(Number(preferences[key])) || Number(preferences[key]) <= 0)) delete preferences[key];
  }
  for (const key of ['alarmVolume', 'tickingVolume']) {
    if (preferences[key] != null) preferences[key] = Math.min(100, Math.max(0, Number(preferences[key]) || 0));
  }
  if (preferences.alarmRepeat != null) preferences.alarmRepeat = Math.min(10, Math.max(1, Math.round(Number(preferences.alarmRepeat)) || 1));
  for (const key of ['customPresets', 'atmosphereCollections', 'routines']) {
    if (preferences[key] == null) continue;
    preferences[key] = (Array.isArray(preferences[key]) ? preferences[key] : []).filter(item => item && typeof item.id === 'string' && typeof item.name === 'string');
  }
  preferences.routines = preferences.routines?.filter(routine => Array.isArray(routine.tasks) && routine.tasks.every(task => task && typeof task.text === 'string'));
  return preferences;
};
