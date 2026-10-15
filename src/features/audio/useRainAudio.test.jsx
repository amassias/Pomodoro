// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useRainAudio } from './useRainAudio';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('does not start delayed audio after the user stops it', async () => {
  let resume;
  const start = vi.fn();
  vi.stubGlobal('AudioContext', class {
    sampleRate = 10;
    resume = () => new Promise(resolve => { resume = resolve; });
    createBuffer = () => ({ getChannelData: () => new Float32Array(30) });
    createBufferSource = () => ({ connect() {}, start, stop() {} });
    createGain = () => ({ gain: {}, connect() {} });
    close() {}
  });
  const { result } = renderHook(() => useRainAudio(50));
  let pending;
  act(() => { pending = result.current.play(); });
  act(() => result.current.stop());
  await act(async () => { resume(); await pending; });
  expect(start).not.toHaveBeenCalled();
});
