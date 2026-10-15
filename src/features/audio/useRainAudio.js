import { useCallback, useEffect, useRef } from 'react';

// A local fallback: no remote stream, account or media permission required.
export const useRainAudio = (volume) => {
  const contextRef = useRef(null);
  const generationRef = useRef(0);
  const sourceRef = useRef(null);
  const gainRef = useRef(null);
  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = volume / 100 * 0.25;
  }, [volume]);
  const stop = useCallback(() => {
    generationRef.current += 1;
    sourceRef.current?.stop();
    sourceRef.current = null;
  }, []);
  const play = useCallback(async () => {
    stop();
    const generation = generationRef.current;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) throw new Error('Audio is unavailable');
    const context = contextRef.current ?? new AudioContext();
    contextRef.current = context;
    await context.resume();
    if (generation !== generationRef.current) return false;
    const buffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
    const samples = buffer.getChannelData(0);
    let previous = 0;
    for (let i = 0; i < samples.length; i++) {
      previous = (previous + (Math.random() * 2 - 1) * 0.02) / 1.02;
      samples[i] = previous * 3.5;
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = context.createGain();
    gain.gain.value = volume / 100 * 0.25;
    gainRef.current = gain;
    source.connect(gain);
    gain.connect(context.destination);
    source.start();
    sourceRef.current = source;
    return true;
  }, [stop, volume]);
  useEffect(() => () => {
    stop();
    contextRef.current?.close();
    contextRef.current = null;
  }, [stop]);
  return { play, stop };
};
