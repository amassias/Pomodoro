import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ALARM_SOUNDS, TICKING_SOUNDS } from '../../lib/sounds';
import { requestNotificationPermission, showNotification } from '../../lib/notifications';
import { getModeMinutes } from '../../lib/timer';
import { clearTimerSession, readTimerSession, writeTimerSession } from '../../lib/timerSession';

const Timer = ({ settings, updateSettings }) => {
  const [initialSession] = useState(() => readTimerSession());
  const initialRemainingMs = initialSession?.remainingMs ?? getModeMinutes('focus', settings) * 60 * 1000;
  const initialTotalSeconds = Math.ceil(initialRemainingMs / 1000);
  const [minutes, setMinutes] = useState(() => Math.floor(initialTotalSeconds / 60));
  const [seconds, setSeconds] = useState(() => initialTotalSeconds % 60);
  const [isActive, setIsActive] = useState(() => initialSession?.isActive ?? false);
  const [mode, setMode] = useState(() => initialSession?.mode ?? 'focus');
  const pomodorosCompletedRef = useRef(0);

  const tickingAudioRef = useRef(null);
  const modeRef = useRef(mode);
  const settingsRef = useRef(settings);
  
  // Timestamp-based timing to prevent drift in background tabs
  const endAtRef = useRef(initialSession?.endAt ?? null);
  const remainingMsRef = useRef(initialRemainingMs);
  const restoredSessionRef = useRef(Boolean(initialSession));

  // Keep refs in sync with state/props
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Reuse a single AudioContext to avoid hitting browser limits
  const audioContextRef = useRef(null);

  // Stable click sound callback
  const playClickSound = useCallback(() => {
    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const audioContext = audioContextRef.current;
      // Resume if suspended (e.g. after browser auto-suspend)
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch {
      // Silently fail — click sound is non-critical
    }
  }, []);

  // Request notification permission on first interaction
  const notifPermissionRequested = useRef(false);

  // Stable toggle callback using functional update to avoid stale isActive
  const toggleTimer = useCallback(() => {
    playClickSound();
    // Ask for notification permission once on first start
    if (!notifPermissionRequested.current) {
      notifPermissionRequested.current = true;
      requestNotificationPermission();
    }
    setIsActive(prev => {
      if (!prev) {
        // Starting: set end time based on remaining time
        endAtRef.current = Date.now() + remainingMsRef.current;
      } else {
        // Pausing: save remaining time
        remainingMsRef.current = Math.max(0, endAtRef.current - Date.now());
        endAtRef.current = null;
      }
      return !prev;
    });
  }, [playClickSound]);

  // Stable reset callback using refs to access current mode/settings
  const resetTimer = useCallback(() => {
    setIsActive(false);
    const mins = getModeMinutes(modeRef.current, settingsRef.current);
    remainingMsRef.current = mins * 60 * 1000;
    endAtRef.current = null;
    setMinutes(mins);
    setSeconds(0);
    clearTimerSession();
  }, []);

  useEffect(() => {
    window.addEventListener('timer-toggle', toggleTimer);
    window.addEventListener('timer-reset', resetTimer);

    return () => {
      window.removeEventListener('timer-toggle', toggleTimer);
      window.removeEventListener('timer-reset', resetTimer);
    };
  }, [toggleTimer, resetTimer]);

  useEffect(() => {
    // Sync time when settings or mode change IF not active to prevent jumping
    if (isActive) return;
    if (restoredSessionRef.current) {
      restoredSessionRef.current = false;
      return;
    }
    const mins = getModeMinutes(mode, settings);
    remainingMsRef.current = mins * 60 * 1000;

    const timeoutId = setTimeout(() => {
      setMinutes(mins);
      setSeconds(0);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [settings, mode, isActive]);

  useEffect(() => {
    writeTimerSession({
      mode,
      isActive,
      endAt: endAtRef.current,
      remainingMs: remainingMsRef.current,
    });
  }, [mode, isActive, minutes, seconds]);

  // Helper to handle timer completion
  const handleTimerComplete = useCallback(() => {
    const currentSettings = settingsRef.current;
    
    // Play alarm sound with repeat
    const playAlarm = (times = 1, { fallback } = {}) => {
      if (times <= 0) return;
      const resolvedUrl = ALARM_SOUNDS[currentSettings.sound] || ALARM_SOUNDS.bell;
      const audio = new Audio(resolvedUrl);
      audio.volume = (currentSettings.alarmVolume ?? 70) / 100;
      audio.onended = () => {
        if (times > 1) {
          setTimeout(() => playAlarm(times - 1), 200);
        }
      };
      audio.play().catch(e => {
        const fallbackUrl = fallback || ALARM_SOUNDS.bell;
        if (fallbackUrl && fallbackUrl !== resolvedUrl) {
          const retry = new Audio(fallbackUrl);
          retry.volume = (currentSettings.alarmVolume ?? 70) / 100;
          retry.onended = audio.onended;
          retry.play().catch(err => console.log('Audio play failed', err));
          return;
        }
        console.log('Audio play failed', e);
      });
    };

    playAlarm(currentSettings.alarmRepeat ?? 3);

    // Browser notification (especially useful when tab is in background)
    if (modeRef.current === 'focus') {
      showNotification('Focus session complete! 🎯', {
        body: 'Great work! Time for a break.',
        tag: 'pomodoro-timer',
      });
    } else {
      showNotification('Break is over! ⏱️', {
        body: 'Ready to focus again?',
        tag: 'pomodoro-timer',
      });
    }

    // Emit pomodoro completion event
    if (modeRef.current === 'focus') {
      window.dispatchEvent(new CustomEvent('pomodoroCompleted', {
        detail: { duration: currentSettings.focusDuration }
      }));
    }

    // Auto start next timer after 1 second
    setTimeout(() => {
      const currentMode = modeRef.current;
      const latestSettings = settingsRef.current;
      
      if (currentMode === 'focus') {
        pomodorosCompletedRef.current += 1;
        const nextMode = pomodorosCompletedRef.current % 4 === 0 ? 'longBreak' : 'shortBreak';
        const nextMins = getModeMinutes(nextMode, latestSettings);

        setMode(nextMode);
        remainingMsRef.current = nextMins * 60 * 1000;
        setMinutes(nextMins);
        setSeconds(0);

        if (latestSettings.autoStartBreaks) {
          endAtRef.current = Date.now() + remainingMsRef.current;
          setIsActive(true);
        }
      } else {
        const nextMins = getModeMinutes('focus', latestSettings);
        setMode('focus');
        remainingMsRef.current = nextMins * 60 * 1000;
        setMinutes(nextMins);
        setSeconds(0);
        
        if (latestSettings.autoStartPomodoros) {
          endAtRef.current = Date.now() + remainingMsRef.current;
          setIsActive(true);
        }
      }
    }, 1000);
  }, []);

  // Track previous second for ticking sound
  const prevSecondRef = useRef(-1);

  useEffect(() => {
    if (!isActive) {
      document.title = 'Pomodoro Focus';
      prevSecondRef.current = -1;
      return;
    }

    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, endAtRef.current - now);
      remainingMsRef.current = remaining;
      
      const totalSeconds = Math.ceil(remaining / 1000);
      const displayMinutes = Math.floor(totalSeconds / 60);
      const displaySeconds = totalSeconds % 60;
      
      setMinutes(displayMinutes);
      setSeconds(displaySeconds);
      
      // Update document title
      const timeString = `${String(displayMinutes).padStart(2, '0')}:${String(displaySeconds).padStart(2, '0')}`;
      const modeString = modeRef.current === 'focus' ? 'Focus' : 'Break';
      document.title = `${timeString} - ${modeString}`;
      
      // Play ticking sound if enabled (only when second changes)
      const currentSettings = settingsRef.current;
      if (displaySeconds !== prevSecondRef.current && remaining > 0) {
        prevSecondRef.current = displaySeconds;
        if (currentSettings.tickingSound && currentSettings.tickingSound !== 'none') {
          const soundUrl = TICKING_SOUNDS[currentSettings.tickingSound];
          if (soundUrl) {
            if (!tickingAudioRef.current || tickingAudioRef.current._soundKey !== currentSettings.tickingSound) {
              tickingAudioRef.current = new Audio(soundUrl);
              tickingAudioRef.current._soundKey = currentSettings.tickingSound;
            }
            tickingAudioRef.current.currentTime = 0;
            tickingAudioRef.current.volume = ((currentSettings.tickingVolume ?? 50) / 100) * 0.3;
            tickingAudioRef.current.play().catch(e => console.log('Tick sound failed', e));
          }
        }
      }
      
      // Timer completed
      if (remaining <= 0) {
        setIsActive(false);
        endAtRef.current = null;
        setMinutes(0);
        setSeconds(0);
        handleTimerComplete();
      }
    };

    // Run immediately, then every 100ms for accuracy
    tick();
    const interval = setInterval(tick, 100);

    return () => clearInterval(interval);
  }, [isActive, handleTimerComplete]);



  const setTimerMode = (newMode) => {
    setMode(newMode);
    setIsActive(false);
    const mins = getModeMinutes(newMode, settings);
    remainingMsRef.current = mins * 60 * 1000;
    endAtRef.current = null;
    setMinutes(mins);
    setSeconds(0);
    clearTimerSession();
  };

  const applyPreset = (focusDuration, shortBreakDuration, longBreakDuration) => {
    updateSettings(prev => ({ ...prev, focusDuration, shortBreakDuration, longBreakDuration }));
    setMode('focus');
    setIsActive(false);
    remainingMsRef.current = focusDuration * 60 * 1000;
    setMinutes(focusDuration);
    setSeconds(0);
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      // Fullscreen can be unavailable in embedded browsers.
    }
  };

  return (
    <div className="timer-container glass-panel">
      <div className="timer-heading">
        <span className={`status-dot ${isActive ? 'active' : ''}`}></span>
        <span>{isActive ? 'Focus in progress' : 'Ready when you are'}</span>
      </div>
      <div className="timer-modes">
        <button
          className={mode === 'focus' ? 'active' : ''}
          onClick={() => setTimerMode('focus')}
        >
          Focus
        </button>
        <button
          className={mode === 'shortBreak' ? 'active' : ''}
          onClick={() => setTimerMode('shortBreak')}
        >
          Short
        </button>
        <button
          className={mode === 'longBreak' ? 'active' : ''}
          onClick={() => setTimerMode('longBreak')}
        >
          Long
        </button>
      </div>
      <div className="timer-tools" aria-label="Focus presets">
        <button onClick={() => applyPreset(25, 5, 15)}>Classic</button>
        <button onClick={() => applyPreset(50, 10, 20)}>Deep 50</button>
        <button onClick={() => applyPreset(90, 15, 30)}>Flow 90</button>
        <button onClick={toggleFullscreen}>Full screen</button>
      </div>

      <div className="time-display">
        {String(Math.max(0, Number(minutes) || 0)).padStart(2, '0')}:{String(Math.max(0, Number(seconds) || 0)).padStart(2, '0')}
      </div>
      <p className="timer-caption">{mode === 'focus' ? 'Protect this time. One thing at a time.' : 'Step away and let your attention reset.'}</p>

      <div className="timer-controls">
        <button className="primary-btn" onClick={toggleTimer}>
          {isActive ? 'Pause session' : 'Start focus'}
        </button>
        <button className="reset-btn" onClick={resetTimer}>
          Reset
        </button>
      </div>

      <style>{`
        .timer-container {
          padding: clamp(1.5rem, 4vw, 2.5rem);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.4rem;
          min-width: 0;
          justify-content: center;
          background: linear-gradient(145deg, rgba(17,20,24,0.84), rgba(8,10,12,0.72));
        }
        .timer-heading { display: flex; align-items: center; gap: 0.5rem; color: var(--text-secondary); font-size: 0.72rem; letter-spacing: 0.04em; }
        .status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--text-muted); }
        .status-dot.active { background: var(--success-color); box-shadow: 0 0 12px var(--success-color); }
        .timer-caption { margin: -0.6rem 0 0; color: var(--text-muted); font-size: 0.78rem; text-align: center; }
        .timer-modes {
          display: flex;
          gap: 1rem;
          background: rgba(255,255,255,0.045);
          padding: 0.35rem;
          border-radius: 99px;
        }
        .timer-modes button {
          background: transparent;
          color: var(--text-secondary);
          padding: 0.5rem 1rem;
          border-radius: 99px;
          font-size: 0.9rem;
          font-weight: 500;
        }
        .timer-modes button.active {
          background: rgba(255,255,255,0.1);
          color: #fff;
          font-weight: 600;
        }
        .timer-tools { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.35rem; margin-top: -0.65rem; }
        .timer-tools button { padding: 0.35rem 0.55rem; border-radius: 999px; background: transparent; color: var(--text-muted); font-size: 0.66rem; border: 1px solid rgba(255,255,255,0.08); }
        .timer-tools button:hover { color: #fff; border-color: rgba(255,255,255,0.2); }
        .time-display {
          font-size: clamp(4.5rem, 9vw, 7rem);
          font-weight: 300;
          letter-spacing: -0.065em;
          line-height: 1;
          font-variant-numeric: tabular-nums;
        }
        .timer-controls {
          display: flex;
          gap: 1.5rem;
          align-items: center;
        }
        .primary-btn {
          background: var(--accent-color);
          color: #1a0807;
          padding: 0.95rem 2rem;
          border-radius: 99px;
          font-weight: 600;
          letter-spacing: 0.01em;
          font-size: 1rem;
        }
        .primary-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 12px 30px rgba(255,113,107,0.24);
        }
        .reset-btn {
          background: transparent;
          color: rgba(255, 255, 255, 0.5);
          padding: 0 1rem;
          border: none;
          font-weight: 600;
          letter-spacing: 0.02em;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .reset-btn:hover {
          color: #fff;
          transform: translateY(-1px);
        }

        @media (max-width: 768px) {
          .timer-container {
            width: 100%;
            min-width: 0;
            padding: 1.5rem;
            gap: 1.25rem;
          }
          .time-display {
            font-size: clamp(3.25rem, 14vw, 5rem);
          }
          
          @media (max-width: 380px) {
            .time-display {
                font-size: 3.5rem; /* Ensure it fits on very small devices like SE */
            }
          }
          .timer-controls {
            width: 100%;
            gap: 0.75rem;
          }
          .primary-btn {
            flex: 1;
            padding: 0.9rem 1rem;
            letter-spacing: 1px;
          }
        }

        @media (max-width: 420px) {
          .timer-controls {
            flex-direction: column;
            align-items: stretch;
          }
          .primary-btn {
            width: 100%;
          }
          .reset-btn {
            padding: 0.75rem 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Timer;
