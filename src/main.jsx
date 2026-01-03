import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import SpotifyCallback from './components/SpotifyCallback.jsx';
import SupabaseCallback from './components/SupabaseCallback.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { UserDataProvider } from './context/UserDataContext.jsx';
import './index.css';

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
                {isSpotifyCallback ? (
                    <SpotifyCallback />
                ) : isSupabaseCallback ? (
                    <SupabaseCallback />
                ) : (
                    <UserDataProvider>
                        <App />
                    </UserDataProvider>
                )}
            </AuthProvider>
        </ErrorBoundary>
    </React.StrictMode>,
)
