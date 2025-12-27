import React, { useState, useEffect } from 'react';
import BackgroundVideo from './components/BackgroundVideo';
import Timer from './components/Timer';
import CitySelector from './components/CitySelector';
import TaskList from './components/TaskList';
import LofiPlayer from './components/LofiPlayer';
import SpotifyPlayer from './components/SpotifyPlayer';
import Report from './components/Report';
import SettingsModal from './components/SettingsModal';
import { getTokenFromUrl } from './utils/spotify';

function App() {
  const [city, setCity] = useState('seoul_hangang');
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    focusDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    sound: 'beep',
    alarmVolume: 70,
    alarmRepeat: 1,
    tickingSound: 'none',
    tickingVolume: 50,
    autoStartBreaks: false,
    autoStartPomodoros: false,
    musicProvider: 'lofi', // lofi | spotify
    spotifyClientId: localStorage.getItem('spotifyClientId') || 'c017309c2bfc4c9f9c6794e18c79f250',
    spotifyToken: localStorage.getItem('spotifyToken') || null
  });

  useEffect(() => {
    // 1. Check if we are the Popup Window returning with a token
    const hash = getTokenFromUrl();
    const _token = hash.access_token;

    if (_token && window.opener) {
      // We are in the popup, send token to main app and close
      window.opener.postMessage({ type: 'SPOTIFY_TOKEN', token: _token }, window.location.origin);
      window.close();
      return;
    }

    // 2. Check if we are the Main App receiving the token
    const handleMessage = (event) => {
      // Validate origin for security
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'SPOTIFY_TOKEN' && event.data.token) {
        const newToken = event.data.token;
        setSettings(prev => ({ ...prev, spotifyToken: newToken }));
        localStorage.setItem('spotifyToken', newToken);

        // Clear hash if any
        window.location.hash = "";
      }
    };

    window.addEventListener('message', handleMessage);

    // 3. Check for existing token in URL (fallback if opened directly or redirect)
    if (_token && !window.opener) {
      setSettings(prev => ({ ...prev, spotifyToken: _token }));
      localStorage.setItem('spotifyToken', _token);
      window.location.hash = "";
    }

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Persist Spotify Client ID
  useEffect(() => {
    if (settings.spotifyClientId) {
      localStorage.setItem('spotifyClientId', settings.spotifyClientId);
    }
  }, [settings.spotifyClientId]);

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

      {settings.musicProvider === 'spotify' ? (
        <SpotifyPlayer token={settings.spotifyToken} playing={false} />
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
          width: 100vw;
          height: 100vh;
        }
        .overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          /* justify-content: space-between; Removed to allow absolute header */
          align-items: center;
          padding: 2rem;
          z-index: 10;
        }
        .top-bar {
          position: absolute; /* Taken out of flow */
          top: 0;
          left: 0;
          right: 0;
          margin: 0 auto; /* Center horizontal if max-width applies */
          padding: 1rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          width: 90%; /* bit less than 100 to show floating effect */
          max-width: 1200px;
          z-index: 100;
          
          /* Auto-hide logic */
          transform: translateY(-85%); /* Hide most of it by default */
          opacity: 0.3; /* Dim it */
          transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
          border-bottom-left-radius: 24px;
          border-bottom-right-radius: 24px;
          border-top-left-radius: 0; /* Attach to top */
          border-top-right-radius: 0;
        }
        .top-bar:hover {
          transform: translateY(0);
          opacity: 1;
        }
        
        /* Settings Button */
        .settings-btn {
          position: fixed;
          top: 5.5rem;
          right: 2rem;
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
      `}</style>
    </div>
  );
}

export default App;
