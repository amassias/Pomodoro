import React, { useState, useRef } from 'react';

const LofiPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const playerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef(null);

  const lofiTracks = [
    { 
      name: 'Lofi Radio', 
      artist: 'Zeno.fm Lofi Stream',
      url: 'https://stream-156.zeno.fm/tabzverz0fctv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiJ0YWJ6dmVyejBmY3R2IiwiaG9zdCI6InN0cmVhbS0xNTYuemVuby5mbSIsInJ0dGwiOjUsImp0aSI6ImtMbk1BSW5aU1hlMkowQ041VVV3OEEiLCJpYXQiOjE3NjY3ODU0MTUsImV4cCI6MTc2Njc4NTQ3NX0._s6l1U1wRdc51D-SwATyaGGUEKomqDfWFzgDp7t9CIQ'
    },
    { name: 'Lofi Girl', id: 'jfKfPfyJRdk', artist: 'Study & Chill' },
    { name: 'Synthwave Radio', id: '4xDzrJKXOOY', artist: 'Synthwave' },
    { name: 'Lofi Beats', id: 'kffacxfA7g4', artist: 'Lo-Fi Hip Hop' }
  ];

  const [currentTrack, setCurrentTrack] = useState(0);
  const audioRef = useRef(new Audio());

  const handleMouseDown = (e) => {
    if (e.target.closest('.player-controls') || e.target.closest('.volume-control')) return;
    isDraggingRef.current = true;
    dragOffsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const handleMouseMove = (e) => {
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
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  React.useEffect(() => {
    const audio = audioRef.current;
    const track = lofiTracks[currentTrack];
    
    if (track.url) {
      audio.src = track.url;
      audio.crossOrigin = 'anonymous';
      if (isPlaying) {
        audio.play().catch(e => console.log('Autoplay blocked', e));
      } else {
        audio.pause();
      }
    }
  }, [currentTrack, lofiTracks, isPlaying]);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (isPlaying) {
      audio.play().catch(e => console.log('Play failed', e));
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  React.useEffect(() => {
    const audio = audioRef.current;
    audio.volume = volume / 100;
  }, [volume]);

  React.useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [position]);

  React.useEffect(() => {
    return () => {
      audioRef.current.pause();
      audioRef.current.src = '';
    };
  }, []);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const nextTrack = () => {
    setCurrentTrack((prev) => (prev + 1) % lofiTracks.length);
  };

  return (
    <div
      ref={playerRef}
      className="lofi-player glass-panel"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        cursor: isDraggingRef.current ? 'grabbing' : 'grab'
      }}
    >
      <div className="player-header" onMouseDown={handleMouseDown}>
        <h3>Lofi</h3>
        <div className="drag-handle">⋮⋮</div>
      </div>

      <div className="current-track">{lofiTracks[currentTrack].name}</div>

      <div className="player-controls">
        <button className="play-btn" onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>

        <button className="next-btn" onClick={nextTrack} title="Next track">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="5 4 15 12 5 20 5 4" />
            <line x1="19" y1="5" x2="19" y2="19" />
          </svg>
        </button>
      </div>

      <div className="volume-control">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        </svg>
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => setVolume(e.target.value)}
          className="volume-slider"
        />
        <span className="volume-value">{volume}%</span>
      </div>

      <style jsx>{`
        .lofi-player {
          position: fixed;
          bottom: 2rem;
          left: 2rem;
          padding: 0.8rem;
          width: 200px;
          display: flex;
          flex-direction: column;
          gap: 0.7rem;
          z-index: 50;
          user-select: none;
          will-change: transform;
        }

        .player-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: grab;
          padding-bottom: 0.4rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .player-header:active {
          cursor: grabbing;
        }

        .player-header h3 {
          font-weight: 600;
          font-size: 0.9rem;
          letter-spacing: 1px;
          margin: 0;
        }

        .drag-handle {
          font-size: 0.5rem;
          color: rgba(255, 255, 255, 0.3);
          letter-spacing: -2px;
        }

        .current-track {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.7);
          text-align: center;
          font-weight: 500;
          min-height: 1.2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1.2;
        }

        .player-controls {
          display: flex;
          gap: 0.8rem;
          justify-content: center;
          align-items: center;
        }

        .play-btn,
        .next-btn {
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .play-btn:hover,
        .next-btn:hover {
          background: rgba(255, 255, 255, 0.25);
          border-color: rgba(255, 255, 255, 0.4);
          transform: scale(1.05);
        }

        .play-btn {
          width: 38px;
          height: 38px;
          background: rgba(255, 107, 107, 0.2);
          border-color: rgba(255, 107, 107, 0.3);
        }

        .play-btn:hover {
          background: rgba(255, 107, 107, 0.3);
        }

        .volume-control {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          margin-top: 0.3rem;
        }

        .volume-slider {
          flex: 1;
          height: 3px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.1);
          outline: none;
          -webkit-appearance: none;
          appearance: none;
          cursor: pointer;
        }

        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          transition: all 0.2s;
        }

        .volume-slider::-webkit-slider-thumb:hover {
          transform: scale(1.3);
          box-shadow: 0 0 8px rgba(255, 255, 255, 0.4);
        }

        .volume-slider::-moz-range-thumb {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }

        .volume-slider::-moz-range-thumb:hover {
          transform: scale(1.3);
          box-shadow: 0 0 8px rgba(255, 255, 255, 0.4);
        }

        .volume-value {
          font-size: 0.65rem;
          color: rgba(255, 255, 255, 0.5);
          min-width: 28px;
          text-align: right;
        }

        svg {
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};

export default LofiPlayer;
