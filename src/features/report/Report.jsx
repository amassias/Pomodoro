import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUserData } from '../../providers/UserDataProvider.jsx';
import Achievements from './Achievements';
import ReflectionDialog from './ReflectionDialog';
import AuthMenu from '../auth/AuthMenu';
import { generateCSV, downloadFile } from '../../lib/export';
import { getLocalDateKey, parseLocalDateKey } from '../../lib/date';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { getProductivityPatterns, getWeeklyComparison } from '../../lib/insights';
import { computeReportStats } from '../../lib/reportStats';
import './Report.css';

const Report = () => {
  const [showReport, setShowReport] = useState(false);
  const reportModalRef = useRef(null);
  const closeReport = useCallback(() => setShowReport(false), []);
  const [reflection, setReflection] = useState(null);
  const closeReflection = useCallback(() => setReflection(null), []);

  useDialogFocus({ open: showReport, onClose: closeReport, dialogRef: reportModalRef });

  const { pomodoroHistory, setPomodoroHistory, tasks, setTasks, activeTask, archivedTasks, setArchivedTasks, settings, setSettings } = useUserData();
  const importInputRef = useRef(null);
  const [stats, setStats] = useState({
    totalHours: 0,
    pomodorosCompleted: 0,
    currentStreak: 0,
    weeklyData: [],
    archivedTasks: []
  });
  const [timeRange, setTimeRange] = useState('week'); // week, month, year
  const [selectedDay, setSelectedDay] = useState(null);
  const weeklyComparison = useMemo(() => getWeeklyComparison(pomodoroHistory), [pomodoroHistory]);
  const productivityPatterns = useMemo(() => getProductivityPatterns(pomodoroHistory), [pomodoroHistory]);
  const taskInsights = useMemo(() => {
    const summary = new Map();
    Object.values(pomodoroHistory || {}).forEach((sessions) => (sessions || []).forEach((session) => {
      if (!session.taskId && !session.taskName) return;
      const key = session.taskId || session.taskName;
      const current = summary.get(key) || { name: session.taskName || 'Untitled task', minutes: 0, sessions: 0, difficultyTotal: 0, difficultyCount: 0, interruptions: 0 };
      current.minutes += Number(session.duration) || 0;
      current.sessions += 1;
      current.interruptions += Number(session.interruptions) || 0;
      if (session.difficulty) { current.difficultyTotal += Number(session.difficulty); current.difficultyCount += 1; }
      summary.set(key, current);
    }));
    return [...summary.values()].sort((left, right) => right.minutes - left.minutes).slice(0, 6);
  }, [pomodoroHistory]);
  const heatmapDays = useMemo(() => Array.from({ length: 28 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (27 - index));
    const key = getLocalDateKey(date);
    const minutes = (pomodoroHistory[key] || []).reduce((sum, session) => sum + (Number(session.duration) || 0), 0);
    return { key, minutes, level: minutes >= 120 ? 4 : minutes >= 75 ? 3 : minutes >= 25 ? 2 : minutes > 0 ? 1 : 0 };
  }), [pomodoroHistory]);

  const savePomodoroData = useCallback((durationMinutes, { sessionId, taskId, taskName, result, difficulty, interruptions, notes } = {}) => {
    const today = getLocalDateKey();

    setPomodoroHistory((prevHistory) => {
      const history = prevHistory && typeof prevHistory === 'object' ? { ...prevHistory } : {};

      if (!history[today]) {
        history[today] = [];
      }

      if (sessionId && history[today].some((entry) => entry.sessionId === sessionId)) return history;

      const entry = {
        sessionId: sessionId || crypto.randomUUID(),
        duration: durationMinutes,
        timestamp: new Date().toISOString(),
        completed: true
      };

      if (taskId) entry.taskId = taskId;
      if (taskName) entry.taskName = taskName;
      if (result) entry.result = result;
      if (difficulty) entry.difficulty = difficulty;
      if (interruptions != null) entry.interruptions = interruptions;
      if (notes) entry.notes = notes;

      history[today].push(entry);

      return history;
    });
  }, [setPomodoroHistory]);

  const handlePomodoroComplete = useCallback((event) => {
    const duration = event?.detail?.duration;
    if (!duration) return;
    const sessionId = event?.detail?.sessionId || crypto.randomUUID();
    const completedSession = {
      sessionId,
      duration,
      taskId: activeTask?.id || null,
      taskName: activeTask?.text || null,
    };
    savePomodoroData(duration, completedSession);
    if (completedSession.taskId) {
      setTasks(prev => prev.map(task => task.id === completedSession.taskId ? { ...task, completedPomodoros: (task.completedPomodoros || 0) + 1 } : task));
    }
    setReflection(completedSession);
  }, [activeTask, savePomodoroData, setTasks]);

  const loadStats = useCallback(() => {
    setStats(computeReportStats(pomodoroHistory, archivedTasks));
  }, [archivedTasks, pomodoroHistory]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    window.addEventListener('pomodoroCompleted', handlePomodoroComplete);
    return () => window.removeEventListener('pomodoroCompleted', handlePomodoroComplete);
  }, [handlePomodoroComplete]);

  useEffect(() => {
    if (showReport) {
      loadStats();
      setSelectedDay(null);
    }
  }, [showReport, loadStats]);

  useEffect(() => {
    const openReport = () => setShowReport(true);
    window.addEventListener('open-report', openReport);
    return () => window.removeEventListener('open-report', openReport);
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && showReport) {
        setShowReport(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showReport]);



  useEffect(() => {
    setSelectedDay(null);
  }, [timeRange]);

  const getDailyHoursMap = () => {
    const history = pomodoroHistory && typeof pomodoroHistory === 'object' ? pomodoroHistory : {};
    const dailyHours = {};

    Object.entries(history).forEach(([date, sessions]) => {
      const minutes = (sessions || []).reduce((sum, s) => sum + (s.duration || 25), 0);
      dailyHours[date] = minutes / 60;
    });

    return dailyHours;
  };

  const getChartData = () => {
    const today = new Date();
    const data = {};

    const dailyHours = getDailyHoursMap();

    if (timeRange === 'week') {
      const currentDay = today.getDay(); // 0 (Sun) to 6 (Sat)
      const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
      const monday = new Date(today);
      monday.setDate(today.getDate() - distanceToMonday);

      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const dateStr = getLocalDateKey(date);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dayNum = date.getDate();
        data[dateStr] = {
          label: `${dayName}, ${dayNum}`,
          value: dailyHours[dateStr] || 0
        };
      }
    }

    if (timeRange === 'month') {
      // Last 4 weeks (28 days), grouped by week to keep the chart readable.
      const buckets = [0, 0, 0, 0];
      for (let daysAgo = 0; daysAgo < 28; daysAgo++) {
        const d = new Date(today);
        d.setDate(d.getDate() - daysAgo);
        const dateStr = getLocalDateKey(d);
        const bucketIndex = Math.floor((27 - daysAgo) / 7); // 0=oldest, 3=newest
        buckets[bucketIndex] += dailyHours[dateStr] || 0;
      }

      for (let i = 0; i < 4; i++) {
        const startDaysAgo = 27 - i * 7;
        const start = new Date(today);
        start.setDate(start.getDate() - startDaysAgo);
        const key = getLocalDateKey(start);
        const monthLabel = start.toLocaleDateString('en-US', { month: 'short' });
        const dayLabel = start.getDate();

        data[key] = {
          label: `Week of ${monthLabel} ${dayLabel}`,
          value: buckets[i]
        };
      }
    }

    if (timeRange === 'year') {
      // Last 12 months, grouped by month.
      const monthTotals = {};
      Object.entries(dailyHours).forEach(([dateStr, hours]) => {
        const monthKey = dateStr.slice(0, 7); // YYYY-MM
        monthTotals[monthKey] = (monthTotals[monthKey] || 0) + (hours || 0);
      });

      for (let offset = 11; offset >= 0; offset--) {
        const monthDate = new Date(today.getFullYear(), today.getMonth() - offset, 1);
        const year = monthDate.getFullYear();
        const month = String(monthDate.getMonth() + 1).padStart(2, '0');
        const monthKey = `${year}-${month}`;
        const key = `${monthKey}-01`;
        const label = monthDate.toLocaleDateString('en-US', { month: 'short' });

        data[key] = {
          label,
          value: monthTotals[monthKey] || 0
        };
      }
    }

    return data;
  };

  const maxHours = Math.max(...Object.values(getChartData()).map(d => d.value), 1);
  const chartData = getChartData();

  const getTasksForDate = (dateStr) => {
    return stats.archivedTasks.filter(task => {
      if (!task.archivedAt) return false;
      return task.archivedAt.startsWith(dateStr);
    });
  };

  const renderTasks = () => {
    if (!selectedDay) return null;

    const tasksForDay = getTasksForDate(selectedDay.date);
    const dateObj = parseLocalDateKey(selectedDay.date);
    const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    return (
      <div className="daily-tasks-section">
        <h3>Tasks Completed on {formattedDate}</h3>
        {tasksForDay.length === 0 ? (
          <p className="no-tasks">No tasks completed on this day.</p>
        ) : (
          <ul className="completed-task-list">
            {tasksForDay.map(task => (
              <li key={task.id} className="completed-task-item">
                <span className="check-icon">✓</span>
                <span className="task-text">{task.text}</span>
                <span className="task-time">
                  {new Date(task.archivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <>
      <button
        className="report-btn"
        onClick={() => setShowReport(true)}
        title="View statistics"
        aria-label="View statistics"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
        <span>Insights</span>
      </button>

      <AuthMenu />

      {showReport && (
        <div className="report-modal-overlay" onClick={closeReport}>
          <div ref={reportModalRef} className="report-modal glass-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="report-title">
            <div className="report-header">
              <h2 id="report-title">Insights</h2>
              <button className="close-btn" onClick={closeReport} aria-label="Close">✕</button>
            </div>

            <div className="report-cards">
              <div className="stat-card">
                <div className="stat-icon">⏱️</div>
                <div className="stat-value">{stats.totalHours}h</div>
                <div className="stat-label">Total hours</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">✓</div>
                <div className="stat-value">{stats.pomodorosCompleted}</div>
                <div className="stat-label">Focus sessions</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🔥</div>
                <div className="stat-value">{stats.currentStreak}</div>
                <div className="stat-label">Day streak</div>
              </div>
            </div>
            <div className="weekly-insight" role="status">
              <div><span>This week</span><strong>{(weeklyComparison.currentMinutes / 60).toFixed(1)}h</strong></div>
              <div><span>Previous week</span><strong>{(weeklyComparison.previousMinutes / 60).toFixed(1)}h</strong></div>
              <p className={weeklyComparison.changePercent === 0 ? 'neutral' : weeklyComparison.changePercent > 0 ? 'positive' : 'negative'}>
                {weeklyComparison.changePercent === 0
                  ? 'Same as last week'
                  : `${weeklyComparison.changePercent > 0 ? '↑' : '↓'} ${Math.abs(weeklyComparison.changePercent)}% versus last week`}
              </p>
            </div>
            <section className="focus-heatmap"><div><h3>Focus consistency</h3><span>Last 28 days</span></div><div className="heatmap-grid">{heatmapDays.map(day => <span key={day.key} className={`heatmap-day level-${day.level}`} title={`${day.key}: ${day.minutes} minutes`} aria-label={`${day.key}: ${day.minutes} minutes`}></span>)}</div></section>
            {productivityPatterns.totalSessions > 0 && <section className="productivity-patterns" aria-label="Productivity patterns">
              <h3>Patterns to use</h3>
              <div className="pattern-grid">
                {productivityPatterns.bestHour && <p>Your strongest focus window is <strong>{String(productivityPatterns.bestHour.hour).padStart(2, '0')}:00–{String((productivityPatterns.bestHour.hour + 1) % 24).padStart(2, '0')}:00</strong>.</p>}
                {productivityPatterns.bestWeekday && <p><strong>{productivityPatterns.bestWeekday.day}</strong> is your most productive day.</p>}
                {productivityPatterns.completionRate !== null && <p><strong>{productivityPatterns.completionRate}%</strong> of reflected sessions were completed; {productivityPatterns.abandoned} were abandoned.</p>}
              </div>
            </section>}

            <div className="report-timerange">
              <button
                className={`range-btn ${timeRange === 'week' ? 'active' : ''}`}
                onClick={() => setTimeRange('week')}
              >
                Week
              </button>
              <button
                className={`range-btn ${timeRange === 'month' ? 'active' : ''}`}
                onClick={() => setTimeRange('month')}
              >
                Month
              </button>
              <button
                className={`range-btn ${timeRange === 'year' ? 'active' : ''}`}
                onClick={() => setTimeRange('year')}
              >
                Year
              </button>
            </div>

            <div className="chart-container">
              <div className="chart">
                {Object.entries(chartData).map(([dateStr, data]) => (
                  <div key={dateStr} className="chart-bar-wrapper">
                    <div className="chart-bar-label">{data.label.split(',')[0]}</div>
                    <div className="chart-bar-container">
                      <div
                        className={`chart-bar ${(timeRange === 'week' && selectedDay?.date === dateStr) ? 'selected' : ''}`}
                        style={{ height: `${(data.value / maxHours) * 120}px` }}
                        title={`${data.value.toFixed(1)}h`}
                        onClick={() => {
                          if (timeRange !== 'week') return;
                          setSelectedDay({ date: dateStr });
                        }}
                      />
                    </div>
                    <div className="chart-bar-value">{data.value.toFixed(1)}h</div>
                  </div>
                ))}
              </div>
            </div>

            <Achievements history={pomodoroHistory} />

            {taskInsights.length > 0 && <section className="task-insights"><h3>Task history</h3>{taskInsights.map(task => <div key={task.name}><strong>{task.name}</strong><span>{task.sessions} sessions · {(task.minutes / 60).toFixed(1)}h · {task.interruptions} interruptions{task.difficultyCount ? ` · difficulty ${(task.difficultyTotal / task.difficultyCount).toFixed(1)}/5` : ''}</span></div>)}</section>}

            {renderTasks()}

            <div className="report-actions">
              <button className="export-btn" onClick={() => {
                const csv = generateCSV(pomodoroHistory);
                const dateStr = getLocalDateKey();
                downloadFile(csv, `pomodoro_history_${dateStr}.csv`, 'text/csv');
              }}>
                Export CSV
              </button>
              <button className="export-btn" onClick={() => {
                const backup = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), tasks, archivedTasks, pomodoroHistory, settings }, null, 2);
                downloadFile(backup, `world_focus_backup_${getLocalDateKey()}.json`, 'application/json');
              }}>Export JSON</button>
              <button className="export-btn" onClick={() => importInputRef.current?.click()}>Import JSON</button>
              <input ref={importInputRef} type="file" accept="application/json,.json" hidden onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                try {
                  const backup = JSON.parse(await file.text());
                  if (backup.version !== 1 || !Array.isArray(backup.tasks) || !Array.isArray(backup.archivedTasks) || !backup.pomodoroHistory || typeof backup.settings !== 'object') throw new Error('Unsupported backup');
                  if (!window.confirm('Replace current tasks, history and settings with this backup?')) return;
                  setTasks(backup.tasks);
                  setArchivedTasks(backup.archivedTasks);
                  setPomodoroHistory(backup.pomodoroHistory);
                  setSettings(prev => ({ ...prev, ...backup.settings, spotifyToken: prev.spotifyToken, spotifyRefreshToken: prev.spotifyRefreshToken, spotifyTokenExpiresAt: prev.spotifyTokenExpiresAt }));
                } catch {
                  window.alert('This backup file is invalid or unsupported.');
                } finally {
                  event.target.value = '';
                }
              }} />
              <button className="reset-btn" onClick={() => {
                if (confirm('Reset all data?')) {
                  setPomodoroHistory({});
                  setTasks([]);
                  setArchivedTasks([]);
                  loadStats();
                }
              }}>
                Reset Data
              </button>
            </div>
          </div>
        </div>
      )}

      <ReflectionDialog reflection={reflection} onClose={closeReflection} />
    </>
  );
};

export default Report;
