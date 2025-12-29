import { useEffect, useRef, useState } from 'react';
import { ALARM_SOUNDS, TICKING_SOUNDS } from '../utils/sounds';
import { fetchUserPlaylists, getLoginUrl, getRedirectUri } from '../utils/spotify';

const SettingsModal = ({ settings, updateSettings, onClose }) => {
    const modalContentRef = useRef(null);
    const [connecting, setConnecting] = useState(false);
    const [playlists, setPlaylists] = useState([]);
    const [loadingPlaylists, setLoadingPlaylists] = useState(false);
    const [playlistError, setPlaylistError] = useState('');
    const spotifyRedirectUri = getRedirectUri();

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
        <div
            className="modal-overlay"
            onPointerDown={(e) => {
                if (!modalContentRef.current) return;
                if (!modalContentRef.current.contains(e.target)) {
                    onClose?.();
                }
            }}
        >
            <div ref={modalContentRef} className="modal-content glass-panel">
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
                            <label>Short Break</label>
                            <input
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
                            <label>Long Break</label>
                            <input
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
                    <h3>Music Provider</h3>
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
                        padding: calc(1rem + env(safe-area-inset-top, 0px))
                                 calc(1rem + env(safe-area-inset-right, 0px))
                                 calc(1rem + env(safe-area-inset-bottom, 0px))
                                 calc(1rem + env(safe-area-inset-left, 0px));
                        box-sizing: border-box;
                    }
                    .modal-content {
                        width: 100%;
                        max-width: 450px;
                        max-height: calc(100vh - 2rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
                        padding: 2rem;
                        background: rgba(20, 20, 20, 0.95);
                        border-radius: 16px;
                        overflow-y: auto;
                        -webkit-overflow-scrolling: touch;
                        box-sizing: border-box;
                    }
                    @supports (max-height: 100dvh) {
                        .modal-content {
                            max-height: calc(100dvh - 2rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
                        }
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

                    @media (max-width: 600px) {
                        .modal-content {
                            max-width: none;
                            padding: 1.25rem;
                        }
                        .playlist-select {
                            min-width: 0;
                            width: 100%;
                        }
                    }

                    .playlist-picker {
                        margin-top: 1rem;
                        padding: 1rem;
                        border-radius: 12px;
                        background: rgba(0,0,0,0.2);
                        border: 1px solid rgba(255,255,255,0.08);
                    }

                    .playlist-picker-row {
                        display: flex;
                        gap: 0.8rem;
                        align-items: center;
                        flex-wrap: wrap;
                    }

                    .playlist-btn {
                        background: rgba(255,255,255,0.1);
                        border: 1px solid rgba(255,255,255,0.2);
                        color: rgba(255,255,255,0.85);
                        padding: 0.6rem 0.9rem;
                        border-radius: 10px;
                        cursor: pointer;
                        transition: all 0.2s;
                        font-size: 0.95rem;
                        white-space: nowrap;
                    }

                    .playlist-btn:hover {
                        background: rgba(255,255,255,0.15);
                        border-color: rgba(255,255,255,0.35);
                    }

                    .playlist-btn:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }

                    .playlist-select {
                        flex: 1;
                        min-width: 220px;
                        background: rgba(255,255,255,0.1);
                        border: 1px solid rgba(255,255,255,0.2);
                        padding: 0.6rem 0.9rem;
                        border-radius: 10px;
                        color: #fff;
                        font-family: inherit;
                    }

                    .playlist-select:disabled {
                        opacity: 0.5;
                    }

                    .playlist-error {
                        margin: 0.7rem 0 0;
                        color: rgba(255,255,255,0.7);
                        font-size: 0.9rem;
                    }

                    /* Input Styles */
                    .inputs-row {
                        display: flex;
                        gap: 1rem;
                        flex-direction: column;
                    }
                    .input-wrapper {
                        display: flex;
                        flex-direction: column;
                        gap: 0.5rem;
                        flex: 0 0 auto;
                        width: 100%;
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

                    .provider-toggle {
                        justify-content: space-between;
                        background: rgba(255,255,255,0.05);
                        padding: 0.5rem 1rem;
                        border-radius: 12px;
                        cursor: default;
                    }

                    .provider-toggle span {
                        font-weight: 500;
                        opacity: 0.5;
                        transition: opacity 0.2s;
                    }
                    
                    .provider-toggle span.active {
                        opacity: 1;
                        color: var(--accent-color);
                    }

                    .switch {
                        width: 50px;
                        height: 26px;
                        background: rgba(255,255,255,0.2);
                        border-radius: 13px;
                        position: relative;
                        cursor: pointer;
                    }

                    .slider-round {
                        width: 22px;
                        height: 22px;
                        background: white;
                        border-radius: 50%;
                        position: absolute;
                        top: 2px;
                        transition: left 0.3s;
                    }

                    .slider-round.left { left: 2px; }
                    .slider-round.right { left: 26px; background: #1cb954; }

                    .spotify-settings {
                        display: flex;
                        flex-direction: column;
                        gap: 1rem;
                        margin-top: 1rem;
                        padding: 1rem;
                        background: rgba(30, 215, 96, 0.1);
                        border-radius: 12px;
                        border: 1px solid rgba(30, 215, 96, 0.2);
                    }

                    .connect-btn {
                        background: #1cb954;
                        color: white;
                        border: none;
                        padding: 0.8rem;
                        border-radius: 8px;
                        font-weight: 600;
                        cursor: pointer;
                        width: 100%;
                        transition: background 0.2s;
                    }

                    .connect-btn:hover {
                        background: #1ed760;
                    }

                    .help-text {
                        font-size: 0.75rem;
                        color: rgba(255,255,255,0.5);
                        margin: 0;
                    }
                    
                    .status-connected {
                        color: #1ed760;
                        font-size: 0.9rem;
                        font-weight: 600;
                        margin-top: 0.5rem;
                        display: block;
                        text-align: center;
                    }
                `}</style>
            </div>
        </div>
    );
};

export default SettingsModal;
