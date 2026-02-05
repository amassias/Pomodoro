import { useEffect, useState } from 'react';
import { clearPkceValues, exchangeCodeForToken, getRedirectUri, loadPkceValues } from '../../lib/spotify';

const postBack = (payload) => {
    if (window.opener) {
        window.opener.postMessage(payload, window.location.origin);
    }
};

const SpotifyCallback = () => {
    const [status, setStatus] = useState('Completing Spotify login...');

    useEffect(() => {
        const run = async () => {
            const params = new URLSearchParams(window.location.search);
            const code = params.get('code');
            const returnedState = params.get('state');
            const error = params.get('error');
            const clientId = localStorage.getItem('spotifyClientId') || import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
            const { state: storedState } = loadPkceValues();

            if (error) {
                setStatus(`Spotify denied access (${error}).`);
                postBack({ type: 'SPOTIFY_AUTH_ERROR', error });
                return;
            }

            if (!clientId) {
                setStatus('Missing Spotify Client ID.');
                postBack({ type: 'SPOTIFY_AUTH_ERROR', error: 'missing_client_id' });
                return;
            }

            if (!code) {
                setStatus('Missing authorization code.');
                postBack({ type: 'SPOTIFY_AUTH_ERROR', error: 'missing_code' });
                return;
            }

            if (!storedState || storedState !== returnedState) {
                setStatus('State mismatch. Please try connecting again.');
                postBack({ type: 'SPOTIFY_AUTH_ERROR', error: 'state_mismatch' });
                return;
            }

            try {
                const redirectUri = getRedirectUri();
                const tokenResponse = await exchangeCodeForToken({ clientId, code, redirectUri });
                const expiresIn = tokenResponse.expires_in || 3600;
                const expiresAt = Date.now() + expiresIn * 1000;

                // If we were opened as a popup, the opener will persist tokens (scoped to user).
                // Only persist locally when this callback page is visited directly.
                const isPopup = Boolean(window.opener);
                if (!isPopup) {
                    if (tokenResponse.access_token) {
                        localStorage.setItem('spotifyToken', tokenResponse.access_token);
                        localStorage.setItem('spotifyTokenExpiresAt', String(expiresAt));
                    }
                    if (tokenResponse.refresh_token) {
                        localStorage.setItem('spotifyRefreshToken', tokenResponse.refresh_token);
                    }
                }

                clearPkceValues();

                const payload = {
                    type: 'SPOTIFY_TOKEN',
                    token: tokenResponse.access_token,
                    refreshToken: tokenResponse.refresh_token,
                    expiresAt
                };

                postBack(payload);

                if (window.opener) {
                    window.close();
                } else {
                    window.location.replace('/');
                }
            } catch (err) {
                console.error('Spotify token exchange failed', err);
                setStatus('Could not complete Spotify login. Please try again.');
                postBack({ type: 'SPOTIFY_AUTH_ERROR', error: 'token_exchange_failed' });
            }
        };

        run();
    }, []);

    return (
        <div style={{ color: '#fff', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b0b0b' }}>
            <p>{status}</p>
        </div>
    );
};

export default SpotifyCallback;
