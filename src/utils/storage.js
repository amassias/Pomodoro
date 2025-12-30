export const storageKeys = {
  tasks: 'pomodoro-tasks',
  archivedTasks: 'pomodoro-archived-tasks',
  history: 'pomodoroHistory',
  city: 'pomodoro-city',

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
