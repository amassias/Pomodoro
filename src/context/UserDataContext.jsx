import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../utils/supabase';
import { readJson, removeKey, scopedKey, storageKeys, writeJson } from '../utils/storage';
import { getLocalDateKey } from '../utils/dateUtils';
import { useAuth } from './AuthContext.jsx';

const UserDataContext = createContext(null);

const DEFAULT_CITY = 'seoul_hangang';
const DEFAULT_SPOTIFY_PLAYLIST = 'spotify:playlist:0vvXsWCC9xrXsKd4JyS05a';

const getDefaultSettings = ({ userId }) => {
  const savedSpotifyClientId =
    localStorage.getItem(storageKeys.spotifyClientId) ||
    import.meta.env.VITE_SPOTIFY_CLIENT_ID ||
    'c017309c2bfc4c9f9c6794e18c79f250';

  const tokenKey = scopedKey(userId, storageKeys.spotifyToken);
  const refreshTokenKey = scopedKey(userId, storageKeys.spotifyRefreshToken);
  const expiresAtKey = scopedKey(userId, storageKeys.spotifyExpiresAt);
  const playlistKey = scopedKey(userId, storageKeys.spotifySelectedPlaylistUri);

  const savedSpotifyToken = localStorage.getItem(tokenKey);
  const savedSpotifyRefreshToken = localStorage.getItem(refreshTokenKey);
  const savedSpotifyExpiresAt = localStorage.getItem(expiresAtKey);
  const savedSpotifySelectedPlaylistUri =
    localStorage.getItem(playlistKey) || DEFAULT_SPOTIFY_PLAYLIST;

  return {
    focusDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    sound: 'beep',
    alarmVolume: 70,
    alarmRepeat: 3,
    tickingSound: 'none',
    tickingVolume: 50,
    autoStartBreaks: false,
    autoStartPomodoros: false,
    musicProvider: 'lofi',
    dailyGoal: 120, // 2 hours in minutes

    // Spotify preferences + local-only secrets
    spotifyClientId: savedSpotifyClientId,
    spotifySelectedPlaylistUri: savedSpotifySelectedPlaylistUri,
    spotifyToken: savedSpotifyToken || null,
    spotifyRefreshToken: savedSpotifyRefreshToken || null,
    spotifyTokenExpiresAt: savedSpotifyExpiresAt ? Number(savedSpotifyExpiresAt) : null,
  };
};

const sanitizeSettingsForDb = (settings) => {
  const {
    spotifyToken: _spotifyToken,
    spotifyRefreshToken: _spotifyRefreshToken,
    spotifyTokenExpiresAt: _spotifyTokenExpiresAt,
    ...rest
  } = settings || {};

  return rest;
};

const mergeSettings = ({ defaults, persisted }) => {
  if (!persisted || typeof persisted !== 'object') return defaults;
  return {
    ...defaults,
    ...persisted,

    // Ensure spotify secrets always come from localStorage-scoped defaults.
    spotifyToken: defaults.spotifyToken,
    spotifyRefreshToken: defaults.spotifyRefreshToken,
    spotifyTokenExpiresAt: defaults.spotifyTokenExpiresAt,
  };
};

const isEffectivelyEmpty = (value, type) => {
  if (type === 'array') return !Array.isArray(value) || value.length === 0;
  if (type === 'object') return !value || typeof value !== 'object' || Object.keys(value).length === 0;
  return value == null;
};

const normalizeTask = (task) => {
  if (!task || typeof task !== 'object') return null;
  const id =
    typeof task.id === 'string'
      ? task.id
      : typeof task.id === 'number'
        ? String(task.id)
        : null;
  if (!id) return null;

  return {
    id,
    text: typeof task.text === 'string' ? task.text : '',
    completed: typeof task.completed === 'boolean' ? task.completed : false,
  };
};

const normalizeTasks = (maybeTasks) => {
  if (!Array.isArray(maybeTasks)) return [];
  return maybeTasks.map(normalizeTask).filter(Boolean);
};

const normalizeArchivedTask = (task) => {
  const normalized = normalizeTask(task);
  if (!normalized) return null;
  const archivedAt = typeof task.archivedAt === 'string' ? task.archivedAt : null;
  return {
    ...normalized,
    archivedAt,
  };
};

const normalizeArchivedTasks = (maybeTasks) => {
  if (!Array.isArray(maybeTasks)) return [];
  return maybeTasks.map(normalizeArchivedTask).filter(Boolean);
};

