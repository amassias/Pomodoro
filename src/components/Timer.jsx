import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ALARM_SOUNDS, TICKING_SOUNDS } from '../utils/sounds';

const DEFAULT_DURATIONS = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
};

const coercePositiveInt = (value, fallback) => {
  const n = Number(value);
  if (Number.isInteger(n) && n > 0) return n;
  return fallback;
};

const getModeMinutes = (mode, settings) => {
  if (mode === 'focus') return coercePositiveInt(settings.focusDuration, DEFAULT_DURATIONS.focus);
  if (mode === 'shortBreak') return coercePositiveInt(settings.shortBreakDuration, DEFAULT_DURATIONS.shortBreak);
  if (mode === 'longBreak') return coercePositiveInt(settings.longBreakDuration, DEFAULT_DURATIONS.longBreak);
  return DEFAULT_DURATIONS.focus;
};

const Timer = ({ settings }) => {
  const [minutes, setMinutes] = useState(() => getModeMinutes('focus', settings));
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState('focus'); // focus, shortBreak, longBreak
  const [pomodorosCompleted, setPomodorosCompleted] = useState(0);

  const tickingAudioRef = useRef(null);
  const modeRef = useRef(mode);
  const settingsRef = useRef(settings);
  
  // Timestamp-based timing to prevent drift in background tabs
  const endAtRef = useRef(null);
  const remainingMsRef = useRef(getModeMinutes('focus', settings) * 60 * 1000);

  // Keep refs in sync with state/props
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Stable click sound callback
  const playClickSound = useCallback(() => {
    // Create a simple click sound using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800; // Frequency in Hz
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  }, []);

  // Stable toggle callback using functional update to avoid stale isActive
  const toggleTimer = useCallback(() => {
    playClickSound();
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
    if (!isActive) {
      const mins = getModeMinutes(mode, settings);
      remainingMsRef.current = mins * 60 * 1000;
      setMinutes(mins);
      setSeconds(0);
    }
  }, [settings, mode]); // isActive excluded to avoid reset during countdown if settings panel is opened

  // Helper to handle timer completion
  const handleTimerComplete = useCallback(() => {
    const currentSettings = settingsRef.current;
    
    // Play alarm sound with repeat
    const playAlarm = (times = 1, { fallback } = {}) => {
      if (times <= 0) return;
      const resolvedUrl = ALARM_SOUNDS[currentSettings.sound] || ALARM_SOUNDS.bell;
      const audio = new Audio(resolvedUrl);
      audio.volume = (currentSettings.alarmVolume || 70) / 100;
      audio.onended = () => {
        if (times > 1) {
          setTimeout(() => playAlarm(times - 1), 200);
        }
      };
      audio.play().catch(e => {
        const fallbackUrl = fallback || ALARM_SOUNDS.bell;
        if (fallbackUrl && fallbackUrl !== resolvedUrl) {
          const retry = new Audio(fallbackUrl);
          retry.volume = (currentSettings.alarmVolume || 70) / 100;
          retry.onended = audio.onended;
          retry.play().catch(err => console.log('Audio play failed', err));
          return;
        }
        console.log('Audio play failed', e);
      });
    };

    playAlarm(currentSettings.alarmRepeat || 3);

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
        setPomodorosCompleted(prev => {
          const newCompleted = prev + 1;
          const nextMode = newCompleted % 4 === 0 ? 'longBreak' : 'shortBreak';
          const nextMins = getModeMinutes(nextMode, latestSettings);
          
          setMode(nextMode);
          remainingMsRef.current = nextMins * 60 * 1000;
          setMinutes(nextMins);
          setSeconds(0);
          
          if (latestSettings.autoStartBreaks) {
            endAtRef.current = Date.now() + remainingMsRef.current;
            setIsActive(true);
          }
          
          return newCompleted;
        });
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
            if (!tickingAudioRef.current || tickingAudioRef.current.src !== soundUrl) {
              tickingAudioRef.current = new Audio(soundUrl);
            }
            tickingAudioRef.current.currentTime = 0;
            tickingAudioRef.current.volume = ((currentSettings.tickingVolume || 50) / 100) * 0.3;
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
  };

  return (
    <div className="timer-container glass-panel">
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

      <div className="time-display">
        {String(Math.max(0, Number(minutes) || 0)).padStart(2, '0')}:{String(Math.max(0, Number(seconds) || 0)).padStart(2, '0')}
      </div>

      <div className="timer-controls">
        <button className="primary-btn" onClick={toggleTimer}>
          {isActive ? 'PAUSE' : 'START'}
        </button>
        <button className="reset-btn" onClick={resetTimer}>
          RESET
        </button>
      </div>

      <style jsx>{`
        .timer-container {
          padding: 3rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2rem;
          min-width: 320px;
        }
        .timer-modes {
          display: flex;
          gap: 1rem;
          background: rgba(0,0,0,0.2);
          padding: 0.5rem;
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
        .time-display {
          font-size: 6rem;
          font-weight: 200;
          line-height: 1;
          font-variant-numeric: tabular-nums;
        }
        .timer-controls {
          display: flex;
          gap: 1.5rem;
          align-items: center;
        }
        .primary-btn {
          background: #fff;
          color: #000;
          padding: 1rem 3rem;
          border-radius: 99px;
          font-weight: 600;
          letter-spacing: 2px;
          font-size: 1rem;
        }
        .primary-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 0 20px rgba(255,255,255,0.4);
        }
        .reset-btn {
          background: transparent;
          color: rgba(255, 255, 255, 0.5);
          padding: 0 1rem;
          border: none;
          font-weight: 600;
          letter-spacing: 2px;
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
