import { describe, expect, it } from 'vitest';
import { classifyThirdPartyResource, summarizeThirdPartyResources } from './performanceMonitoring';

describe('third-party performance monitoring', () => {
  it('classifies supported media and data providers', () => {
    expect(classifyThirdPartyResource('https://www.youtube.com/iframe_api')).toBe('youtube');
    expect(classifyThirdPartyResource('https://abc.supabase.co/rest/v1/user_state')).toBe('supabase');
    expect(classifyThirdPartyResource('https://stream-156.zeno.fm/radio')).toBe('lofi-radio');
  });

  it('aggregates request duration and transfer size', () => {
    expect(summarizeThirdPartyResources([
      { name: 'https://www.youtube.com/a', duration: 100.4, transferSize: 2000 },
      { name: 'https://www.youtube.com/b', duration: 50.4, transferSize: 1000 },
    ])).toEqual({ youtube: { requests: 2, durationMs: 150, transferBytes: 3000 } });
  });
});
