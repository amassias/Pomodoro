import { useCallback, useEffect, useState } from 'react';
import { getMe, isTokenExpired, refreshAccessToken } from '../../lib/spotify';
import { scopedKey, storageKeys } from '../../lib/storage.js';

// Receives Spotify tokens from the login popup, persists them, refreshes them before
// they expire and detects the subscription level (Premium is required for playback).
export const useSpotifySession = ({ userId, settings, setSettings, persistSpotifySecretsToLocalStorage }) => {
  const spotifyProductKey = scopedKey(userId, storageKeys.spotifyProduct);
  const [spotifyProduct, setSpotifyProduct] = useState(localStorage.getItem(spotifyProductKey) || null);

  const persistSpotifyTokens = useCallback(({ token, refreshToken, expiresAt, expiresIn }) => {
    const resolvedExpiresAt = expiresAt || (expiresIn ? Date.now() + expiresIn * 1000 : null);

    setSettings(prev => ({
      ...prev,
      spotifyToken: token || prev.spotifyToken,
      spotifyRefreshToken: refreshToken || prev.spotifyRefreshToken,
      spotifyTokenExpiresAt: resolvedExpiresAt || prev.spotifyTokenExpiresAt
    }));

    persistSpotifySecretsToLocalStorage({
      token,
      refreshToken,
      expiresAt: resolvedExpiresAt
    });
  }, [persistSpotifySecretsToLocalStorage, setSettings]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'SPOTIFY_TOKEN' && event.data.token) {
        persistSpotifyTokens({
          token: event.data.token,
          refreshToken: event.data.refreshToken,
          expiresAt: event.data.expiresAt
        });
      }
      if (event.data.type === 'SPOTIFY_AUTH_ERROR') {
        console.warn('Spotify auth error', event.data.error);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [persistSpotifyTokens]);

  // Persist Spotify Client ID
  useEffect(() => {
    if (settings.spotifyClientId) {
      localStorage.setItem(storageKeys.spotifyClientId, settings.spotifyClientId);
    }
  }, [settings.spotifyClientId]);

  // Persist Spotify selected playlist
  useEffect(() => {
    if (settings.spotifySelectedPlaylistUri) {
      const playlistKey = scopedKey(userId, storageKeys.spotifySelectedPlaylistUri);
      localStorage.setItem(playlistKey, settings.spotifySelectedPlaylistUri);
    }
  }, [userId, settings.spotifySelectedPlaylistUri]);

  // Refresh token when near expiry
  useEffect(() => {
    let cancelled = false;

    const BASE_POLL_MS = 60_000;
    const MAX_RETRIES = 8;
    const MAX_BACKOFF_MS = 30 * 60_000; // 30 minutes

    let retryCount = 0;
    let timeoutId = null;
    let inFlight = false;

    const schedule = (delayMs) => {
      if (cancelled) return;
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        tick();
      }, delayMs);
    };

    const tick = async () => {
      if (!settings.spotifyRefreshToken || !settings.spotifyClientId) return;
      if (!isTokenExpired(settings.spotifyTokenExpiresAt)) return;

      if (inFlight) {
        schedule(BASE_POLL_MS);
        return;
      }

      if (retryCount >= MAX_RETRIES) {
        console.warn('Spotify token refresh paused (too many failures).');
        schedule(MAX_BACKOFF_MS);
        return;
      }

      inFlight = true;

      try {
        const response = await refreshAccessToken({
          clientId: settings.spotifyClientId,
          refreshToken: settings.spotifyRefreshToken
        });

        if (!cancelled) {
          retryCount = 0;
          persistSpotifyTokens({
            token: response.access_token,
            refreshToken: response.refresh_token || settings.spotifyRefreshToken,
            expiresIn: response.expires_in
          });
        }

        schedule(BASE_POLL_MS);
      } catch (err) {
        retryCount += 1;
        console.error('Spotify token refresh failed', err);

        const backoffMs = Math.min(
          BASE_POLL_MS * Math.pow(2, Math.max(0, retryCount - 1)),
          MAX_BACKOFF_MS
        );
        schedule(backoffMs);
      } finally {
        inFlight = false;
      }
    };

    // Poll periodically; if refresh fails while expired, back off.
    const start = () => {
      // If token isn't expired, just poll at a steady pace.
      if (!settings.spotifyRefreshToken || !settings.spotifyClientId) {
        schedule(BASE_POLL_MS);
        return;
      }

      if (!isTokenExpired(settings.spotifyTokenExpiresAt)) {
        retryCount = 0;
        schedule(BASE_POLL_MS);
        return;
      }

      tick();
    };

    start();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [settings.spotifyRefreshToken, settings.spotifyTokenExpiresAt, settings.spotifyClientId, persistSpotifyTokens]);

  // Detect Spotify subscription level (Premium needed for Web Playback SDK)
  useEffect(() => {
    let cancelled = false;

    const loadSubscription = async () => {
      if (!settings.spotifyToken) {
        setSpotifyProduct(null);
        localStorage.removeItem(spotifyProductKey);
        return;
      }

      try {
        const me = await getMe({ token: settings.spotifyToken });
        const product = me?.product || null;
        if (cancelled) return;

        setSpotifyProduct(product);
        if (product) {
          localStorage.setItem(spotifyProductKey, product);
        } else {
          localStorage.removeItem(spotifyProductKey);
        }
      } catch (err) {
        if (cancelled) return;
        console.warn('Failed to load Spotify subscription info', err);
        setSpotifyProduct(null);
        localStorage.removeItem(spotifyProductKey);
      }
    };

    loadSubscription();
    return () => {
      cancelled = true;
    };
  }, [settings.spotifyToken, spotifyProductKey]);

  return { spotifyProduct };
};
