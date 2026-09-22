import React, { useCallback, useEffect, useRef, useState } from 'react';
import lofiGirlImg from '../../assets/lofi-girl.webp';

const LofiPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const playerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const positionRef = useRef({ x: 0, y: 0 });
  const pendingPositionRef = useRef({ x: 0, y: 0 });
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const activePointerIdRef = useRef(null);
  const animationFrameRef = useRef(null);
  const resumeAfterAlarmRef = useRef(false);

  // Hardcoded Lofi Girl Radio
  const trackUrl = 'https://stream-156.zeno.fm/tabzverz0fctv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiJ0YWJ6dmVyejBmY3R2IiwiaG9zdCI6InN0cmVhbS0xNTYuemVuby5mbSIsInJ0dGwiOjUsImp0aSI6ImtMbk1BSW5aU1hlMkowQ041VVV3OEEiLCJpYXQiOjE3NjY3ODU0MTUsImV4cCI6MTc2Njc4NTQ3NX0._s6l1U1wRdc51D-SwATyaGGUEKomqDfWFzgDp7t9CIQ';
  const lofiImage = lofiGirlImg;

  const audioRef = useRef(new Audio());

  const configureAudioSource = useCallback(() => {
    const audio = audioRef.current;
    audio.preload = 'auto';

    if (audio.src !== trackUrl) {
      audio.src = trackUrl;
      audio.crossOrigin = 'anonymous';
    }

    return audio;
  }, [trackUrl]);

  const handlePointerDown = (event) => {
    if (event.button !== 0 || event.target.closest('.player-controls') || event.target.closest('.volume-mini')) return;
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

  useEffect(() => {
    configureAudioSource();

    const warmUp = () => {
      try {
        configureAudioSource().load();
      } catch {
        // no-op
      }
    };

    window.addEventListener('pointerdown', warmUp, { once: true });
    window.addEventListener('keydown', warmUp, { once: true });
    return () => {
      window.removeEventListener('pointerdown', warmUp);
      window.removeEventListener('keydown', warmUp);
    };
  }, [configureAudioSource]);

  useEffect(() => {
    const audio = audioRef.current;
    audio.volume = volume / 100;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    const handleError = () => {
      setAudioError(true);
      setIsPlaying(false);
    };
    audio.addEventListener('error', handleError);
    return () => audio.removeEventListener('error', handleError);
  }, []);

  useEffect(() => {
    const pauseForAlarm = () => {
      const audio = audioRef.current;
      resumeAfterAlarmRef.current = !audio.paused;
      if (resumeAfterAlarmRef.current) {
        audio.pause();
        setIsPlaying(false);
      }
    };

    const resumeAfterAlarm = () => {
      if (!resumeAfterAlarmRef.current) return;
      resumeAfterAlarmRef.current = false;
      configureAudioSource().play()
        .then(() => {
          setAudioError(false);
          setIsPlaying(true);
        })
        .catch(() => setAudioError(true));
    };

    window.addEventListener('timer-alarm-start', pauseForAlarm);
    window.addEventListener('timer-alarm-end', resumeAfterAlarm);
    return () => {
      window.removeEventListener('timer-alarm-start', pauseForAlarm);
      window.removeEventListener('timer-alarm-end', resumeAfterAlarm);
    };
  }, [configureAudioSource]);

  const paintPendingPosition = useCallback(() => {
    const nextPosition = pendingPositionRef.current;
    positionRef.current = nextPosition;
    if (playerRef.current) {
      playerRef.current.style.transform = `translate3d(${nextPosition.x}px, ${nextPosition.y}px, 0)`;
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

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Autoplay on first user interaction (browsers block autoplay without interaction)
  useEffect(() => {
    const attemptAutoplay = () => {
      const audio = configureAudioSource();
      audio.volume = volume / 100;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(() => {
            setAudioError(false);
            setIsPlaying(true);
          })
          .catch(() => {
            // Autoplay blocked, will start on first user interaction
          });
      }
    };

    // Try immediate autoplay first
    attemptAutoplay();

    // If blocked, try again on first user interaction
    const startOnInteraction = () => {
      if (!audioRef.current.paused) return; // Already playing
      const audio = configureAudioSource();
      audio.volume = audioRef.current.volume; // Use current audio volume, not stale closure
      audio.play()
        .then(() => {
          setAudioError(false);
          setIsPlaying(true);
        })
        .catch(() => {});
    };

    window.addEventListener('click', startOnInteraction, { once: true });
    window.addEventListener('keydown', startOnInteraction, { once: true });

    return () => {
      window.removeEventListener('click', startOnInteraction);
      window.removeEventListener('keydown', startOnInteraction);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configureAudioSource]);

  const togglePlay = () => {
    const audio = configureAudioSource();
    audio.volume = volume / 100;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    const playPromise = audio.play();
    setIsPlaying(true);
    setAudioError(false);

    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch((e) => {
        console.warn('Play/Autoplay blocked', e);
        setIsPlaying(false);
        setAudioError(true);
      });
    }
  };

  return (
    <div
              ref={playerRef}
      className={`lofi-player glass-panel ${isDragging ? 'is-dragging' : ''}`}
              style={{
                cursor: isDragging ? 'grabbing' : 'grab'
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <div className="art-container">
                <img
                  src={lofiImage}
                  alt="Lofi Girl"
                  className="album-art"
                  draggable="false"
                />
                <div className="drag-overlay"></div>
              </div>

              <div className="track-info">
                <div className="track-name">Lofi Girl</div>
                <div className={`track-artist ${audioError ? 'error' : ''}`}>{audioError ? 'Stream unavailable — retry' : 'Lofi Radio'}</div>
              </div>

      <div className="player-controls">
                <div className="volume-mini">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="volume-slider"
                    title={`Volume: ${volume}%`}
                  />
      </div>
                <button className="play-btn" onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
                  {isPlaying ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="5" width="4" height="14" />
                      <rect x="14" y="5" width="4" height="14" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" transform="translate(-0.75 0)" />
                    </svg>
                  )}
                </button>
              </div>

              <style>{`
        .lofi-player {
                  position: fixed;
                  bottom: calc(env(safe-area-inset-bottom, 0px) + 0.75rem);
                  left: calc(env(safe-area-inset-left, 0px) + 0.75rem);
                  width: min(300px, calc(100vw - 1.5rem - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px)));
                  height: 80px;
                  padding: 0;
                  display: flex;
                  align-items: center;
                  gap: 0;
                  z-index: 50;
                  user-select: none;
                  touch-action: none;
                  overflow: hidden;
          border-radius: 12px;
                  /* Removed specific background to inherit glass-panel styles */
        }


                .lofi-player.is-dragging {
                  will-change: transform;
                  transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 180ms ease-out;
                  box-shadow: 0 28px 72px rgba(0,0,0,0.42);
                }

                @media (max-width: 600px) {
                  .lofi-player {
                    left: calc(env(safe-area-inset-left, 0px) + 0.75rem);
                    right: calc(env(safe-area-inset-right, 0px) + 0.75rem);
                    width: auto;
                  }
                }

                .art-container {
                    width: 80px;
                    height: 80px;
                    position: relative;
                    flex-shrink: 0;
                }

                .album-art {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
                }

                .drag-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    cursor: grab;
                    background: transparent;
                }
                .drag-overlay:active {
                    cursor: grabbing;
                }

                .track-info {
                  flex: 1;
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                  padding: 0 1rem;
                  overflow: hidden;
                  cursor: grab;
                  height: 100%;
                }
                .track-artist.error { color: var(--accent-color); }
                .track-info:active {
                    cursor: grabbing;
                }

                .track-name {
                  font-weight: 700;
                  font-size: 1rem;
                  color: #fff;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  margin-bottom: 2px;
                }

                .track-artist {
                  font-size: 0.75rem;
                  color: rgba(255, 255, 255, 0.7);
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                }

                .player-controls {
                  display: flex;
                  align-items: center;
                  gap: 1rem;
                  padding-right: 1.5rem;
                  touch-action: auto;
                }

                .play-btn {
                  width: 36px;
                  height: 36px;
                  border-radius: 50%;
                  background: rgba(255, 255, 255, 0.2);
                  color: #fff;
                  border: 1px solid rgba(255, 255, 255, 0.1);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  cursor: pointer;
                  transition: transform 0.1s, background 0.2s;
                  flex-shrink: 0;
                }
                .play-btn:hover {
                    transform: scale(1.05);
                    background: rgba(255, 255, 255, 0.3);
                }
                .play-btn:active {
                    transform: scale(0.95);
                }

                .volume-mini {
                    width: 50px;
                    display: flex;
                    align-items: center;
                    opacity: 0.6;
                    transition: opacity 0.2s;
                }
                .volume-mini:hover {
                    opacity: 1;
                }

                .volume-slider {
                  width: 100%;
                  height: 3px;
                  border-radius: 2px;
                  background: rgba(255, 255, 255, 0.2);
                  outline: none;
                  -webkit-appearance: none;
                  appearance: none;
                  cursor: pointer;
                }
                .volume-slider::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  width: 10px;
                  height: 10px;
                  border-radius: 50%;
                  background: #fff;
                  opacity: 1;
                  transition: transform 0.2s;
                }
                .volume-slider::-webkit-slider-thumb:hover {
                    transform: scale(1.2);
                }

                svg {
                  pointer-events: none;
                }
              `}</style>
    </div>
  );
};

export default LofiPlayer;
