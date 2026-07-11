import React, { useCallback, useEffect, useRef, useState } from 'react';
import lofiGirlImg from '../../assets/lofi-girl.jpg';

const LofiPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const playerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef(null);

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

  const handleMouseDown = (e) => {
    if (e.target.closest('.player-controls') || e.target.closest('.volume-mini')) return;
    isDraggingRef.current = true;
    setIsDragging(true);
    dragOffsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
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

  const handleMouseMove = useCallback((e) => {
    if (!isDraggingRef.current) return;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      setPosition({
        x: e.clientX - dragOffsetRef.current.x,
        y: e.clientY - dragOffsetRef.current.y
      });
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    setIsDragging(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [handleMouseMove, handleMouseUp]);

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
          .then(() => setIsPlaying(true))
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
        .then(() => setIsPlaying(true))
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

    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch((e) => {
        console.log('Play/Autoplay blocked', e);
        setIsPlaying(false);
      });
    }
  };

  return (
    <div
      ref={playerRef}
      className="lofi-player glass-panel"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="art-container">
        <img
          src={lofiImage}
          alt="Lofi Girl"
          className="album-art"
        />
        <div className="drag-overlay"></div>
      </div>

      <div className="track-info">
        <div className="track-name">Lofi Girl</div>
        <div className="track-artist">Lofi Radio</div>
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
          will-change: transform;
          overflow: hidden;
          border-radius: 12px;
          /* Removed specific background to inherit glass-panel styles */
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
