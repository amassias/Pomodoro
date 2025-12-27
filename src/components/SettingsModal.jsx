import React from 'react';
import { ALARM_SOUNDS, TICKING_SOUNDS } from '../utils/sounds';

const SettingsModal = ({ settings, updateSettings, onClose }) => {
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? checked : (name.includes('Volume') || name.includes('Repeat') ? Number(value) : value);

        updateSettings({
            ...settings,
            [name]: newValue
        });

        // Play preview for sound selection
        if (name === 'sound' && ALARM_SOUNDS[newValue]) {
            const audio = new Audio(ALARM_SOUNDS[newValue]);
            audio.volume = (settings.alarmVolume || 70) / 100;
            audio.play().catch(e => console.log('Preview failed', e));
        } else if (name === 'tickingSound' && TICKING_SOUNDS[newValue]) {
            const audio = new Audio(TICKING_SOUNDS[newValue]);
            audio.volume = ((settings.tickingVolume || 50) / 100) * 0.3; // Match timer volume logic
            audio.play().catch(e => console.log('Preview failed', e));
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content glass-panel">
                <div className="modal-header">
                    <h2>Settings</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="setting-group">
                    <h3>Auto Start</h3>
                    <div className="toggle-group">
                        <label className="toggle-label">
                            <input
                                type="checkbox"
                                name="autoStartBreaks"
                                checked={settings.autoStartBreaks || false}
                                onChange={handleChange}
                            />
                            <span>Auto Start Breaks</span>
                        </label>
                    </div>
                    <div className="toggle-group">
                        <label className="toggle-label">
                            <input
                                type="checkbox"
                                name="autoStartPomodoros"
                                checked={settings.autoStartPomodoros || false}
                                onChange={handleChange}
                            />
                            <span>Auto Start Pomodoros</span>
                        </label>
                    </div>
                </div>

                <div className="setting-group">
                    <h3>Timer (minutes)</h3>
                    <div className="inputs-row">
                        <div className="input-wrapper">
                            <label>Focus</label>
                            <input
                                type="number"
                                name="focusDuration"
                                value={settings.focusDuration}
                                onChange={handleChange}
                                min="1"
                            />
                        </div>
                        <div className="input-wrapper">
                            <label>Short Break</label>
                            <input
                                type="number"
                                name="shortBreakDuration"
                                value={settings.shortBreakDuration}
                                onChange={handleChange}
                                min="1"
                            />
                        </div>
                        <div className="input-wrapper">
                            <label>Long Break</label>
                            <input
                                type="number"
                                name="longBreakDuration"
                                value={settings.longBreakDuration}
                                onChange={handleChange}
                                min="1"
                            />
                        </div>
                    </div>
                </div>

                <div className="setting-group">
                    <h3>Sound</h3>

                    <div className="sound-section">
                        <label>Alarm Sound</label>
                        <select
                            name="sound"
                            value={settings.sound || 'bell'}
                            onChange={handleChange}
                            className="sound-select"
                        >
                            <option value="beep">Digital Beep</option>
                            <option value="bell">Bell</option>
                            <option value="alarm">Classic Alarm</option>
                            <option value="lofi-hum">Soft Hum</option>
                        </select>

                        <div className="slider-group">
                            <label>Volume</label>
                            <input
                                type="range"
                                name="alarmVolume"
                                value={settings.alarmVolume || 70}
                                onChange={handleChange}
                                min="0"
                                max="100"
                                className="slider"
                            />
                            <span className="slider-value">{settings.alarmVolume || 70}</span>
                        </div>

                        <div className="slider-group">
                            <label>Repeat</label>
                            <input
                                type="number"
                                name="alarmRepeat"
                                value={settings.alarmRepeat || 1}
                                onChange={handleChange}
                                min="1"
                                max="10"
                                className="repeat-input"
                            />
                        </div>
                    </div>

                    <div className="sound-section">
                        <label>Ticking Sound</label>
                        <select
                            name="tickingSound"
                            value={settings.tickingSound || 'none'}
                            onChange={handleChange}
                            className="sound-select"
                        >
                            <option value="none">None</option>
                            <option value="soft">Soft Tick</option>
                            <option value="regular">Regular Tick</option>
                            <option value="loud">Loud Tick</option>
                        </select>

                        <div className="slider-group">
                            <label>Volume</label>
                            <input
                                type="range"
                                name="tickingVolume"
                                value={settings.tickingVolume || 50}
                                onChange={handleChange}
                                min="0"
                                max="100"
                                className="slider"
                            />
                            <span className="slider-value">{settings.tickingVolume || 50}</span>
                        </div>
                    </div>
                </div>

                <style jsx>{`
                    .modal-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0,0,0,0.6);
                        backdrop-filter: blur(5px);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        z-index: 100;
                        padding: 2rem;
                        box-sizing: border-box;
                    }
                    .modal-content {
                        width: 100%;
                        max-width: 450px;
                        max-height: 90vh;
                        padding: 2rem;
                        background: rgba(20, 20, 20, 0.95);
                        border-radius: 16px;
                        overflow-y: auto;
                        box-sizing: border-box;
                    }
                    .modal-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 2rem;
                        position: sticky;
                        top: 0;
                        background: rgba(20, 20, 20, 0.95);
                        padding-bottom: 1rem;
                        z-index: 101;
                    }
                    .modal-header h2 {
                        margin: 0;
                    }
                    .close-btn {
                        background: transparent;
                        color: #fff;
                        font-size: 1.8rem;
                        border: none;
                        cursor: pointer;
                        padding: 0.5rem;
                        line-height: 1;
                        transition: color 0.2s;
                        flex-shrink: 0;
                    }
                    .close-btn:hover {
                        color: rgba(255,255,255,0.7);
                    }
                    .setting-group {
                        margin-bottom: 2.5rem;
                        padding-bottom: 2rem;
                        border-bottom: 1px solid rgba(255,255,255,0.1);
                    }
                    .setting-group:last-of-type {
                        border-bottom: none;
                        margin-bottom: 0;
                        padding-bottom: 0;
                    }
                    .setting-group h3 {
                        font-size: 0.85rem;
                        text-transform: uppercase;
                        letter-spacing: 1.5px;
                        color: var(--text-secondary);
                        margin-bottom: 1.5rem;
                        margin-top: 0;
                    }
                    
                    /* Toggle Styles */
                    .toggle-group {
                        margin-bottom: 1rem;
                    }
                    .toggle-label {
                        display: flex;
                        align-items: center;
                        gap: 1rem;
                        cursor: pointer;
                        font-size: 1rem;
                    }
                    .toggle-label input[type="checkbox"] {
                        width: 50px;
                        height: 28px;
                        cursor: pointer;
                        appearance: none;
                        background: rgba(255,255,255,0.2);
                        border: none;
                        border-radius: 14px;
                        position: relative;
                        transition: background 0.3s;
                    }
                    .toggle-label input[type="checkbox"]:checked {
                        background: var(--accent-color);
                    }
                    .toggle-label input[type="checkbox"]::before {
                        content: '';
                        position: absolute;
                        width: 24px;
                        height: 24px;
                        border-radius: 50%;
                        background: white;
                        top: 2px;
                        left: 2px;
                        transition: left 0.3s;
                    }
                    .toggle-label input[type="checkbox"]:checked::before {
                        left: 24px;
                    }

                    /* Sound Section Styles */
                    .sound-section {
                        margin-bottom: 2rem;
                        padding: 1.5rem;
                        background: rgba(0,0,0,0.2);
                        border-radius: 12px;
                    }
                    .sound-section:last-child {
                        margin-bottom: 0;
                    }
                    .sound-section > label {
                        display: block;
                        font-size: 0.95rem;
                        font-weight: 600;
                        margin-bottom: 1rem;
                        color: #fff;
                    }
                    
                    /* Slider Group Styles */
                    .slider-group {
                        display: flex;
                        align-items: center;
                        gap: 1rem;
                        margin-top: 1rem;
                    }
                    .slider-group label {
                        font-size: 0.9rem;
                        color: rgba(255,255,255,0.7);
                        min-width: 60px;
                    }
                    .slider {
                        flex: 1;
                        height: 6px;
                        border-radius: 3px;
                        background: rgba(255,255,255,0.2);
                        outline: none;
                        -webkit-appearance: none;
                        appearance: none;
                    }
                    .slider::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        appearance: none;
                        width: 18px;
                        height: 18px;
                        border-radius: 50%;
                        background: white;
                        cursor: pointer;
                        box-shadow: 0 0 8px rgba(255,255,255,0.4);
                    }
                    .slider::-moz-range-thumb {
                        width: 18px;
                        height: 18px;
                        border-radius: 50%;
                        background: white;
                        cursor: pointer;
                        border: none;
                        box-shadow: 0 0 8px rgba(255,255,255,0.4);
                    }
                    .slider-value {
                        min-width: 40px;
                        text-align: right;
                        font-weight: 600;
                        font-size: 0.9rem;
                    }
                    .repeat-input {
                        width: 80px !important;
                        padding: 0.6rem !important;
                        text-align: center;
                        font-weight: 600;
                    }

                    /* Input Styles */
                    .inputs-row {
                        display: flex;
                        gap: 1rem;
                    }
                    .input-wrapper {
                        display: flex;
                        flex-direction: column;
                        gap: 0.5rem;
                        flex: 1;
                    }
                    .input-wrapper label {
                        font-size: 0.8rem;
                        color: var(--text-secondary);
                    }
                    
                    input[type="number"],
                    input[type="text"],
                    select {
                        background: rgba(255,255,255,0.1);
                        border: 1px solid rgba(255,255,255,0.2);
                        padding: 0.7rem;
                        border-radius: 8px;
                        color: #fff;
                        font-family: inherit;
                        font-size: 1rem;
                    }
                    input[type="number"]:focus,
                    input[type="text"]:focus,
                    select:focus {
                        outline: none;
                        border-color: var(--accent-color);
                        background: rgba(255,255,255,0.15);
                    }
                    
                    .sound-select {
                        width: 100% !important;
                        padding: 0.8rem !important;
                        margin-bottom: 1rem;
                    }
                `}</style>
            </div>
        </div>
    );
};

export default SettingsModal;
