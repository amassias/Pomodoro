// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SharedSessionProvider, useSharedSession } from './SharedSessionProvider';
const backend = vi.hoisted(() => ({ channels: [], callbacks: [] }));
vi.mock('../lib/supabase', () => ({ supabase: {
  channel: () => {
    const channel = { on: vi.fn().mockReturnThis(), track: vi.fn(), send: vi.fn(), presenceState: () => ({}) };
    channel.subscribe = fn => { backend.callbacks.push(fn); return channel; };
    backend.channels.push(channel);
    return channel;
  },
  removeChannel: vi.fn(),
} }));
const Harness = () => {
  const room = useSharedSession();
  return <><button onClick={room.createRoom}>Create</button><button onClick={room.toggleReady}>Ready</button><button onClick={room.leaveRoom}>Leave</button><p>{room.connectionStatus}</p><p>{room.isReady ? 'Ready now' : 'Not ready'}</p></>;
};
beforeEach(() => { sessionStorage.clear(); backend.channels=[]; backend.callbacks=[]; window.history.replaceState({}, '', '/'); });
afterEach(cleanup);
it('updates ready presence without reconnecting and clears room state on leave', async () => {
  render(<SharedSessionProvider><Harness /></SharedSessionProvider>);
  fireEvent.click(screen.getByText('Create'));
  await waitFor(() => expect(backend.channels).toHaveLength(1));
  const channel = backend.channels[0];
  await act(async () => { await backend.callbacks[0]('SUBSCRIBED'); });
  expect(screen.getByText('connected')).toBeTruthy();
  fireEvent.click(screen.getByText('Ready'));
  expect(screen.getByText('Ready now')).toBeTruthy();
  expect(backend.channels).toHaveLength(1);
  expect(channel.track).toHaveBeenLastCalledWith(expect.objectContaining({ ready: true, role: 'host' }));
  fireEvent.click(screen.getByText('Leave'));
  expect(screen.getByText('Not ready')).toBeTruthy();
  expect(window.location.search).toBe('');
});
