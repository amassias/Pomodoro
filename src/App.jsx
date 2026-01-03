import React, { useCallback, useEffect, useState } from 'react';
import BackgroundVideo from './components/BackgroundVideo';
import Timer from './components/Timer';
import CitySelector from './components/CitySelector';
import TaskList from './components/TaskList';
import LofiPlayer from './components/LofiPlayer';
import SpotifyPlayer from './components/SpotifyPlayer';
import Report from './components/Report';
import SettingsModal from './components/SettingsModal';
import { getMe, isTokenExpired, refreshAccessToken } from './utils/spotify';
import { useUserData } from './context/UserDataContext.jsx';
import { scopedKey, storageKeys } from './utils/storage.js';

function App() {
  const {
    userId,
    city,
    setCity,
    settings,
    setSettings,
    persistSpotifySecretsToLocalStorage,
  } = useUserData();

  const [showSettings, setShowSettings] = useState(false);
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
  }, [settings.spotifyRefreshToken, settings.spotifyTokenExpiresAt, settings.spotifyClientId]);

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
      } else if (e.code === 'Space') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('timer-toggle'));
      } else if (e.key.toLowerCase() === 'r') {
        window.dispatchEvent(new CustomEvent('timer-reset'));
      } else if (e.key.toLowerCase() === 'm') {
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
  }, [showSettings]);

  // Exhaustive list of video streams with categories
  const cities = {
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
    train: { name: 'Norway Train', id: 'HyGci9POlW8', category: 'Focus' }
  };

  const currentCity = cities[city] || cities.shibuya;

  return (
    <div className="app-container">
      <BackgroundVideo videoId={currentCity.id} />

      <div className="overlay">
        <header className="top-bar glass-panel">
          <div className="header-left">
            <h1>World Focus</h1>
          </div>

          <CitySelector
            currentCity={city}
            cities={cities}
            onSelect={setCity}
          />

          <div className="header-right">
          </div>
        </header>

        <main className="main-content">
          <div className="main-grid">
            <Timer settings={settings} />
            <TaskList />
          </div>
        </main>

        <footer className="bottom-bar glass-panel">
          <p>Studying in {currentCity.name}</p>
        </footer>
      </div>

      <Report />
      <button
        className="settings-btn"
        onClick={() => setShowSettings(true)}
        title="Settings"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
      </button>

      <a
        className="recommend-btn"
        href="mailto:massias.arthur@gmail.com?subject=World%20Focus%20-%20Suggestion&body=Hi!%0A%0AI%20would%20like%20to%20suggest%3A%0A%0A%5B%20%5D%20A%20new%20YouTube%20live%20view%0A%5B%20%5D%20A%20new%20feature%0A%0ADetails%3A%0A"
        title="Suggest a YouTube live view or request a feature"
        aria-label="Suggest a YouTube live view or request a feature"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><line x1="9" y1="9" x2="15" y2="9"></line><line x1="9" y1="13" x2="15" y2="13"></line></svg>
      </a>

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

      {showSettings && (
        <SettingsModal
          settings={settings}
          updateSettings={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      <style jsx>{`
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
          padding: clamp(0.75rem, 3vw, 2rem);
          z-index: 10;
        }
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
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          z-index: 100;
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
        .recommend-btn {
          position: fixed;
          top: calc(env(safe-area-inset-top, 0px) + 0.75rem + 144px);
          right: calc(env(safe-area-inset-right, 0px) + 0.75rem);
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          z-index: 100;
          text-decoration: none;
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
          margin-bottom: auto;
          display: flex;
          justify-content: center;
          align-items: center;
          flex: 1;
          width: 100%;
          pointer-events: none; /* Let clicks pass through if needed, but buttons need pointer-events: auto */
        }
        .main-grid {
            display: flex;
            gap: 2rem;
            align-items: flex-start;
            flex-wrap: wrap;
            justify-content: center;
            margin-bottom: 1.25rem;
            pointer-events: auto; /* Reactivate for controls */
        }
        .bottom-bar {
          margin-top: auto; /* Keep at bottom */
          padding: 0.8rem 2rem;
          font-size: 0.9rem;
          font-weight: 300;
          letter-spacing: 1px;
        }
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

        @media (max-width: 768px) {
          .main-grid {
            flex-direction: column;
            align-items: stretch;
            width: 100%;
          }
          .top-bar {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
