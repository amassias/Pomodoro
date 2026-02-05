import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useUserData } from '../context/UserDataContext.jsx';
import Achievements from './Achievements';
import { generateCSV, downloadFile } from '../utils/exportUtils';
import { getLocalDateKey, parseLocalDateKey } from '../utils/dateUtils';

const Report = () => {
  const [showReport, setShowReport] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const authBtnRef = useRef(null);
  const authPopoverRef = useRef(null);

  const { loading: authLoading, user, signInWithPassword, signUp, signInWithOAuth, signOut } = useAuth();
  const { pomodoroHistory, setPomodoroHistory, setTasks, archivedTasks, setArchivedTasks } = useUserData();
  const [stats, setStats] = useState({
    totalHours: 0,
    pomodorosCompleted: 0,
    currentStreak: 0,
    weeklyData: [],
    archivedTasks: []
  });
  const [timeRange, setTimeRange] = useState('week'); // week, month, year
  const [selectedDay, setSelectedDay] = useState(null);

  const savePomodoroData = useCallback((durationMinutes) => {
    const today = getLocalDateKey();

    setPomodoroHistory((prevHistory) => {
      const history = prevHistory && typeof prevHistory === 'object' ? { ...prevHistory } : {};

      if (!history[today]) {
        history[today] = [];
      }

      history[today].push({
        duration: durationMinutes,
        timestamp: new Date().toISOString(),
        completed: true
      });

      return history;
    });
  }, [setPomodoroHistory]);

  const handlePomodoroComplete = useCallback((event) => {
    const duration = event?.detail?.duration;
    if (!duration) return;
    savePomodoroData(duration);
  }, [savePomodoroData]);

  const loadStats = useCallback(() => {
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

    const today = new Date();
    for (let i = 0; i < 100; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = getLocalDateKey(checkDate);

      if (history[dateStr]) {
        currentStreak++;
      } else if (i > 0) {
        break;
      }
    }

    setStats({
      totalHours: (totalMinutes / 60).toFixed(1),
      pomodorosCompleted: totalPomodoros,
      currentStreak,
      weeklyData,
      archivedTasks: tasks
    });
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
    const handleEsc = (e) => {
      if (e.key === 'Escape' && showReport) {
        setShowReport(false);
      }
      if (e.key === 'Escape' && showAuth) {
        setShowAuth(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showReport, showAuth]);

  useEffect(() => {
    if (!showAuth) return;

    const onPointerDown = (e) => {
      const popoverEl = authPopoverRef.current;
      const buttonEl = authBtnRef.current;
      if (popoverEl && popoverEl.contains(e.target)) return;
      if (buttonEl && buttonEl.contains(e.target)) return;
      setShowAuth(false);
    };

    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [showAuth]);

  const redirectTo = `${window.location.origin}/auth-callback`;

  const handleOAuth = async (provider) => {
    setAuthError('');
    setAuthBusy(true);
    try {
      const { error } = await signInWithOAuth({ provider, redirectTo });
      if (error) setAuthError(error.message || String(error));
    } catch (err) {
      setAuthError(err?.message || String(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleEmailSignIn = async () => {
    const email = String(authEmail || '').trim();
    const password = String(authPassword || '');
    if (!email || !password) {
      setAuthError('Email and password are required.');
      return;
    }

    setAuthError('');
    setAuthBusy(true);
    try {
      const { error } = await signInWithPassword({ email, password });
      if (error) setAuthError(error.message || String(error));
      else setShowAuth(false);
    } catch (err) {
      setAuthError(err?.message || String(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleEmailSignUp = async () => {
    const email = String(authEmail || '').trim();
    const password = String(authPassword || '');
    if (!email || !password) {
      setAuthError('Email and password are required.');
      return;
    }

    setAuthError('');
    setAuthBusy(true);
    try {
      const { error } = await signUp({ email, password });
      if (error) {
        setAuthError(error.message || String(error));
      } else {
        setShowAuth(false);
      }
    } catch (err) {
      setAuthError(err?.message || String(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    setAuthError('');
    setAuthBusy(true);
    try {
      const { error } = await signOut();
      if (error) setAuthError(error.message || String(error));
      else setShowAuth(false);
    } catch (err) {
      setAuthError(err?.message || String(err));
    } finally {
      setAuthBusy(false);
    }
  };

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
    const dateObj = new Date(selectedDay.date);
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
      </button>

      <button
        ref={authBtnRef}
        className={`auth-btn ${user ? 'signed-in' : ''}`}
        onClick={() => {
          setAuthError('');
          setShowAuth(v => !v);
        }}
        title={user ? 'Account' : 'Sign in'}
        aria-label={user ? 'Account' : 'Sign in'}
        aria-expanded={showAuth}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21a8 8 0 0 0-16 0" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </button>

      {showAuth && (
        <div ref={authPopoverRef} className="auth-popover glass-panel" role="dialog" aria-label="Authentication">
          <div className="auth-popover-header">
            <div className="auth-title">{user ? 'Account' : 'Sign in'}</div>
            <button className="auth-close" onClick={() => setShowAuth(false)} aria-label="Close">×</button>
          </div>

          {authLoading ? (
            <div className="auth-muted">Loading…</div>
          ) : user ? (
            <>
              <div className="auth-muted">Signed in as</div>
              <div className="auth-strong">{user.email || user.id}</div>
              <button className="auth-primary" disabled={authBusy} onClick={handleLogout}>
                {authBusy ? 'Signing out…' : 'Sign out'}
              </button>
            </>
          ) : (
            <>
              <div className="auth-benefits">
                <div className="auth-benefits-title">✨ Why create an account?</div>
                <ul className="auth-benefits-list">
                  <li>🔄 Sync your data across all devices</li>
                  <li>💾 Never lose your progress or stats</li>
                  <li>📊 Access your reports anywhere</li>
                </ul>
              </div>

              <div className="auth-fields">
                <input
                  type="email"
                  placeholder="Email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  autoComplete="email"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              <div className="auth-actions">
                <button className="auth-primary" disabled={authBusy} onClick={handleEmailSignIn}>
                  {authBusy ? 'Please wait…' : 'Sign in'}
                </button>
                <button className="auth-secondary" disabled={authBusy} onClick={handleEmailSignUp}>
                  Sign up
                </button>
              </div>

              <div className="auth-divider"><span>or</span></div>

              <div className="auth-oauth">
                <button
                  type="button"
                  className="auth-provider"
                  disabled={authBusy}
                  onClick={() => handleOAuth('github')}
                  aria-label="Continue with GitHub"
                  title="Continue with GitHub"
                >
                  <img className="auth-provider-logo auth-provider-logo--github" src="/logos/github.png" alt="" aria-hidden="true" />
                  <span className="sr-only">Continue with GitHub</span>
                </button>
                <button
                  type="button"
                  className="auth-provider"
                  disabled={authBusy}
                  onClick={() => handleOAuth('google')}
                  aria-label="Continue with Google"
                  title="Continue with Google"
                >
                  <img className="auth-provider-logo" src="/logos/google.png" alt="" aria-hidden="true" />
                  <span className="sr-only">Continue with Google</span>
                </button>
              </div>
            </>
          )}

          {authError ? <div className="auth-error">{authError}</div> : null}
        </div>
      )}

      {showReport && (
        <div className="report-modal-overlay" onClick={() => setShowReport(false)}>
          <div className="report-modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="report-header">
              <h2>Report</h2>
              <button className="close-btn" onClick={() => setShowReport(false)} aria-label="Close">✕</button>
            </div>

            <div className="report-cards">
              <div className="stat-card">
                <div className="stat-icon">⏱️</div>
                <div className="stat-value">{stats.totalHours}h</div>
                <div className="stat-label">Total Hours</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">✓</div>
                <div className="stat-value">{stats.pomodorosCompleted}</div>
                <div className="stat-label">Pomodoros</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🔥</div>
                <div className="stat-value">{stats.currentStreak}</div>
                <div className="stat-label">Day Streak</div>
              </div>
            </div>

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

            {renderTasks()}

            <div className="report-actions">
              <button className="export-btn" onClick={() => {
                const csv = generateCSV(pomodoroHistory);
                const dateStr = getLocalDateKey();
                downloadFile(csv, `pomodoro_history_${dateStr}.csv`, 'text/csv');
              }}>
                Export CSV
              </button>
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

      <style jsx>{`
        .report-btn {
          position: fixed;
          top: calc(env(safe-area-inset-top, 0px) + 0.75rem + 60px);
          right: calc(env(safe-area-inset-right, 0px) + 0.75rem);
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          z-index: 100;
        }

        .report-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .auth-btn {
          position: fixed;
          top: calc(env(safe-area-inset-top, 0px) + 0.75rem);
          right: calc(env(safe-area-inset-right, 0px) + 0.75rem);
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          z-index: 100;
        }

        .auth-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .auth-btn.signed-in {
          border-color: rgba(74, 222, 128, 0.6);
        }

        .auth-popover {
          position: fixed;
          top: calc(env(safe-area-inset-top, 0px) + 0.75rem + 180px);
          right: calc(env(safe-area-inset-right, 0px) + 0.75rem);
          width: min(320px, calc(100vw - 1.5rem - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px)));
          padding: 1rem;
          border-radius: 16px;
          z-index: 150;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .auth-popover-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
        }

        .auth-title {
          font-weight: 500;
          letter-spacing: 0.5px;
        }

        .auth-close {
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.8);
          font-size: 1.25rem;
          cursor: pointer;
          line-height: 1;
        }

        .auth-muted {
          color: rgba(255,255,255,0.6);
          font-size: 0.9rem;
        }

        .auth-strong {
          color: rgba(255,255,255,0.95);
          font-size: 0.95rem;
          word-break: break-word;
        }

        .auth-benefits {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 0.8rem 1rem;
          margin-bottom: 0.8rem;
        }

        .auth-benefits-title {
          font-size: 0.85rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 0.5rem;
        }

        .auth-benefits-list {
          list-style: none;
          padding: 0;
          margin: 0;
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.7);
        }

        .auth-benefits-list li {
          padding: 0.2rem 0;
        }

        .auth-fields {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .auth-fields input {
          width: 100%;
          padding: 0.7rem 0.8rem;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(0,0,0,0.25);
          color: rgba(255,255,255,0.95);
          outline: none;
        }

        .auth-fields input:focus {
          border-color: rgba(255,255,255,0.35);
        }

        .auth-actions {
          display: flex;
          gap: 0.5rem;
        }

        .auth-primary,
        .auth-secondary,
        .auth-provider {
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.95);
          padding: 0.65rem 0.8rem;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.15s ease;
          font-size: 0.9rem;
        }

        .auth-primary {
          flex: 1;
        }

        .auth-secondary {
          flex: 1;
          background: rgba(0,0,0,0.15);
        }

        .auth-primary:hover,
        .auth-secondary:hover,
        .auth-provider:hover {
          border-color: rgba(255,255,255,0.35);
          background: rgba(255,255,255,0.12);
        }

        .auth-primary:disabled,
        .auth-secondary:disabled,
        .auth-provider:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .auth-divider {
          position: relative;
          text-align: center;
          color: rgba(255,255,255,0.5);
          font-size: 0.85rem;
        }

        .auth-divider span {
          padding: 0 0.5rem;
          background: rgba(0,0,0,0);
        }

        .auth-oauth {
          display: flex;
          flex-direction: row;
          gap: 0.75rem;
          justify-content: center;
        }

        .auth-provider {
          width: 44px;
          height: 44px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .auth-provider-logo {
          width: 22px;
          height: 22px;
          object-fit: contain;
          display: block;
        }

        /* GitHub logo is often dark; invert it for dark UI. */
        .auth-provider-logo--github {
          filter: invert(1);
        }

        .auth-primary:focus-visible,
        .auth-secondary:focus-visible,
        .auth-provider:focus-visible {
          outline: 2px solid rgba(255,255,255,0.7);
          outline-offset: 2px;
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        .auth-error {
          color: rgba(255, 190, 190, 0.95);
          font-size: 0.85rem;
          border-top: 1px solid rgba(255,255,255,0.12);
          padding-top: 0.6rem;
          word-break: break-word;
        }

        .report-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
        }

        .report-modal {
          width: 95%;
          max-height: calc(100vh - 2rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
          max-width: 1200px;
          padding: clamp(1rem, 3vw, 3rem);
          border-radius: 24px;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          animation: slideIn 0.3s ease-out;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        @supports (max-height: 100dvh) {
          .report-modal {
            max-height: calc(100dvh - 2rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
          }
        }

        @media (max-width: 768px) {
          .report-modal {
            width: 100%;
            border-radius: 16px;
          }
          .report-header h2 {
            font-size: 1.8rem;
          }
          .range-btn {
            padding: 0.7rem 1rem;
          }
          .chart-container {
            min-height: 220px;
            padding: 1rem;
          }
          .chart {
            gap: 0.75rem;
          }
        }

        @keyframes slideIn {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .report-header h2 {
          font-size: 2.5rem;
          font-weight: 600;
          letter-spacing: 1px;
          margin: 0;
        }

        .close-btn {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          font-size: 2rem;
          cursor: pointer;
          transition: color 0.2s;
        }

        .close-btn:hover {
          color: #fff;
        }

        .report-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 2rem;
          text-align: center;
          transition: all 0.2s;
        }

        .stat-card:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .stat-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .stat-value {
          font-size: 2.5rem;
          font-weight: 700;
          color: #ff6b6b;
          margin-bottom: 0.5rem;
        }

        .stat-label {
          font-size: 1rem;
          color: rgba(255, 255, 255, 0.6);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .report-timerange {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }

        .range-btn {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: rgba(255, 255, 255, 0.7);
          padding: 0.8rem 2rem;
          border-radius: 24px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 1rem;
          font-weight: 500;
        }

        .range-btn:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .range-btn.active {
          background: #fff;
          color: #000;
          border-color: #fff;
        }

        .chart-container {
          flex: 1;
          padding: 2rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 300px;
        }

        .chart {
          display: flex;
          align-items: flex-end;
          gap: 1.5rem;
          height: 280px;
          width: 100%;
          justify-content: space-around;
        }

        .chart-bar-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.8rem;
          flex: 1;
        }

        .chart-bar-label {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.6);
          text-align: center;
          font-weight: 500;
        }

        .chart-bar-container {
          height: 200px;
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          overflow: hidden;
        }

        .chart-bar {
          width: 80%;
          background: linear-gradient(180deg, rgba(255, 107, 107, 0.9), rgba(255, 107, 107, 0.6));
          border-radius: 8px 8px 0 0;
          transition: all 0.2s;
          min-height: 3px;
        }

        .chart-bar:hover {
          background: linear-gradient(180deg, rgba(255, 107, 107, 1), rgba(255, 107, 107, 0.8));
          filter: drop-shadow(0 0 12px rgba(255, 107, 107, 0.5));
        }

        .chart-bar-value {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.7);
          font-weight: 600;
        }

        .export-btn {
          flex: 1;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: rgba(255, 255, 255, 0.9);
          padding: 1rem 2rem;
          border-radius: 12px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          transition: all 0.2s;
        }

        .export-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .reset-btn {
          flex: 1;
          background: rgba(255, 107, 107, 0.2);
          border: 1px solid rgba(255, 107, 107, 0.3);
          color: #ff6b6b;
          padding: 1rem 2rem;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          font-size: 1rem;
          transition: all 0.2s;
        }

        .reset-btn:hover {
          background: rgba(255, 107, 107, 0.3);
          border-color: rgba(255, 107, 107, 0.5);
        }

        .report-actions {
          display: flex;
          gap: 1rem;
          width: 100%;
        }

        .test-btn {
          width: 48%;
          background: rgba(107, 180, 255, 0.2);
          border: 1px solid rgba(107, 180, 255, 0.3);
          color: #6bb4ff;
          padding: 1rem 2rem;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          font-size: 1rem;
          transition: all 0.2s;
        }

        .test-btn:hover {
          background: rgba(107, 180, 255, 0.3);
          border-color: rgba(107, 180, 255, 0.5);
        }

          .chart-bar.selected {
             background: linear-gradient(180deg, #ff6b6b, #ff8787);
             box-shadow: 0 0 15px rgba(255, 107, 107, 0.6);
          }

          .daily-tasks-section {
              background: rgba(255, 255, 255, 0.03);
              border-radius: 12px;
              padding: 1.5rem;
              animation: fadeIn 0.3s ease;
          }
          
          @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
          }

          .daily-tasks-section h3 {
              font-size: 0.95rem;
              font-weight: 500;
              margin-top: 0;
              margin-bottom: 1rem;
              color: var(--text-secondary);
          }

          .no-tasks {
              color: rgba(255,255,255,0.4);
              font-style: italic;
              text-align: center;
              padding: 1rem;
          }

          .completed-task-list {
              list-style: none;
              padding: 0;
              margin: 0;
              display: flex;
              flex-direction: column;
              gap: 0.8rem;
          }

          .completed-task-item {
              display: flex;
              align-items: center;
              gap: 1rem;
              padding: 0.8rem;
              background: rgba(0,0,0,0.2);
              border-radius: 8px;
              border-left: 3px solid var(--accent-color);
          }

          .check-icon {
              color: #4ade80;
              font-weight: bold;
          }

          .task-text {
              flex: 1;
              color: rgba(255,255,255,0.9);
          }

          .task-time {
              font-size: 0.8rem;
              color: rgba(255,255,255,0.4);
          }

        @media (max-width: 768px) {
          .report-modal {
            width: 98%;
            height: 95vh;
            padding: 1.5rem;
            gap: 1.5rem;
          }

          .report-header h2 {
            font-size: 1.8rem;
          }

          .report-cards {
            grid-template-columns: 1fr;
          }

          .chart {
            height: 200px;
          }

          .chart-bar-container {
            height: 150px;
          }
        }
      `}</style>
    </>
  );
};

export default Report;
