import { useCallback, useRef, useState } from 'react';
import { ALARM_SOUNDS, TICKING_SOUNDS } from '../../lib/sounds';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { useSoundPreview } from './useSoundPreview';
import MusicProviderSettings from './MusicProviderSettings';
import SoundSettings from './SoundSettings';
import './SettingsModal.css';

const SettingsModal = ({ settings, updateSettings, onClose, onRestartTour }) => {
    const modalContentRef = useRef(null);

    const { playPreviewAudio, stopPreviewAudio } = useSoundPreview();

    const handleClose = useCallback(() => {
        stopPreviewAudio();
        onClose?.();
    }, [onClose, stopPreviewAudio]);

    useDialogFocus({ open: true, onClose: handleClose, dialogRef: modalContentRef });

    const durationFieldNames = new Set(['focusDuration', 'shortBreakDuration', 'longBreakDuration']);
    const getDurationDrafts = () => ({
        focusDuration: String(settings.focusDuration ?? ''),
        shortBreakDuration: String(settings.shortBreakDuration ?? ''),
        longBreakDuration: String(settings.longBreakDuration ?? ''),
    });
    const [durationDrafts, setDurationDrafts] = useState(getDurationDrafts);

    // Reset the drafts during render when the saved durations change (e.g. a preset is applied).
    const savedDurationsKey = `${settings.focusDuration}|${settings.shortBreakDuration}|${settings.longBreakDuration}`;
    const [draftsSourceKey, setDraftsSourceKey] = useState(savedDurationsKey);
    if (draftsSourceKey !== savedDurationsKey) {
        setDraftsSourceKey(savedDurationsKey);
        setDurationDrafts(getDurationDrafts());
    }

    const commitDurationDraft = (name) => {
        const raw = String(durationDrafts[name] ?? '').trim();
        const isValid = /^[1-9]\d*$/.test(raw);

        if (!isValid) {
            setDurationDrafts(prev => ({
                ...prev,
                [name]: String(settings[name] ?? ''),
            }));
            return;
        }

        const nextValue = Number(raw);
        if (nextValue !== settings[name]) {
            updateSettings({
                ...settings,
                [name]: nextValue,
            });
        }
        setDurationDrafts(prev => ({
            ...prev,
            [name]: String(nextValue),
        }));
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (durationFieldNames.has(name)) return;
        const newValue = type === 'checkbox' ? checked : (name.includes('Volume') || name.includes('Repeat') || name.includes('Goal') ? Number(value) : value);

        updateSettings({
            ...settings,
            [name]: newValue
        });

        // Play preview for sound selection
        if (name === 'sound' && ALARM_SOUNDS[newValue]) {
            playPreviewAudio(ALARM_SOUNDS[newValue], (settings.alarmVolume ?? 70) / 100, {
                fallbackUrl: ALARM_SOUNDS.bell,
                fallbackTone: true
            });
        } else if (name === 'tickingSound' && TICKING_SOUNDS[newValue]) {
            // Match timer volume logic
            playPreviewAudio(TICKING_SOUNDS[newValue], ((settings.tickingVolume ?? 50) / 100) * 0.3);
        } else if (name === 'sound' || name === 'tickingSound') {
            stopPreviewAudio();
        }
    };

    return (
        <div
            className="modal-overlay"
            onPointerDown={(e) => {
                if (!modalContentRef.current) return;
                if (!modalContentRef.current.contains(e.target)) {
                    handleClose();
                }
            }}
        >
            <div ref={modalContentRef} className="modal-content glass-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
                <div className="modal-header">
                    <h2 id="settings-title">Settings</h2>
                    <button className="close-btn" onClick={handleClose} aria-label="Close settings">×</button>
                </div>
                <div className="modal-body delight-numbered">

                <div className="setting-group">
                    <h3>Auto start</h3>
                    <div className="toggle-group">
                        <label className="toggle-label">
                            <span>Start breaks automatically</span>
                            <input
                                type="checkbox"
                                name="autoStartBreaks"
                                checked={settings.autoStartBreaks || false}
                                onChange={handleChange}
                            />
                        </label>
                        <label className="toggle-label">
                            <span>Start focus sessions automatically</span>
                            <input
                                type="checkbox"
                                name="autoStartPomodoros"
                                checked={settings.autoStartPomodoros || false}
                                onChange={handleChange}
                            />
                        </label>
                    </div>
                </div>

                <div className="setting-group">
                    <h3>Timer (minutes)</h3>
                    <div className="inputs-row">
                        <div className="input-wrapper">
                            <label htmlFor="focusDuration">Focus</label>
                            <input
                                id="focusDuration"
                                type="number"
                                name="focusDuration"
                                value={durationDrafts.focusDuration}
                                onChange={(e) => setDurationDrafts(prev => ({ ...prev, focusDuration: e.target.value }))}
                                onBlur={() => commitDurationDraft('focusDuration')}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') e.currentTarget.blur();
                                }}
                                min="1"
                                step="1"
                                inputMode="numeric"
                                pattern="[0-9]*"
                            />
                        </div>
                        <div className="input-wrapper">
                            <label htmlFor="shortBreakDuration">Short break</label>
                            <input
                                id="shortBreakDuration"
                                type="number"
                                name="shortBreakDuration"
                                value={durationDrafts.shortBreakDuration}
                                onChange={(e) => setDurationDrafts(prev => ({ ...prev, shortBreakDuration: e.target.value }))}
                                onBlur={() => commitDurationDraft('shortBreakDuration')}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') e.currentTarget.blur();
                                }}
                                min="1"
                                step="1"
                                inputMode="numeric"
                                pattern="[0-9]*"
                            />
                        </div>
                        <div className="input-wrapper">
                            <label htmlFor="longBreakDuration">Long break</label>
                            <input
                                id="longBreakDuration"
                                type="number"
                                name="longBreakDuration"
                                value={durationDrafts.longBreakDuration}
                                onChange={(e) => setDurationDrafts(prev => ({ ...prev, longBreakDuration: e.target.value }))}
                                onBlur={() => commitDurationDraft('longBreakDuration')}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') e.currentTarget.blur();
                                }}
                                min="1"
                                step="1"
                                inputMode="numeric"
                                pattern="[0-9]*"
                            />
                        </div>
                    </div>
                </div>
                <div className="setting-group">
                    <h3>Custom presets</h3>
                    <button className="tutorial-btn" onClick={() => {
                        const name = window.prompt('Preset name');
                        if (!name?.trim()) return;
                        const preset = { id: crypto.randomUUID(), name: name.trim().slice(0, 24), focusDuration: Number(durationDrafts.focusDuration) || 25, shortBreakDuration: Number(durationDrafts.shortBreakDuration) || 5, longBreakDuration: Number(durationDrafts.longBreakDuration) || 15 };
                        updateSettings({ ...settings, customPresets: [...(Array.isArray(settings.customPresets) ? settings.customPresets : []), preset].slice(-6) });
                    }}>Save current durations</button>
                    <div className="preset-list">
                        {(Array.isArray(settings.customPresets) ? settings.customPresets : []).map(preset => (
                            <div key={preset.id}><span>{preset.name} · {preset.focusDuration}/{preset.shortBreakDuration}/{preset.longBreakDuration}</span><button aria-label={`Delete ${preset.name}`} onClick={() => updateSettings({ ...settings, customPresets: settings.customPresets.filter(item => item.id !== preset.id) })}>×</button></div>
                        ))}
                    </div>
                </div>

                <div className="setting-group">
                    <h3>Daily goal</h3>
                    <div className="slider-group">
                        <label>Target</label>
                        <input
                            type="range"
                            name="dailyGoal"
                            value={settings.dailyGoal || 120}
                            onChange={(e) => updateSettings({ ...settings, dailyGoal: Number(e.target.value) })}
                            min="60"
                            max="720"
                            step="30"
                            className="slider"
                        />
                        <span className="slider-value">{Math.floor((settings.dailyGoal || 120) / 60)}h {((settings.dailyGoal || 120) % 60) > 0 ? ((settings.dailyGoal || 120) % 60) + 'm' : ''}</span>
                    </div>
                </div>
                <div className="setting-group">
                    <h3>Weekly goal</h3>
                    <div className="slider-group">
                        <span className="slider-label">Target</span>
                        <input type="range" name="weeklyGoal" min="120" max="2400" step="30" value={settings.weeklyGoal || 600} onChange={handleChange} className="slider" />
                        <span className="slider-value">{Math.floor((settings.weeklyGoal || 600) / 60)}h</span>
                    </div>
                </div>

                <MusicProviderSettings settings={settings} updateSettings={updateSettings} />

                <SoundSettings settings={settings} onChange={handleChange} />
                <div className="setting-group">
                    <h3>Shortcuts &amp; feedback</h3>
                    <div className="toggle-group">
                        <label className="toggle-label">
                            <span>Keyboard shortcuts</span>
                            <input type="checkbox" name="shortcutsEnabled" checked={settings.shortcutsEnabled !== false} onChange={handleChange} />
                        </label>
                        <label className="toggle-label">
                            <span>Vibration on timer completion</span>
                            <input type="checkbox" name="vibrationEnabled" checked={settings.vibrationEnabled !== false} onChange={handleChange} />
                        </label>
                    </div>
                    <div className="shortcut-grid">
                        <label>Start / pause<select name="shortcutToggle" value={settings.shortcutToggle || 'Space'} onChange={handleChange}><option value="Space">Space</option><option value="Enter">Enter</option><option value="p">P</option></select></label>
                        <label>Reset<select name="shortcutReset" value={settings.shortcutReset || 'r'} onChange={handleChange}><option value="r">R</option><option value="x">X</option><option value="Backspace">Backspace</option></select></label>
                        <label>Mute<select name="shortcutMute" value={settings.shortcutMute || 'm'} onChange={handleChange}><option value="m">M</option><option value="u">U</option><option value="v">V</option></select></label>
                    </div>
                    <button
                        className="tutorial-btn"
                        onClick={onRestartTour}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
                        <span>Replay the tour</span>
                    </button>
                    <p className="help-text" style={{ marginTop: '0.75rem' }}>
                        Shortcuts are ignored while you are typing in a field.
                    </p>
                </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