export const UserDataProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [loading, setLoading] = useState(true);

  const [tasks, setTasks] = useState([]);
  const [archivedTasks, setArchivedTasks] = useState([]);
  const [pomodoroHistory, setPomodoroHistory] = useState({});
  const [favoriteCities, setFavoriteCities] = useState([]);
  const [customLocations, setCustomLocations] = useState({});
  const [city, setCity] = useState(DEFAULT_CITY);
  const [settings, setSettings] = useState(() => getDefaultSettings({ userId: null }));

  const debounceRef = useRef(null);
  const lastLoadedUserIdRef = useRef(null);

  // Load user state from DB (or guest state from localStorage).
  useEffect(() => {
    let cancelled = false;

    const loadGuest = () => {
      setTasks(normalizeTasks(readJson(storageKeys.tasks, [])));
      setArchivedTasks(normalizeArchivedTasks(readJson(storageKeys.archivedTasks, [])));
      setPomodoroHistory(readJson(storageKeys.history, {}));
      setFavoriteCities(readJson(storageKeys.favoriteCities, []));
      setCustomLocations(readJson(storageKeys.customLocations, {}));
      setCity(localStorage.getItem(storageKeys.city) || DEFAULT_CITY);
      setSettings(getDefaultSettings({ userId: null }));
    };

    const ensureRow = async (id) => {
      // Try fetching first.
      const { data, error } = await supabase
        .from('user_state')
        .select('user_id, city, tasks, archived_tasks, pomodoro_history, settings, favorite_cities')
        .eq('user_id', id)
        .maybeSingle();

      if (error) throw error;
      if (data) return data;

      const defaults = {
        user_id: id,
        city: DEFAULT_CITY,
        tasks: [],
        archived_tasks: [],
        pomodoro_history: {},
        favorite_cities: [],
        settings: {},
      };

      const insert = await supabase.from('user_state').insert(defaults).select().single();
      if (insert.error) throw insert.error;
      return insert.data;
    };

    const run = async () => {
      setLoading(true);
      try {
        if (!userId) {
          loadGuest();
          return;
        }

        const row = await ensureRow(userId);

        // Optional one-time migration from guest localStorage → account.
        // Only when the account is empty and guest has data.
        const guestTasks = normalizeTasks(readJson(storageKeys.tasks, []));
        const guestArchived = normalizeArchivedTasks(readJson(storageKeys.archivedTasks, []));
        const guestHistory = readJson(storageKeys.history, {});
        const guestFavorites = readJson(storageKeys.favoriteCities, []);

        const shouldMigrate =
          isEffectivelyEmpty(row.tasks, 'array') &&
          isEffectivelyEmpty(row.archived_tasks, 'array') &&
          isEffectivelyEmpty(row.pomodoro_history, 'object') &&
          isEffectivelyEmpty(row.favorite_cities, 'array') &&
          (!isEffectivelyEmpty(guestTasks, 'array') ||
            !isEffectivelyEmpty(guestArchived, 'array') ||
            !isEffectivelyEmpty(guestHistory, 'object') ||
            !isEffectivelyEmpty(guestFavorites, 'array'));

        const mergedRow = shouldMigrate
          ? {
            ...row,
            tasks: guestTasks,
            archived_tasks: guestArchived,
            pomodoro_history: guestHistory && typeof guestHistory === 'object' ? guestHistory : {},
            favorite_cities: Array.isArray(guestFavorites) ? guestFavorites : [],
          }
          : row;

        if (!cancelled) {
          setTasks(normalizeTasks(mergedRow.tasks));
          setArchivedTasks(normalizeArchivedTasks(mergedRow.archived_tasks));
          setPomodoroHistory(
            mergedRow.pomodoro_history && typeof mergedRow.pomodoro_history === 'object'
              ? mergedRow.pomodoro_history
              : {}
          );
          setFavoriteCities(Array.isArray(mergedRow.favorite_cities) ? mergedRow.favorite_cities : []);
          setCity(mergedRow.city || DEFAULT_CITY);

          const defaults = getDefaultSettings({ userId });
          setSettings(mergeSettings({ defaults, persisted: mergedRow.settings }));

          lastLoadedUserIdRef.current = userId;
        }

        if (shouldMigrate) {
          // Persist migrated state, then clear guest keys to avoid cross-account leakage.
          await supabase
            .from('user_state')
            .upsert(
              {
                user_id: userId,
                city: mergedRow.city || DEFAULT_CITY,
                tasks: normalizeTasks(mergedRow.tasks),
                archived_tasks: normalizeArchivedTasks(mergedRow.archived_tasks),
                pomodoro_history: mergedRow.pomodoro_history,
                favorite_cities: Array.isArray(mergedRow.favorite_cities) ? mergedRow.favorite_cities : [],
                settings: mergedRow.settings || {},
              },
              { onConflict: 'user_id' }
            );

          removeKey(storageKeys.tasks);
          removeKey(storageKeys.archivedTasks);
          removeKey(storageKeys.history);
          removeKey(storageKeys.favoriteCities);
        }
      } catch (err) {
        console.warn('Failed to load user state', err);
        if (!cancelled) {
          // Fall back to guest state if DB fails.
          loadGuest();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Persist guest data to localStorage (no DB).
  useEffect(() => {
    if (userId) return;
    writeJson(storageKeys.tasks, tasks);
  }, [userId, tasks]);

  useEffect(() => {
    if (userId) return;
    writeJson(storageKeys.archivedTasks, archivedTasks);
  }, [userId, archivedTasks]);

  useEffect(() => {
    if (userId) return;
    writeJson(storageKeys.history, pomodoroHistory);
  }, [userId, pomodoroHistory]);

  useEffect(() => {
    if (userId) return;
    writeJson(storageKeys.favoriteCities, favoriteCities);
  }, [userId, favoriteCities]);

  useEffect(() => {
    if (userId) return;
    writeJson(storageKeys.customLocations, customLocations);
  }, [userId, customLocations]);

  useEffect(() => {
    if (userId) return;
    if (city) localStorage.setItem(storageKeys.city, city);
  }, [userId, city]);

  // Debounced DB persistence for logged-in users.
  useEffect(() => {
    if (!userId) return;

    // Avoid immediate write while we are still loading/initializing.
    if (loading) return;

    // If the auth user changed and we haven't loaded yet, skip.
    if (lastLoadedUserIdRef.current && lastLoadedUserIdRef.current !== userId) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        await supabase
          .from('user_state')
          .upsert(
            {
              user_id: userId,
              city: city || DEFAULT_CITY,
              tasks: normalizeTasks(tasks),
              archived_tasks: normalizeArchivedTasks(archivedTasks),
              pomodoro_history:
                pomodoroHistory && typeof pomodoroHistory === 'object' ? pomodoroHistory : {},
              favorite_cities: favoriteCities,
              settings: sanitizeSettingsForDb(settings),
            },
            { onConflict: 'user_id' }
          );
      } catch (err) {
        console.warn('Failed to persist user state', err);
      }
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [userId, loading, tasks, archivedTasks, pomodoroHistory, favoriteCities, city, settings]);

  const persistSpotifySecretsToLocalStorage = useCallback(({ token, refreshToken, expiresAt }) => {
    const tokenKey = scopedKey(userId, storageKeys.spotifyToken);
    const refreshTokenKey = scopedKey(userId, storageKeys.spotifyRefreshToken);
    const expiresAtKey = scopedKey(userId, storageKeys.spotifyExpiresAt);

    if (token) localStorage.setItem(tokenKey, token);
    if (refreshToken) localStorage.setItem(refreshTokenKey, refreshToken);
    if (expiresAt) localStorage.setItem(expiresAtKey, String(expiresAt));
  }, [userId]);

  const clearSpotifySecretsFromLocalStorage = useCallback((id) => {
    const tokenKey = scopedKey(id, storageKeys.spotifyToken);
    const refreshTokenKey = scopedKey(id, storageKeys.spotifyRefreshToken);
    const expiresAtKey = scopedKey(id, storageKeys.spotifyExpiresAt);

    removeKey(tokenKey);
    removeKey(refreshTokenKey);
    removeKey(expiresAtKey);
  }, []);

  const value = useMemo(() => {
    return {
      loading,
      userId,

      tasks,
      setTasks,

      archivedTasks,
      setArchivedTasks,

      pomodoroHistory,
      setPomodoroHistory,

      city,
      setCity,

      favoriteCities, // expose to consumers
      toggleFavorite: (cityId) => {
        setFavoriteCities((prev) => {
          const s = new Set(prev);
          if (s.has(cityId)) s.delete(cityId);
          else s.add(cityId);
          return Array.from(s);
        });
      },

      customLocations,
      addCustomLocation: (name, videoId) => {
        const key = `custom_${videoId}`;
        setCustomLocations((prev) => ({
          ...prev,
          [key]: { name, id: videoId, category: 'Custom' }
        }));
        return key;
      },
      removeCustomLocation: (key) => {
        setCustomLocations((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      },

      settings,
      setSettings,

      persistSpotifySecretsToLocalStorage,
      clearSpotifySecretsFromLocalStorage,

      getTodayProgress: () => {
        const today = getLocalDateKey();
        const sessions = pomodoroHistory[today] || [];
        return sessions.reduce((acc, session) => acc + (session.duration || 0), 0);
      },
    };
  }, [loading, userId, tasks, archivedTasks, pomodoroHistory, favoriteCities, customLocations, city, settings, persistSpotifySecretsToLocalStorage, clearSpotifySecretsFromLocalStorage]);

  return <UserDataContext.Provider value={value}>{children}</UserDataContext.Provider>;
};

export const useUserData = () => {
  const ctx = useContext(UserDataContext);
  if (!ctx) {
    throw new Error('useUserData must be used within UserDataProvider');
  }
  return ctx;
};
