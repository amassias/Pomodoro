export const classifyThirdPartyResource = (url) => {
  if (/youtube\.com|youtube-nocookie\.com|googlevideo\.com|ytimg\.com/.test(url)) return 'youtube';
  if (/supabase\.(co|in)/.test(url)) return 'supabase';
  if (/spotify\.com|scdn\.co/.test(url)) return 'spotify';
  if (/zeno\.fm/.test(url)) return 'lofi-radio';
  return null;
};

export const summarizeThirdPartyResources = (entries) => {
  const summary = {};
  for (const entry of entries) {
    const provider = classifyThirdPartyResource(entry.name || '');
    if (!provider) continue;
    const current = summary[provider] || { requests: 0, durationMs: 0, transferBytes: 0 };
    current.requests += 1;
    current.durationMs += Math.round(Number(entry.duration) || 0);
    current.transferBytes += Number(entry.transferSize) || 0;
    summary[provider] = current;
  }
  return summary;
};

export const startThirdPartyPerformanceMonitoring = () => {
  if (typeof PerformanceObserver === 'undefined') return () => {};
  const entries = [...performance.getEntriesByType('resource')];
  const persist = () => {
    try {
      sessionStorage.setItem('world-focus-third-party-performance', JSON.stringify(summarizeThirdPartyResources(entries)));
    } catch {
      // Metrics must never affect product behavior.
    }
  };
  persist();
  const observer = new PerformanceObserver((list) => {
    entries.push(...list.getEntries());
    persist();
  });
  observer.observe({ type: 'resource', buffered: true });
  return () => observer.disconnect();
};
