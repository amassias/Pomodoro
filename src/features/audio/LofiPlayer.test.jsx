// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import LofiPlayer from './LofiPlayer';
const rain = vi.hoisted(() => ({ play: vi.fn().mockResolvedValue(), stop: vi.fn() }));
vi.mock('./useRainAudio', () => ({ useRainAudio: () => rain }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('offers local rain after a stream failure and lets the user pause it', async () => {
  vi.stubGlobal('Audio',class extends EventTarget {
    paused=true; volume=0.5; src='';
    load() {} pause() { this.paused=true; }
    play() { this.dispatchEvent(new Event('error')); return Promise.reject(new Error('Stream offline')); }
  });
  render(<LofiPlayer />);
  fireEvent.click(await screen.findByRole('button',{name:'Try rain ambience'}));
  expect(await screen.findByText('Rain ambience')).toBeTruthy();
  expect(await screen.findByRole('button',{name:'Pause'})).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Pause'}));
  expect(screen.getByRole('button',{name:'Play'})).toBeTruthy();
  expect(rain.stop).toHaveBeenCalled();
});
