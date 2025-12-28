import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import SpotifyCallback from './components/SpotifyCallback.jsx';
import './index.css';

const searchParams = new URLSearchParams(window.location.search);
const hasSpotifyParams = searchParams.has('code') || searchParams.has('error');
const isSpotifyCallback = window.location.pathname.startsWith('/spotify-callback') || hasSpotifyParams;

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        {isSpotifyCallback ? <SpotifyCallback /> : <App />}
    </React.StrictMode>,
)
