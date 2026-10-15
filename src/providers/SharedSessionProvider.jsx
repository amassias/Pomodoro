import { browserSessionStorage as storage } from "../lib/browserStorage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "../lib/supabase";
const SharedSessionContext = createContext(null);
const fromUrl = () => {
  const p = new URLSearchParams(location.search);
  return /^[a-z0-9]{8}$/.test(p.get("room") || "") &&
    /^[a-z0-9]{16,128}$/.test(p.get("roomKey") || "")
    ? { id: p.get("room"), key: p.get("roomKey") }
    : null;
};
const profileForTab = () => {
  try {
    const p = JSON.parse(storage.getItem("world-focus-profile"));
    if (typeof p?.name === "string")
      return {
        name: p.name.slice(0, 40),
        avatar: typeof p.avatar === "string" ? p.avatar.slice(0, 12) : "🌱",
      };
  } catch {
    /* new profile */
  }
  const p = {
    name: `Focus friend ${Math.floor(100 + Math.random() * 900)}`,
    avatar: "🌱",
  };
  storage.setItem("world-focus-profile", JSON.stringify(p));
  return p;
};
export const SharedSessionProvider = ({ children }) => {
  const [room, setRoom] = useState(fromUrl);
  const [profile] = useState(profileForTab);
  const [snapshot, setSnapshot] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(
    room ? "connecting" : "idle",
  );
  const [error, setError] = useState("");
  const member = useRef(
    storage.getItem("world-focus-room-member") || crypto.randomUUID(),
  );
  const latest = useRef(null);
  const epoch = useRef(0);
  const requestChain = useRef(Promise.resolve());
  useEffect(() => {
    storage.setItem("world-focus-room-member", member.current);
  }, []);
  const call = useCallback(
    async (action, payload = {}, target = room) => {
      if (!supabase || !target) throw new Error("Room service unavailable.");
      const { data, error: failure } = await supabase.rpc("focus_room", {
        p_action: action,
        p_id: target.id,
        p_key: target.key,
        p_member: member.current,
        p_profile: profile,
        p_payload: payload,
      });
      if (failure) throw failure;
      return data;
    },
    [profile, room],
  );
  const leaveRoom = useCallback(() => {
    const old = room;
    epoch.current++;
    setRoom(null);
    setSnapshot(null);
    setError("");
    setConnectionStatus("idle");
    latest.current = null;
    const url = new URL(location.href);
    for (const k of ["room", "roomKey", "expires"]) url.searchParams.delete(k);
    history.replaceState({}, "", url);
    if (old) call("leave", {}, old).catch(() => {});
  }, [call, room]);
  const update = useCallback((data) => {
    setSnapshot(data);
    setConnectionStatus("connected");
    setError("");
  }, []);
  useEffect(() => {
    if (!room) return;
    let cancelled = false;
    let inFlight = false;
    const current = ++epoch.current;
    const poll = async (action = "snapshot") => {
      if (inFlight) return;
      inFlight = true;
      try {
        const data = await call(action);
        if (!cancelled && epoch.current === current) update(data);
      } catch (failure) {
        if (!cancelled) {
          setError(failure.message);
          setConnectionStatus("error");
        }
      } finally {
        inFlight = false;
      }
    };
    poll("join");
    const timer = setInterval(() => poll(), 3000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [call, room, update]);
  const perform = useCallback(
    (action, payload) => {
      const current = epoch.current;
      requestChain.current = requestChain.current
        .catch(() => {})
        .then(() => call(action, payload))
        .then((data) => {
          if (epoch.current === current) update(data);
        })
        .catch((failure) => {
          if (epoch.current === current) setError(failure.message);
        });
      return requestChain.current;
    },
    [call, update],
  );
  const createRoom = useCallback(async () => {
    if (!supabase) return;
    setConnectionStatus("connecting");
    const next = {
      id: crypto.randomUUID().replaceAll("-", "").slice(0, 8),
      key: crypto.randomUUID().replaceAll("-", ""),
    };
    try {
      const data = await call("create", {}, next);
      setRoom(next);
      update(data);
      const url = new URL(location.href);
      url.searchParams.set("room", next.id);
      url.searchParams.set("roomKey", next.key);
      history.replaceState({}, "", url);
    } catch (failure) {
      setError(failure.message);
      setConnectionStatus("error");
    }
  }, [call, update]);
  const publishTimerState = useCallback(
    (timer) => {
      const signature = JSON.stringify([
        timer.mode,
        timer.isActive,
        timer.endAt,
        timer.isActive ? null : timer.remainingMs,
        timer.durationMs,
        timer.completedFocusSessions,
      ]);
      if (snapshot?.isHost && latest.current !== signature) {
        latest.current = signature;
        perform("timer", timer);
      }
    },
    [perform, snapshot?.isHost],
  );
  const sendRoomEvent = useCallback(
    (payload) => {
      if (payload?.text?.trim()) return perform("message", payload);
    },
    [perform],
  );
  const sendMessage = useCallback(
    (text) => sendRoomEvent({ type: "message", text: text.trim() }),
    [sendRoomEvent],
  );
  const sendReaction = useCallback(
    (text) => sendRoomEvent({ type: "reaction", text }),
    [sendRoomEvent],
  );
  const toggleReady = useCallback(
    () =>
      perform("ready", {
        ready: !snapshot?.participants?.find((p) => p.id === snapshot.memberId)
          ?.ready,
      }),
    [perform, snapshot],
  );
  const toggleRoomLock = useCallback(
    () => perform("lock", { locked: !snapshot?.locked }),
    [perform, snapshot?.locked],
  );
  const kickParticipant = useCallback(
    (targetId) => perform("kick", { targetId }),
    [perform],
  );
  const shareUrl = useMemo(() => {
    if (!room) return null;
    const url = new URL(location.href);
    url.searchParams.set("room", room.id);
    url.searchParams.set("roomKey", room.key);
    return url.href;
  }, [room]);
  const value = {
    isAvailable: Boolean(supabase),
    roomId: room?.id || null,
    isHost: snapshot?.isHost || false,
    participantCount: snapshot?.participants?.length || 1,
    connectionStatus,
    error,
    expiresAt: snapshot?.expiresAt,
    remoteTimerState: snapshot?.timer,
    participants: snapshot?.participants || [],
    messages: snapshot?.messages || [],
    roomLocked: snapshot?.locked || false,
    isReady:
      snapshot?.participants?.find((p) => p.id === snapshot.memberId)?.ready ||
      false,
    profile,
    publishTimerState,
    createRoom,
    leaveRoom,
    shareUrl,
    sendMessage,
    sendReaction,
    toggleReady,
    toggleRoomLock,
    kickParticipant,
    sendRoomEvent,
  };
  return (
    <SharedSessionContext.Provider value={value}>
      {children}
    </SharedSessionContext.Provider>
  );
};
export const useSharedSession = () => {
  const context = useContext(SharedSessionContext);
  if (!context)
    throw new Error(
      "useSharedSession must be used within SharedSessionProvider",
    );
  return context;
};
