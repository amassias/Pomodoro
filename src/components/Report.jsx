import React, { useState, useEffect } from 'react';

const Report = ({ onPomodoroComplete }) => {
  const [showReport, setShowReport] = useState(false);
  const [stats, setStats] = useState({
    totalHours: 0,
    pomodorosCompleted: 0,
    currentStreak: 0,
    weeklyData: []
  });
  const [timeRange, setTimeRange] = useState('week'); // week, month, year

  // Load stats from localStorage
  useEffect(() => {
    loadStats();
  }, []);

  // Listen for pomodoro completions
  useEffect(() => {
    if (onPomodoroComplete) {
      window.addEventListener('pomodoroCompleted', handlePomodoroComplete);
      return () => window.removeEventListener('pomodoroCompleted', handlePomodoroComplete);
    }
  }, []);

  const handlePomodoroComplete = (event) => {
    const { duration } = event.detail;
    savePomodoroData(duration);
    loadStats();
  };

  const savePomodoroData = (durationMinutes) => {
    const today = new Date().toISOString().split('T')[0];
    const history = JSON.parse(localStorage.getItem('pomodoroHistory') || '{}');
    
    if (!history[today]) {
      history[today] = [];
    }
    
    history[today].push({
      duration: durationMinutes,
      timestamp: new Date().toISOString(),
      completed: true
    });
    
    localStorage.setItem('pomodoroHistory', JSON.stringify(history));
  };

  const addTestData = () => {
    // Add test data for the last 7 days
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const history = JSON.parse(localStorage.getItem('pomodoroHistory') || '{}');
      if (!history[dateStr]) {
        history[dateStr] = [];
      }
      
      // Add random pomodoros
      const count = Math.floor(Math.random() * 4) + 1;
      for (let j = 0; j < count; j++) {
        history[dateStr].push({
          duration: 25,
          timestamp: new Date().toISOString(),
          completed: true
        });
      }
      
      localStorage.setItem('pomodoroHistory', JSON.stringify(history));
    }
    
    loadStats();
    console.log('Test data added!');
  };

  const loadStats = () => {
    const history = JSON.parse(localStorage.getItem('pomodoroHistory') || '{}');
    
    let totalMinutes = 0;
    let totalPomodoros = 0;
    let weeklyData = {};
    let currentStreak = 0;

    // Calculate totals
    Object.entries(history).forEach(([date, sessions]) => {
      const dayMinutes = sessions.reduce((sum, s) => sum + (s.duration || 25), 0);
      totalMinutes += dayMinutes;
      totalPomodoros += sessions.length;
      
      // Weekly data
      const dateObj = new Date(date);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = dateObj.getDate();
      weeklyData[`${dayName} ${dayNum}`] = dayMinutes / 60;
    });

    // Calculate streak
    const today = new Date();
    for (let i = 0; i < 100; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
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
      weeklyData
    });
  };

  const getChartData = () => {
    const today = new Date();
    const data = {};

    if (timeRange === 'week') {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dayNum = date.getDate();
        const key = `${dayName} ${dayNum}`;
        data[`${dayName}, ${dayNum}/${String(date.getMonth() + 1).padStart(2, '0')}`] = stats.weeklyData[key] || 0;
      }
    }

    return data;
  };

  const maxHours = Math.max(...Object.values(getChartData()), 1);
  const chartData = getChartData();

  return (
    <>
      <button 
        className="report-btn"
        onClick={() => setShowReport(true)}
        title="View statistics"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      </button>

      {showReport && (
        <div className="report-modal-overlay" onClick={() => setShowReport(false)}>
          <div className="report-modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="report-header">
              <h2>Report</h2>
              <button className="close-btn" onClick={() => setShowReport(false)}>✕</button>
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
                {Object.entries(chartData).map(([day, hours]) => (
                  <div key={day} className="chart-bar-wrapper">
                    <div className="chart-bar-label">{day}</div>
                    <div className="chart-bar-container">
                      <div 
                        className="chart-bar"
                        style={{ height: `${(hours / maxHours) * 120}px` }}
                        title={`${hours.toFixed(1)}h`}
                      />
                    </div>
                    <div className="chart-bar-value">{hours.toFixed(1)}h</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="report-actions">
              <button className="reset-btn" onClick={() => {
                if (confirm('Reset all data?')) {
                  localStorage.removeItem('pomodoroHistory');
                  loadStats();
                }
              }}>
                Reset Data
              </button>
              <button className="test-btn" onClick={addTestData}>
                Add Test Data (7 days)
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .report-btn {
          position: fixed;
          top: 2rem;
          right: 2rem;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          width: 40px;
          height: 40px;
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
          height: 90vh;
          max-width: 1200px;
          padding: 3rem;
          border-radius: 24px;
          overflow-y: auto;
          animation: slideIn 0.3s ease-out;
          display: flex;
          flex-direction: column;
          gap: 2rem;
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

        .reset-btn {
          width: 48%;
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
