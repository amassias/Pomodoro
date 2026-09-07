// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest';
import { markBadYoutubeVideoId, readBadYoutubeVideoIds } from './storage';

beforeEach(() => localStorage.clear());

it('temporarily excludes a failed stream and restores it at expiry', () => {
  markBadYoutubeVideoId('failedStream', { now: 1000, ttlMs: 300000 });
  expect(readBadYoutubeVideoIds({ now: 300999 }).has('failedStream')).toBe(true);
  expect(readBadYoutubeVideoIds({ now: 301000 }).has('failedStream')).toBe(false);
  expect(readBadYoutubeVideoIds({ now: 301001 }).size).toBe(0);
});

it('isolates playback failures between accounts', () => {
  markBadYoutubeVideoId('failedStream', { userId: 'first', now: 1000, ttlMs: 300000 });
  expect(readBadYoutubeVideoIds({ userId: 'second', now: 2000 }).size).toBe(0);
  expect(readBadYoutubeVideoIds({ userId: 'first', now: 2000 }).size).toBe(1);
});
