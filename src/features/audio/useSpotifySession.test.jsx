// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useSpotifySession } from './useSpotifySession';
const api = vi.hoisted(() => ({ expired: false, refresh: vi.fn().mockResolvedValue({access_token:'refreshed',expires_in:3600}) }));
vi.mock('../../lib/spotify',()=>({getMe:async()=>({product:'premium'}),isTokenExpired:()=>api.expired,refreshAccessToken:api.refresh}));
afterEach(()=>{cleanup();vi.useRealTimers();localStorage.clear();});
it('keeps polling while a token is valid and refreshes once it later expires', async()=>{
  vi.useFakeTimers(); api.expired=false; api.refresh.mockClear();
  const persist=vi.fn();
  renderHook(()=>useSpotifySession({userId:null,settings:{spotifyRefreshToken:'test-refresh',spotifyClientId:'test-client',spotifyTokenExpiresAt:999999},setSettings:vi.fn(),persistSpotifySecretsToLocalStorage:persist}));
  await act(async()=>vi.advanceTimersByTime(60000));
  expect(api.refresh).not.toHaveBeenCalled();
  api.expired=true;
  await act(async()=>vi.advanceTimersByTime(60000));
  expect(api.refresh).toHaveBeenCalledTimes(1);
  expect(persist).toHaveBeenCalledWith(expect.objectContaining({token:'refreshed'}));
});
