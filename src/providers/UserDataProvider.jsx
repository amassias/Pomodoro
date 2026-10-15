import { cacheAccountState, readAccountCache, mergeAccountState, syncAccountState } from '../lib/accountSync';
import { browserLocalStorage as localStorage } from '../lib/browserStorage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { readJson, removeKey, scopedKey, storageKeys, writeJson } from '../lib/storage';
import { getLocalDateKey } from '../lib/date';
import { normalizeTasks, normalizeArchivedTasks, normalizeHistory, publicSettings } from '../lib/userState';
import { useAuth } from './AuthProvider.jsx';

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
    weeklyGoal: 600,
    activeTaskId: null,
    shortcutsEnabled: true,
    shortcutToggle: 'Space',
    shortcutReset: 'r',
    shortcutMute: 'm',
    vibrationEnabled: true,
    customPresets: [],
    atmosphereCollections: [],
    routines: [],

    // Spotify preferences + local-only secrets
    spotifyClientId: savedSpotifyClientId,
    spotifySelectedPlaylistUri: savedSpotifySelectedPlaylistUri,
    spotifyToken: savedSpotifyToken || null,
    spotifyRefreshToken: savedSpotifyRefreshToken || null,
    spotifyTokenExpiresAt: savedSpotifyExpiresAt ? Number(savedSpotifyExpiresAt) : null,
  };
};

const sanitizeSettingsForDb = (settings, { customLocations, favoriteCities } = {}) => {
  const {
    spotifyToken: _spotifyToken,
    spotifyRefreshToken: _spotifyRefreshToken,
    spotifyTokenExpiresAt: _spotifyTokenExpiresAt,
    _customLocations: _storedCustomLocations,
    _favoriteCities: _storedFavoriteCities,
    ...rest
  } = settings || {};

  // Keep UI-only location data in settings JSONB so a fresh deployment does
  // not depend on optional database columns being present.
  if (customLocations && typeof customLocations === 'object' && Object.keys(customLocations).length > 0) {
    rest._customLocations = customLocations;
  }
  if (Array.isArray(favoriteCities) && favoriteCities.length > 0) {
    rest._favoriteCities = favoriteCities;
  }

  return rest;
};

