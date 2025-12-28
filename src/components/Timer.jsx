import React, { useState, useEffect, useRef } from 'react';
import { ALARM_SOUNDS, TICKING_SOUNDS } from '../utils/sounds';

const Timer = ({ settings }) => {
  const [minutes, setMinutes] = useState(settings.focusDuration);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState('focus'); // focus, shortBreak, longBreak
  const [pomodorosCompleted, setPomodorosCompleted] = useState(0);

  const tickingAudioRef = useRef(null);

  useEffect(() => {
    const handleToggle = () => toggleTimer();
    const handleReset = () => resetTimer();

    window.addEventListener('timer-toggle', handleToggle);
    window.addEventListener('timer-reset', handleReset);

    return () => {
      window.removeEventListener('timer-toggle', handleToggle);
      window.removeEventListener('timer-reset', handleReset);
    };
  }, [isActive, mode, minutes, seconds]); // Dependencies needed if toggle/reset use state closures? 
  // toggleTimer uses setIsActive(!isActive), so it needs isActive dependency or functional update.
  // Let's check toggleTimer definition.

  useEffect(() => {
    // Sync time when settings or mode change IF not active to prevent jumping
    if (!isActive) {
      if (mode === 'focus') setMinutes(settings.focusDuration);
      else if (mode === 'shortBreak') setMinutes(settings.shortBreakDuration);
      else if (mode === 'longBreak') setMinutes(settings.longBreakDuration);
      setSeconds(0);
    }
  }, [settings, mode]); // isActive excluded to avoid reset during countdown if settings panel is opened

  useEffect(() => {
    let interval = null;
    if (isActive) {
      interval = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            clearInterval(interval);
            setIsActive(false);

            // Play alarm sound with repeat
            // Play alarm sound with repeat
            const playAlarm = (times = 1) => {
              if (times <= 0) return;
              const audio = new Audio(ALARM_SOUNDS[settings.sound] || ALARM_SOUNDS.beep);
              audio.volume = (settings.alarmVolume || 70) / 100; // Convert to 0-1 range
              audio.onended = () => {
                if (times > 1) {
                  setTimeout(() => playAlarm(times - 1), 500); // Repeat with 500ms delay
                }
              };
              audio.play().catch(e => console.log('Audio play failed', e));
            };

            playAlarm(settings.alarmRepeat || 1);

            // Emit pomodoro completion event
            if (mode === 'focus') {
              window.dispatchEvent(new CustomEvent('pomodoroCompleted', {
                detail: { duration: settings.focusDuration }
              }));
            }

            // Auto start next timer
            setTimeout(() => {
              if (mode === 'focus') {
                const newCompleted = pomodorosCompleted + 1;
                setPomodorosCompleted(newCompleted);

                if (newCompleted % 4 === 0) {
                  setMode('longBreak');
                  setMinutes(settings.longBreakDuration);
                  setSeconds(0);
                  if (settings.autoStartBreaks) setIsActive(true);
                } else {
                  setMode('shortBreak');
                  setMinutes(settings.shortBreakDuration);
                  setSeconds(0);
                  if (settings.autoStartBreaks) setIsActive(true);
                }
              } else if (mode === 'shortBreak' || mode === 'longBreak') {
                setMode('focus');
                setMinutes(settings.focusDuration);
                setSeconds(0);
                if (settings.autoStartPomodoros) setIsActive(true);
              }
            }, 1000);
          } else {
            setMinutes(minutes - 1);
            setSeconds(59);
          }
        } else {
          setSeconds(seconds - 1);

          // Play ticking sound if enabled
          // Play ticking sound if enabled
          if (settings.tickingSound && settings.tickingSound !== 'none') {
            const soundUrl = TICKING_SOUNDS[settings.tickingSound];
            if (soundUrl) {
              if (!tickingAudioRef.current || tickingAudioRef.current.src !== soundUrl) {
                tickingAudioRef.current = new Audio(soundUrl);
              }

              // Reset and play
              tickingAudioRef.current.currentTime = 0;
              tickingAudioRef.current.volume = ((settings.tickingVolume || 50) / 100) * 0.3; // Reduce volume to 30% of set volume
              tickingAudioRef.current.play().catch(e => console.log('Tick sound failed', e));
            }
          }
        }
      }, 1000);
    } else if (!isActive && seconds !== 0) {
      clearInterval(interval);
      document.title = 'Pomodoro Focus';
    }

    // Update Title
    if (isActive) {
      const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      const modeString = mode === 'focus' ? 'Focus' : 'Break';
      document.title = `${timeString} - ${modeString}`;
    }

    return () => clearInterval(interval);
  }, [isActive, seconds, minutes, settings, mode]);

  const playClickSound = () => {
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
  };

  const toggleTimer = () => {
    playClickSound();
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    if (mode === 'focus') setMinutes(settings.focusDuration);
    else if (mode === 'shortBreak') setMinutes(settings.shortBreakDuration);
    else if (mode === 'longBreak') setMinutes(settings.longBreakDuration);
    setSeconds(0);
  };

  const setTimerMode = (newMode) => {
    setMode(newMode);
    setIsActive(false);
    setSeconds(0);
    if (newMode === 'focus') setMinutes(settings.focusDuration);
    else if (newMode === 'shortBreak') setMinutes(settings.shortBreakDuration);
    else if (newMode === 'longBreak') setMinutes(settings.longBreakDuration);
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
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
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
