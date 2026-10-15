import { useCallback, useEffect, useRef, useState } from "react";
import { useRainAudio } from "./useRainAudio";
import { loadYouTubeIframeApi } from "../../lib/youtubePlayer";
import lofiGirlImg from "../../assets/lofi-girl.webp";
import "./LofiPlayer.css";

// Resolve a currently live broadcast; official website links can also expire.
const LofiPlayer = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [source, setSource] = useState("radio");
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  const [volume, setVolume] = useState(50);
  const cardRef = useRef(null);
  const isDraggingRef = useRef(false);
  const positionRef = useRef({ x: 0, y: 0 });
  const pendingPositionRef = useRef({ x: 0, y: 0 });
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const activePointerIdRef = useRef(null);
  const animationFrameRef = useRef(null);
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

        const node = document.createElement("div");
        host.current.appendChild(node);
        player.current = new YT.Player(node, {
          width: "100%",
          height: "200",
          videoId: data.videoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
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

  const handlePointerDown = (event) => {
    if (event.button !== 0 || event.target.closest('.player-controls') || event.target.closest('.volume-mini') || event.target.closest('button')) return;
    event.preventDefault();
    isDraggingRef.current = true;
    activePointerIdRef.current = event.pointerId;
    setIsDragging(true);
    dragOffsetRef.current = {
      x: event.clientX - positionRef.current.x,
      y: event.clientY - positionRef.current.y
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const paintPendingPosition = useCallback(() => {
    const nextPosition = pendingPositionRef.current;
    positionRef.current = nextPosition;
    if (cardRef.current) {
      cardRef.current.style.transform = `translate3d(${nextPosition.x}px, ${nextPosition.y}px, 0)`;
    }
    animationFrameRef.current = null;
  }, []);

  const handlePointerMove = useCallback((event) => {
    if (!isDraggingRef.current || event.pointerId !== activePointerIdRef.current) return;
    pendingPositionRef.current = {
      x: event.clientX - dragOffsetRef.current.x,
      y: event.clientY - dragOffsetRef.current.y
    };
    if (!animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(paintPendingPosition);
    }
  }, [paintPendingPosition]);

  const handlePointerUp = useCallback((event) => {
    if (event.pointerId !== activePointerIdRef.current) return;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
      paintPendingPosition();
    }
    isDraggingRef.current = false;
    activePointerIdRef.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, [paintPendingPosition]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

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
    <section ref={cardRef} className={`lofi-player glass-panel ${isDragging ? "is-dragging" : ""}`} aria-label="Focus audio"
      onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}>
      <div className="art-container">
        <img src={lofiGirlImg} alt="Lofi Girl" className="album-art" draggable="false" />
      </div>
      <div className="track-info">
        <div className="track-name">{source === "radio" ? "Lofi Girl" : "Rain ambience"}</div>
        <div className={`track-artist ${error ? "error" : ""}`} role={error ? "status" : undefined}>
          {error ? "Stream unavailable — retry" : source === "radio" ? "Lofi Radio" : "Generated on your device"}
        </div>
        {error && source === "radio" && <button className="audio-fallback-btn" onClick={startRain}>Try rain ambience</button>}
        {source === "rain" && <button className="audio-fallback-btn" onClick={() => {
          stop(); setPlaying(false); setSource("radio"); setOpen(true); setError(false);
        }}>Retry radio</button>}
      </div>
      <div className="player-controls">
        <div className="volume-mini">
          <input aria-label="Audio volume" type="range" min="0" max="100" value={volume}
            onChange={(e) => setVolume(Number(e.target.value))} className="volume-slider" />
        </div>
        <button className="play-btn" onClick={() => {
          if (error && source === "radio") { setError(false); setRetry(n => n + 1); }
          toggle();
        }} aria-label={`${playing ? "Pause" : "Play"} ${source}`} title={playing ? "Pause" : "Play"}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            {playing ? <><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></> : <path d="M8 5v14l11-7z" transform="translate(-0.75 0)" />}
          </svg>
        </button>
      </div>
      {open && source === "radio" && <div ref={host} className="lofi-audio-host" hidden aria-hidden="true" inert />}
    </section>
  );
};
export default LofiPlayer;
