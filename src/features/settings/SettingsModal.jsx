import { useCallback, useEffect, useRef, useState } from 'react';
import { ALARM_SOUNDS, TICKING_SOUNDS } from '../../lib/sounds';
import { fetchUserPlaylists, getLoginUrl, getRedirectUri } from '../../lib/spotify';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import './SettingsModal.css';

const SettingsModal = ({ settings, updateSettings, onClose, onRestartTour }) => {
    const modalContentRef = useRef(null);
    const previewAudioRef = useRef(null);
    const previewAudioContextRef = useRef(null);
    const [connecting, setConnecting] = useState(false);
    const [playlists, setPlaylists] = useState([]);
    const [loadingPlaylists, setLoadingPlaylists] = useState(false);
    const [playlistError, setPlaylistError] = useState('');
    const spotifyRedirectUri = getRedirectUri();

    const stopPreviewAudio = () => {
        const audio = previewAudioRef.current;
        if (!audio) return;
        try {
            audio.pause();
            audio.currentTime = 0;
        } catch {
            // ignore
        }
    };

    const playFallbackTone = async ({ frequency = 880, durationMs = 140 } = {}) => {
        try {
            const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextCtor) return;

            if (!previewAudioContextRef.current) {
                previewAudioContextRef.current = new AudioContextCtor();
            }

            const ctx = previewAudioContextRef.current;
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.value = frequency;
            gain.gain.setValueAtTime(0.0001, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + durationMs / 1000);

            osc.onended = () => {
                try {
                    osc.disconnect();
                    gain.disconnect();
                } catch {
                    // ignore
                }
            };
        } catch (e) {
            console.warn('Fallback tone failed', e);
        }
    };

    const playPreviewAudio = (url, volume, { fallbackUrl, fallbackTone = false } = {}) => {
        if (!url) {
            stopPreviewAudio();
            return;
        }
        stopPreviewAudio();
        const audio = new Audio(url);
        audio.preload = 'auto';
        audio.volume = Math.min(1, Math.max(0, Number(volume) || 0));
        previewAudioRef.current = audio;
        audio.play().catch(e => {
            if (fallbackUrl && fallbackUrl !== url) {
                playPreviewAudio(fallbackUrl, volume);
                return;
            }
            if (fallbackTone) {
                playFallbackTone();
                return;
            }
            console.warn('Preview failed', e);
        });
    };

    const handleClose = useCallback(() => {
        stopPreviewAudio();
        onClose?.();
    }, [onClose]);

    useDialogFocus({ open: true, onClose: handleClose, dialogRef: modalContentRef });

    useEffect(() => {
        return () => {
            stopPreviewAudio();
            try {
                previewAudioContextRef.current?.close?.();
            } catch {
                // ignore
            }
            previewAudioContextRef.current = null;
        };
    }, []);

    const durationFieldNames = new Set(['focusDuration', 'shortBreakDuration', 'longBreakDuration']);
    const [durationDrafts, setDurationDrafts] = useState({
        focusDuration: String(settings.focusDuration ?? ''),
        shortBreakDuration: String(settings.shortBreakDuration ?? ''),
        longBreakDuration: String(settings.longBreakDuration ?? ''),
    });

    useEffect(() => {
        setDurationDrafts({
            focusDuration: String(settings.focusDuration ?? ''),
            shortBreakDuration: String(settings.shortBreakDuration ?? ''),
            longBreakDuration: String(settings.longBreakDuration ?? ''),
        });
    }, [settings.focusDuration, settings.shortBreakDuration, settings.longBreakDuration]);

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
            playPreviewAudio(ALARM_SOUNDS[newValue], (settings.alarmVolume || 70) / 100, {
                fallbackUrl: ALARM_SOUNDS.bell,
                fallbackTone: true
            });
        } else if (name === 'tickingSound' && TICKING_SOUNDS[newValue]) {
            // Match timer volume logic
            playPreviewAudio(TICKING_SOUNDS[newValue], ((settings.tickingVolume || 50) / 100) * 0.3);
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

                <div className="setting-group">
                    <h3>Music provider</h3>
                    <div className="toggle-group">
                        <label className="toggle-label provider-toggle">
                            <span className={settings.musicProvider === 'spotify' ? '' : 'active'}>Lofi</span>
                            <div className="switch" onClick={() => updateSettings({ ...settings, musicProvider: settings.musicProvider === 'spotify' ? 'lofi' : 'spotify' })}>
                                <div className={`slider-round ${settings.musicProvider === 'spotify' ? 'right' : 'left'}`}></div>
                            </div>
                            <span className={settings.musicProvider === 'spotify' ? 'active' : ''}>Spotify</span>
                        </label>
                    </div>

                    {settings.musicProvider === 'spotify' && (
                        <div className="spotify-settings">
                            {/* Client ID hidden as requested */}
                            <div className="connect-wrapper">
                                <button
                                    className="connect-btn"
                                    disabled={connecting}
                                    onClick={async () => {
                                        if (!settings.spotifyClientId) {
                                            alert('Please enter a Client ID first');
                                            return;
                                        }

                                        setConnecting(true);
                                        try {
                                            const url = await getLoginUrl(settings.spotifyClientId);
                                            const width = 450;
                                            const height = 730;
                                            const left = (window.screen.width / 2) - (width / 2);
                                            const top = (window.screen.height / 2) - (height / 2);
                                            const popup = window.open(url, 'Spotify Login', `width=${width},height=${height},left=${left},top=${top}`);
                                            if (!popup || popup.closed || typeof popup.closed === 'undefined') {
                                                alert("Popup was blocked! Please allow popups for this website to connect to Spotify.");
                                            }
                                        } catch (err) {
                                            console.error('Spotify auth start failed', err);
                                            alert('Could not start Spotify login. Please try again.');
                                        } finally {
                                            setConnecting(false);
                                        }
                                    }}
                                >
                                    {connecting ? 'Opening…' : 'Connect to Spotify'}
                                </button>
                                {settings.spotifyToken && <span className="status-connected">Connected ✓</span>}
                            </div>

                            {settings.spotifyToken && (
                                <div className="playlist-picker">
                                    <div className="playlist-picker-row">
                                        <button
                                            className="playlist-btn"
                                            disabled={loadingPlaylists}
                                            onClick={async () => {
                                                setPlaylistError('');
                                                setLoadingPlaylists(true);
                                                try {
                                                    const result = await fetchUserPlaylists({ token: settings.spotifyToken });
                                                    setPlaylists(result);
                                                    if (result.length > 0 && !settings.spotifySelectedPlaylistUri) {
                                                        updateSettings({
                                                            ...settings,
                                                            spotifySelectedPlaylistUri: result[0].uri
                                                        });
                                                    }
                                                } catch (err) {
                                                    console.error('Failed to load playlists', err);
                                                    const message = String(err?.message || err);
                                                    if (message === 'unauthorized') {
                                                        setPlaylistError('Session expired. Please reconnect to Spotify.');
                                                    } else if (message === 'forbidden') {
                                                        setPlaylistError('Playlist access not granted. Reconnect to Spotify to allow playlist access.');
                                                    } else {
                                                        setPlaylistError('Could not load playlists. Try reconnecting to Spotify.');
                                                    }
                                                } finally {
                                                    setLoadingPlaylists(false);
                                                }
                                            }}
                                        >
                                            {loadingPlaylists ? 'Loading…' : 'Load my playlists'}
                                        </button>

                                        <select
                                            className="playlist-select"
                                            value={settings.spotifySelectedPlaylistUri || 'spotify:playlist:0vvXsWCC9xrXsKd4JyS05a'}
                                            onChange={(e) => {
                                                updateSettings({
                                                    ...settings,
                                                    spotifySelectedPlaylistUri: e.target.value
                                                });
                                            }}
                                            disabled={playlists.length === 0}
                                            title={playlists.length === 0 ? 'Load playlists first' : 'Choose playlist'}
                                        >
                                            {playlists.length === 0 ? (
                                                <option value={settings.spotifySelectedPlaylistUri || 'spotify:playlist:0vvXsWCC9xrXsKd4JyS05a'}>
                                                    {loadingPlaylists ? 'Loading…' : 'Load playlists to choose'}
                                                </option>
                                            ) : (
                                                playlists.map(p => (
                                                    <option key={p.id} value={p.uri}>{p.name}</option>
                                                ))
                                            )}
                                        </select>
                                    </div>
                                    {playlistError && <p className="playlist-error">{playlistError}</p>}
                                </div>
                            )}
                            <p className="help-text">Requires Spotify Premium. Add your app Redirect URI in the Spotify Developer Dashboard.</p>
                            <p className="help-text">Redirect URI used: <span style={{ opacity: 0.9, wordBreak: 'break-all' }}>{spotifyRedirectUri}</span></p>
                        </div>
                    )}
                </div>

                <div className="setting-group">
                    <h3>Sound</h3>

                    <div className="sound-section">
                        <label>Alarm sound</label>
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
                            <option value="chime">Chime</option>
                            <option value="soft-bell">Soft Bell</option>
                            <option value="kitchen-timer">Kitchen Timer</option>
                            <option value="phone-ring">Phone Ring</option>
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
                        <label>Ticking sound</label>
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
                            <option value="tick">Wood Tap</option>
                            <option value="type-click">Typewriter</option>
                            <option value="soft-pop">Soft Pop</option>
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
