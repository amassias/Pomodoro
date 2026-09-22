import React, { useCallback, useEffect, useState } from 'react';
import { markBadYoutubeVideoId, readBadYoutubeVideoIds } from '../../lib/storage.js';
import { CITIES } from './cities';

// Merges built-in and custom locations, checks which YouTube streams are live,
// hides streams that failed recently and keeps the selected city on a playable stream.
export const useLiveLocations = ({ userId, userDataLoading, city, setCity, customLocations }) => {
  // Merge built-in CITIES with user's custom locations
  const cities = React.useMemo(() => ({
    ...CITIES,
    ...customLocations
  }), [customLocations]);

  const [isValidatingLocations, setIsValidatingLocations] = useState(true);
  const [locationsError, setLocationsError] = useState(null);
  const [validationFailed, setValidationFailed] = useState(false);
  const [locationCheck, setLocationCheck] = useState(0);
  const [liveYoutubeVideoIds, setLiveYoutubeVideoIds] = useState(() => new Set());

  const [badYoutubeVideoIds, setBadYoutubeVideoIds] = useState(() => readBadYoutubeVideoIds({ userId }));
  useEffect(() => {
    const refresh = () => {
      if (document.hidden || !navigator.onLine) return;
      setBadYoutubeVideoIds(readBadYoutubeVideoIds({ userId }));
      setLocationCheck(value => value + 1);
    };
    const interval = setInterval(refresh, 5 * 60 * 1000);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [userId]);

  useEffect(() => {
    setBadYoutubeVideoIds(readBadYoutubeVideoIds({ userId }));
  }, [userId]);

  useEffect(() => {
    let cancelled = false;

    const validate = async () => {
      // Wait for user data to finish loading before validating
      if (userDataLoading) return;

      setIsValidatingLocations(true);
      setLocationsError(null);

      const videoIds = Array.from(
        new Set(
          Object.values(cities)
            .map((c) => c?.id)
            .filter(Boolean)
        )
      );

      if (!videoIds.length) {
        setLiveYoutubeVideoIds(new Set());
        setIsValidatingLocations(false);
        return;
      }

      // In local dev mode, skip validation entirely and show all locations
      // Vercel serverless functions aren't available locally
      if (import.meta.env.DEV) {
        setLiveYoutubeVideoIds(new Set(videoIds));
        setLocationsError(null);
        setIsValidatingLocations(false);
        return;
      }

      try {
        const response = await fetch('/api/youtube/validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ videoIds }),
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          let details = text;
          try {
            const parsed = JSON.parse(text);
            details = parsed?.error || parsed?.message || text;
          } catch {
            // ignore
          }

          throw new Error(`Validate API failed (${response.status})${details ? `: ${details}` : ''}`);
        }

        const data = await response.json();
        const validIds = Array.isArray(data?.validIds) ? data.validIds : [];
        if (cancelled) return;

        setLiveYoutubeVideoIds(new Set(validIds));
        setValidationFailed(false);
        setIsValidatingLocations(false);
      } catch (err) {
        console.warn('Failed to validate live locations', err);
        if (cancelled) return;

        // Fallback: show all cities instead of none, with a warning
        const allVideoIds = Array.from(
          new Set(
            Object.values(cities)
              .map((c) => c?.id)
              .filter(Boolean)
          )
        );
        setLiveYoutubeVideoIds(new Set(allVideoIds));
        setValidationFailed(true);
        setLocationsError(err instanceof Error ? err.message : 'failed');
        setIsValidatingLocations(false);
      }
    };

    validate();
    return () => {
      cancelled = true;
    };
  }, [cities, userDataLoading, locationCheck]);

  // Exhaustive list of video streams with categories
  const visibleCities = React.useMemo(() => {
    const entries = Object.entries(cities).filter(([, c]) => {
      if (!c?.id) return false;
      if (badYoutubeVideoIds.has(c.id)) return false;
      if (isValidatingLocations) return liveYoutubeVideoIds.has(c.id);
      
      // If validation failed, show all cities except known bad ones
      if (validationFailed) {
        return !badYoutubeVideoIds.has(c.id);
      }
      
      if (!liveYoutubeVideoIds.has(c.id)) return false;
      if (badYoutubeVideoIds.has(c.id)) return false;
      return true;
    });

    return Object.fromEntries(entries);
  }, [badYoutubeVideoIds, cities, isValidatingLocations, liveYoutubeVideoIds, validationFailed]);

  // If the currently selected city is missing/hidden, fall back to the first visible option.
  useEffect(() => {
    // Don't run fallback while still validating - wait for validation to complete
    if (userDataLoading || isValidatingLocations) return;
    // A city that is still visible (not quarantined) is kept as-is.
    if (visibleCities[city]) return;
    // Nothing to switch to: keep the current stream rather than blanking the background.
    if (!Object.keys(visibleCities).length) return;

    // Prefer a fallback in the same category as the previously-selected city.
    const previousCategory = cities?.[city]?.category || null;
    const visibleEntries = Object.entries(visibleCities);

    const sameCategoryFallbackKey = previousCategory
      ? (visibleEntries.find(([, c]) => c?.category === previousCategory)?.[0] || null)
      : null;

    const preferredKey = visibleCities.seoul_hangang ? 'seoul_hangang' : null;
    const firstVisibleKey = visibleEntries[0]?.[0] || null;

    const fallbackKey = sameCategoryFallbackKey || preferredKey || firstVisibleKey || null;

    if (fallbackKey && fallbackKey !== city) {
      setCity(fallbackKey);
    }
  }, [city, cities, userDataLoading, isValidatingLocations, setCity, visibleCities]);

  const currentCity = cities[city] || null;

  const handleVideoError = useCallback(
    ({ videoId, code }) => {
      if (!videoId) return;

      // If the YouTube API itself failed to load (adblock/network), don't permanently hide a specific city.
      if (code === 'api_load_failed' || !navigator.onLine) {
        console.warn('YouTube IFrame API failed to load; cannot evaluate stream health.', { videoId });
        return;
      }

      // Short TTL for timeouts (can be transient), longer TTL for explicit YouTube errors.
      const ttlMs = code === 'play_timeout' ? 5 * 60 * 1000 : 30 * 60 * 1000;

      markBadYoutubeVideoId(videoId, { userId, ttlMs });
      setBadYoutubeVideoIds(readBadYoutubeVideoIds({ userId }));
    },
    [userId]
  );

  return { cities, visibleCities, currentCity, isValidatingLocations, locationsError, validationFailed, handleVideoError };
};
