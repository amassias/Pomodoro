// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { UserDataProvider, useUserData } from './UserDataProvider';
vi.mock('./AuthProvider.jsx', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('../lib/supabase', () => ({ supabase: {} }));
const Harness = () => {
  const { settings, setSettings, loading } = useUserData();
  return <><p>{loading ? 'Loading' : `Focus ${settings.focusDuration}`}</p><button onClick={() => setSettings(prev => ({ ...prev, focusDuration: 50, alarmVolume: 0, customPresets: [{ id: 'custom', name: 'Study', focusDuration: 40 }] }))}>Save</button><span>Volume {settings.alarmVolume}</span><span>{settings.customPresets[0]?.name}</span></>;
};
beforeEach(() => localStorage.clear());
afterEach(cleanup);
it('persists guest duration, mute and saved presets after remount', async () => {
  const view = render(<UserDataProvider><Harness /></UserDataProvider>);
  await screen.findByText('Focus 25');
  fireEvent.click(screen.getByText('Save'));
  await waitFor(() => expect(screen.getByText('Focus 50')).toBeTruthy());
  view.unmount();
  render(<UserDataProvider><Harness /></UserDataProvider>);
  await screen.findByText('Focus 50');
  expect(screen.getByText('Volume 0')).toBeTruthy();
  expect(screen.getByText('Study')).toBeTruthy();
});