const mergeSettings = ({ defaults, persisted }) => {
  if (!persisted || typeof persisted !== 'object') return defaults;
  return {
    ...defaults,
    ...publicSettings(persisted),

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

export const UserDataProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('local');
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  const [tasks, setTasks] = useState([]);
  const [archivedTasks, setArchivedTasks] = useState([]);
  const [pomodoroHistory, setPomodoroHistory] = useState({});
  const [favoriteCities, setFavoriteCities] = useState([]);
  const [customLocations, setCustomLocations] = useState({});
  const [city, setCity] = useState(DEFAULT_CITY);
  const [settings, setSettings] = useState(() => mergeSettings({ defaults: getDefaultSettings({ userId: null }), persisted: readJson(storageKeys.settings, {}) }));

  const debounceRef = useRef(null);
  const accountBaseRef = useRef(null);
  const [syncRetry, setSyncRetry] = useState(0);
  useEffect(() => {
    const retry = () => setSyncRetry(n => n + 1);
    window.addEventListener('online', retry);
    const timer = window.setInterval(retry, 15000);
    return () => { window.removeEventListener('online', retry); window.clearInterval(timer); };
  }, []);
  const lastLoadedUserIdRef = useRef(null);
  const lastRemoteUpdatedAtRef = useRef(null);
  const skipNextPersistRef = useRef(false);

  useEffect(() => {
    const updateStorageStatus = event => {
      if (!userId && event.detail?.kind === 'local') setSyncStatus(event.detail.persistent ? 'local' : 'temporary');
    };
    window.addEventListener('browser-storage-state', updateStorageStatus);
    return () => window.removeEventListener('browser-storage-state', updateStorageStatus);
  }, [userId]);

  // Load user state from DB (or guest state from localStorage).
  useEffect(() => {
    let cancelled = false;

    const loadGuest = () => {
      lastLoadedUserIdRef.current = null;
      setSyncStatus(localStorage.persistent ? 'local' : 'temporary');
      setLastSyncedAt(null);
      setTasks(normalizeTasks(readJson(storageKeys.tasks, [])));
      setArchivedTasks(normalizeArchivedTasks(readJson(storageKeys.archivedTasks, [])));
      setPomodoroHistory(normalizeHistory(readJson(storageKeys.history, {})));
      const favorites = readJson(storageKeys.favoriteCities, []);
      setFavoriteCities(Array.isArray(favorites) ? favorites.filter(id => typeof id === 'string') : []);
      const locations = readJson(storageKeys.customLocations, {});
      setCustomLocations(locations && typeof locations === 'object' && !Array.isArray(locations) ? Object.fromEntries(Object.entries(locations).filter(([, location]) => location && typeof location.id === 'string' && typeof location.name === 'string')) : {});
      setCity(localStorage.getItem(storageKeys.city) || DEFAULT_CITY);
      setSettings(mergeSettings({ defaults: getDefaultSettings({ userId: null }), persisted: readJson(storageKeys.settings, {}) }));
    };

    const ensureRow = async (id) => {
      // Try fetching first.
      const { data, error } = await supabase
        .from('user_state')
        .select('user_id, city, tasks, archived_tasks, pomodoro_history, settings, updated_at')
        .eq('user_id', id)
        .abortSignal(AbortSignal.timeout(10_000))
        .maybeSingle();

      if (error) throw error;
      if (data) return data;

      const defaults = {
        user_id: id,
        city: DEFAULT_CITY,
        tasks: [],
        archived_tasks: [],
        pomodoro_history: {},
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

        const cached = readAccountCache(userId);
        let row;
        try { row = await ensureRow(userId); }
        catch (error) { if (!cached?.row) throw error; row = cached.row; }
        if (cancelled) return;
        accountBaseRef.current = row;
        if (cached?.pending) row = mergeAccountState(cached.row, cached.pending, row);
        if (cancelled) return;

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
          isEffectivelyEmpty(row.settings?._favoriteCities, 'array') &&
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
            settings: sanitizeSettingsForDb(row.settings, {
              customLocations: row.settings?._customLocations,
              favoriteCities: guestFavorites,
            }),
          }
          : row;

        if (!cancelled) {
          setTasks(normalizeTasks(mergedRow.tasks));
          setArchivedTasks(normalizeArchivedTasks(mergedRow.archived_tasks));
          setPomodoroHistory(normalizeHistory(mergedRow.pomodoro_history));
          setCity(mergedRow.city || DEFAULT_CITY);

          const defaults = getDefaultSettings({ userId });
          const persistedSettings = mergedRow.settings || {};
          // Extract location preferences embedded in settings JSONB.
          const {
            _customLocations: dbCustomLocations,
            _favoriteCities: dbFavoriteCities,
            ...cleanPersistedSettings
          } = persistedSettings;
          setFavoriteCities(Array.isArray(dbFavoriteCities) ? dbFavoriteCities : []);
          setSettings(mergeSettings({ defaults, persisted: cleanPersistedSettings }));
          setCustomLocations(
            dbCustomLocations && typeof dbCustomLocations === 'object'
              ? dbCustomLocations
              : {}
          );

          lastLoadedUserIdRef.current = userId;
          lastRemoteUpdatedAtRef.current = mergedRow.updated_at || null;
          setLastSyncedAt(mergedRow.updated_at || null);
          setSyncStatus('synced');
        }

        if (shouldMigrate) {
          // Persist migrated state, then clear guest keys to avoid cross-account leakage.
          const migration = await supabase
            .from('user_state')
            .upsert(
              {
                user_id: userId,
                city: mergedRow.city || DEFAULT_CITY,
                tasks: normalizeTasks(mergedRow.tasks),
                archived_tasks: normalizeArchivedTasks(mergedRow.archived_tasks),
                pomodoro_history: mergedRow.pomodoro_history,
                settings: mergedRow.settings || {},
              },
              { onConflict: 'user_id' }
            );

          if (migration.error) throw migration.error;
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
          setSyncStatus('error');
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
  // Each of these must wait for the initial load, exactly like the city and DB
  // effects below: on mount the state is still empty, so an unguarded write
  // overwrites the stored data before loadGuest() has read it back.
  useEffect(() => {
    if (userId || loading) return;
    writeJson(storageKeys.tasks, tasks);
  }, [userId, loading, tasks]);

  useEffect(() => {
    if (userId || loading) return;
    writeJson(storageKeys.archivedTasks, archivedTasks);
  }, [userId, loading, archivedTasks]);

  useEffect(() => {
    if (userId || loading) return;
    writeJson(storageKeys.history, pomodoroHistory);
  }, [userId, loading, pomodoroHistory]);

  useEffect(() => {
    if (userId || loading) return;
    writeJson(storageKeys.favoriteCities, favoriteCities);
  }, [userId, loading, favoriteCities]);

  useEffect(() => {
    if (userId || loading) return;
    writeJson(storageKeys.customLocations, customLocations);
  }, [userId, loading, customLocations]);

  useEffect(() => {
    if (userId || loading) return;
    if (city) localStorage.setItem(storageKeys.city, city);
  }, [userId, city, loading]);

  useEffect(() => {
    if (userId || loading) return;
    writeJson(storageKeys.settings, publicSettings(settings));
  }, [userId, loading, settings]);

  // Persist the queue before contacting the server. Never share it across accounts.
  useEffect(() => {
    if (!userId || loading || lastLoadedUserIdRef.current !== userId) return;
    if (skipNextPersistRef.current) { skipNextPersistRef.current = false; return; }
    let cancelled = false;
    const payload = { user_id: userId, city: city || DEFAULT_CITY, tasks: normalizeTasks(tasks),
      archived_tasks: normalizeArchivedTasks(archivedTasks), pomodoro_history: pomodoroHistory,
      settings: sanitizeSettingsForDb(settings, { customLocations, favoriteCities }) };
    if (Object.keys(payload).every(key => JSON.stringify(payload[key]) === JSON.stringify(accountBaseRef.current?.[key]))) return;
    cacheAccountState(userId, accountBaseRef.current, payload);
    debounceRef.current = setTimeout(async () => {
      if (!navigator.onLine) { setSyncStatus('offline — changes queued'); return; }
      setSyncStatus('syncing');
      try {
        const row = await syncAccountState(supabase, userId, accountBaseRef.current, payload);
        if (cancelled) return;
        accountBaseRef.current = row;
        lastRemoteUpdatedAtRef.current = row.updated_at;
        cacheAccountState(userId, row);
        skipNextPersistRef.current = true;
        setTasks(normalizeTasks(row.tasks)); setArchivedTasks(normalizeArchivedTasks(row.archived_tasks));
        setPomodoroHistory(normalizeHistory(row.pomodoro_history)); setCity(row.city || DEFAULT_CITY);
        setFavoriteCities(row.settings?._favoriteCities || []); setCustomLocations(row.settings?._customLocations || {});
        setSettings(mergeSettings({ defaults: getDefaultSettings({ userId }), persisted: row.settings }));
        setSyncStatus('synced'); setLastSyncedAt(row.updated_at);
      } catch (err) {
        if (!cancelled) { console.warn('Changes retained for retry', err); setSyncStatus('offline — changes queued'); }
      }
    }, 600);
    return () => { cancelled = true; clearTimeout(debounceRef.current); };
  }, [userId, loading, tasks, archivedTasks, pomodoroHistory, favoriteCities, customLocations, city, settings, syncRetry]);

  useEffect(() => {
    if (!userId || loading) return undefined;
    let cancelled = false;
    const channel = supabase.channel(`user-state-sync:${userId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_state', filter: `user_id=eq.${userId}` }, ({ new: row }) => {
        if (cancelled || !row?.updated_at || row.updated_at === lastRemoteUpdatedAtRef.current) return;
        if (readAccountCache(userId)?.pending) return;
        accountBaseRef.current = row;
        cacheAccountState(userId, row);
        lastLoadedUserIdRef.current = userId;
        lastRemoteUpdatedAtRef.current = row.updated_at;
        skipNextPersistRef.current = true;
        setTasks(normalizeTasks(row.tasks));
        setArchivedTasks(normalizeArchivedTasks(row.archived_tasks));
        setPomodoroHistory(normalizeHistory(row.pomodoro_history));
        setCity(row.city || DEFAULT_CITY);
        const persistedSettings = row.settings || {};
        const {
          _customLocations: remoteLocations,
          _favoriteCities: remoteFavoriteCities,
          ...cleanSettings
        } = persistedSettings;
        setFavoriteCities(Array.isArray(remoteFavoriteCities) ? remoteFavoriteCities : []);
        setCustomLocations(remoteLocations && typeof remoteLocations === 'object' ? remoteLocations : {});
        setSettings(mergeSettings({ defaults: getDefaultSettings({ userId }), persisted: cleanSettings }));
        setLastSyncedAt(row.updated_at);
        setSyncStatus('synced');
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [loading, userId]);

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
    const incompleteTasks = (Array.isArray(tasks) ? tasks : []).filter((task) => !task.completed);
    const activeTask = incompleteTasks.find((task) => task.id === settings.activeTaskId) || incompleteTasks[0] || null;

    return {
      loading,
      userId,
      syncStatus,
      lastSyncedAt,

      tasks,
      setTasks,

      activeTask,

      archivedTasks,
      setArchivedTasks,

      pomodoroHistory,
      setPomodoroHistory,

      city,
      setCity,

      setFavoriteCities,
      setCustomLocations,
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
  }, [loading, userId, syncStatus, lastSyncedAt, tasks, archivedTasks, pomodoroHistory, favoriteCities, customLocations, city, settings, persistSpotifySecretsToLocalStorage, clearSpotifySecretsFromLocalStorage]);

  return <UserDataContext.Provider value={value}>{children}</UserDataContext.Provider>;
};

export const useUserData = () => {
  const ctx = useContext(UserDataContext);
  if (!ctx) {
    throw new Error('useUserData must be used within UserDataProvider');
  }
  return ctx;
};
