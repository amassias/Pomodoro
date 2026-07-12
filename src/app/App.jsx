import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import BackgroundVideo from '../features/location/BackgroundVideo';
import Timer from '../features/timer/Timer';
import CitySelector from '../features/location/CitySelector';
import TaskList from '../features/tasks/TaskList';
import DailyProgress from '../features/location/DailyProgress';
import SharedSessionControl from '../features/shared/SharedSessionControl';
import { getMe, isTokenExpired, refreshAccessToken } from '../lib/spotify';
import { useUserData } from '../providers/UserDataProvider.jsx';
import { markBadYoutubeVideoId, readBadYoutubeVideoIds, scopedKey, storageKeys, hasCompletedOnboarding, setOnboardingCompleted } from '../lib/storage.js';
import { startThirdPartyPerformanceMonitoring } from '../lib/performanceMonitoring';

const LofiPlayer = lazy(() => import('../features/audio/LofiPlayer'));
const SpotifyPlayer = lazy(() => import('../features/audio/SpotifyPlayer'));
const Report = lazy(() => import('../features/report/Report'));
const SettingsModal = lazy(() => import('../features/settings/SettingsModal'));
const FeedbackModal = lazy(() => import('../features/feedback/FeedbackModal'));
const WelcomeModal = lazy(() => import('../features/onboarding/WelcomeModal'));
const OnboardingTour = lazy(() => import('../features/onboarding/OnboardingTour'));

import AchievementWatcher from '../features/report/AchievementWatcher';

const CITIES = {
  // Urban Night
  shibuya: { name: 'Tokyo (Shibuya)', id: 'tujkoXI8rWM', category: 'Urban Night' },
  shinjuku: { name: 'Tokyo (Shinjuku)', id: 'DjdUEyjx8GM', category: 'Urban Night' },
  osaka: { name: 'Osaka (Dotonbori)', id: 'CoSJb_nSgxo', category: 'Urban Night' },
  nyc_times: { name: 'NYC (Times Sq)', id: 'rnXIjl_Rzy4', category: 'Urban Night' },
  nyc_street: { name: 'NYC (Street)', id: '1-iS7LArMPA', category: 'Urban Night' },
  seoul_gangnam: { name: 'Seoul (Gangnam)', id: 'OE_S4_2F8Cg', category: 'Urban Night' },
  seoul_hangang: { name: 'Seoul (Hangang & Banpo Bridge)', id: '-JhoMGoAfFc', category: 'Urban Night' },
  hongkong: { name: 'Hong Kong', id: 'h3hF2v9c_Ck', category: 'Urban Night' },
  chongqing: { name: 'Chongqing', id: 'XY2M2WJb4sg', category: 'Urban Night' },

  // Urban Day
  paris: { name: 'Paris (Eiffel)', id: 'OzYp4NRZlwQ', category: 'Urban Day' },
  london: { name: 'London (Abbey Rd)', id: '57w2gYXjRic', category: 'Urban Day' },
  venice: { name: 'Venice', id: 'ph1vpnYIxJk', category: 'Urban Day' },
  prague: { name: 'Prague', id: 'u0THwV8T47E', category: 'Urban Day' },
  amsterdam: { name: 'Amsterdam', id: 'sJP5q6SeX5Q', category: 'Urban Day' },
  jackson: { name: 'Jackson Hole', id: '1EqIQaUqfT4', category: 'Urban Day' },
  santorini: { name: 'Santorini', id: '9G88RhrM32Y', category: 'Urban Day' },

  // Nature
  namibia: { name: 'Namibia (Desert)', id: 'ydYDqZQpim8', category: 'Nature' },
  kenya: { name: 'Kenya (Safari)', id: 'liveVslqWxc', category: 'Nature' },
  monterey: { name: 'Jellyfish', id: '2g811Eo7K8U', category: 'Nature' },
  maldives: { name: 'Maldives', id: 'N9l9g5e8G8E', category: 'Nature' },
  aurora: { name: 'Northern Lights', id: 'DDU-rZs-Ic4', category: 'Nature' },

  // Focus / Vibe
  iss: { name: 'Space (ISS)', id: 'xRPjKQtRXR8', category: 'Focus' },
  lofi: { name: 'Lofi Girl', id: 'jfKfPfyJRdk', category: 'Focus' },
  synthwave: { name: 'Synthwave Radio', id: '4xDzrJKXOOY', category: 'Focus' },
  train: { name: 'Norway Train', id: 'HyGci9POlW8', category: 'Focus' },
};

