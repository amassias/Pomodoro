import React, { useEffect, useState } from 'react';
import SpotifyPlayer from 'react-spotify-web-playback';

const SpotifyWebPlayer = ({ token, playing }) => {
    const [play, setPlay] = useState(false);

    useEffect(() => {
        setPlay(playing);
    }, [playing]);

    if (!token) return null;

    return (
        <div className="spotify-player-wrapper glass-panel">
            <SpotifyPlayer
                token={token}
                showSaveIcon
                callback={state => {
                    if (!state.isPlaying) setPlay(false);
                }}
                play={play}
                uris={['spotify:playlist:0vvXsWCC9xrXsKd4JyS05a']} // Lofi Girl Playlist
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
            <style jsx>{`
                .spotify-player-wrapper {
                   position: fixed;
                   bottom: 2rem;
                   left: 50%;
                   transform: translateX(-50%);
                   width: 90%;
                   max-width: 600px;
                   border-radius: 16px;
                   overflow: hidden; 
                   z-index: 90;
                   padding: 0.5rem 1rem;
                   backdrop-filter: blur(12px);
                   border: 1px solid rgba(255, 255, 255, 0.1);
                   box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                }
            `}</style>
        </div>
    );
};

export default SpotifyWebPlayer;
