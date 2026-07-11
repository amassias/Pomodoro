import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

const SharedSessionContext = createContext(null);
const ROOM_PATTERN = /^[a-z0-9]{8}$/;

const readRoomFromUrl = () => {
  const value = new URLSearchParams(window.location.search).get('room')?.toLowerCase() || '';
  return ROOM_PATTERN.test(value) ? value : null;
};

export const SharedSessionProvider = ({ children }) => {
  const [roomId, setRoomId] = useState(readRoomFromUrl);
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

    const channel = supabase.channel(`focus-room:${roomId}`, {
      config: { presence: { key: participantIdRef.current }, broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setParticipantCount(Math.max(1, Object.keys(state).length));
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
  }, [isHost, roomId]);

  const publishTimerState = useCallback((timerState) => {
    latestTimerStateRef.current = timerState;
    if (!isHost || !channelRef.current) return;
    channelRef.current.send({ type: 'broadcast', event: 'timer-state', payload: timerState });
  }, [isHost]);

  const createRoom = useCallback(() => {
    const nextRoomId = crypto.randomUUID().replaceAll('-', '').slice(0, 8);
    sessionStorage.setItem(`world-focus-host:${nextRoomId}`, 'true');
    const url = new URL(window.location.href);
    url.searchParams.set('room', nextRoomId);
    window.history.pushState({}, '', url);
    setIsHost(true);
    setRoomId(nextRoomId);
    setConnectionStatus('connecting');
  }, []);

  const leaveRoom = useCallback(() => {
    if (roomId) sessionStorage.removeItem(`world-focus-host:${roomId}`);
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    window.history.pushState({}, '', url);
    setRoomId(null);
    setIsHost(false);
    setRemoteTimerState(null);
    setParticipantCount(1);
    setConnectionStatus('idle');
  }, [roomId]);

  const shareUrl = useMemo(() => {
    if (!roomId) return null;
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    return url.toString();
  }, [roomId]);

  const value = useMemo(() => ({ roomId, isHost, participantCount, connectionStatus, remoteTimerState, publishTimerState, createRoom, leaveRoom, shareUrl }), [roomId, isHost, participantCount, connectionStatus, remoteTimerState, publishTimerState, createRoom, leaveRoom, shareUrl]);
  return <SharedSessionContext.Provider value={value}>{children}</SharedSessionContext.Provider>;
};

export const useSharedSession = () => {
  const context = useContext(SharedSessionContext);
  if (!context) throw new Error('useSharedSession must be used within SharedSessionProvider');
  return context;
};
