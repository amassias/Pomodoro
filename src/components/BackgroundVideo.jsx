import React from 'react';

const BackgroundVideo = ({ videoId }) => {
  return (
    <div className="video-background">
      <div className="video-overlay"></div>
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&loop=1&playlist=${videoId}&modestbranding=1&enablejsapi=1&origin=${window.location.origin}`}
        title="Live View"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      ></iframe>
      <style jsx>{`
        .video-background {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: -1;
          pointer-events: none; /* Prevent interaction with video */
          overflow: hidden;
        }
        .video-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.2); /* Slight darken for text readability */
          z-index: 1;
        }
        iframe {
          width: 100vw;
          height: 56.25vw; /* Given a 16:9 aspect ratio, 9/16*100 = 56.25 */
          min-height: 100vh;
          min-width: 177.77vh; /* Given a 16:9 aspect ratio, 16/9*100 = 177.77 */
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
      `}</style>
    </div>
  );
};

export default BackgroundVideo;
