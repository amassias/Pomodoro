import { useState } from 'react';
import { fetchUserPlaylists, getLoginUrl, getRedirectUri } from '../../lib/spotify';

const MusicProviderSettings = ({ settings, updateSettings }) => {
    const [connecting, setConnecting] = useState(false);
    const [playlists, setPlaylists] = useState([]);
    const [loadingPlaylists, setLoadingPlaylists] = useState(false);
    const [playlistError, setPlaylistError] = useState('');
    const spotifyRedirectUri = getRedirectUri();

    return (
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
    );
};

export default MusicProviderSettings;
