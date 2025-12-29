import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import SpotifyCallback from './components/SpotifyCallback.jsx';
import SupabaseCallback from './components/SupabaseCallback.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './index.css';

const pathname = window.location.pathname;
const searchParams = new URLSearchParams(window.location.search);

const isSupabaseCallback = pathname.startsWith('/auth-callback');

const hasOAuthParams = searchParams.has('code') || searchParams.has('error');
const hasSpotifyPkce = Boolean(
    localStorage.getItem('spotify_pkce_verifier') || localStorage.getItem('spotify_auth_state')
);
const isSpotifyCallback = pathname.startsWith('/spotify-callback') || (hasOAuthParams && hasSpotifyPkce);

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <AuthProvider>
            {isSupabaseCallback ? (
                <SupabaseCallback />
            ) : isSpotifyCallback ? (
                <SpotifyCallback />
            ) : (
                <App />
            )}
        </AuthProvider>
    </React.StrictMode>,
)