function App() {
  const {
    loading: userDataLoading,
    userId,
    city,
    setCity,
    settings,
    setSettings,
    persistSpotifySecretsToLocalStorage,
    customLocations,
    syncStatus,
  } = useUserData();

  const [showSettings, setShowSettings] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showTour, setShowTour] = useState(false);
  useEffect(() => startThirdPartyPerformanceMonitoring(), []);
  const spotifyProductKey = scopedKey(userId, storageKeys.spotifyProduct);
  const [spotifyProduct, setSpotifyProduct] = useState(localStorage.getItem(spotifyProductKey) || null);

  // Check onboarding status after user data loads
  useEffect(() => {
    if (!userDataLoading && !hasCompletedOnboarding(userId)) {
      setShowWelcome(true);
    }
  }, [userDataLoading, userId]);

  const handleStartTour = () => {
    setShowWelcome(false);
    setShowTour(true);
  };

  const handleSkipOnboarding = () => {
    setShowWelcome(false);
    setOnboardingCompleted(userId, true);
  };

  const handleTourComplete = () => {
    setShowTour(false);
    setOnboardingCompleted(userId, true);
  };

  const handleRestartTour = () => {
    setShowSettings(false);
    setShowWelcome(true);
  };

  // Merge built-in CITIES with user's custom locations
  const cities = React.useMemo(() => ({
    ...CITIES,
    ...customLocations
  }), [customLocations]);

  const [isValidatingLocations, setIsValidatingLocations] = useState(true);
  const [locationsError, setLocationsError] = useState(null);
  const [validationFailed, setValidationFailed] = useState(false);
  const [liveYoutubeVideoIds, setLiveYoutubeVideoIds] = useState(() => new Set());

  const [badYoutubeVideoIds, setBadYoutubeVideoIds] = useState(() => readBadYoutubeVideoIds({ userId }));

  useEffect(() => {
    setBadYoutubeVideoIds(readBadYoutubeVideoIds({ userId }));
  }, [userId]);

  useEffect(() => {
    let cancelled = false;

    const validate = async () => {
      // Wait for user data to finish loading before validating
      if (userDataLoading) return;

      setIsValidatingLocations(true);
      setLocationsError(null);

      const videoIds = Array.from(
        new Set(
          Object.values(cities)
            .map((c) => c?.id)
            .filter(Boolean)
        )
      );

      if (!videoIds.length) {
        setLiveYoutubeVideoIds(new Set());
        setIsValidatingLocations(false);
        return;
      }

      // In local dev mode, skip validation entirely and show all locations
      // Vercel serverless functions aren't available locally
      if (import.meta.env.DEV) {
        setLiveYoutubeVideoIds(new Set(videoIds));
        setLocationsError(null);
        setIsValidatingLocations(false);
        return;
      }

      try {
        const response = await fetch('/api/youtube/validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ videoIds }),
        });

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          let details = text;
          try {
            const parsed = JSON.parse(text);
            details = parsed?.error || parsed?.message || text;
          } catch {
            // ignore
          }

          throw new Error(`Validate API failed (${response.status})${details ? `: ${details}` : ''}`);
        }

        const data = await response.json();
        const validIds = Array.isArray(data?.validIds) ? data.validIds : [];
        if (cancelled) return;

        setLiveYoutubeVideoIds(new Set(validIds));
        setValidationFailed(false);
        setIsValidatingLocations(false);
      } catch (err) {
        console.warn('Failed to validate live locations', err);
        if (cancelled) return;

        // Fallback: show all cities instead of none, with a warning
        const allVideoIds = Array.from(
          new Set(
            Object.values(cities)
              .map((c) => c?.id)
              .filter(Boolean)
          )
        );
        setLiveYoutubeVideoIds(new Set(allVideoIds));
        setValidationFailed(true);
        setLocationsError(err instanceof Error ? err.message : 'failed');
        setIsValidatingLocations(false);
      }
    };

    validate();
    return () => {
      cancelled = true;
    };
  }, [cities, userDataLoading]);

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

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'Escape' && showSettings) {
        setShowSettings(false);
      } else if (settings.shortcutsEnabled !== false && (e.code === settings.shortcutToggle || e.key.toLowerCase() === String(settings.shortcutToggle || 'Space').toLowerCase())) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('timer-toggle'));
      } else if (settings.shortcutsEnabled !== false && e.key.toLowerCase() === String(settings.shortcutReset || 'r').toLowerCase()) {
        window.dispatchEvent(new CustomEvent('timer-reset'));
      } else if (settings.shortcutsEnabled !== false && e.key.toLowerCase() === String(settings.shortcutMute || 'm').toLowerCase()) {
        // Toggle Mute: Toggle between 0 and defaults (70/50)
        setSettings(prev => {
          const newAlarmVol = prev.alarmVolume === 0 ? 70 : 0;
          const newTickVol = prev.tickingVolume === 0 ? 50 : 0;
          return { ...prev, alarmVolume: newAlarmVol, tickingVolume: newTickVol };
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSettings, setSettings, settings.shortcutsEnabled, settings.shortcutToggle, settings.shortcutReset, settings.shortcutMute]);

  // Exhaustive list of video streams with categories
  const visibleCities = React.useMemo(() => {
    if (isValidatingLocations) return {};

    const entries = Object.entries(cities).filter(([key, c]) => {
      if (!c?.id) return false;
      
      // Always show custom locations (user-added) without validation
      if (key.startsWith('custom_')) return true;

      // If validation failed, show all cities except known bad ones
      if (validationFailed) {
        return !badYoutubeVideoIds.has(c.id);
      }
      
      if (!liveYoutubeVideoIds.has(c.id)) return false;
      if (badYoutubeVideoIds.has(c.id)) return false;
      return true;
    });

    return Object.fromEntries(entries);
  }, [badYoutubeVideoIds, cities, isValidatingLocations, liveYoutubeVideoIds, validationFailed]);

  // If the currently selected city is missing/hidden, fall back to the first visible option.
  useEffect(() => {
    // Don't run fallback while still validating - wait for validation to complete
    if (isValidatingLocations) return;
    if (visibleCities[city]) return;

    // Prefer a fallback in the same category as the previously-selected city.
    const previousCategory = cities?.[city]?.category || null;
    const visibleEntries = Object.entries(visibleCities);

    const sameCategoryFallbackKey = previousCategory
      ? (visibleEntries.find(([, c]) => c?.category === previousCategory)?.[0] || null)
      : null;

    const preferredKey = visibleCities.seoul_hangang ? 'seoul_hangang' : null;
    const firstVisibleKey = visibleEntries[0]?.[0] || null;

    const fallbackKey = sameCategoryFallbackKey || preferredKey || firstVisibleKey || null;

    if (fallbackKey && fallbackKey !== city) {
      setCity(fallbackKey);
    }
  }, [city, cities, isValidatingLocations, setCity, visibleCities]);

  const currentCity = visibleCities[city] || null;

  const handleVideoError = useCallback(
    ({ videoId, code }) => {
      if (!videoId) return;

      // If the YouTube API itself failed to load (adblock/network), don't permanently hide a specific city.
      if (code === 'api_load_failed') {
        console.warn('YouTube IFrame API failed to load; cannot evaluate stream health.', { videoId });
        return;
      }

      // Short TTL for timeouts (can be transient), longer TTL for explicit YouTube errors.
      const ttlMs = code === 'play_timeout' ? 30 * 60 * 1000 : undefined;

      markBadYoutubeVideoId(videoId, { userId, ttlMs });
      setBadYoutubeVideoIds(readBadYoutubeVideoIds({ userId }));
    },
    [userId]
  );

  return (
    <div className="app-container">
      {currentCity?.id ? (
        <BackgroundVideo videoId={currentCity.id} onVideoError={handleVideoError} />
      ) : null}

      <div className="overlay">
        <header className="focus-header">
          <div className="brand-block">
            <span className="brand-mark" aria-hidden="true"></span>
            <div>
              <strong>World Focus</strong>
              <span>Make this session count</span>
            </div>
          </div>
          <div className={`sync-indicator ${syncStatus}`} title={`Data status: ${syncStatus}`} aria-label={`Data ${syncStatus}`}>{syncStatus === 'local' ? 'Local' : syncStatus}</div>
          <div className="top-widget-area">
            <SharedSessionControl />
            <DailyProgress />
          </div>
        </header>
        <div className="ambient-label" aria-hidden="true">
          <span className="live-dot"></span>
          Live atmosphere
        </div>
        <main className="main-content">
          <div className="main-grid">
            <Timer settings={settings} updateSettings={setSettings} />
            <TaskList />
          </div>
        </main>

        <CitySelector
          currentCity={city}
          cities={visibleCities}
          onSelect={setCity}
          isLoading={isValidatingLocations}
          error={locationsError}
          validationFailed={validationFailed}
        />
        <nav className="mobile-nav" aria-label="Mobile navigation">
          <button onClick={() => document.querySelector('#focus-timer')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>Timer</button>
          <button onClick={() => document.querySelector('#focus-tasks')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>Tasks</button>
          <button onClick={() => window.dispatchEvent(new Event('open-report'))}>Insights</button>
          <button onClick={() => setShowSettings(true)}>Settings</button>
        </nav>
      </div>

      <AchievementWatcher />

      <Suspense fallback={null}>
        <Report />
      </Suspense>
      <button
        className="settings-btn"
        onClick={() => setShowSettings(true)}
        title="Settings"
        aria-label="Settings"
      >
        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
        <span>Settings</span>
      </button>

      <button
        className="recommend-btn"
        onClick={() => setShowFeedbackModal(true)}
        title="Send feedback or suggest a YouTube live view"
        aria-label="Send feedback or suggest a YouTube live view"
      >
        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><line x1="9" y1="9" x2="15" y2="9"></line><line x1="9" y1="13" x2="15" y2="13"></line></svg>
        <span>Feedback</span>
      </button>

      <Suspense fallback={null}>
        {settings.musicProvider === 'spotify' ? (
          <SpotifyPlayer
            token={settings.spotifyToken}
            isPremium={spotifyProduct === 'premium'}
            playing={false}
            uri={settings.spotifySelectedPlaylistUri}
          />
        ) : (
          <LofiPlayer />
        )}
      </Suspense>

      {showSettings && (
        <Suspense fallback={null}>
          <SettingsModal
            settings={settings}
            updateSettings={setSettings}
            onClose={() => setShowSettings(false)}
            onRestartTour={handleRestartTour}
          />
        </Suspense>
      )}

      <Suspense fallback={null}>
        <FeedbackModal
          open={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          currentStreamId={currentCity?.id}
          currentStreamName={currentCity?.name}
        />
      </Suspense>

      {showWelcome && (
        <Suspense fallback={null}>
          <WelcomeModal
            onStartTour={handleStartTour}
            onSkip={handleSkipOnboarding}
          />
        </Suspense>
      )}

      {showTour && (
        <Suspense fallback={null}>
          <OnboardingTour onComplete={handleTourComplete} />
        </Suspense>
      )}

      <style>{`
        .app-container {
          position: relative;
          width: 100%;
          min-height: 100vh;
          height: auto;
        }
        @supports (min-height: 100dvh) {
          .app-container {
            min-height: 100dvh;
          }
        }
        .overlay {
          position: relative;
          width: 100%;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          /* justify-content: space-between; Removed to allow absolute header */
          align-items: center;
          padding: clamp(0.75rem, 2.5vw, 2rem);
          z-index: 10;
        }
        .focus-header {
          width: min(100%, 1180px);
          min-height: 56px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          z-index: 110;
        }
        .brand-block { display: flex; align-items: center; gap: 0.75rem; }
        .brand-block > div { display: flex; flex-direction: column; gap: 0.1rem; }
        .brand-block strong { font-size: 0.92rem; letter-spacing: 0.04em; }
        .brand-block span:not(.brand-mark) { color: var(--text-muted); font-size: 0.72rem; }
        .brand-mark { width: 10px; height: 10px; border-radius: 50%; background: var(--accent-color); box-shadow: 0 0 18px var(--accent-color); }
        .sync-indicator { margin-right: auto; padding: 0.3rem 0.5rem; border-radius: 999px; color: var(--text-muted); background: rgba(255,255,255,0.04); font-size: 0.62rem; text-transform: capitalize; }
        .sync-indicator.synced { color: var(--success-color); }
        .sync-indicator.error { color: var(--accent-color); }
        .ambient-label { position: fixed; left: 1.25rem; bottom: 1.3rem; display: flex; align-items: center; gap: 0.45rem; color: var(--text-secondary); font-size: 0.72rem; z-index: 90; text-transform: uppercase; letter-spacing: 0.12em; }
        .live-dot { width: 6px; height: 6px; background: var(--success-color); border-radius: 50%; box-shadow: 0 0 10px var(--success-color); }
        @supports (min-height: 100dvh) {
          .overlay {
            min-height: 100dvh;
          }
        }
        .top-bar {
          position: sticky;
          top: calc(env(safe-area-inset-top, 0px) + 0.5rem);
          margin: 0 auto;
          padding: 1rem clamp(1rem, 4vw, 2rem);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          width: 90%; /* bit less than 100 to show floating effect */
          max-width: 1200px;
          z-index: 100;
          transition: all 0.2s ease;
          border-bottom-left-radius: 24px;
          border-bottom-right-radius: 24px;
          border-top-left-radius: 0; /* Attach to top */
          border-top-right-radius: 0;
        }

        /* Desktop-only auto-hide (hover-capable pointers) */
        @media (hover: hover) and (pointer: fine) {
          .top-bar {
            transform: translateY(calc(-100% + 18px));
            opacity: 0.25;
            transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
          }
          .top-bar:hover {
            transform: translateY(0);
            opacity: 1;
          }

          /* Add a visual hint handle at the bottom */
          .top-bar::after {
            content: '';
            position: absolute;
            bottom: 5px;
            left: 50%;
            transform: translateX(-50%);
            width: 40px;
            height: 4px;
            background: rgba(255,255,255,0.3);
            border-radius: 2px;
          }
        }
        
        /* Settings Button */
        .settings-btn {
          position: fixed;
          top: calc(env(safe-area-inset-top, 0px) + 0.75rem);
          right: calc(env(safe-area-inset-right, 0px) + 0.75rem);
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          min-width: 48px;
          height: 42px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          z-index: 100;
          gap: 0.45rem;
          padding: 0 0.8rem;
          font-size: 0.78rem;
        }
        
        .settings-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.4);
          box-shadow: 0 0 12px rgba(255, 255, 255, 0.2);
          transform: scale(1.05);
        }
        
        .settings-btn:active {
          transform: scale(0.95);
        }
        
        /* Recommend Button */
        .top-widget-area {
            position: static;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 24px;
            padding: 4px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(5px);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 0.4rem;
        }
        .shared-session-create, .shared-session button { color: #fff; background: rgba(255,255,255,0.08); border: 1px solid var(--glass-border); border-radius: 999px; padding: 0.45rem 0.7rem; font-size: 0.68rem; }
        .shared-session { position: relative; display: flex; align-items: center; gap: 0.45rem; padding: 0 0.2rem; color: var(--text-muted); font-size: 0.68rem; }
        .shared-session strong { color: #fff; }
        .shared-status { width: 7px; height: 7px; border-radius: 50%; background: var(--text-muted); }
        .shared-status.connected { background: var(--success-color); box-shadow: 0 0 8px var(--success-color); }
        .shared-status.error { background: var(--accent-color); }
        .shared-session-panel { position: absolute; top: calc(100% + 0.5rem); right: 0; z-index: 160; width: min(320px, calc(100vw - 2rem)); display: grid; gap: 0.5rem; padding: 0.75rem; border: 1px solid var(--glass-border); border-radius: 12px; background: var(--glass-bg-strong); box-shadow: var(--shadow-panel); }
        .shared-panel-heading { display: flex; align-items: center; justify-content: space-between; }.shared-panel-heading button { padding: 0.15rem 0.45rem; font-size: 1.1rem; line-height: 1; color: var(--text-secondary); background: transparent; }
        .participant-list { display: grid; gap: 0.3rem; }.participant-list > div { display: flex; justify-content: space-between; gap: 0.5rem; }.participant-list button, .shared-reactions button, .shared-session-panel form button { padding: 0.25rem 0.4rem; color: var(--text-secondary); background: rgba(255,255,255,0.08); border-radius: 6px; font-size: 0.66rem; }
        .shared-reactions { display: flex; gap: 0.35rem; }.shared-messages { max-height: 6rem; overflow-y: auto; }.shared-messages p { margin: 0.2rem 0; font-size: 0.7rem; }.shared-messages span { color: var(--text-muted); }.shared-session-panel form { display: flex; gap: 0.4rem; }.shared-session-panel input { min-width: 0; flex: 1; color: #fff; background: rgba(255,255,255,0.08); border: 1px solid var(--glass-border); border-radius: 6px; padding: 0.4rem; }

        .top-widget-area:hover {
            background: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.2);
            transform: scale(1.02);
        }

        .recommend-btn {
          position: fixed;
          top: calc(env(safe-area-inset-top, 0px) + 9.75rem);
          right: calc(env(safe-area-inset-right, 0px) + 0.75rem);
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          min-width: 48px;
          height: 42px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          z-index: 100;
          text-decoration: none;
          gap: 0.45rem;
          padding: 0 0.8rem;
          font-size: 0.78rem;
        }
        
        .recommend-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.4);
          box-shadow: 0 0 12px rgba(255, 255, 255, 0.2);
          transform: scale(1.05);
        }
        
        .recommend-btn:active {
          transform: scale(0.95);
        }
        .top-bar h1 {
          font-weight: 300;
          letter-spacing: 2px;
          font-size: 1.5rem;
        }
        .main-content {
          margin-top: auto; /* Push to center/bottom */
          margin-bottom: clamp(4rem, 10vh, 7rem);
          display: flex;
          justify-content: center;
          align-items: center;
          flex: 1;
          width: 100%;
          pointer-events: none; /* Let clicks pass through if needed, but buttons need pointer-events: auto */
        }
        .main-grid {
            display: grid;
            grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
            gap: 1rem;
            align-items: stretch;
            justify-content: center;
            width: min(100%, 840px);
            pointer-events: auto; /* Reactivate for controls */
        }
        .bottom-bar {
          margin-top: auto; /* Keep at bottom */
          padding: 0.8rem 2rem;
          font-size: 0.9rem;
          font-weight: 300;
          letter-spacing: 1px;
        }
        .mobile-nav { display: none; }
        @media (min-width: 768px) {
           .top-bar {
             flex-direction: row;
             justify-content: space-between;
           }
           .header-left, .header-right {
               display: block;
               flex: 1;
           }
           .header-right {
               display: flex;
               justify-content: flex-end;
           }
           .top-bar h1 {
               text-align: left;
           }
        }

        @media (max-width: 980px) {
          .main-grid {
            grid-template-columns: 1fr;
            width: min(100%, 620px);
          }
        }
        @media (max-width: 768px) {
          .main-content { align-items: flex-start; padding-top: 2rem; margin-bottom: 7rem; }
          .brand-block > div span { display: none; }
          .shared-session > span:not(.shared-status), .shared-session strong { display: none; }
          .settings-btn span, .recommend-btn span { display: none; }
          .settings-btn, .recommend-btn { width: 42px; min-width: 42px; padding: 0; }
          .ambient-label { display: none; }
          .mobile-nav { position: fixed; left: calc(env(safe-area-inset-left, 0px) + 0.75rem); right: calc(env(safe-area-inset-right, 0px) + 0.75rem); bottom: calc(env(safe-area-inset-bottom, 0px) + 0.65rem); z-index: 120; display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.25rem; padding: 0.35rem; border: 1px solid var(--glass-border); border-radius: 14px; background: rgba(8,10,12,0.88); backdrop-filter: blur(16px); }
          .mobile-nav button { padding: 0.55rem 0.25rem; border-radius: 10px; color: var(--text-secondary); background: transparent; font-size: 0.68rem; }
          .mobile-nav button:active { background: rgba(255,255,255,0.1); color: #fff; }
          .top-bar {
            width: 100%;
          }
        }
      `}</style>
      <Analytics />
    </div>
  );
}

export default App;
