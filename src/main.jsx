import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import ErrorBoundary from './shared/ui/ErrorBoundary.jsx';
import { AuthProvider } from './providers/AuthProvider.jsx';
import { UserDataProvider } from './providers/UserDataProvider.jsx';
import './index.css';

const App = lazy(() => import('./app/App.jsx'));
const SpotifyCallback = lazy(() => import('./features/auth/SpotifyCallback.jsx'));
const SupabaseCallback = lazy(() => import('./features/auth/SupabaseCallback.jsx'));

const pathname = window.location.pathname;
const searchParams = new URLSearchParams(window.location.search);

const hasOAuthParams = searchParams.has('code') || searchParams.has('error');
const hasSpotifyPkce = Boolean(
    localStorage.getItem('spotify_pkce_verifier') || localStorage.getItem('spotify_auth_state')
);

// Spotify uses PKCE and may redirect to a path that still includes generic OAuth params.
// Prefer Spotify callback handling when PKCE markers are present so it doesn't get
// accidentally handled by SupabaseCallback.
const isSpotifyCallback = pathname.startsWith('/spotify-callback') || (hasOAuthParams && hasSpotifyPkce);
const isSupabaseCallback = pathname.startsWith('/auth-callback') && !isSpotifyCallback;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <Suspense fallback={null}>
          {isSpotifyCallback ? (
            <SpotifyCallback />
          ) : isSupabaseCallback ? (
            <SupabaseCallback />
          ) : (
            <UserDataProvider>
              <App />
            </UserDataProvider>
          )}
        </Suspense>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
