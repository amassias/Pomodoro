import React, { useState, useEffect } from 'react';

const Timer = ({ settings }) => {
    const [minutes, setMinutes] = useState(settings.focusDuration);
    const [seconds, setSeconds] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [mode, setMode] = useState('focus'); // focus, shortBreak, longBreak

    // Sound mapping (using online URLs for demo purposes)
    const sounds = {
        beep: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
        bell: 'https://cdn.freesound.org/previews/221/221683_1079366-lq.mp3', // Simple bell sound (placeholder)
        alarm: 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg',
        'lofi-hum': 'https://actions.google.com/sounds/v1/ambiences/humming_fan.ogg'
    };

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
                        const audio = new Audio(sounds[settings.sound] || sounds.beep);
                        audio.play().catch(e => console.log('Audio play failed', e));
                        
                        // Emit pomodoro completion event
                        if (mode === 'focus') {
                            window.dispatchEvent(new CustomEvent('pomodoroCompleted', {
                                detail: { duration: settings.focusDuration }
                            }));
                        }
                    } else {
                        setMinutes(minutes - 1);
                        setSeconds(59);
                    }
                } else {
                    setSeconds(seconds - 1);
                }
            }, 1000);
        } else if (!isActive && seconds !== 0) {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isActive, seconds, minutes, settings.sound, settings.focusDuration, mode]);

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
                <button className="reset-btn" onClick={resetTimer} title="Reset">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74-2.74L3 12" /></svg>
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
          color: var(--text-secondary);
          padding: 0.8rem;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .reset-btn:hover {
          background: rgba(255,255,255,0.1);
          color: #fff;
        }
      `}</style>
        </div>
    );
};

export default Timer;
