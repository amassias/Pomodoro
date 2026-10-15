let youtubeApiPromise;

export const loadYouTubeIframeApi = () => {
  if (typeof window === "undefined")
    return Promise.reject(new Error("Window not available"));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(
      'script[data-youtube-iframe-api="true"]',
    );
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.dataset.youtubeIframeApi = "true";
      script.onerror = () => {
        youtubeApiPromise = null;
        script.remove();
        reject(new Error("Failed to load YouTube IFrame API"));
      };
      document.head.appendChild(script);
    }

    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousReady === "function") previousReady();
      resolve(window.YT);
    };
  });

  return youtubeApiPromise;
};
