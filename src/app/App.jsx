import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import BackgroundVideo from '../features/location/BackgroundVideo';
import Timer from '../features/timer/Timer';
import CitySelector from '../features/location/CitySelector';
import TaskList from '../features/tasks/TaskList';
import DailyProgress from '../features/location/DailyProgress';
import SharedSessionControl from '../features/shared/SharedSessionControl';
import { useUserData } from '../providers/UserDataProvider.jsx';
import { hasCompletedOnboarding, setOnboardingCompleted } from '../lib/storage.js';
import { useLiveLocations } from '../features/location/useLiveLocations';
import { useSpotifySession } from '../features/audio/useSpotifySession';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { startThirdPartyPerformanceMonitoring } from '../lib/performanceMonitoring';

const LofiPlayer = lazy(() => import('../features/audio/LofiPlayer'));
const SpotifyPlayer = lazy(() => import('../features/audio/SpotifyPlayer'));
const Report = lazy(() => import('../features/report/Report'));
const SettingsModal = lazy(() => import('../features/settings/SettingsModal'));
const FeedbackModal = lazy(() => import('../features/feedback/FeedbackModal'));
const WelcomeModal = lazy(() => import('../features/onboarding/WelcomeModal'));
const OnboardingTour = lazy(() => import('../features/onboarding/OnboardingTour'));

import AchievementWatcher from '../features/report/AchievementWatcher';
import './App.css';

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

  // Once user data has loaded, show the welcome screen to each user who has not finished onboarding.
  const [onboardingCheckedFor, setOnboardingCheckedFor] = useState(undefined);
  if (!userDataLoading && onboardingCheckedFor !== userId) {
    setOnboardingCheckedFor(userId);
    if (!hasCompletedOnboarding(userId)) setShowWelcome(true);
  }

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

  const { visibleCities, currentCity, isValidatingLocations, locationsError, validationFailed, handleVideoError } = useLiveLocations({ userId, userDataLoading, city, setCity, customLocations });
  const { spotifyProduct } = useSpotifySession({ userId, settings, setSettings, persistSpotifySecretsToLocalStorage });
  useKeyboardShortcuts({ settings, setSettings, showSettings, setShowSettings });


  return (
    <div className="app-container">
      {currentCity?.id ? (
        <BackgroundVideo key={currentCity.id} videoId={currentCity.id} onVideoError={handleVideoError} />
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
          currentCityLabel={currentCity?.name}
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
          <button onClick={() => setShowFeedbackModal(true)}>Feedback</button>
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

      <Analytics />
    </div>
  );
}

export default App;
