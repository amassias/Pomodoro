// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import SupabaseCallback from './SupabaseCallback';
const auth = vi.hoisted(() => ({ exchangeCodeForSession: vi.fn(), getSession: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { auth } }));
afterEach(() => { cleanup(); window.history.replaceState({}, '', '/'); });
it('exchanges only the code and keeps an actionable failure message', async () => {
  window.history.replaceState({}, '', '/auth-callback?code=one-time-code');
  auth.exchangeCodeForSession.mockResolvedValue({ error: new Error('Expired code') });
  render(<React.StrictMode><SupabaseCallback /></React.StrictMode>);
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Expired code');
  expect(auth.exchangeCodeForSession).toHaveBeenCalledExactlyOnceWith('one-time-code');
  expect(screen.getByRole('link', { name: 'Back to your workspace' }).getAttribute('href')).toBe('/');
  expect(window.location.search).toBe('');
});
