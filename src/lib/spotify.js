const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const PKCE_VERIFIER_KEY = "spotify_pkce_verifier";
const PKCE_STATE_KEY = "spotify_auth_state";
const DEFAULT_REDIRECT_PATH = "/spotify-callback";

export const scopes = [
    "streaming",
    "user-read-email",
    "user-read-private",
    "user-read-playback-state",
    "user-modify-playback-state",
    "playlist-read-private",
    "playlist-read-collaborative"
];

const generateRandomString = (length = 64) => {
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let text = "";
    for (let i = 0; i < length; i += 1) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

const sha256 = async (plain) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
    return new Uint8Array(hashBuffer);
};

const base64UrlEncode = (buffer) => {
    return btoa(String.fromCharCode.apply(null, Array.from(buffer)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
};

const buildCodeChallenge = async (verifier) => {
    const hashed = await sha256(verifier);
    return base64UrlEncode(hashed);
};

export const getRedirectUri = () => {
    // You can override the full redirect URI via env (recommended for production).
    const explicit = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
    if (explicit) return explicit;

    // Or override only the path.
    const path = import.meta.env.VITE_SPOTIFY_REDIRECT_PATH || DEFAULT_REDIRECT_PATH;
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${window.location.origin}${normalizedPath}`;
};

export const storePkceValues = (verifier, state) => {
    localStorage.setItem(PKCE_VERIFIER_KEY, verifier);
    localStorage.setItem(PKCE_STATE_KEY, state);
};

export const loadPkceValues = () => ({
    verifier: localStorage.getItem(PKCE_VERIFIER_KEY),
    state: localStorage.getItem(PKCE_STATE_KEY)
});

export const clearPkceValues = () => {
    localStorage.removeItem(PKCE_VERIFIER_KEY);
    localStorage.removeItem(PKCE_STATE_KEY);
};

export const getLoginUrl = async (clientId) => {
    const verifier = generateRandomString(64);
    const challenge = await buildCodeChallenge(verifier);
    const state = generateRandomString(16);
    const redirectUri = getRedirectUri();

    storePkceValues(verifier, state);

    const params = new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        redirect_uri: redirectUri,
        scope: scopes.join(" "),
        code_challenge_method: "S256",
        code_challenge: challenge,
        state,
        show_dialog: "true"
    });

    return `${AUTH_ENDPOINT}?${params.toString()}`;
};

export const exchangeCodeForToken = async ({ clientId, code, redirectUri }) => {
    const { verifier } = loadPkceValues();
    if (!verifier) {
        throw new Error("Missing PKCE verifier. Please start the login again.");
    }

    const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: verifier
    });

    const response = await fetch(TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
    }

    return response.json();
};

export const refreshAccessToken = async ({ clientId, refreshToken }) => {
    const body = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId
    });

    const response = await fetch(TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
    }

    return response.json();
};

export const isTokenExpired = (expiresAt) => {
    if (!expiresAt) return true;
    return Date.now() >= expiresAt - 60000; // refresh 1 minute early
};

export const fetchUserPlaylists = async ({ token, limit = 50 }) => {
    if (!token) throw new Error("Missing Spotify access token");

    let url = `https://api.spotify.com/v1/me/playlists?limit=${encodeURIComponent(limit)}&offset=0`;
    const playlists = [];
    let pageCount = 0;

    while (url) {
        pageCount += 1;
        if (pageCount > 10) break;

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            throw new Error("unauthorized");
        }
        if (response.status === 403) {
            throw new Error("forbidden");
        }
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`spotify_api_error:${response.status}:${text}`);
        }

        const data = await response.json();
        const items = Array.isArray(data.items) ? data.items : [];
        for (const item of items) {
            if (item?.uri && item?.name) {
                playlists.push({
                    id: item.id,
                    name: item.name,
                    uri: item.uri
                });
            }
        }

        url = data.next;
    }

    return playlists;
};

export const getMe = async ({ token }) => {
    if (!token) throw new Error("Missing Spotify access token");

    const response = await fetch("https://api.spotify.com/v1/me", {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (response.status === 401) {
        throw new Error("unauthorized");
    }
    if (response.status === 403) {
        throw new Error("forbidden");
    }
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`spotify_api_error:${response.status}:${text}`);
    }

    return response.json();
};
