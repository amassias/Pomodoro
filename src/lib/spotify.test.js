// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { getLoginUrl, loadPkceValues } from './spotify';
afterEach(() => localStorage.clear());
it('builds PKCE login using a new verifier and persists the client ID for its callback', async () => {
  const url = new URL(await getLoginUrl('test-client'));
  const first = loadPkceValues();
  expect(url.searchParams.get('code_challenge_method')).toBe('S256');
  expect(url.searchParams.get('state')).toBe(first.state);
  expect(first.verifier).toHaveLength(64);
  expect(localStorage.getItem('spotifyClientId')).toBe('test-client');
  await getLoginUrl('test-client');
  expect(loadPkceValues().verifier).not.toBe(first.verifier);
});
