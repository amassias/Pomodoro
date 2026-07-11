import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

const SharedSessionContext = createContext(null);
const ROOM_PATTERN = /^[a-z0-9]{8}$/;
const ROOM_KEY_PATTERN = /^[a-z0-9]{16}$/;

const readRoomFromUrl = () => {
  const value = new URLSearchParams(window.location.search).get('room')?.toLowerCase() || '';
  return ROOM_PATTERN.test(value) ? value : null;
};

const readRoomKeyFromUrl = () => {
  const value = new URLSearchParams(window.location.search).get('roomKey')?.toLowerCase() || '';
  return ROOM_KEY_PATTERN.test(value) ? value : 'public-session';
};

const readExpiryFromUrl = () => {
  const value = Number(new URLSearchParams(window.location.search).get('expires'));
  return Number.isFinite(value) && value > Date.now() ? value : null;
};

export const SharedSessionProvider = ({ children }) => {
  const [roomId, setRoomId] = useState(readRoomFromUrl);
  const [roomKey, setRoomKey] = useState(readRoomKeyFromUrl);
  const [expiresAt, setExpiresAt] = useState(readExpiryFromUrl);
  const [participantCount, setParticipantCount] = useState(1);
  const [connectionStatus, setConnectionStatus] = useState(roomId ? 'connecting' : 'idle');
  const [remoteTimerState, setRemoteTimerState] = useState(null);
  const [isHost, setIsHost] = useState(() => Boolean(roomId && sessionStorage.getItem(`world-focus-host:${roomId}`)));
  const channelRef = useRef(null);
  const latestTimerStateRef = useRef(null);
  const participantIdRef = useRef(sessionStorage.getItem('world-focus-participant-id') || crypto.randomUUID());

  useEffect(() => {
    sessionStorage.setItem('world-focus-participant-id', participantIdRef.current);
  }, []);

  useEffect(() => {
    if (!roomId) return undefined;

    if (!expiresAt && roomKey !== 'public-session') {
      const timeoutId = window.setTimeout(() => setConnectionStatus('expired'), 0);
      return () => window.clearTimeout(timeoutId);
    }

    const channel = supabase.channel(`focus-room:${roomId}:${roomKey}`, {
      config: { presence: { key: participantIdRef.current }, broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setParticipantCount(Math.max(1, Object.keys(state).length));
        const entries = Object.entries(state).sort(([left], [right]) => left.localeCompare(right));
        const hasHost = entries.some(([, presences]) => presences.some((presence) => presence.role === 'host'));
        if (!hasHost && entries[0]?.[0] === participantIdRef.current) {
          sessionStorage.setItem(`world-focus-host:${roomId}`, 'true');
          setIsHost(true);
        }
      })
      .on('broadcast', { event: 'timer-state' }, ({ payload }) => {
        if (!isHost && payload?.mode) setRemoteTimerState(payload);
      })
      .on('broadcast', { event: 'request-state' }, () => {
        if (isHost && latestTimerStateRef.current) {
          channel.send({ type: 'broadcast', event: 'timer-state', payload: latestTimerStateRef.current });
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          await channel.track({ role: isHost ? 'host' : 'guest', joinedAt: new Date().toISOString() });
          if (!isHost) channel.send({ type: 'broadcast', event: 'request-state', payload: {} });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionStatus('error');
        }
      });

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [expiresAt, isHost, roomId, roomKey]);

  const publishTimerState = useCallback((timerState) => {
    latestTimerStateRef.current = timerState;
    if (!isHost || !channelRef.current) return;
    channelRef.current.send({ type: 'broadcast', event: 'timer-state', payload: timerState });
  }, [isHost]);

  const createRoom = useCallback(() => {
    const nextRoomId = crypto.randomUUID().replaceAll('-', '').slice(0, 8);
    const nextRoomKey = crypto.randomUUID().replaceAll('-', '').slice(0, 16);
    const nextExpiry = Date.now() + 4 * 60 * 60 * 1000;
    sessionStorage.setItem(`world-focus-host:${nextRoomId}`, 'true');
    const url = new URL(window.location.href);
    url.searchParams.set('room', nextRoomId);
    url.searchParams.set('roomKey', nextRoomKey);
    url.searchParams.set('expires', String(nextExpiry));
    window.history.pushState({}, '', url);
    setIsHost(true);
    setRoomId(nextRoomId);
    setRoomKey(nextRoomKey);
    setExpiresAt(nextExpiry);
    setConnectionStatus('connecting');
  }, []);

  const leaveRoom = useCallback(() => {
    if (roomId) sessionStorage.removeItem(`world-focus-host:${roomId}`);
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    url.searchParams.delete('roomKey');
    url.searchParams.delete('expires');
    window.history.pushState({}, '', url);
    setRoomId(null);
    setRoomKey('public-session');
    setExpiresAt(null);
    setIsHost(false);
    setRemoteTimerState(null);
    setParticipantCount(1);
    setConnectionStatus('idle');
  }, [roomId]);

  useEffect(() => {
    if (!roomId || !expiresAt) return undefined;
    const delay = Math.max(0, expiresAt - Date.now());
    const timeoutId = window.setTimeout(leaveRoom, delay);
    return () => window.clearTimeout(timeoutId);
  }, [expiresAt, leaveRoom, roomId]);

  const shareUrl = useMemo(() => {
    if (!roomId) return null;
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    url.searchParams.set('roomKey', roomKey);
    if (expiresAt) url.searchParams.set('expires', String(expiresAt));
    return url.toString();
  }, [expiresAt, roomId, roomKey]);

  const value = useMemo(() => ({ roomId, isHost, participantCount, connectionStatus, expiresAt, remoteTimerState, publishTimerState, createRoom, leaveRoom, shareUrl }), [roomId, isHost, participantCount, connectionStatus, expiresAt, remoteTimerState, publishTimerState, createRoom, leaveRoom, shareUrl]);
  return <SharedSessionContext.Provider value={value}>{children}</SharedSessionContext.Provider>;
};

export const useSharedSession = () => {
  const context = useContext(SharedSessionContext);
  if (!context) throw new Error('useSharedSession must be used within SharedSessionProvider');
  return context;
};
