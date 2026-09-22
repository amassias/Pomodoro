import { getLocalDateKey, parseLocalDateKey } from './date';

// Aggregates totals, the current day streak and per-day hours for the Insights report.
export const computeReportStats = (pomodoroHistory, archivedTasks, today = new Date()) => {
  const history = pomodoroHistory && typeof pomodoroHistory === 'object' ? pomodoroHistory : {};
  const tasks = Array.isArray(archivedTasks) ? archivedTasks : [];

  let totalMinutes = 0;
  let totalPomodoros = 0;
  const weeklyData = {};
  let currentStreak = 0;

  Object.entries(history).forEach(([date, sessions]) => {
    const dayMinutes = sessions.reduce((sum, s) => sum + (s.duration || 25), 0);
    totalMinutes += dayMinutes;
    totalPomodoros += sessions.length;

    const dateObj = parseLocalDateKey(date);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = dateObj.getDate();
    weeklyData[`${dayName} ${dayNum}`] = dayMinutes / 60;
  });

  for (let i = 0; i < 100; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = getLocalDateKey(checkDate);

    if (history[dateStr]) {
      currentStreak++;
    } else if (i === 0) {
      // Today has no sessions yet — check if yesterday continues a streak
      continue;
    } else {
      break;
    }
  }

  return {
    totalHours: (totalMinutes / 60).toFixed(1),
    pomodorosCompleted: totalPomodoros,
    currentStreak,
    weeklyData,
    archivedTasks: tasks
  };
};
