const totalMinutesForRange = (history, start, end) => Object.entries(history || {}).reduce((sum, [date, sessions]) => {
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
  const changePercent = previousMinutes > 0 ? Math.round(((currentMinutes - previousMinutes) / previousMinutes) * 100) : currentMinutes > 0 ? 100 : 0;
  return { currentMinutes, previousMinutes, changePercent };
};
