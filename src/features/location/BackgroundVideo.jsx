import React, { useEffect, useRef, useState } from 'react';

let youtubeApiPromise;

const loadYouTubeIframeApi = () => {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window not available'));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-youtube-iframe-api="true"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.dataset.youtubeIframeApi = 'true';
      script.onerror = () => reject(new Error('Failed to load YouTube IFrame API'));
      document.head.appendChild(script);
    }

    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousReady === 'function') previousReady();
      resolve(window.YT);
    };
  });

  return youtubeApiPromise;
};

const BackgroundVideo = ({ videoId, onVideoError }) => {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const latestVideoIdRef = useRef(videoId);
  const onVideoErrorRef = useRef(onVideoError);
  const [status, setStatus] = useState('loading');
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    onVideoErrorRef.current = onVideoError;
  }, [onVideoError]);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const YT = await loadYouTubeIframeApi();
        if (cancelled || !containerRef.current) return;

        if (!playerRef.current) {
          playerRef.current = new YT.Player(containerRef.current, {
            width: '100%',
            height: '100%',
            videoId,
            playerVars: {
              autoplay: 1,
              mute: 1,
              controls: 0,
              rel: 0,
              modestbranding: 1,
              playsinline: 1,
              iv_load_policy: 3,
              disablekb: 1,
              fs: 0,
              origin: window.location.origin,

              // Looping a single video requires playlist=videoId
              loop: 1,
              playlist: videoId,
            },
            events: {
              onReady: (event) => {
                setStatus('ready');
                try {
                  event.target.mute();
                  event.target.playVideo();
                } catch {
                  // ignore
                }
              },
              onError: (event) => {
                setStatus('failed');
                const currentId = latestVideoIdRef.current || videoId;
                onVideoErrorRef.current?.({ videoId: currentId, code: event.data });
              },
            },
          });
        }
      } catch (err) {
        setStatus('failed');
        // If the API can't load, treat the video as broken for this session.
        const currentId = latestVideoIdRef.current || videoId;
        onVideoErrorRef.current?.({ videoId: currentId, code: 'api_load_failed', error: err });
      }
    };

    init();
    return () => {
      cancelled = true;
    };
    // init once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryNonce]);

  useEffect(() => {
    latestVideoIdRef.current = videoId;

    const player = playerRef.current;
    if (!player || !videoId) return;

    try {
      // Update looping playlist when swapping videos.
      if (typeof player.loadPlaylist === 'function') {
        player.loadPlaylist([videoId]);
      } else if (typeof player.loadVideoById === 'function') {
        player.loadVideoById(videoId);
      }

      if (typeof player.mute === 'function') player.mute();
      if (typeof player.playVideo === 'function') player.playVideo();
    } catch {
      // ignore
    }
  }, [videoId]);

  useEffect(() => {
    return () => {
      try {
        playerRef.current?.destroy?.();
      } catch {
        // ignore
      } finally {
        playerRef.current = null;
      }
    };
  }, []);

  const retryVideo = () => {
    try {
      playerRef.current?.destroy?.();
    } catch {
      // Ignore teardown failures and recreate the player.
    }
    playerRef.current = null;
    setStatus('loading');
    setRetryNonce((value) => value + 1);
  };

  return (
    <div className="video-background">
      <div className="video-overlay"></div>
      <div ref={containerRef} className="youtube-player" />
      {status === 'failed' && (
        <div className="media-fallback" role="status">
          <span>Live atmosphere unavailable</span>
          <button type="button" onClick={retryVideo}>Retry video</button>
        </div>
      )}
      <style>{`
        .video-background {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100vh;
          z-index: -1;
          pointer-events: none;
          overflow: hidden;
          background:
            radial-gradient(circle at 25% 15%, rgba(255, 113, 107, 0.16), transparent 42%),
            linear-gradient(145deg, #1a1e24, #07090c 70%);
        }
        @supports (height: 100dvh) {
          .video-background {
            height: 100dvh;
          }
        }
        .video-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background:
            linear-gradient(90deg, rgba(0,0,0,0.38), rgba(0,0,0,0.12) 45%, rgba(0,0,0,0.3)),
            linear-gradient(0deg, rgba(0,0,0,0.48), transparent 45%, rgba(0,0,0,0.18));
          z-index: 1;
        }
        .youtube-player {
          width: 100%;
          height: 56.25vw; /* 16:9 */
          min-height: 100vh;
          min-width: 177.77vh;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
        @supports (min-height: 100dvh) {
          .youtube-player {
            min-height: 100dvh;
          }
        }
        .youtube-player :global(iframe) {
          width: 100%;
          height: 100%;
        }
        .media-fallback {
          position: absolute;
          left: 50%;
          bottom: 6rem;
          transform: translateX(-50%);
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.65rem 0.8rem 0.65rem 1rem;
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 999px;
          background: rgba(8,10,12,0.86);
          color: var(--text-secondary);
          font-size: 0.75rem;
          pointer-events: auto;
        }
        .media-fallback button { padding: 0.45rem 0.7rem; border-radius: 999px; background: var(--accent-soft); color: #fff; }
      `}</style>
    </div>
  );
};

export default BackgroundVideo;
