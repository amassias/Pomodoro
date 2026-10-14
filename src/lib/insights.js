import { normalizeHistory } from './userState';
const totalMinutesForRange = (history, start, end) => Object.entries(normalizeHistory(history)).reduce((sum, [date, sessions]) => {
  const day = new Date(`${date}T00:00:00`);
  if (day < start || day >= end || !Array.isArray(sessions)) return sum;
  return sum + sessions.reduce((total, session) => total + (Number(session.duration) || 0), 0);
}, 0);

export const getWeeklyComparison = (history, now = new Date()) => {
  const currentStart = new Date(now);
  currentStart.setHours(0, 0, 0, 0);
  currentStart.setDate(currentStart.getDate() - ((currentStart.getDay() + 6) % 7));
  const currentEnd = new Date(currentStart);
  currentEnd.setDate(currentEnd.getDate() + 7);
  const previousStart = new Date(currentStart);
  previousStart.setDate(previousStart.getDate() - 7);

  const currentMinutes = totalMinutesForRange(history, currentStart, currentEnd);
  const previousMinutes = totalMinutesForRange(history, previousStart, currentStart);
  const changePercent = previousMinutes > 0 ? Math.round(((currentMinutes - previousMinutes) / previousMinutes) * 100) : currentMinutes > 0 ? null : 0;
  return { currentMinutes, previousMinutes, changePercent };
};

const dayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'long' });

export const getProductivityPatterns = (history) => {
  const sessions = Object.values(normalizeHistory(history)).flatMap((day) => Array.isArray(day) ? day : []);
  const hourlyMinutes = Array(24).fill(0);
  const weekdayMinutes = new Map();
  let completed = 0;
  let abandoned = 0;
  let blocked = 0;
  let reflected = 0;

  sessions.forEach((session) => {
    const timestamp = new Date(session.timestamp);
    if (!Number.isNaN(timestamp.valueOf())) {
      hourlyMinutes[timestamp.getHours()] += Number(session.duration) || 0;
      const weekday = dayFormatter.format(timestamp);
      weekdayMinutes.set(weekday, (weekdayMinutes.get(weekday) || 0) + (Number(session.duration) || 0));
    }
    if (['completed', 'partial', 'blocked', 'abandoned'].includes(session.result)) reflected += 1;
    if (session.result === 'completed') completed += 1;
    if (session.result === 'blocked') blocked += 1;
    if (session.result === 'abandoned') abandoned += 1;
  });

  const bestHour = hourlyMinutes.reduce((best, minutes, hour) => minutes > best.minutes ? { hour, minutes } : best, { hour: null, minutes: 0 });
  const bestWeekday = [...weekdayMinutes.entries()].reduce((best, [day, minutes]) => minutes > best.minutes ? { day, minutes } : best, { day: null, minutes: 0 });
  const classified = reflected;

  return {
    totalSessions: sessions.length,
    completionRate: classified ? Math.round((completed / classified) * 100) : null,
    abandoned,
    blocked,
    reflected,
    bestHour: bestHour.minutes ? bestHour : null,
    bestWeekday: bestWeekday.minutes ? bestWeekday : null,
  };
};
