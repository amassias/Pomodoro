import React from 'react';

const SettingsModal = ({ settings, updateSettings, onClose }) => {
    const handleChange = (e) => {
        const { name, value } = e.target;
        updateSettings({
            ...settings,
            [name]: name === 'sound' ? value : Number(value)
        });
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content glass-panel">
                <div className="modal-header">
                    <h2>Settings</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
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
                    <select
                        name="sound"
                        value={settings.sound}
                        onChange={handleChange}
                        className="sound-select"
                    >
                        <option value="beep">Digital Beep</option>
                        <option value="bell">Zen Bell</option>
                        <option value="alarm">Classic Alarm</option>
                        <option value="lofi-hum">Soft Hum</option>
                    </select>
                </div>

                <style jsx>{`
                    .modal-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100vw;
                        height: 100vh;
                        background: rgba(0,0,0,0.6);
                        backdrop-filter: blur(5px);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        z-index: 100;
                    }
                    .modal-content {
                        width: 90%;
                        max-width: 400px;
                        padding: 2rem;
                        background: rgba(20, 20, 20, 0.95); /* More opaque */
                    }
                    .modal-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 2rem;
                    }
                    .close-btn {
                        background: transparent;
                        color: #fff;
                        font-size: 1.5rem;
                    }
                    .setting-group {
                        margin-bottom: 2rem;
                    }
                    .setting-group h3 {
                        font-size: 0.9rem;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        color: var(--text-secondary);
                        margin-bottom: 1rem;
                    }
                    .inputs-row {
                        display: flex;
                        gap: 1rem;
                    }
                    .input-wrapper {
                        display: flex;
                        flex-direction: column;
                        gap: 0.5rem;
                    }
                    .input-wrapper label {
                        font-size: 0.8rem;
                        color: var(--text-secondary);
                    }
                    input, select {
                        background: rgba(255,255,255,0.1);
                        border: 1px solid rgba(255,255,255,0.2);
                        padding: 0.5rem;
                        border-radius: 6px;
                        color: #fff;
                        width: 100%;
                        font-family: inherit;
                    }
                    input:focus, select:focus {
                        outline: none;
                        border-color: var(--accent-color);
                    }
                `}</style>
            </div>
        </div>
    );
};

export default SettingsModal;
