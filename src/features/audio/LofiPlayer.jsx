import { useEffect, useRef, useState } from "react";
import { useRainAudio } from "./useRainAudio";
import { loadYouTubeIframeApi } from "../../lib/youtubePlayer";
import "./LofiPlayer.css";

// Resolve a currently live broadcast; official website links can also expire.
const LofiPlayer = () => {
  const [source, setSource] = useState("radio");
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [broadcast, setBroadcast] = useState(null);
  const [volume, setVolume] = useState(50);
  const host = useRef(null);
  const player = useRef(null);
  const resume = useRef(false);
  const playingRef = useRef(false);
  const volumeRef = useRef(volume);
  const { play, stop } = useRainAudio(volume);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);
  useEffect(() => {
    volumeRef.current = volume;
    player.current?.setVolume?.(volume);
  }, [volume]);

  useEffect(() => {
    if (!open || source !== "radio") return;
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled && !player.current) setError(true);
    }, 15000);
    Promise.all([
      loadYouTubeIframeApi(),
      fetch("/api/youtube/radio", {
        cache: retry > 0 ? "reload" : "default",
        signal: AbortSignal.timeout(12000),
      }).then(async (response) => {
        if (!response.ok) throw new Error("Radio unavailable");
        const data = await response.json();
        if (!/^[\w-]{11}$/.test(data.videoId)) throw new Error("Invalid radio");
        return data;
      }),
    ])
      .then(([YT, data]) => {
        if (cancelled || !host.current) return;
        setBroadcast(data);
        const node = document.createElement("div");
        host.current.appendChild(node);
        player.current = new YT.Player(node, {
          width: "100%",
          height: "200",
          videoId: data.videoId,
          playerVars: {
            autoplay: 0,
            controls: 1,
            playsinline: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              clearTimeout(timeout);
              event.target.setVolume(volumeRef.current);
              event.target.playVideo();
            },
            onStateChange: (event) => {
              if (!cancelled) {
                setPlaying(event.data === 1);
                if (event.data === 1) setError(false);
              }
            },
            onError: () => {
              if (!cancelled) {
                setError(true);
                setPlaying(false);
              }
            },
            onAutoplayBlocked: () => {
              if (!cancelled) setPlaying(false);
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      player.current?.destroy();
      player.current = null;
    };
  }, [open, source, retry]);

  useEffect(() => {
    const pause = () => {
      resume.current =
        source === "radio"
          ? player.current?.getPlayerState?.() === 1
          : playingRef.current;
      if (source === "radio") player.current?.pauseVideo();
      else stop();
      setPlaying(false);
    };
    const restart = () => {
      if (!resume.current) return;
      resume.current = false;
      if (source === "radio") player.current?.playVideo();
      else
        play()
          .then(started => { if (started !== false) setPlaying(true); })
          .catch(() => setError(true));
    };
    window.addEventListener("timer-alarm-start", pause);
    window.addEventListener("timer-alarm-end", restart);
    return () => {
      window.removeEventListener("timer-alarm-start", pause);
      window.removeEventListener("timer-alarm-end", restart);
    };
  }, [source, play, stop]);

  const startRain = async () => {
    resume.current = false;
    player.current?.pauseVideo();
    setSource("rain");
    setOpen(false);
    setError(false);
    try {
      const started = await play();
      if (started === false) return;
      setPlaying(true);
    } catch {
      setError(true);
      setPlaying(false);
    }
  };
  const toggle = () => {
    resume.current = false;
    if (source === "rain") {
      if (playing) {
        stop();
        setPlaying(false);
      } else startRain();
      return;
    }
    if (!open) {
      stop();
      setOpen(true);
      setError(false);
      return;
    }
    if (playing) player.current?.pauseVideo();
    else player.current?.playVideo();
  };
  return (
    <section className="lofi-player glass-panel" aria-label="Focus audio">
      <div className="lofi-toolbar">
        <div>
          <strong>{source === "radio" ? "Lofi Girl" : "Rain ambience"}</strong>
          <small>
            {source === "radio"
              ? broadcast?.title || "Official YouTube radio"
              : "Generated on your device"}
          </small>
        </div>
        <button
          onClick={toggle}
          aria-label={`${playing ? "Pause" : "Play"} ${source}`}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <input
          aria-label="Audio volume"
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
        />
      </div>
      {open && source === "radio" && (
        <div className="lofi-radio-panel">
          <div ref={host} className="lofi-video" />
          <a
            href={
              broadcast
                ? `https://www.youtube.com/watch?v=${broadcast.videoId}`
                : "https://www.youtube.com/@LofiGirl/live"
            }
            target="_blank"
            rel="noreferrer"
          >
            Open official stream
          </a>
          <button
            onClick={() => {
              resume.current = false;
              setOpen(false);
              setPlaying(false);
            }}
          >
            Close radio
          </button>
          {error && (
            <p role="status">
              Radio unavailable. Retry, open YouTube, or use rain.
            </p>
          )}
          {error && (
            <button
              onClick={() => {
                setError(false);
                setRetry((n) => n + 1);
              }}
            >
              Retry radio
            </button>
          )}
        </div>
      )}
      <div className="lofi-sources">
        {source === "radio" ? (
          <button onClick={startRain}>Rain ambience</button>
        ) : (
          <button
            onClick={() => {
              stop();
              setPlaying(false);
              setSource("radio");
              setOpen(true);
              setError(false);
            }}
          >
            Lofi Girl radio
          </button>
        )}
        {source === "rain" && error && (
          <span role="status">Audio unavailable. Try again.</span>
        )}
      </div>
    </section>
  );
};
export default LofiPlayer;
