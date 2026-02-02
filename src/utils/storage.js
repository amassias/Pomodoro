export const storageKeys = {
  tasks: 'pomodoro-tasks',
  archivedTasks: 'pomodoro-archived-tasks',
  history: 'pomodoroHistory',
  city: 'pomodoro-city',

  badYoutubeVideoIds: 'pomodoro-bad-youtube-video-ids',
  favoriteCities: 'pomodoro-favorite-cities',
  customLocations: 'pomodoro-custom-locations',

  spotifyClientId: 'spotifyClientId',
  spotifyToken: 'spotifyToken',
  spotifyRefreshToken: 'spotifyRefreshToken',
  spotifyExpiresAt: 'spotifyTokenExpiresAt',
  spotifyProduct: 'spotifyProduct',
  spotifySelectedPlaylistUri: 'spotifySelectedPlaylistUri',

  spotifyPkceVerifier: 'spotify_pkce_verifier',
  spotifyAuthState: 'spotify_auth_state',
};

export const scopedKey = (userId, key) => {
  if (!userId) return key;
  return `user:${userId}:${key}`;
};

export const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

export const writeJson = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const removeKey = (key) => {
  localStorage.removeItem(key);
};

const DEFAULT_BAD_YOUTUBE_TTL_MS = 24 * 60 * 60 * 1000;

const normalizeBadYoutubeMap = (value) => {
  if (!value || typeof value !== 'object') return {};
  const map = {};
  for (const [videoId, expiresAt] of Object.entries(value)) {
    if (typeof videoId !== 'string' || !videoId) continue;
    if (typeof expiresAt !== 'number' || !Number.isFinite(expiresAt)) continue;
    map[videoId] = expiresAt;
  }
  return map;
};

export const readBadYoutubeVideoIds = ({ userId, now = Date.now() } = {}) => {
  const key = scopedKey(userId, storageKeys.badYoutubeVideoIds);
  const raw = readJson(key, {});
  const map = normalizeBadYoutubeMap(raw);

  let changed = false;
  for (const [videoId, expiresAt] of Object.entries(map)) {
    if (expiresAt <= now) {
      delete map[videoId];
      changed = true;
    }
  }

  if (changed) writeJson(key, map);
  return new Set(Object.keys(map));
};

export const markBadYoutubeVideoId = (
  videoId,
  { userId, now = Date.now(), ttlMs = DEFAULT_BAD_YOUTUBE_TTL_MS } = {}
) => {
  if (typeof videoId !== 'string' || !videoId) return;

  const key = scopedKey(userId, storageKeys.badYoutubeVideoIds);
  const raw = readJson(key, {});
  const map = normalizeBadYoutubeMap(raw);
  map[videoId] = now + ttlMs;
  writeJson(key, map);
};

// Onboarding helpers
const ONBOARDING_KEY = 'pomodoro-onboarding-completed';

export const hasCompletedOnboarding = (userId) => {
  const key = scopedKey(userId, ONBOARDING_KEY);
  return readJson(key, false) === true;
};

export const setOnboardingCompleted = (userId, completed = true) => {
  const key = scopedKey(userId, ONBOARDING_KEY);
  writeJson(key, completed);
};

export const resetOnboarding = (userId) => {
  setOnboardingCompleted(userId, false);
};
