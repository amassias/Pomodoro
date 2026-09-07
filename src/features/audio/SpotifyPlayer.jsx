import React, { useEffect, useRef, useState } from 'react';
import SpotifyPlayer from 'react-spotify-web-playback';

const DEFAULT_URI = 'spotify:playlist:0vvXsWCC9xrXsKd4JyS05a';

const SpotifyWebPlayer = ({ token, playing, uri, isPremium }) => {
    const [play, setPlay] = useState(playing);
    const isPlayingRef = useRef(playing);
    const resumeAfterAlarmRef = useRef(false);

    useEffect(() => {
        const pauseForAlarm = () => {
            resumeAfterAlarmRef.current = isPlayingRef.current;
            if (resumeAfterAlarmRef.current) setPlay(false);
        };
        const resumeAfterAlarm = () => {
            if (!resumeAfterAlarmRef.current) return;
            resumeAfterAlarmRef.current = false;
            setPlay(true);
        };

        window.addEventListener('timer-alarm-start', pauseForAlarm);
        window.addEventListener('timer-alarm-end', resumeAfterAlarm);
        return () => {
            window.removeEventListener('timer-alarm-start', pauseForAlarm);
            window.removeEventListener('timer-alarm-end', resumeAfterAlarm);
        };
    }, []);

    const selectedUri = uri || DEFAULT_URI;

    // Premium-only: Spotify Web Playback SDK requires Premium.
    if (!isPremium) return null;
    if (!token) return null;

    return (
        <div className="spotify-player-wrapper glass-panel">
            <SpotifyPlayer
                key={selectedUri}
                token={token}
                showSaveIcon
                callback={state => {
                    isPlayingRef.current = state.isPlaying;
                    setPlay(state.isPlaying);
                }}
                play={play}
                uris={[selectedUri]}
                styles={{
                    activeColor: '#fff',
                    bgColor: 'transparent',
                    color: '#fff',
                    loaderColor: '#fff',
                    sliderColor: '#1cb954',
                    trackArtistColor: '#ccc',
                    trackNameColor: '#fff',
                    height: '80px',
                }}
            />
            <style>{`
                .spotify-player-wrapper {
                                     position: fixed;
                                     bottom: calc(env(safe-area-inset-bottom, 0px) + 0.75rem);
                                     left: calc(env(safe-area-inset-left, 0px) + 0.75rem);
                                     width: min(300px, calc(100vw - 1.5rem - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px)));
                                     height: 80px;
                                     border-radius: 12px;
                                     overflow: hidden; 
                                     z-index: 50;
                                     padding: 0;
                                     user-select: none;
                }

                                @media (max-width: 600px) {
                                    .spotify-player-wrapper {
                                        left: calc(env(safe-area-inset-left, 0px) + 0.75rem);
                                        right: calc(env(safe-area-inset-right, 0px) + 0.75rem);
                                        width: auto;
                                    }
                                }
            `}</style>
        </div>
    );
};

export default SpotifyWebPlayer;
