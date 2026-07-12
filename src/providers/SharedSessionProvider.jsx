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

const defaultProfile = () => {
  const stored = sessionStorage.getItem('world-focus-profile');
  if (stored) {
    try { return JSON.parse(stored); } catch { /* use generated profile */ }
  }
  const profile = { name: `Focus friend ${Math.floor(100 + Math.random() * 900)}`, avatar: ['🌱', '🍅', '🌙', '⚡', '🧠'][Math.floor(Math.random() * 5)] };
  sessionStorage.setItem('world-focus-profile', JSON.stringify(profile));
  return profile;
};

const roomHistoryKey = (roomId) => `world-focus-room-history:${roomId}`;

const readRoomHistory = (roomId) => {
  if (!roomId) return [];
  try {
    const value = JSON.parse(localStorage.getItem(roomHistoryKey(roomId)) || '[]');
    return Array.isArray(value) ? value.slice(-30) : [];
  } catch {
    return [];
  }
};

export const SharedSessionProvider = ({ children }) => {
  const [roomId, setRoomId] = useState(readRoomFromUrl);
  const [roomKey, setRoomKey] = useState(readRoomKeyFromUrl);
  const [expiresAt, setExpiresAt] = useState(readExpiryFromUrl);
  const [participantCount, setParticipantCount] = useState(1);
  const [connectionStatus, setConnectionStatus] = useState(roomId ? 'connecting' : 'idle');
  const [remoteTimerState, setRemoteTimerState] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState(() => readRoomHistory(readRoomFromUrl()));
  const [roomLocked, setRoomLocked] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [profile] = useState(defaultProfile);
  const [isHost, setIsHost] = useState(() => Boolean(roomId && sessionStorage.getItem(`world-focus-host:${roomId}`)));
  const channelRef = useRef(null);
  const latestTimerStateRef = useRef(null);
  const participantIdRef = useRef(sessionStorage.getItem('world-focus-participant-id') || crypto.randomUUID());

  const appendMessage = useCallback((message) => {
    if (!roomId) return;
    setMessages((previous) => {
      if (previous.some((item) => item.id === message.id)) return previous;
      const next = [...previous, message].slice(-30);
      try { localStorage.setItem(roomHistoryKey(roomId), JSON.stringify(next)); } catch { /* history remains available for this open session */ }
      return next;
    });
  }, [roomId]);

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
        setParticipants(Object.entries(state).flatMap(([id, presences]) => presences.map((presence) => ({ id, ...presence }))));
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
      .on('broadcast', { event: 'room-event' }, ({ payload }) => {
        if (!payload?.type) return;
        if (payload.type === 'message' || payload.type === 'reaction' || payload.type === 'activity') {
          appendMessage({ id: payload.id || crypto.randomUUID(), ...payload, at: payload.at || Date.now() });
        }
        if (payload.type === 'lock') setRoomLocked(Boolean(payload.locked));
        if (payload.type === 'kick' && payload.targetId === participantIdRef.current) window.dispatchEvent(new Event('leave-shared-room'));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          await channel.track({ role: isHost ? 'host' : 'guest', joinedAt: new Date().toISOString(), ...profile, ready: isReady });
          if (!isHost) channel.send({ type: 'broadcast', event: 'request-state', payload: {} });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionStatus('error');
        }
      });

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [appendMessage, expiresAt, isHost, isReady, profile, roomId, roomKey]);

  const publishTimerState = useCallback((timerState) => {
    latestTimerStateRef.current = timerState;
    if (!isHost || !channelRef.current) return;
    channelRef.current.send({ type: 'broadcast', event: 'timer-state', payload: timerState });
  }, [isHost]);

  const sendRoomEvent = useCallback((payload) => {
    if (!channelRef.current) return;
    const event = { ...payload, id: crypto.randomUUID(), at: Date.now(), senderId: participantIdRef.current, senderName: profile.name, senderAvatar: profile.avatar };
    if (event.type === 'message' || event.type === 'reaction' || event.type === 'activity') appendMessage(event);
    channelRef.current.send({ type: 'broadcast', event: 'room-event', payload: event });
  }, [appendMessage, profile]);

  const sendMessage = useCallback((text) => {
    if (text?.trim()) sendRoomEvent({ type: 'message', text: text.trim().slice(0, 280) });
  }, [sendRoomEvent]);

  const sendReaction = useCallback((emoji) => sendRoomEvent({ type: 'reaction', text: emoji }), [sendRoomEvent]);

  const toggleReady = useCallback(() => setIsReady((value) => !value), []);

  const toggleRoomLock = useCallback(() => {
    if (!isHost) return;
    setRoomLocked((value) => {
      sendRoomEvent({ type: 'lock', locked: !value });
      return !value;
    });
  }, [isHost, sendRoomEvent]);

  const kickParticipant = useCallback((targetId) => {
    if (isHost && targetId !== participantIdRef.current) sendRoomEvent({ type: 'kick', targetId });
  }, [isHost, sendRoomEvent]);

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
    setMessages([]);
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
    window.addEventListener('leave-shared-room', leaveRoom);
    return () => window.removeEventListener('leave-shared-room', leaveRoom);
  }, [leaveRoom]);

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

  const value = useMemo(() => ({ roomId, isHost, participantCount, connectionStatus, expiresAt, remoteTimerState, participants, messages, roomLocked, isReady, profile, publishTimerState, createRoom, leaveRoom, shareUrl, sendMessage, sendReaction, toggleReady, toggleRoomLock, kickParticipant, sendRoomEvent }), [roomId, isHost, participantCount, connectionStatus, expiresAt, remoteTimerState, participants, messages, roomLocked, isReady, profile, publishTimerState, createRoom, leaveRoom, shareUrl, sendMessage, sendReaction, toggleReady, toggleRoomLock, kickParticipant, sendRoomEvent]);
  return <SharedSessionContext.Provider value={value}>{children}</SharedSessionContext.Provider>;
};

export const useSharedSession = () => {
  const context = useContext(SharedSessionContext);
  if (!context) throw new Error('useSharedSession must be used within SharedSessionProvider');
  return context;
};
