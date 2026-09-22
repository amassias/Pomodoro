import { useCallback, useEffect, useRef } from 'react';

// Plays alarm/ticking previews in Settings, falling back to a synthesized tone when a file cannot play.
export const useSoundPreview = () => {
    const previewAudioRef = useRef(null);
    const previewAudioContextRef = useRef(null);

    const stopPreviewAudio = useCallback(() => {
        const audio = previewAudioRef.current;
        if (!audio) return;
        try {
            audio.pause();
            audio.currentTime = 0;
        } catch {
            // ignore
        }
    }, []);

    const playFallbackTone = async ({ frequency = 880, durationMs = 140 } = {}) => {
        try {
            const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextCtor) return;

            if (!previewAudioContextRef.current) {
                previewAudioContextRef.current = new AudioContextCtor();
            }

            const ctx = previewAudioContextRef.current;
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.value = frequency;
            gain.gain.setValueAtTime(0.0001, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + durationMs / 1000);

            osc.onended = () => {
                try {
                    osc.disconnect();
                    gain.disconnect();
                } catch {
                    // ignore
                }
            };
        } catch (e) {
            console.warn('Fallback tone failed', e);
        }
    };

    const playPreviewAudio = (url, volume, { fallbackUrl, fallbackTone = false } = {}) => {
        if (!url) {
            stopPreviewAudio();
            return;
        }
        stopPreviewAudio();
        const audio = new Audio(url);
        audio.preload = 'auto';
        audio.volume = Math.min(1, Math.max(0, Number(volume) || 0));
        previewAudioRef.current = audio;
        audio.play().catch(e => {
            if (fallbackUrl && fallbackUrl !== url) {
                playPreviewAudio(fallbackUrl, volume);
                return;
            }
            if (fallbackTone) {
                playFallbackTone();
                return;
            }
            console.warn('Preview failed', e);
        });
    };

    useEffect(() => {
        return () => {
            stopPreviewAudio();
            try {
                previewAudioContextRef.current?.close?.();
            } catch {
                // ignore
            }
            previewAudioContextRef.current = null;
        };
    }, [stopPreviewAudio]);

    return { playPreviewAudio, stopPreviewAudio };
};
